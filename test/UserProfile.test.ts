import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { useUserProfile } from '../src/application/hooks/useUserProfile';

type ApiGetMock = (url: string) => Promise<{ data: unknown }>;

const MockApiGet = jest.fn<ApiGetMock>();

jest.mock('@infrastructure/http/client', () => ({
  apiClient: {
    get: (url: string) => MockApiGet(url),
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

const MockUseSWR = useSWR as unknown as jest.MockedFunction<MockSWRHook>;

const SetSWRResult = ({
  data,
  error,
  isLoading = false,
  mutate = jest.fn(),
}: {
  data?: unknown;
  error?: Error;
  isLoading?: boolean;
  mutate?: unknown;
} = {}) => {
  MockUseSWR.mockReturnValue({ data, error, isLoading, mutate });
};

const CaptureFetcher = () => {
  let CapturedFetcher: ((url: string) => Promise<unknown>) | undefined;

  MockUseSWR.mockImplementation((...Args: unknown[]) => {
    CapturedFetcher = Args[1] as (url: string) => Promise<unknown>;
    return {
      data: undefined,
      error: undefined,
      isLoading: false,
      mutate: jest.fn(),
    };
  });

  return () => CapturedFetcher!;
};

describe('useUserProfile', () => {
  beforeEach(() => {
    MockApiGet.mockReset();
    MockUseSWR.mockReset();
    SetSWRResult();
  });

  it('uses the profile endpoint as cache key when enabled', () => {
    renderHook(() => useUserProfile(true));

    expect(MockUseSWR).toHaveBeenCalledWith(
      '/user/profile',
      expect.any(Function),
      expect.objectContaining({ revalidateOnFocus: false })
    );
  });

  it('is enabled by default', () => {
    renderHook(() => useUserProfile());

    expect(MockUseSWR.mock.calls[0][0]).toBe('/user/profile');
  });

  it('passes null to SWR when disabled', () => {
    renderHook(() => useUserProfile(false));

    expect(MockUseSWR.mock.calls[0][0]).toBeNull();
  });

  it('exposes user and nickname', () => {
    const User = { Nickname: 'Player1', UserType: 'User' };
    SetSWRResult({ data: User });

    const { result } = renderHook(() => useUserProfile(true));

    expect(result.current.user).toEqual(User);
    expect(result.current.nickname).toBe('Player1');
    expect(result.current.isAdmin).toBe(false);
  });

  it('flags admin users', () => {
    SetSWRResult({ data: { Nickname: 'Boss', UserType: 'Admin' } });

    const { result } = renderHook(() => useUserProfile(true));

    expect(result.current.isAdmin).toBe(true);
  });

  it('is not admin while there is no data', () => {
    SetSWRResult({ isLoading: true });

    const { result } = renderHook(() => useUserProfile(true));

    expect(result.current.user).toBeUndefined();
    expect(result.current.nickname).toBeUndefined();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it('exposes error and mutate from SWR', () => {
    const FakeError = new Error('Unauthorized');
    const MockMutate = jest.fn();
    SetSWRResult({ error: FakeError, mutate: MockMutate });

    const { result } = renderHook(() => useUserProfile(true));

    expect(result.current.error).toBe(FakeError);
    expect(result.current.mutate).toBe(MockMutate);
  });

  it('fetcher unwraps the User field of the response', async () => {
    MockApiGet.mockResolvedValue({
      data: { User: { Nickname: 'Wrapped', ChipBalance: 10 } },
    });

    const GetFetcher = CaptureFetcher();
    renderHook(() => useUserProfile(true));
    const Result = await GetFetcher()('/user/profile');

    expect(MockApiGet).toHaveBeenCalledWith('/user/profile');
    expect(Result).toEqual({ Nickname: 'Wrapped', ChipBalance: 10 });
  });

  it('fetcher returns the body itself when there is no User field', async () => {
    MockApiGet.mockResolvedValue({ data: { Nickname: 'Flat' } });

    const GetFetcher = CaptureFetcher();
    renderHook(() => useUserProfile(true));
    const Result = await GetFetcher()('/user/profile');

    expect(Result).toEqual({ Nickname: 'Flat' });
  });
});
