import { test, expect, type Page } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';

const AdminEmail = process.env.E2E_ADMIN_EMAIL;
const AdminPassword = process.env.E2E_ADMIN_PASSWORD;

test.describe('TC-006 - Unhappy Path', () => {
  test.skip(
    !AdminEmail || !AdminPassword,
    'Configure E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD with a seeded admin account.'
  );

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
  };

  const MockUserChips = async (page: Page) => {
    await page.route('**/user/chips', (route) =>
      route.fulfill({ json: { chips: 1000 } })
    );
  };

  const ExpectWarningModalReady = async (page: Page) => {
    const WarningHeading = page.getByRole('heading', {
      name: 'Jogo em andamento!',
    });
    await expect(WarningHeading).toBeVisible();
    await expect(WarningHeading.locator('..')).toHaveCSS('opacity', '1');
  };

  test('blocks navigation to another Gambit table when a session is active', async ({
    page,
  }, TestInfo) => {
    await MockUserChips(page);
    await page.route('**/gambit-table', (route) =>
      route.fulfill({
        json: [
          {
            GambitTableId: 1,
            Name: 'Gambit atual',
            Active: true,
            MinimumChipsRequired: 100,
            CardPrice: 10,
            TableMultiplier: 2,
            MinimumCardsPurchased: 1,
            MaxCardsPurchased: 10,
          },
          {
            GambitTableId: 2,
            Name: 'Gambit destino',
            Active: true,
            MinimumChipsRequired: 100,
            CardPrice: 10,
            TableMultiplier: 2,
            MinimumCardsPurchased: 1,
            MaxCardsPurchased: 10,
          },
        ],
      })
    );
    await page.route('**/gambit/sessions/active', (route) =>
      route.fulfill({ json: { GambitTableId: 1 } })
    );

    await LoginAsAdmin(page);
    await page.goto('/gambit-tables');
    await page.getByRole('heading', { name: 'Escolha sua mesa' }).waitFor();
    await CaptureScreenshot(page, TestInfo, '01-gambit-tables');
    await page.getByRole('heading', { name: 'Gambit destino' }).click();

    await ExpectWarningModalReady(page);
    await expect(
      page.getByText('Gambit atual', { exact: true }).last()
    ).toBeVisible();
    await expect(page).toHaveURL('/gambit-tables');
    await CaptureScreenshot(page, TestInfo, '02-gambit-session-warning');
  });

  test('blocks navigation to another Slot Machine table when a session is active', async ({
    page,
  }, TestInfo) => {
    await MockUserChips(page);
    await page.route('**/slot/machine', (route) =>
      route.fulfill({
        json: [
          {
            SlotMachineId: 1,
            Name: 'Slot atual',
            Active: true,
            MinimumChipsRequired: 100,
            MinimumSpinValue: 10,
            MinimumRerollValue: 5,
          },
          {
            SlotMachineId: 2,
            Name: 'Slot destino',
            Active: true,
            MinimumChipsRequired: 100,
            MinimumSpinValue: 10,
            MinimumRerollValue: 5,
          },
        ],
      })
    );
    await page.route('**/sessions/active', (route) =>
      route.fulfill({ json: { SlotMachineId: 1, Status: 'InProgress' } })
    );

    await LoginAsAdmin(page);
    await page.goto('/slotmachine-tables');
    await page.getByRole('heading', { name: 'Escolha sua mesa' }).waitFor();
    await CaptureScreenshot(page, TestInfo, '01-slot-tables');
    await page.getByRole('heading', { name: 'Slot destino' }).click();

    await ExpectWarningModalReady(page);
    await expect(
      page.getByText('Slot atual', { exact: true }).last()
    ).toBeVisible();
    await expect(page).toHaveURL('/slotmachine-tables');
    await CaptureScreenshot(page, TestInfo, '02-slot-session-warning');
  });
});
