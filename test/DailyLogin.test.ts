import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { act, renderHook } from '@testing-library/react';
import useSWR from 'swr';
import {
  CalculateDailyProgress,
  UseDailyLogin,
} from '../src/application/hooks/useDailyLogin';

type ApiGetMock = (url: string) => Promise<{ data: unknown }>;
type ApiPostMock = (url: string) => Promise<{ data: unknown }>;

const MockApiGet = jest.fn<ApiGetMock>();
const MockApiPost = jest.fn<ApiPostMock>();

jest.mock('@infrastructure/http/client', () => ({
  apiClient: {
    get: (url: string) => MockApiGet(url),
    post: (url: string) => MockApiPost(url),
  },
}));

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

type MockSWRHook = (...Args: unknown[]) => {
  data: unknown;
  error: unknown;
  isLoading: boolean;
  mutate: unknown;
};

type DailyFetcher = (Key: readonly string[]) => Promise<unknown>;

const MockUseSWR = useSWR as unknown as jest.MockedFunction<MockSWRHook>;
const MockMutate = jest.fn(async () => undefined);

const UseFixedToday = () => {
  jest.useFakeTimers({
    now: new Date(2026, 2, 10, 12, 0, 0),
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
};

const SetSWRResult = ({
  data,
  error,
  isLoading = false,
}: {
  data?: unknown;
  error?: Error;
  isLoading?: boolean;
} = {}) => {
  MockUseSWR.mockReturnValue({ data, error, isLoading, mutate: MockMutate });
};

const CaptureFetcher = () => {
  let CapturedFetcher: DailyFetcher | undefined;

  MockUseSWR.mockImplementation((...Args: unknown[]) => {
    CapturedFetcher = Args[1] as DailyFetcher;
    return {
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: MockMutate,
    };
  });

  renderHook(() => UseDailyLogin(true));

  return CapturedFetcher!;
};

const FetchProfile = async (Profile: unknown) => {
  MockApiGet.mockResolvedValue({ data: Profile });
  const Fetcher = CaptureFetcher();
  return Fetcher(['/user/profile', 'daily-login-state']);
};

describe('CalculateDailyProgress', () => {
  it('uses the sequence day when claim is available', () => {
    expect(CalculateDailyProgress(0, true, 3)).toEqual({
      ClaimedDays: 2,
      CurrentDay: 3,
      CurrentDayIndex: 2,
    });
  });

  it('counts the sequence day as claimed when claim is not available', () => {
    expect(CalculateDailyProgress(0, false, 3)).toEqual({
      ClaimedDays: 3,
      CurrentDay: 3,
      CurrentDayIndex: 2,
    });
  });

  it('clamps the sequence day between 1 and 7', () => {
    expect(CalculateDailyProgress(0, true, 0).CurrentDay).toBe(1);
    expect(CalculateDailyProgress(0, true, 0).ClaimedDays).toBe(0);
    expect(CalculateDailyProgress(0, true, 12).CurrentDay).toBe(7);
    expect(CalculateDailyProgress(0, true, 2.9).CurrentDay).toBe(2);
  });

  it('caps the progress at 7 days when the streak is full', () => {
    expect(CalculateDailyProgress(9, true)).toEqual({
      ClaimedDays: 6,
      CurrentDay: 7,
      CurrentDayIndex: 6,
    });
    expect(CalculateDailyProgress(7, false)).toEqual({
      ClaimedDays: 7,
      CurrentDay: 7,
      CurrentDayIndex: 6,
    });
  });

  it('points to the next day when claim is available', () => {
    expect(CalculateDailyProgress(2, true, null)).toEqual({
      ClaimedDays: 2,
      CurrentDay: 3,
      CurrentDayIndex: 2,
    });
  });

  it('points to the last claimed day when claim is not available', () => {
    expect(CalculateDailyProgress(4, false)).toEqual({
      ClaimedDays: 4,
      CurrentDay: 4,
      CurrentDayIndex: 3,
    });
  });

  it('starts at day 1 without streak and without claim', () => {
    expect(CalculateDailyProgress(0, false)).toEqual({
      ClaimedDays: 0,
      CurrentDay: 1,
      CurrentDayIndex: 0,
    });
  });

  it('treats a negative streak as zero', () => {
    expect(CalculateDailyProgress(-3, true)).toEqual({
      ClaimedDays: 0,
      CurrentDay: 1,
      CurrentDayIndex: 0,
    });
  });
});

describe('UseDailyLogin fetcher', () => {
  beforeEach(() => {
    UseFixedToday();
    MockApiGet.mockReset();
    MockUseSWR.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows the first claim when the user never logged in', async () => {
    const Result = await FetchProfile({ ChipBalance: 100 });

    expect(MockApiGet).toHaveBeenCalledWith('/user/profile');
    expect(Result).toEqual({
      FirstLoginToday: true,
      DailyStreak: 0,
      Reward: 0,
      ChipBalance: 100,
      LastLoginDate: null,
      SequenceDay: 1,
    });
  });

  it('keeps the streak when the last login was yesterday', async () => {
    const Result = await FetchProfile({
      User: { LastLoginDate: '2026-03-09', DailyLoginStreak: 3 },
    });

    expect(Result).toMatchObject({
      FirstLoginToday: true,
      DailyStreak: 3,
      LastLoginDate: '2026-03-09',
      SequenceDay: 4,
    });
  });

  it('blocks a second claim on the same day', async () => {
    const Result = await FetchProfile({
      LastLoginDate: '2026-03-10T08:00:00.000Z',
      DailyLoginStreak: 3,
    });

    expect(Result).toMatchObject({
      FirstLoginToday: false,
      DailyStreak: 3,
      SequenceDay: 3,
    });
  });

  it('resets the streak after missing a day', async () => {
    const Result = await FetchProfile({
      LastLoginDate: '2026-03-07',
      DailyLoginStreak: 5,
    });

    expect(Result).toMatchObject({
      FirstLoginToday: true,
      DailyStreak: 0,
      SequenceDay: 1,
    });
  });

  it('keeps day 1 when already claimed today without streak', async () => {
    const Result = await FetchProfile({
      LastLoginDate: '2026-03-10',
      DailyLoginStreak: 0,
    });

    expect(Result).toMatchObject({ FirstLoginToday: false, SequenceDay: 1 });
  });

  it('caps the sequence day at 7', async () => {
    const Result = await FetchProfile({
      LastLoginDate: '2026-03-09',
      DailyLoginStreak: 10,
    });

    expect(Result).toMatchObject({ DailyStreak: 10, SequenceDay: 7 });
  });

  it('reads camelCase fields', async () => {
    const Result = await FetchProfile({
      lastLoginDate: '2026-03-09',
      dailyLoginStreak: 2,
      chipBalance: 70,
    });

    expect(Result).toMatchObject({
      DailyStreak: 2,
      ChipBalance: 70,
      LastLoginDate: '2026-03-09',
    });
  });

  it('reads the daily login fields', async () => {
    const Result = await FetchProfile({
      LastDailyLoginAt: '2026-03-09',
      DailyStreak: 1,
    });

    expect(Result).toMatchObject({ DailyStreak: 1, SequenceDay: 2 });
  });

  it('reads the camelCase daily login fields', async () => {
    const Result = await FetchProfile({
      lastDailyLoginAt: '2026-03-09',
      dailyStreak: 4,
    });

    expect(Result).toMatchObject({ DailyStreak: 4, SequenceDay: 5 });
  });

  it('accepts a Date instance as last login', async () => {
    const Result = await FetchProfile({
      LastLoginDate: new Date(2026, 2, 9, 22, 0, 0),
      DailyLoginStreak: 1,
    });

    expect(Result).toMatchObject({ LastLoginDate: '2026-03-09' });
  });

  it('parses a non ISO date string', async () => {
    const Result = await FetchProfile({
      LastLoginDate: 'March 9, 2026 10:00:00',
      DailyLoginStreak: 1,
    });

    expect(Result).toMatchObject({ LastLoginDate: '2026-03-09' });
  });

  it('ignores an invalid last login date', async () => {
    const Result = await FetchProfile({
      LastLoginDate: 'not-a-date',
      DailyLoginStreak: 4,
    });

    expect(Result).toMatchObject({
      FirstLoginToday: true,
      DailyStreak: 0,
      LastLoginDate: null,
    });
  });

  it('ignores an invalid Date instance', async () => {
    const Result = await FetchProfile({
      LastLoginDate: new Date('invalid'),
    });

    expect(Result).toMatchObject({ LastLoginDate: null });
  });

  it('treats a negative stored streak as zero', async () => {
    const Result = await FetchProfile({
      LastLoginDate: '2026-03-10',
      DailyLoginStreak: -2,
    });

    expect(Result).toMatchObject({ DailyStreak: 0, ChipBalance: 0 });
  });
});

describe('UseDailyLogin', () => {
  beforeEach(() => {
    UseFixedToday();
    MockApiPost.mockReset();
    MockUseSWR.mockReset();
    MockMutate.mockClear();
    SetSWRResult();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses the profile cache key when enabled', () => {
    renderHook(() => UseDailyLogin());

    expect(MockUseSWR).toHaveBeenCalledWith(
      ['/user/profile', 'daily-login-state'],
      expect.any(Function),
      expect.objectContaining({ revalidateOnFocus: false })
    );
  });

  it('passes null to SWR when disabled', () => {
    renderHook(() => UseDailyLogin(false));

    expect(MockUseSWR.mock.calls[0][0]).toBeNull();
  });

  it('starts at day 1 without claim while there is no state', () => {
    const { result } = renderHook(() => UseDailyLogin(true));

    expect(result.current.CanClaimToday).toBe(false);
    expect(result.current.CurrentDay).toBe(1);
    expect(result.current.ClaimedDays).toBe(0);
    expect(result.current.Error).toBeNull();
    expect(result.current.LastReward).toBeNull();
  });

  it('derives the progress from the daily state', () => {
    SetSWRResult({
      data: {
        FirstLoginToday: true,
        DailyStreak: 2,
        Reward: 0,
        ChipBalance: 50,
        LastLoginDate: '2026-03-09',
        SequenceDay: 3,
      },
    });

    const { result } = renderHook(() => UseDailyLogin(true));

    expect(result.current.CanClaimToday).toBe(true);
    expect(result.current.CurrentDay).toBe(3);
    expect(result.current.CurrentDayIndex).toBe(2);
    expect(result.current.ClaimedDays).toBe(2);
  });

  it('reports loading and errors from SWR', () => {
    SetSWRResult({ isLoading: true, error: new Error('Profile failed') });

    const { result } = renderHook(() => UseDailyLogin(true));

    expect(result.current.IsLoading).toBe(true);
    expect(result.current.Error).toBe('Profile failed');
  });

  it('claims the reward and updates the cache', async () => {
    MockApiPost.mockResolvedValue({
      data: { DailyStreak: 3, Reward: 100, ChipBalance: 500 },
    });

    const { result } = renderHook(() => UseDailyLogin(true));

    let Claimed: unknown;
    await act(async () => {
      Claimed = await result.current.ClaimDailyReward();
    });

    const Expected = {
      FirstLoginToday: false,
      DailyStreak: 3,
      Reward: 100,
      ChipBalance: 500,
      LastLoginDate: '2026-03-10',
      SequenceDay: 3,
    };

    expect(MockApiPost).toHaveBeenCalledWith('/user/daily-login');
    expect(Claimed).toEqual(Expected);
    expect(MockMutate).toHaveBeenCalledWith(Expected, false);
    expect(result.current.LastReward).toBe(100);
    expect(result.current.CanClaimToday).toBe(false);
    expect(result.current.IsLoading).toBe(false);
  });

  it('reads camelCase fields from the claim response', async () => {
    MockApiPost.mockResolvedValue({
      data: { dailyStreak: 2, reward: 20, chipBalance: 80 },
    });

    const { result } = renderHook(() => UseDailyLogin(true));

    let Claimed: unknown;
    await act(async () => {
      Claimed = await result.current.ClaimDailyReward();
    });

    expect(Claimed).toMatchObject({
      DailyStreak: 2,
      Reward: 20,
      ChipBalance: 80,
    });
  });

  it('keeps the cached balance when the claim omits it', async () => {
    SetSWRResult({
      data: {
        FirstLoginToday: true,
        DailyStreak: 0,
        Reward: 0,
        ChipBalance: 300,
        LastLoginDate: null,
        SequenceDay: 1,
      },
    });
    MockApiPost.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => UseDailyLogin(true));

    let Claimed: unknown;
    await act(async () => {
      Claimed = await result.current.ClaimDailyReward();
    });

    expect(Claimed).toMatchObject({
      DailyStreak: 1,
      Reward: 0,
      ChipBalance: 300,
    });
  });

  it('uses zero balance when neither claim nor cache has it', async () => {
    MockApiPost.mockResolvedValue({ data: { DailyStreak: 1 } });

    const { result } = renderHook(() => UseDailyLogin(true));

    let Claimed: unknown;
    await act(async () => {
      Claimed = await result.current.ClaimDailyReward();
    });

    expect(Claimed).toMatchObject({ ChipBalance: 0 });
  });

  it('caps the claimed streak at 7 days', async () => {
    MockApiPost.mockResolvedValue({ data: { DailyStreak: 15, Reward: 1 } });

    const { result } = renderHook(() => UseDailyLogin(true));

    let Claimed: unknown;
    await act(async () => {
      Claimed = await result.current.ClaimDailyReward();
    });

    expect(Claimed).toMatchObject({ DailyStreak: 7, SequenceDay: 7 });
  });

  it('returns null and exposes the message when the claim fails', async () => {
    MockApiPost.mockRejectedValue(new Error('Already claimed'));

    const { result } = renderHook(() => UseDailyLogin(true));

    let Claimed: unknown;
    await act(async () => {
      Claimed = await result.current.ClaimDailyReward();
    });

    expect(Claimed).toBeNull();
    expect(result.current.Error).toBe('Already claimed');
    expect(result.current.IsLoading).toBe(false);
    expect(MockMutate).not.toHaveBeenCalled();
  });

  it('uses a default message when the error has none', async () => {
    MockApiPost.mockRejectedValue({});

    const { result } = renderHook(() => UseDailyLogin(true));

    await act(async () => {
      await result.current.ClaimDailyReward();
    });

    expect(result.current.Error).toBe('Erro ao resgatar bonus diario');
  });

  it('ignores a new claim while one is in progress', async () => {
    let ResolvePost: (Value: { data: unknown }) => void = () => undefined;
    MockApiPost.mockReturnValue(
      new Promise((Resolve) => {
        ResolvePost = Resolve;
      })
    );

    const { result } = renderHook(() => UseDailyLogin(true));

    let FirstClaim: Promise<unknown> = Promise.resolve();
    act(() => {
      FirstClaim = result.current.ClaimDailyReward();
    });

    expect(result.current.IsLoading).toBe(true);

    let SecondClaim: unknown;
    await act(async () => {
      SecondClaim = await result.current.ClaimDailyReward();
    });

    expect(SecondClaim).toBeNull();
    expect(MockApiPost).toHaveBeenCalledTimes(1);

    await act(async () => {
      ResolvePost({ data: { DailyStreak: 1, Reward: 10 } });
      await FirstClaim;
    });

    expect(result.current.IsLoading).toBe(false);
    expect(result.current.LastReward).toBe(10);
  });

  it('drops the local override once the cached state is available', async () => {
    SetSWRResult({
      data: {
        FirstLoginToday: true,
        DailyStreak: 0,
        Reward: 0,
        ChipBalance: 0,
        LastLoginDate: null,
        SequenceDay: 1,
      },
    });
    MockApiPost.mockResolvedValue({ data: { DailyStreak: 1, Reward: 5 } });

    const { result } = renderHook(() => UseDailyLogin(true));

    await act(async () => {
      await result.current.ClaimDailyReward();
    });

    expect(result.current.CanClaimToday).toBe(true);
    expect(result.current.LastReward).toBe(5);
  });
});
