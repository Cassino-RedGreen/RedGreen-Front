import { expect, type Page, type Response } from '@playwright/test';
import { GetGambitCardCenter } from './GambitBoard';
import { BumisEffect } from './GambitEffects';

const UnlockTimeout = 30_000;
const ResponseTimeout = 20_000;
const EventTimeout = 30_000;
const ActionTimeout = 10_000;
const EventCardsCount = 3;
const EventStages = 2;

export type GambitGridCard = {
  Effect?: string | null;
  Locked?: boolean;
  Position: number;
};

export type GambitPendingEvent = {
  BadOptions: string[];
  GoodOptions: string[];
};

export type GambitPendingInteraction = {
  RequiredSelections: number;
};

export type GambitGrid = {
  PendingEvent: GambitPendingEvent | null;
  PendingInteraction: GambitPendingInteraction | null;
  Revealed: GambitGridCard[];
  Unrevealed?: GambitGridCard[];
};

export type GambitSessionState = {
  AccumulatedPoints: number;
  BurnSlotsAvailable: number;
  CardsPurchased: number;
  CurrentGridSnapshot?: GambitGrid | null;
  FirstEventFlip?: number;
  GambitSessionId: number | string;
  Grid?: GambitGrid | null;
  ManualFlipsCount: number;
  NextEffect: string | null;
  Result: number | null;
  Status: string;
};

type GambitResolveEffectBody = Partial<GambitSessionState> & {
  PeekResult?: { Position?: number } | null;
  Session?: GambitSessionState;
};

export type GambitFlip = {
  Effect: string | null;
  Position: number;
  State: GambitSessionState;
};

export const GetGrid = (State: GambitSessionState | null | undefined) =>
  State?.Grid ?? State?.CurrentGridSnapshot;

const IsPostTo = (Candidate: Response, Path: string) =>
  Candidate.request().method() === 'POST' && Candidate.url().endsWith(Path);

