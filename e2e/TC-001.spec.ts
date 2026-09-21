import { test, expect } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';

test.describe('TC-001 - Happy Path', () => {
  test('creates an account and logs in with the same account', async ({
    page,
  }, TestInfo) => {
    const Email = `e2e-${Date.now()}@example.com`;
    const Password = 'e2e-password-123';
    const Nickname = `e2e-${Date.now()}`;
    await page.goto('/login');
    await CaptureScreenshot(page, TestInfo, '01-login-page');
    await page.getByPlaceholder('Digite seu e-mail').fill(Email);
    await CaptureScreenshot(page, TestInfo, '02-email-filled');

    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(
      page.getByRole('heading', { name: 'Criar conta' })
    ).toBeVisible();
    await CaptureScreenshot(page, TestInfo, '03-signup-form');

    await page.getByPlaceholder('Nome').fill('E2E User');
    await page.getByPlaceholder('Nickname').fill(Nickname);
    await page.getByPlaceholder('DD/MM/AAAA').fill('01/01/2001');
    await page.getByPlaceholder('E-mail').fill(Email);
    await page.getByPlaceholder('Senha', { exact: true }).fill(Password);
    await page.getByPlaceholder('Confirmar senha').fill(Password);
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await CaptureScreenshot(page, TestInfo, '04-signup-filled');

    await expect(
      page.getByRole('heading', { name: 'Digite sua senha' })
    ).toBeVisible();
    await CaptureScreenshot(page, TestInfo, '05-post-registration-login');

    await page.getByPlaceholder('Senha').fill(Password);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('user-menu-toggle')).toBeVisible();
    await expect(page.getByText(Nickname, { exact: true })).toBeVisible();
    await CaptureScreenshot(page, TestInfo, '06-authenticated-home');
  });
});
