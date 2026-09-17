import { test, expect } from '@playwright/test';

test.describe('Setup smoke', () => {
  test('renders the login identify step', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByPlaceholder('Digite seu e-mail')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible();
  });

  test('shows a validation toast for a malformed email', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('Digite seu e-mail').fill('not-an-email');
    await page.getByRole('button', { name: 'Continuar' }).click();

    await expect(
      page.getByText('POR FAVOR, INSIRA UM EMAIL VÁLIDO')
    ).toBeVisible();
  });
});