// Plays the Gambit board through the UI. Every canvas click waits for the
// board wrapper to report data-locked="false", happens exactly once, and is
// then given a fixed window for the expected API response. The client-side
// Bumis state (the disguised card and the positions spent unmasking it) is
// tracked here because it never reaches the API.
export const CreateGambitPlayer = (Page: Page) => {
  const Board = Page.getByTestId('gambit-board');
  const Canvas = Board.locator('canvas');
  const Cinematic = Page.getByTestId('gambit-reveal-cinematic');
  const EventDialog = Page.getByRole('dialog').filter({
    has: Page.getByRole('heading', { name: 'Escolha Uma Carta' }),
  });
  const EventCards = EventDialog.getByRole('button', { name: /^Escolher / });

  const DeadPositions: number[] = [];
  let BumisPending = false;
  let PeekOpen = false;

  const WaitForUnlockedBoard = async () => {
    await expect(
      Board,
      'The Gambit board stayed locked (data-locked="true")'
    ).toHaveAttribute('data-locked', 'false', { timeout: UnlockTimeout });
  };

  const ClickCard = async (Position: number) => {
    const Box = await Canvas.boundingBox();

    if (!Box) {
      throw new Error('The Gambit board canvas has no bounding box');
    }

    await Canvas.click({
      position: GetGambitCardCenter(Box, Position),
      timeout: ActionTimeout,
    });
  };

  const ClickCardForResponse = async (Position: number, Path: string) => {
    await WaitForUnlockedBoard();

    const ResponsePromise = Page.waitForResponse(
      (Candidate) => IsPostTo(Candidate, Path),
      { timeout: ResponseTimeout }
    );
    ResponsePromise.catch(() => undefined);

    await ClickCard(Position);

    let Result: Response;

    try {
      Result = await ResponsePromise;
    } catch {
      throw new Error(
        `No POST ${Path} response within ${ResponseTimeout}ms after clicking card ${Position}`
      );
    }

    expect(Result.ok(), `POST ${Path} returned ${Result.status()}`).toBe(true);

    return Result;
  };

  const GetNextPosition = (State: GambitSessionState) =>
    (GetGrid(State)?.Unrevealed ?? [])
      .filter((Card) => !Card.Locked && !DeadPositions.includes(Card.Position))
      .map((Card) => Card.Position)
      .sort((Left, Right) => Left - Right)[0];

  const DismissCinematic = async () => {
    await expect(Cinematic).toBeVisible();
    await Cinematic.getByRole('button', { name: 'Pular' }).click({
      timeout: ActionTimeout,
    });
    await expect(Cinematic).toBeHidden();
  };

  // The front keeps a revealed Bumis disguised until the next card click,
  // which shows the truth cinematic instead of burning. That card plays its
  // reveal animation locally and cannot be burned afterwards.
  const UnmaskBumis = async (State: GambitSessionState) => {
    const Position = GetNextPosition(State);

    if (Position === undefined) {
      throw new Error('No closed card left to unmask the Bumis effect');
    }

    await WaitForUnlockedBoard();
    await ClickCard(Position);
    await expect(Cinematic).toBeVisible({ timeout: ResponseTimeout });
    await DismissCinematic();
    DeadPositions.push(Position);
    BumisPending = false;
  };

  const FlipCard = async (Position: number): Promise<GambitFlip> => {
    const BurnResponse = await ClickCardForResponse(
      Position,
      `/gambit/sessions/active/burn/${Position}`
    );
    const State = (await BurnResponse.json()) as GambitSessionState;
    const Effect =
      GetGrid(State)?.Revealed.find((Card) => Card.Position === Position)
        ?.Effect ?? null;

    BumisPending = Effect === BumisEffect;

    return { Effect, Position, State };
  };

  const FlipNext = async (State: GambitSessionState) => {
    if (BumisPending) {
      await UnmaskBumis(State);
    }

    const Position = GetNextPosition(State);

    if (Position === undefined) {
      throw new Error('No closed card left to flip');
    }

    return FlipCard(Position);
  };

  const ResolveInteraction = async (State: GambitSessionState) => {
    const Grid = GetGrid(State);
    const Interaction = Grid?.PendingInteraction;

    if (!Interaction) {
      throw new Error('There is no pending interaction to resolve');
    }

    const Positions = (Grid.Unrevealed ?? [])
      .filter((Card) => !Card.Locked && !DeadPositions.includes(Card.Position))
      .map((Card) => Card.Position)
      .sort((Left, Right) => Left - Right)
      .slice(0, Interaction.RequiredSelections);

    if (Positions.length < Interaction.RequiredSelections) {
      throw new Error('Not enough closed cards for the pending interaction');
    }

    let ResolveResponse: Response | undefined;

    for (const [Step, Position] of Positions.entries()) {
      if (Step === Positions.length - 1) {
        ResolveResponse = await ClickCardForResponse(
          Position,
          '/gambit/sessions/active/resolve-effect'
        );
        break;
      }

      await WaitForUnlockedBoard();
      await ClickCard(Position);
      await expect(
        Page.getByText(`${Step + 1}/${Interaction.RequiredSelections}`, {
          exact: true,
        })
      ).toBeVisible({ timeout: ResponseTimeout });
    }

    if (!ResolveResponse) {
      throw new Error('No resolve-effect response for the interaction');
    }

    const ResolveBody =
      (await ResolveResponse.json()) as GambitResolveEffectBody;

    if (ResolveBody.PeekResult && 'Position' in ResolveBody.PeekResult) {
      PeekOpen = true;
    }

    return ResolveBody.Session ?? (ResolveBody as GambitSessionState);
  };

  const ClosePeekIfOpen = async () => {
    if (!PeekOpen) {
      return;
    }

    const ClosePeek = Page.getByRole('button', { name: 'Fechar espiada' });
    await ClosePeek.click({ timeout: ActionTimeout });
    await expect(ClosePeek).toBeHidden();
    PeekOpen = false;
  };

  const WaitForEventCards = async (Stage: number) => {
    await expect(
      EventDialog.getByText(`Escolha ${Stage} de ${EventStages}`, {
        exact: true,
      })
    ).toBeVisible({ timeout: EventTimeout });
    await expect(EventCards).toHaveCount(EventCardsCount, {
      timeout: EventTimeout,
    });

    for (let Card = 0; Card < EventCardsCount; Card += 1) {
      await expect(EventCards.nth(Card)).toBeEnabled({
        timeout: EventTimeout,
      });
      await expect(EventCards.nth(Card)).toHaveCSS('opacity', '1', {
        timeout: EventTimeout,
      });
    }
  };

  // Picks the first card of the green table, then the first of the red one.
  // OnStage runs once each table is ready, before its card is chosen.
  const ResolveEvent = async (
    OnStage?: (Stage: number) => Promise<void>
  ): Promise<GambitSessionState> => {
    await WaitForEventCards(1);
    await OnStage?.(1);
    await EventCards.first().click({ force: true, timeout: ActionTimeout });

    await WaitForEventCards(2);
    await OnStage?.(2);

    const ResolveEventResponsePromise = Page.waitForResponse(
      (Candidate) =>
        IsPostTo(Candidate, '/gambit/sessions/active/resolve-event'),
      { timeout: ResponseTimeout }
    );
    ResolveEventResponsePromise.catch(() => undefined);
    await EventCards.first().click({ force: true, timeout: ActionTimeout });
    const ResolveEventResponse = await ResolveEventResponsePromise;
    expect(ResolveEventResponse.ok()).toBe(true);
    await expect(EventDialog).toBeHidden({ timeout: EventTimeout });

    return (await ResolveEventResponse.json()) as GambitSessionState;
  };

  // Resolves pending interactions (and events, unless StopAtEvent is set)
  // until the board is free to burn again.
  const ResolvePending = async (
    State: GambitSessionState,
    { StopAtEvent = false }: { StopAtEvent?: boolean } = {}
  ) => {
    let Current = State;

    for (;;) {
      const Grid = GetGrid(Current);

      if (Grid?.PendingEvent) {
        if (StopAtEvent) {
          return Current;
        }

        Current = await ResolveEvent();
      } else if (Grid?.PendingInteraction) {
        Current = await ResolveInteraction(Current);
      } else {
        await ClosePeekIfOpen();

        return Current;
      }
    }
  };

  return {
    Board,
    Canvas,
    Cinematic,
    ClosePeekIfOpen,
    DismissCinematic,
    EventCards,
    EventDialog,
    FlipCard,
    FlipNext,
    GetNextPosition,
    IsBumisPending: () => BumisPending,
    // The disguise only lives in the page state, so a reload drops it.
    ForgetBumis: () => {
      BumisPending = false;
    },
    ResolveEvent,
    ResolveInteraction,
    ResolvePending,
    UnmaskBumis,
    WaitForUnlockedBoard,
  };
};
