import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { useUserChips } from '../src/application/hooks/useUserChips';

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

describe('useUserChips', () => {
  beforeEach(() => {
    MockApiGet.mockReset();
    MockUseSWR.mockReset();
    SetSWRResult();
  });

  it('uses the chips endpoint as cache key when enabled', () => {
    renderHook(() => useUserChips(true));

    expect(MockUseSWR).toHaveBeenCalledWith(
      '/user/chips',
      expect.any(Function),
      expect.objectContaining({ revalidateOnFocus: false })
    );
  });

  it('is enabled by default', () => {
    renderHook(() => useUserChips());

    expect(MockUseSWR.mock.calls[0][0]).toBe('/user/chips');
  });

  it('passes null to SWR when disabled', () => {
    renderHook(() => useUserChips(false));

    expect(MockUseSWR.mock.calls[0][0]).toBeNull();
  });

  it('returns chips from the chips field', () => {
    SetSWRResult({ data: { chips: 150 } });

    const { result } = renderHook(() => useUserChips(true));

    expect(result.current.chips).toBe(150);
  });

  it('falls back to ChipBalance when chips is missing', () => {
    SetSWRResult({ data: { ChipBalance: 320 } });

    const { result } = renderHook(() => useUserChips(true));

    expect(result.current.chips).toBe(320);
  });

  it('prefers chips over ChipBalance when both exist', () => {
    SetSWRResult({ data: { chips: 10, ChipBalance: 999 } });

    const { result } = renderHook(() => useUserChips(true));

    expect(result.current.chips).toBe(10);
  });

  it('returns undefined chips while there is no data', () => {
    SetSWRResult({ isLoading: true });

    const { result } = renderHook(() => useUserChips(true));

    expect(result.current.chips).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it('exposes error and mutate from SWR', () => {
    const FakeError = new Error('Network error');
    const MockMutate = jest.fn();
    SetSWRResult({ error: FakeError, mutate: MockMutate });

    const { result } = renderHook(() => useUserChips(true));

    expect(result.current.error).toBe(FakeError);
    expect(result.current.mutate).toBe(MockMutate);
  });

  it('fetcher returns the response body from the API', async () => {
    MockApiGet.mockResolvedValue({ data: { ChipBalance: 42 } });

    const GetFetcher = CaptureFetcher();
    renderHook(() => useUserChips(true));
    const Result = await GetFetcher()('/user/chips');

    expect(MockApiGet).toHaveBeenCalledWith('/user/chips');
    expect(Result).toEqual({ ChipBalance: 42 });
  });
});
