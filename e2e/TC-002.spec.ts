import { test, expect, type Page } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';

test.describe('TC-002 - Unhappy Path', () => {
  const OpenSignupForm = async (page: Page, Email: string) => {
    await page.route('**/auth/check-email**', (route) =>
      route.fulfill({ json: { taken: false } })
    );
    await page.goto('/login');
    await page.getByPlaceholder('Digite seu e-mail').fill(Email);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(
      page.getByRole('heading', { name: 'Criar conta' })
    ).toBeVisible();
  };

  const FillSignupFields = async (
    page: Page,
    Email: string,
    Password: string,
    ConfirmPassword: string
  ) => {
    await page.getByPlaceholder('Nome').fill('E2E User');
    await page.getByPlaceholder('Nickname').fill(`e2e-${Date.now()}`);
    await page.getByPlaceholder('DD/MM/AAAA').fill('01/01/2001');
    await page.getByPlaceholder('E-mail').fill(Email);
    await page.getByPlaceholder('Senha', { exact: true }).fill(Password);
    await page.getByPlaceholder('Confirmar senha').fill(ConfirmPassword);
  };

  const WaitForErrorToast = async (page: Page, Message: string) => {
    const ErrorMessage = page.getByText(Message, { exact: false });

    await expect(ErrorMessage).toBeVisible();
    await expect(ErrorMessage.locator('..')).toHaveCSS('opacity', '1');
  };

  test('rejects short and mismatched passwords during registration', async ({
    page,
  }, TestInfo) => {
    const ShortPasswordEmail = `e2e-short-password-${Date.now()}@example.com`;
    await OpenSignupForm(page, ShortPasswordEmail);
    await FillSignupFields(page, ShortPasswordEmail, 'short', 'short');
    await CaptureScreenshot(page, TestInfo, '01-short-password-filled');

    await page.getByRole('button', { name: 'Criar conta' }).click();
    await WaitForErrorToast(page, 'A SENHA DEVE TER PELO MENOS 8 CARACTERES.');
    await CaptureScreenshot(page, TestInfo, '02-short-password-error');

    const MismatchedPasswordEmail = `e2e-mismatched-password-${Date.now()}@example.com`;
    await OpenSignupForm(page, MismatchedPasswordEmail);
    await FillSignupFields(
      page,
      MismatchedPasswordEmail,
      'e2e-password-123',
      'e2e-password-456'
    );

    await page.getByRole('button', { name: 'Mostrar senha' }).click();
    await page
      .getByRole('button', { name: 'Mostrar confirmação de senha' })
      .click();
    await expect(
      page.getByPlaceholder('Senha', { exact: true })
    ).toHaveAttribute('type', 'text');
    await expect(page.getByPlaceholder('Confirmar senha')).toHaveAttribute(
      'type',
      'text'
    );
    await CaptureScreenshot(page, TestInfo, '03-mismatched-password-filled');

    await page.getByRole('button', { name: 'Criar conta' }).click();
    await WaitForErrorToast(page, 'AS SENHAS NÃO COINCIDEM.');
    await CaptureScreenshot(page, TestInfo, '04-mismatched-password-error');
  });
});
