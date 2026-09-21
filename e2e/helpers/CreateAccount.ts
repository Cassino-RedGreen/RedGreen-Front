import { expect, type Page } from '@playwright/test';

export type Account = {
  Email: string;
  Password: string;
  Nickname: string;
};

export const CreateAccount = async (Page: Page): Promise<Account> => {
  const Timestamp = Date.now();
  const Account: Account = {
    Email: `e2e-${Timestamp}@example.com`,
    Password: 'e2e-password-123',
    Nickname: `e2e-${Timestamp}`,
  };

  await Page.goto('/login');
  await Page.getByPlaceholder('Digite seu e-mail').fill(Account.Email);
  await Page.getByRole('button', { name: 'Continuar' }).click();
  await expect(
    Page.getByRole('heading', { name: 'Criar conta' })
  ).toBeVisible();

  await Page.getByPlaceholder('Nome').fill('E2E User');
  await Page.getByPlaceholder('Nickname').fill(Account.Nickname);
  await Page.getByPlaceholder('DD/MM/AAAA').fill('01/01/2001');
  await Page.getByPlaceholder('E-mail').fill(Account.Email);
  await Page.getByPlaceholder('Senha', { exact: true }).fill(Account.Password);
  await Page.getByPlaceholder('Confirmar senha').fill(Account.Password);
  await Page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(
    Page.getByRole('heading', { name: 'Digite sua senha' })
  ).toBeVisible();

  await Page.getByPlaceholder('Senha', { exact: true }).fill(Account.Password);
  await Page.getByRole('button', { name: 'Entrar' }).click();
  await expect(Page).toHaveURL('/');
  await expect(Page.getByTestId('user-menu-toggle')).toBeVisible();

  return Account;
};
