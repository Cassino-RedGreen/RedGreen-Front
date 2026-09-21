import { test, expect, type Page } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';

const AdminEmail = process.env.E2E_ADMIN_EMAIL;
const AdminPassword = process.env.E2E_ADMIN_PASSWORD;

test.describe('TC-007 - Unhappy Path', () => {
  test.skip(
    !AdminEmail || !AdminPassword,
    'Configure E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD with a seeded admin account.'
  );

  const WaitForStableVisualState = async (page: Page) => {
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
  };

  const WaitForAuthenticatedHome = async (page: Page) => {
    await expect(page.locator('header')).toHaveCSS('opacity', '1');
    await WaitForStableVisualState(page);
  };

  const WaitForLoginPanel = async (page: Page) => {
    await expect(page.locator('.auth-panel')).toHaveCSS('opacity', '1');
    await WaitForStableVisualState(page);
  };

  const LoginAsAdmin = async (page: Page) => {
    await page.goto('/login');
    await page.getByPlaceholder('Digite seu e-mail').fill(AdminEmail!);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(
      page.getByRole('heading', { name: 'Digite sua senha' })
    ).toBeVisible();
    await page.getByPlaceholder('Senha').fill(AdminPassword!);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('user-menu-toggle')).toBeVisible();
    await WaitForAuthenticatedHome(page);
  };

  const ExpectExpiredModalReady = async (page: Page) => {
    const ExpiredHeading = page.getByRole('heading', {
      name: 'Sessão Expirada',
    });
    await expect(ExpiredHeading).toBeVisible();
    await expect(ExpiredHeading.locator('..')).toHaveCSS('opacity', '1');
  };

  test('blocks interaction and redirects to login after session expiration', async ({
    page,
  }, TestInfo) => {
    await LoginAsAdmin(page);
    await CaptureScreenshot(page, TestInfo, '01-authenticated-home');

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('session-expired'));
    });

    await ExpectExpiredModalReady(page);
    await WaitForStableVisualState(page);
    await CaptureScreenshot(page, TestInfo, '02-session-expired-modal');

    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('user-menu-toggle')).toBeVisible();
    await expect(
      page.getByTestId('user-menu-toggle').click({ timeout: 1000 })
    ).rejects.toThrow();
    await expect(
      page.getByRole('heading', { name: 'Sessão Expirada' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Fazer Login' }).click();
    await expect(page).toHaveURL('/login');
    await expect(page.getByPlaceholder('Digite seu e-mail')).toBeVisible();
    await WaitForLoginPanel(page);
    await CaptureScreenshot(page, TestInfo, '03-login-after-expiration');
  });
});
