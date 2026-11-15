import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { AxiosError, type AxiosResponse } from 'axios';
import {
  burnActiveGambitCard,
  cashOutActiveGambitSession,
  createGambitSession,
  fetchActiveGambitSession,
  fetchGambitTableById,
  fetchGambitTables,
  getGambitResolveEffectPeekResult,
  getGambitResolveEffectSession,
  normalizeGambitCashOutResponse,
  resolveActiveGambitEffect,
  resolveActiveGambitEvent,
} from '../src/presentation/games/GambitGame/GambitApi';
import type { GambitTable } from '../src/presentation/games/GambitGame/GambitTypes';
import { createGambitApiSession } from './GambitTestBuilders';

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();

const createGambitTable = (
  overrides: Partial<GambitTable> = {}
): GambitTable => ({
  Active: true,
  CardPrice: 10,
  Description: null,
  GambitTableId: 1,
  MaxCardsPurchased: 25,
  MinimumCardsPurchased: 1,
  MinimumChipsRequired: null,
  Name: 'Mesa Gambit',
  TableMultiplier: 1,
  ...overrides,
});

jest.mock('@infrastructure/http/client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}));

describe('GambitApi', () => {
  afterEach(() => {
    mockApiGet.mockReset();
    mockApiPost.mockReset();
  });

  it('fetches the active Gambit session from the gameplay endpoint', async () => {
    const session = createGambitApiSession();

    mockApiGet.mockResolvedValueOnce({ data: session });

    await expect(fetchActiveGambitSession()).resolves.toBe(session);

    expect(mockApiGet).toHaveBeenCalledWith('/gambit/sessions/active');
  });

  it('fetches available Gambit tables from the backend', async () => {
    const tables = [
      createGambitTable(),
      createGambitTable({ GambitTableId: 2, Name: 'Mesa VIP' }),
    ];

    mockApiGet.mockResolvedValueOnce({ data: tables });

    await expect(fetchGambitTables()).resolves.toBe(tables);

    expect(mockApiGet).toHaveBeenCalledWith('/gambit-table');
  });

  it('fetches a Gambit table by id from the backend', async () => {
    const table = createGambitTable({ GambitTableId: 3 });

    mockApiGet.mockResolvedValueOnce({ data: table });

    await expect(fetchGambitTableById(3)).resolves.toBe(table);

    expect(mockApiGet).toHaveBeenCalledWith('/gambit-table/3');
  });

  it('burns the active Gambit card by position', async () => {
    const session = createGambitApiSession();

    mockApiPost.mockResolvedValueOnce({ data: session });

    await expect(burnActiveGambitCard(7)).resolves.toBe(session);

    expect(mockApiPost).toHaveBeenCalledWith('/gambit/sessions/active/burn/7');
  });

  it('creates a backend Gambit session through the table session route', async () => {
    const session = createGambitApiSession();

    mockApiPost.mockResolvedValueOnce({ data: session });

    await expect(
      createGambitSession({
        CardsPurchased: 5,
        GambitTableId: 1,
      })
    ).resolves.toBe(session);

    expect(mockApiPost).toHaveBeenCalledWith('/gambit-tables/1/sessions', {
      CardsPurchased: 5,
    });
  });

  it('resolves the active Gambit pending event with backend indexes', async () => {
    const session = createGambitApiSession();
    const selection = { BadIndex: 1, GoodIndex: 0 };

    mockApiPost.mockResolvedValueOnce({ data: session });

    await expect(resolveActiveGambitEvent(selection)).resolves.toBe(session);

    expect(mockApiPost).toHaveBeenCalledWith(
      '/gambit/sessions/active/resolve-event',
      selection
    );
  });

  it('resolves the active Gambit pending effect with selected positions', async () => {
    const response = {
      PeekResult: {
        Effect: null,
        Points: 40,
        Position: 4,
      },
      Session: createGambitApiSession(),
    };

    mockApiPost.mockResolvedValueOnce({ data: response });

    await expect(resolveActiveGambitEffect([4, 9, 17])).resolves.toBe(response);

    expect(mockApiPost).toHaveBeenCalledWith(
      '/gambit/sessions/active/resolve-effect',
      {
        Positions: [4, 9, 17],
      }
    );
  });

  it('normalizes cash-out camelCase backend fields to PascalCase', async () => {
    const response = {
      finalBalance: 500,
      message: 'ok',
      reward: 80,
    };

    mockApiPost.mockResolvedValueOnce({ data: response });

    await expect(cashOutActiveGambitSession()).resolves.toEqual({
      FinalBalance: 500,
      Message: 'ok',
      Reward: 80,
      Result: undefined,
      Session: undefined,
    });

    expect(mockApiPost).toHaveBeenCalledWith(
      '/gambit/sessions/active/cash-out'
    );
  });

  it('keeps PascalCase cash-out fields over camelCase ones', () => {
    const session = createGambitApiSession();

    expect(
      normalizeGambitCashOutResponse({
        FinalBalance: 900,
        Message: 'Sacado',
        Result: 120,
        Reward: 120,
        Session: session,
        finalBalance: 1,
        message: 'ignorado',
        reward: 1,
      })
    ).toEqual({
      FinalBalance: 900,
      Message: 'Sacado',
      Result: 120,
      Reward: 120,
      Session: session,
    });
  });

  it('returns null when the backend has no active Gambit session', async () => {
    mockApiGet.mockResolvedValueOnce({ data: null });

    await expect(fetchActiveGambitSession()).resolves.toBeNull();
  });

  it('returns null when the active Gambit session is not found', async () => {
    mockApiGet.mockRejectedValueOnce(
      new AxiosError('Not Found', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 404,
      } as AxiosResponse)
    );

    await expect(fetchActiveGambitSession()).resolves.toBeNull();
  });

  it('propagates other errors while fetching the active Gambit session', async () => {
    const serverError = new AxiosError(
      'Server Error',
      'ERR_BAD_RESPONSE',
      undefined,
      undefined,
      { status: 500 } as AxiosResponse
    );
    mockApiGet.mockRejectedValueOnce(serverError);

    await expect(fetchActiveGambitSession()).rejects.toBe(serverError);
  });

  it('returns an empty table list when the response is not an array', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { message: 'unexpected' } });

    await expect(fetchGambitTables()).resolves.toEqual([]);
  });

  it('reads the session from both resolve-effect response formats', () => {
    const session = createGambitApiSession({ GambitSessionId: 55 });

    expect(getGambitResolveEffectSession({ Session: session })).toBe(session);
    expect(getGambitResolveEffectSession(session)).toBe(session);
  });

  it('reads the peek result of a resolved effect when present', () => {
    const peekResult = { AtLeastOneBad: true };
    const session = createGambitApiSession();

    expect(
      getGambitResolveEffectPeekResult({
        PeekResult: peekResult,
        Session: session,
      })
    ).toBe(peekResult);
    expect(getGambitResolveEffectPeekResult({ Session: session })).toBeNull();
  });
});
