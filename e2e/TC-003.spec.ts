import { test, expect, type Page } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';

test.describe('TC-003 - Unhappy Path', () => {
  const Password = 'e2e-password-123';
  const IncorrectPassword = 'wrong-password-123';

  const WaitForLoginForm = async (page: Page) => {
    const LoginHeading = page.getByRole('heading', {
      name: 'Digite sua senha',
    });

    await expect(LoginHeading).toBeVisible();
    await expect(LoginHeading.locator('..')).toHaveCSS('opacity', '1');
  };

  const WaitForErrorToast = async (page: Page, Message: string) => {
    const ErrorMessage = page.getByText(Message, { exact: false });

    await expect(ErrorMessage).toBeVisible();
    await expect(ErrorMessage.locator('..')).toHaveCSS('opacity', '1');
  };

  test('recognizes a registered email and rejects an incorrect password', async ({
    page,
  }, TestInfo) => {
    await page.route('**/auth/check-email**', (route) =>
      route.fulfill({ json: { taken: false } })
    );
    await page.route('**/auth/login', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid password' }),
      })
    );

    const Email = `e2e-incorrect-password-${Date.now()}@example.com`;
    const Nickname = `e2e-${Date.now()}`;

    await page.goto('/login');
    await CaptureScreenshot(page, TestInfo, '01-login-page');
    await page.getByPlaceholder('Digite seu e-mail').fill(Email);
    await page.getByRole('button', { name: 'Continuar' }).click();

    await expect(
      page.getByRole('heading', { name: 'Criar conta' })
    ).toBeVisible();
    await CaptureScreenshot(page, TestInfo, '02-signup-form');

    await page.getByPlaceholder('Nome').fill('E2E User');
    await page.getByPlaceholder('Nickname').fill(Nickname);
    await page.getByPlaceholder('DD/MM/AAAA').fill('01/01/2001');
    await page.getByPlaceholder('E-mail').fill(Email);
    await page.getByPlaceholder('Senha', { exact: true }).fill(Password);
    await page.getByPlaceholder('Confirmar senha').fill(Password);
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
    await CaptureScreenshot(page, TestInfo, '03-signup-filled');
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await WaitForLoginForm(page);
    await CaptureScreenshot(page, TestInfo, '04-post-registration-login');

    await page.getByRole('button', { name: 'Ocultar senha' }).click();
    await page
      .getByPlaceholder('Senha', { exact: true })
      .fill(IncorrectPassword);
    await page.getByRole('button', { name: 'Mostrar senha' }).click();
    await expect(
      page.getByPlaceholder('Senha', { exact: true })
    ).toHaveAttribute('type', 'text');
    await CaptureScreenshot(page, TestInfo, '05-incorrect-password-filled');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await WaitForErrorToast(page, 'SENHA INVÁLIDA.');
    await CaptureScreenshot(page, TestInfo, '06-incorrect-password-error');
  });
});
