import { test, expect } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';

const AdminEmail = process.env.E2E_ADMIN_EMAIL;
const AdminPassword = process.env.E2E_ADMIN_PASSWORD;

test.describe('TC-005 - Happy Path', () => {
  test.skip(
    !AdminEmail || !AdminPassword,
    'Configure E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD with a seeded admin account.'
  );

  test('administrator creates and edits a Gambit table', async ({
    page,
  }, TestInfo) => {
    test.setTimeout(60_000);
    const TableName = `e2e-gmb-${Date.now()}`;
    const MinimumChips = '500';
    const CardPrice = '100';
    const TableMultiplier = '2';
    const MinimumCards = '1';
    const MaximumCards = '10';
    const EditedTableName = `${TableName}-edited`;
    const EditedMinimumChips = '750';
    const EditedCardPrice = '150';
    const EditedTableMultiplier = '3';
    const EditedMinimumCards = '2';
    const EditedMaximumCards = '12';
    await page.goto('/login');
    await CaptureScreenshot(page, TestInfo, '01-admin-login-page');
    await page.getByPlaceholder('Digite seu e-mail').fill(AdminEmail!);
    await CaptureScreenshot(page, TestInfo, '02-admin-email-filled');

    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(
      page.getByRole('heading', { name: 'Digite sua senha' })
    ).toBeVisible();
    await CaptureScreenshot(page, TestInfo, '03-admin-password-page');

    await page.getByPlaceholder('Senha').fill(AdminPassword!);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('user-menu-toggle')).toBeVisible();
    await CaptureScreenshot(page, TestInfo, '04-admin-home');

    await page.goto('/gambit-tables');
    await expect(
      page.getByRole('heading', { name: 'Escolha sua mesa' })
    ).toBeVisible();
    await page.getByRole('button', { name: '+ Criar Mesa' }).click();
    await expect(
      page.getByRole('heading', { name: 'Criar Mesa' })
    ).toBeVisible();
    await CaptureScreenshot(page, TestInfo, '05-create-gambit-table-modal');

    await page.getByPlaceholder('Nome da mesa').fill(TableName);
    await page.getByPlaceholder('Fichas mínimas').fill(MinimumChips);
    await page.getByPlaceholder('Preço por carta').fill(CardPrice);
    await page.getByPlaceholder('Multiplicador da mesa').fill(TableMultiplier);
    await page.getByPlaceholder('Mínimo de cartas').fill(MinimumCards);
    await page.getByPlaceholder('Máximo de cartas').fill(MaximumCards);
    await CaptureScreenshot(page, TestInfo, '06-create-gambit-table-filled');

    await page.getByRole('button', { name: 'Criar', exact: true }).click();

    await expect(page.getByText('Mesa criada com sucesso!')).toBeVisible();
    await CaptureScreenshot(page, TestInfo, '07-gambit-table-created-success');
    await page.getByRole('button', { name: 'OK' }).click();

    await expect(
      page.getByRole('heading', { name: TableName, exact: true })
    ).toBeVisible();
    await CaptureScreenshot(page, TestInfo, '08-gambit-table-in-list');

    const CreatedTableCard = page
      .getByRole('heading', { name: TableName, exact: true })
      .locator('..');

    await CreatedTableCard.getByRole('button', { name: 'Editar' }).click();
    const EditTableModal = page
      .getByRole('heading', { name: 'Editar Mesa' })
      .locator('..');
    await expect(EditTableModal).toBeVisible();
    await CaptureScreenshot(page, TestInfo, '09-edit-gambit-table-modal');

    const EditTableInputs = EditTableModal.locator('input');
    await EditTableInputs.nth(0).fill(EditedTableName);
    await EditTableInputs.nth(1).fill(EditedMinimumChips);
    await EditTableInputs.nth(2).fill(EditedCardPrice);
    await EditTableInputs.nth(3).fill(EditedTableMultiplier);
    await EditTableInputs.nth(4).fill(EditedMinimumCards);
    await EditTableInputs.nth(5).fill(EditedMaximumCards);
    await CaptureScreenshot(page, TestInfo, '10-edit-gambit-table-filled');

    await EditTableModal.getByRole('button', { name: 'Salvar' }).click();

    await expect(page.getByText('Mesa atualizada com sucesso!')).toBeVisible();
    await CaptureScreenshot(page, TestInfo, '11-gambit-table-updated-success');
    await page.getByRole('button', { name: 'OK' }).click();
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Escolha sua mesa' })
    ).toBeVisible();

    const UpdatedTableCard = page
      .getByRole('heading', { name: EditedTableName, exact: true })
      .locator('..');
    await expect(UpdatedTableCard).toBeVisible();
    await expect(
      UpdatedTableCard.getByText(EditedCardPrice, { exact: true })
    ).toBeVisible();
    await expect(
      UpdatedTableCard.getByText(`${EditedTableMultiplier}×`, { exact: true })
    ).toBeVisible();
    await expect(
      UpdatedTableCard.getByText(
        `${EditedMinimumCards} – ${EditedMaximumCards}`,
        { exact: true }
      )
    ).toBeVisible();
    await expect(
      UpdatedTableCard.getByText(EditedMinimumChips, { exact: true })
    ).toBeVisible();
    await CaptureScreenshot(page, TestInfo, '12-gambit-table-edited-in-list');

    await UpdatedTableCard.getByRole('button', { name: 'Editar' }).click();
    await page.getByRole('button', { name: 'Desativar' }).click();
    await expect(page.getByText('Mesa desativada com sucesso!')).toBeVisible();
    await page.getByRole('button', { name: 'OK' }).click();

    await page
      .getByRole('heading', { name: EditedTableName, exact: true })
      .locator('..')
      .getByRole('button', { name: 'Editar' })
      .click();
    await page.getByRole('button', { name: 'Excluir' }).click();
    await expect(page.getByText('Mesa removida com sucesso.')).toBeVisible();
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(
      page.getByRole('heading', { name: EditedTableName, exact: true })
    ).toHaveCount(0);
  });
});
