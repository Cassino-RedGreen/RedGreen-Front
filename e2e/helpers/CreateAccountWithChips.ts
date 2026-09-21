import { expect, type APIRequestContext } from '@playwright/test';

const ApiBaseUrl = process.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export type ApiAccount = {
  Email: string;
  Password: string;
  Nickname: string;
  Token: string;
};

export const CreateAccountWithChips = async (
  Request: APIRequestContext,
  ChipBalance: number
): Promise<ApiAccount> => {
  const Unique = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const Email = `e2e-${Unique}@example.com`;
  const Password = 'e2e-password-123';
  const Nickname = `e2e-${Unique}`;

  const RegisterResponse = await Request.post(`${ApiBaseUrl}/auth/register`, {
    data: {
      Name: 'E2E User',
      BirthDate: '2001-01-01',
      Nickname,
      Email,
      Password,
      ChipBalance,
      DailyLoginStreak: 0,
      Active: true,
      UserType: 'User',
    },
  });
  expect(RegisterResponse.ok()).toBe(true);

  const LoginResponse = await Request.post(`${ApiBaseUrl}/auth/login`, {
    data: { Email, Password },
  });
  expect(LoginResponse.ok()).toBe(true);
  const { Token } = (await LoginResponse.json()) as { Token: string };

  return { Email, Password, Nickname, Token };
};
