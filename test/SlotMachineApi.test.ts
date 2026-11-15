import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { AxiosError, type AxiosResponse } from 'axios';
import {
  buildRerollAnimationFromSession,
  buildSpinAnimationFromSession,
  cashOutActiveSlotSession,
  createSlotSession,
  fetchActiveSlotSession,
  fetchSlotMachines,
  getPreferredSlotMachine,
  getSlotMachineErrorMessage,
  getSlotMachineSessionState,
  rerollActiveSlotSession,
} from '../src/presentation/games/SlotMachineGame/SlotMachineApi';
import {
  createSlotMachine,
  createSlotMachineSession,
} from './SlotMachineTestBuilders';

const createAxiosError = (data: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    data,
  } as AxiosResponse);

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();

jest.mock('@infrastructure/http/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}));

describe('SlotMachineApi', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1_713_916_800_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockApiGet.mockReset();
    mockApiPost.mockReset();
  });

  it('adapts the backend session reels into the ordered visual spin envelope used by the slot', () => {
    const session = createSlotMachineSession({
      CurrentSpinResult: {
        Reels: [
          { ReelIndex: 3, SymbolId: 'Pig' },
          { ReelIndex: 1, SymbolId: 'Cheese' },
          { ReelIndex: 0, SymbolId: 'Watermelon' },
          { ReelIndex: 2, SymbolId: 'Oranges' },
        ],
      },
      SlotSessionId: 889,
    });

    expect(buildSpinAnimationFromSession(session)).toEqual({
      firstStopDelayMs: 780,
      id: 'slot-session-889-1713916800000',
      reelStopOrder: [0, 1, 2, 3],
      reels: [
        { extraSpinSteps: 1, reelIndex: 0, symbolId: 'watermelon' },
        { extraSpinSteps: 2, reelIndex: 1, symbolId: 'cheese' },
        { extraSpinSteps: 3, reelIndex: 2, symbolId: 'oranges' },
        { extraSpinSteps: 4, reelIndex: 3, symbolId: 'pig' },
      ],
      responseDelayMs: 120,
      spinDirection: 'down',
      spinSpeedPxPerMs: 2.9,
      stopDelayMs: 220,
    });
  });

  it('maps the backend egg symbol into the frontend visual symbol id', () => {
    const session = createSlotMachineSession({
      CurrentSpinResult: {
        Reels: [
          { ReelIndex: 0, SymbolId: 'Egg' },
          { ReelIndex: 1, SymbolId: 'Pig' },
          { ReelIndex: 2, SymbolId: 'Orange' },
          { ReelIndex: 3, SymbolId: 'Cheese' },
        ],
      },
    });

    expect(buildSpinAnimationFromSession(session).reels[0]).toEqual({
      extraSpinSteps: 1,
      reelIndex: 0,
      symbolId: 'egg',
    });
  });

  it('rejects a backend symbol the slot does not know', () => {
    const session = createSlotMachineSession({
      CurrentSpinResult: {
        Reels: [{ ReelIndex: 0, SymbolId: 'Diamond' }],
      },
    });

    expect(() => buildSpinAnimationFromSession(session)).toThrow(
      'Unsupported slot symbol received from backend: Diamond'
    );
  });

  it('builds an empty spin when the session has no spin result', () => {
    const session = createSlotMachineSession({ CurrentSpinResult: null });

    const animation = buildSpinAnimationFromSession(session);

    expect(animation.reels).toEqual([]);
    expect(animation.reelStopOrder).toEqual([]);
  });

  describe('buildRerollAnimationFromSession', () => {
    it('animates only the rerolled reel with the backend symbol', () => {
      const session = createSlotMachineSession({
        CurrentSpinResult: {
          Reels: [
            { ReelIndex: 1, SymbolId: 'TwoX' },
            { ReelIndex: 0, SymbolId: 'Rat' },
          ],
        },
        SlotSessionId: 55,
      });

      expect(buildRerollAnimationFromSession(session, 1)).toEqual({
        extraSpinSteps: 3,
        id: 'slot-reroll-55-1-1713916800000',
        reelIndex: 1,
        responseDelayMs: 100,
        spinDirection: 'down',
        spinSpeedPxPerMs: 2.85,
        symbolId: 'twoX',
      });
    });

    it('fails when the backend did not return the rerolled reel', () => {
      const session = createSlotMachineSession();

      expect(() => buildRerollAnimationFromSession(session, 9)).toThrow(
        'Slot reel 9 was not returned by the backend session.'
      );
    });
  });

  describe('getPreferredSlotMachine', () => {
    it('prefers the machine of the active session', () => {
      const firstMachine = createSlotMachine({ SlotMachineId: 1 });
      const sessionMachine = createSlotMachine({ SlotMachineId: 7 });

      expect(
        getPreferredSlotMachine(
          [firstMachine, sessionMachine],
          createSlotMachineSession({ SlotMachineId: 7 })
        )
      ).toBe(sessionMachine);
    });

    it('falls back to the first active machine when the session machine is missing', () => {
      const inactiveMachine = createSlotMachine({
        Active: false,
        SlotMachineId: 1,
      });
      const activeMachine = createSlotMachine({ SlotMachineId: 2 });

      expect(
        getPreferredSlotMachine(
          [inactiveMachine, activeMachine],
          createSlotMachineSession({ SlotMachineId: 99 })
        )
      ).toBe(activeMachine);
    });

    it('uses the first machine when none is active and there is no session', () => {
      const firstMachine = createSlotMachine({
        Active: false,
        SlotMachineId: 1,
      });

      expect(
        getPreferredSlotMachine(
          [firstMachine, createSlotMachine({ Active: false })],
          null
        )
      ).toBe(firstMachine);
    });

    it('returns null without machines', () => {
      expect(getPreferredSlotMachine([], null)).toBeNull();
    });
  });

  describe('getSlotMachineSessionState', () => {
    it('returns an empty state without session', () => {
      expect(getSlotMachineSessionState(null)).toEqual({
        rerollsMax: 0,
        rerollsRemaining: 0,
        reward: 0,
      });
    });

    it('calculates the remaining rerolls and truncates the reward', () => {
      const session = createSlotMachineSession({
        CurrentRewardSnapshot: 42.9,
        CurrentRerollsSpent: { Rerolls: { Max: 5, Used: 2 } },
      });

      expect(getSlotMachineSessionState(session)).toEqual({
        rerollsMax: 5,
        rerollsRemaining: 3,
        reward: 42,
      });
    });

    it('never returns negative rerolls or reward', () => {
      const session = createSlotMachineSession({
        CurrentRewardSnapshot: -10,
        CurrentRerollsSpent: { Rerolls: { Max: 2, Used: 4 } },
      });

      expect(getSlotMachineSessionState(session)).toEqual({
        rerollsMax: 2,
        rerollsRemaining: 0,
        reward: 0,
      });
    });

    it('treats missing reroll data as zero', () => {
      const session = createSlotMachineSession({ CurrentRerollsSpent: null });

      expect(getSlotMachineSessionState(session)).toEqual({
        rerollsMax: 0,
        rerollsRemaining: 0,
        reward: 0,
      });
    });
  });

  describe('requests', () => {
    it('returns an empty list when the machines response is not an array', async () => {
      mockApiGet.mockResolvedValue({ data: null });

      await expect(fetchSlotMachines()).resolves.toEqual([]);
      expect(mockApiGet).toHaveBeenCalledWith('/slot/machine');
    });

    it('ignores an active session that is no longer in progress', async () => {
      mockApiGet.mockResolvedValue({
        data: createSlotMachineSession({ Status: 'CashedOut' }),
      });

      await expect(fetchActiveSlotSession()).resolves.toBeNull();
    });

    it('returns null when there is no active session', async () => {
      mockApiGet.mockResolvedValue({ data: null });

      await expect(fetchActiveSlotSession()).resolves.toBeNull();
    });

    it('posts to the session endpoints', async () => {
      mockApiPost.mockResolvedValue({ data: { currentBalance: 10 } });

      await createSlotSession(7);
      await rerollActiveSlotSession(3);
      await cashOutActiveSlotSession();

      expect(mockApiPost).toHaveBeenNthCalledWith(
        1,
        '/slot-machines/7/sessions',
        {}
      );
      expect(mockApiPost).toHaveBeenNthCalledWith(
        2,
        '/sessions/active/reroll/3'
      );
      expect(mockApiPost).toHaveBeenNthCalledWith(
        3,
        '/sessions/active/cash-out'
      );
    });
  });

  describe('getSlotMachineErrorMessage', () => {
    it('joins the validation messages returned by the backend', () => {
      const error = createAxiosError({
        message: ['saldo insuficiente', 'maquina inativa'],
      });

      expect(getSlotMachineErrorMessage(error, 'fallback')).toBe(
        'saldo insuficiente, maquina inativa'
      );
    });

    it('uses the backend message string', () => {
      const error = createAxiosError({ message: 'Sessao encerrada' });

      expect(getSlotMachineErrorMessage(error, 'fallback')).toBe(
        'Sessao encerrada'
      );
    });

    it('uses the axios error message when the backend message is blank', () => {
      const error = createAxiosError({ message: '   ' });

      expect(getSlotMachineErrorMessage(error, 'fallback')).toBe(
        'Request failed'
      );
    });

    it('uses the message of a common error', () => {
      expect(
        getSlotMachineErrorMessage(new Error('Falha local'), 'fallback')
      ).toBe('Falha local');
    });

    it('uses the fallback for unknown errors', () => {
      expect(getSlotMachineErrorMessage('boom', 'Erro no slot')).toBe(
        'Erro no slot'
      );
      expect(getSlotMachineErrorMessage(new Error('  '), 'Erro no slot')).toBe(
        'Erro no slot'
      );
    });
  });
});
