import { describe, expect, it } from '@jest/globals';
import {
  mapBackendGambitCardToViewModel,
  mapBackendGambitEventTypeToViewModel,
  mapBackendGambitGridToViewModel,
  mapBackendGambitPendingInteractionToViewModel,
  mapBackendGambitSessionToViewModel,
  mapBackendGambitStatusToViewModel,
  mapBackendGambitTableToViewModel,
  mapGambitSessionToVisualCards,
} from '../src/presentation/games/GambitGame/GambitMapper';
import type { GambitApiUnrevealedCard } from '../src/presentation/games/GambitGame/GambitApi';
import type { BackendGambitTable } from '../src/presentation/games/GambitGame/GambitTypes';
import {
  createGambitApiGrid,
  createGambitApiPendingEvent,
  createGambitApiPendingInteraction,
  createGambitApiRevealedCard,
  createGambitApiSession,
  createGambitApiUnrevealedCard,
} from './GambitTestBuilders';

describe('GambitMapper', () => {
  it('maps unrevealed backend cards without leaking Points or Effect', () => {
    const hiddenCardWithUnexpectedPayload = {
      Effect: 'CLARIVIDENCIA',
      Locked: true,
      Points: 999,
      Position: 6,
    } as GambitApiUnrevealedCard & {
      Effect: 'CLARIVIDENCIA';
      Points: number;
    };
    const grid = createGambitApiGrid({
      Revealed: [],
      Unrevealed: [hiddenCardWithUnexpectedPayload],
    });

    expect(mapBackendGambitGridToViewModel(grid).cards[6]).toMatchObject({
      effect: null,
      locked: true,
      points: null,
      position: 6,
      revealed: false,
    });
  });

  it('maps revealed backend cards with points, effect and locked state', () => {
    const grid = createGambitApiGrid({
      Revealed: [
        createGambitApiRevealedCard({
          Effect: 'DOBRO_DE_POTASSIO',
          Locked: true,
          Points: 25,
          Position: 2,
        }),
      ],
      Unrevealed: [createGambitApiUnrevealedCard({ Position: 3 })],
    });

    expect(mapBackendGambitGridToViewModel(grid).cards[2]).toMatchObject({
      effect: 'dobro-de-potassio',
      locked: true,
      points: 25,
      position: 2,
      revealed: true,
    });
  });

  it('preserves PendingEvent GoodOptions and BadOptions as visual effects', () => {
    const grid = createGambitApiGrid({
      PendingEvent: createGambitApiPendingEvent({
        BadOptions: ['MELANCIDIO', 'QUANTO_MENOS_MELHOR', 'CORINGA_DO_INATEL'],
        GoodOptions: ['DOBRO_DE_POTASSIO', 'QUANTO_MAIS_MELHOR', 'MENTE_LISA'],
      }),
    });

    expect(mapBackendGambitGridToViewModel(grid).pendingEvent).toEqual({
      badOptions: ['melancidio', 'quanto-menos-melhor', 'coringa-do-inatel'],
      eventType: null,
      goodOptions: ['dobro-de-potassio', 'quanto-mais-melhor', 'mente-lisa'],
    });
  });

  it('preserves PendingInteraction RequiredSelections and SelectedPositions', () => {
    const grid = createGambitApiGrid({
      PendingInteraction: createGambitApiPendingInteraction({
        Action: 'SELECT_MULTIPLE_CARDS',
        Effect: 'CABECINHA',
        RequiredSelections: 3,
        SelectedPositions: [4, 9],
      }),
    });

    expect(mapBackendGambitGridToViewModel(grid).pendingInteraction).toEqual({
      action: 'SELECT_MULTIPLE_CARDS',
      effect: 'cabecinha',
      requiredSelections: 3,
      selectedPositions: [4, 9],
    });
  });

  it('maps session score, burns remaining and prepared effect from the active contract', () => {
    const session = createGambitApiSession({
      AccumulatedPoints: 120,
      BurnSlotsAvailable: 12,
      BurnsRemaining: 4,
      ManualFlipsCount: 8,
      NextEffect: 'CLARIVIDENCIA',
      Result: null,
      Status: 'InProgress',
    });

    expect(mapBackendGambitSessionToViewModel(session)).toMatchObject({
      accumulatedPoints: 120,
      burnsRemaining: 4,
      burnSlotsAvailable: 12,
      manualFlipsCount: 8,
      nextEffect: 'clarividencia',
      result: null,
      status: 'in-progress',
    });
  });

  describe('enum mapping', () => {
    it('returns null for an empty card and rejects an unknown card', () => {
      expect(mapBackendGambitCardToViewModel(null)).toBeNull();
      expect(mapBackendGambitCardToViewModel(undefined)).toBeNull();
      expect(() =>
        mapBackendGambitCardToViewModel('DIAMANTE' as never)
      ).toThrow('Unknown Gambit card/effect "DIAMANTE".');
    });

    it('maps every backend status and rejects an unknown one', () => {
      expect(mapBackendGambitStatusToViewModel('CashedOut')).toBe('cashed-out');
      expect(mapBackendGambitStatusToViewModel('Completed')).toBe('completed');
      expect(mapBackendGambitStatusToViewModel('Finished')).toBe('finished');
      expect(() =>
        mapBackendGambitStatusToViewModel('Paused' as never)
      ).toThrow('Unknown Gambit status "Paused".');
    });

    it('maps event types and rejects an unknown one', () => {
      expect(mapBackendGambitEventTypeToViewModel(null)).toBeNull();
      expect(mapBackendGambitEventTypeToViewModel('Good')).toBe('good');
      expect(mapBackendGambitEventTypeToViewModel('Bad')).toBe('bad');
      expect(mapBackendGambitEventTypeToViewModel('Neutral')).toBe('neutral');
      expect(() =>
        mapBackendGambitEventTypeToViewModel('Chaos' as never)
      ).toThrow('Unknown Gambit event type "Chaos".');
    });
  });

  describe('table mapping', () => {
    const createBackendTable = (
      overrides: Partial<BackendGambitTable> = {}
    ): BackendGambitTable => ({
      Active: true,
      CardPrice: 10,
      Description: null,
      GambitTableId: 3,
      MaxCardsPurchased: 25,
      MinimumCardsPurchased: 1,
      MinimumChipsRequired: null,
      Name: 'Mesa Gambit',
      TableMultiplier: 2,
      ...overrides,
    });

    it('maps the table rules with optional fields as null', () => {
      expect(mapBackendGambitTableToViewModel(createBackendTable())).toEqual({
        active: true,
        cardPrice: 10,
        description: null,
        eventInterval: null,
        gambitTableId: 3,
        maxCardsPurchased: 25,
        minimumCardsPurchased: 1,
        minimumChipsRequired: null,
        name: 'Mesa Gambit',
        purchaseMultiplierScale: null,
        tableId: 3,
        tableMultiplier: 2,
      });
    });

    it('keeps the optional numeric rules when present', () => {
      expect(
        mapBackendGambitTableToViewModel(
          createBackendTable({
            EventInterval: 5,
            GambitTableId: 'mesa-vip',
            MinimumChipsRequired: 100,
            PurchaseMultiplierScale: 1.5,
          })
        )
      ).toMatchObject({
        eventInterval: 5,
        minimumChipsRequired: 100,
        purchaseMultiplierScale: 1.5,
        tableId: 'mesa-vip',
      });
    });

    it('rejects a table with invalid price or id', () => {
      expect(() =>
        mapBackendGambitTableToViewModel(
          createBackendTable({ CardPrice: Number.NaN })
        )
      ).toThrow('Invalid Gambit CardPrice: expected a finite number.');
      expect(() =>
        mapBackendGambitTableToViewModel(
          createBackendTable({ GambitTableId: ' ' })
        )
      ).toThrow('Invalid Gambit GambitTableId: expected a valid id.');
    });
  });

  describe('grid validation', () => {
    it('returns a fully hidden grid when there is no snapshot', () => {
      const grid = mapBackendGambitGridToViewModel(null);

      expect(grid.cards).toHaveLength(25);
      expect(grid.cards.every((card) => !card.revealed)).toBe(true);
      expect(grid.pendingEvent).toBeNull();
      expect(grid.pendingInteraction).toBeNull();
    });

    it('treats missing card lists as empty', () => {
      const grid = mapBackendGambitGridToViewModel({
        Revealed: undefined as never,
        Unrevealed: undefined as never,
      });

      expect(grid.cards).toHaveLength(25);
    });

    it('rejects card lists that are not arrays', () => {
      expect(() =>
        mapBackendGambitGridToViewModel({ Unrevealed: {} as never })
      ).toThrow('Invalid Gambit Grid.Unrevealed.');
      expect(() =>
        mapBackendGambitGridToViewModel({ Revealed: {} as never })
      ).toThrow('Invalid Gambit Grid.Revealed.');
    });

    it('rejects positions outside the grid', () => {
      const grid = createGambitApiGrid({
        Unrevealed: [createGambitApiUnrevealedCard({ Position: 25 })],
      });

      expect(() => mapBackendGambitGridToViewModel(grid)).toThrow(
        'Invalid Gambit grid Position "25". Expected 0-24.'
      );
    });

    it('rejects a position repeated between hidden cards', () => {
      const grid = createGambitApiGrid({
        Unrevealed: [
          createGambitApiUnrevealedCard({ Position: 1 }),
          createGambitApiUnrevealedCard({ Position: 1 }),
        ],
      });

      expect(() => mapBackendGambitGridToViewModel(grid)).toThrow(
        'Invalid Gambit grid: duplicate Position "1".'
      );
    });

    it('rejects a card that is hidden and revealed at the same time', () => {
      const grid = createGambitApiGrid({
        Revealed: [createGambitApiRevealedCard({ Position: 4 })],
        Unrevealed: [createGambitApiUnrevealedCard({ Position: 4 })],
      });

      expect(() => mapBackendGambitGridToViewModel(grid)).toThrow(
        'Invalid Gambit grid: duplicate Position "4".'
      );
    });

    it('rejects revealed points that are not finite', () => {
      const grid = createGambitApiGrid({
        Revealed: [
          createGambitApiRevealedCard({ Points: Number.POSITIVE_INFINITY }),
        ],
        Unrevealed: [],
      });

      expect(() => mapBackendGambitGridToViewModel(grid)).toThrow(
        'Invalid Gambit Points: expected a finite number.'
      );
    });
  });

  describe('pending event validation', () => {
    it('requires the option lists', () => {
      const grid = createGambitApiGrid({
        PendingEvent: createGambitApiPendingEvent({
          GoodOptions: undefined as never,
        }),
      });

      expect(() => mapBackendGambitGridToViewModel(grid)).toThrow(
        'Invalid Gambit PendingEvent.GoodOptions.'
      );
    });

    it('requires exactly three options', () => {
      const grid = createGambitApiGrid({
        PendingEvent: createGambitApiPendingEvent({
          BadOptions: ['MELANCIDIO', 'RATIMUNDIO'] as never,
        }),
      });

      expect(() => mapBackendGambitGridToViewModel(grid)).toThrow(
        'Invalid Gambit PendingEvent.BadOptions length.'
      );
    });

    it('rejects an empty option', () => {
      const grid = createGambitApiGrid({
        PendingEvent: createGambitApiPendingEvent({
          BadOptions: ['MELANCIDIO', null, 'RATIMUNDIO'] as never,
        }),
      });

      expect(() => mapBackendGambitGridToViewModel(grid)).toThrow(
        'Invalid Gambit PendingEvent.BadOptions card.'
      );
    });

    it('maps the event type of the pending event', () => {
      const grid = createGambitApiGrid({
        PendingEvent: createGambitApiPendingEvent({ EventType: 'Bad' }),
      });

      expect(
        mapBackendGambitGridToViewModel(grid).pendingEvent?.eventType
      ).toBe('bad');
    });
  });

  describe('pending interaction validation', () => {
    it('returns null without interaction', () => {
      expect(mapBackendGambitPendingInteractionToViewModel(null)).toBeNull();
    });

    it('requires an effect', () => {
      expect(() =>
        mapBackendGambitPendingInteractionToViewModel(
          createGambitApiPendingInteraction({ Effect: null as never })
        )
      ).toThrow('Invalid Gambit PendingInteraction.Effect.');
    });

    it('rejects selected positions outside the grid', () => {
      expect(() =>
        mapBackendGambitPendingInteractionToViewModel(
          createGambitApiPendingInteraction({ SelectedPositions: [-1] })
        )
      ).toThrow('Invalid Gambit grid Position "-1". Expected 0-24.');
    });
  });

  describe('session mapping', () => {
    it('derives the burns remaining from slots and flips when missing', () => {
      const session = createGambitApiSession({
        BurnSlotsAvailable: 10,
        BurnsRemaining: undefined,
        ManualFlipsCount: 3,
      });

      expect(mapBackendGambitSessionToViewModel(session).burnsRemaining).toBe(
        7
      );
    });

    it('never returns negative burns remaining', () => {
      const session = createGambitApiSession({
        BurnSlotsAvailable: 2,
        BurnsRemaining: undefined,
        ManualFlipsCount: 5,
      });

      expect(mapBackendGambitSessionToViewModel(session).burnsRemaining).toBe(
        0
      );
    });

    it('reads the legacy grid snapshot and the session table', () => {
      const session = createGambitApiSession({
        CurrentGridSnapshot: createGambitApiGrid({
          Revealed: [createGambitApiRevealedCard({ Points: 30, Position: 0 })],
          Unrevealed: [],
        }),
        GambitTable: {
          Active: true,
          CardPrice: 5,
          Description: null,
          GambitTableId: 7,
          MaxCardsPurchased: 25,
          MinimumCardsPurchased: 1,
          MinimumChipsRequired: null,
          Name: 'Mesa Gambit',
          TableMultiplier: 1,
        },
        Grid: undefined as never,
        Result: 90,
        Status: 'Completed',
      });

      const viewModel = mapBackendGambitSessionToViewModel(session);

      expect(viewModel.grid.cards[0]).toMatchObject({
        points: 30,
        revealed: true,
      });
      expect(viewModel.table?.cardPrice).toBe(5);
      expect(viewModel.result).toBe(90);
      expect(viewModel.status).toBe('completed');
    });

    it('uses CreatedAt or an empty string when dates are missing', () => {
      const withCreatedAt = createGambitApiSession({ UpdatedAt: undefined });
      const withoutDates = createGambitApiSession({
        CreatedAt: undefined,
        UpdatedAt: undefined,
      });

      expect(mapBackendGambitSessionToViewModel(withCreatedAt).updatedAt).toBe(
        '2026-06-01T00:00:00.000Z'
      );
      expect(mapBackendGambitSessionToViewModel(withoutDates)).toMatchObject({
        createdAt: '',
        updatedAt: '',
      });
    });

    it('rejects a session with invalid user id', () => {
      expect(() =>
        mapBackendGambitSessionToViewModel(
          createGambitApiSession({ UserId: null as never })
        )
      ).toThrow('Invalid Gambit UserId: expected a valid id.');
    });

    it('marks the previewed card in the visual cards', () => {
      const cards = mapGambitSessionToVisualCards(createGambitApiSession(), 3);

      expect(cards[3].previewed).toBe(true);
      expect(cards.filter((card) => card.previewed)).toHaveLength(1);
      expect(
        mapGambitSessionToVisualCards(createGambitApiSession()).some(
          (card) => card.previewed
        )
      ).toBe(false);
    });
  });
});
