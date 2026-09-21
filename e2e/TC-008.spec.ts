import { test, expect } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';

test.describe('TC-008 - Unhappy Path', () => {
  test('shows the inactive-account message when login is rejected', async ({
    page,
  }, TestInfo) => {
    const InactiveEmail = `inactive-e2e-${Date.now()}@example.com`;

    await page.route('**/auth/check-email**', (route) =>
      route.fulfill({ json: { taken: true } })
    );
    await page.route('**/auth/login', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'User is not active',
          error: 'Unauthorized',
          statusCode: 401,
        }),
      })
    );

    await page.goto('/login');
    await expect(page.getByPlaceholder('Digite seu e-mail')).toBeVisible();
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await CaptureScreenshot(page, TestInfo, '01-inactive-account-email');

    await page.getByPlaceholder('Digite seu e-mail').fill(InactiveEmail);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(
      page.getByRole('heading', { name: 'Digite sua senha' })
    ).toBeVisible();
    await expect(page.locator('.auth-panel')).toHaveCSS('opacity', '1');
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await CaptureScreenshot(page, TestInfo, '02-inactive-account-password');

    await page.getByPlaceholder('Senha', { exact: true }).fill('senha-e2e');
    await page.getByRole('button', { name: 'Entrar' }).click();

    const InactiveMessage = page.getByText(
      'NÃO É MAIS POSSÍVEL ACESSAR UMA CONTA COM O E-MAIL INFORMADO.',
      { exact: false }
    );
    await expect(InactiveMessage).toBeVisible();
    await expect(
      page.getByText('CRIE UMA NOVA CONTA COM OUTRO E-MAIL.', { exact: false })
    ).toBeVisible();
    await expect(page).toHaveURL('/login');
    await expect(page.locator('.auth-panel')).toHaveCSS('opacity', '1');
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await CaptureScreenshot(page, TestInfo, '03-inactive-account-message');
  });
});
