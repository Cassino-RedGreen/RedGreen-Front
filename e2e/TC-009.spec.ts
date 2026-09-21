import { test, expect, type Page } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';
import { CreateAccount, type Account } from './helpers/CreateAccount';

const AdminEmail = process.env.E2E_ADMIN_EMAIL;
const AdminPassword = process.env.E2E_ADMIN_PASSWORD;

test.describe('TC-009 - Happy Path', () => {
  test.skip(
    !AdminEmail || !AdminPassword,
    'Configure E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD with a seeded admin account.'
  );

  const PreventDailyBonusModal = async (page: Page) => {
    await page.route('**/user/profile', async (route) => {
      const Response = await route.fetch();
      const Data = (await Response.json()) as Record<string, unknown>;
      const Today = new Date().toISOString().slice(0, 10);

      if (Data.User && typeof Data.User === 'object') {
        Data.User = {
          ...(Data.User as Record<string, unknown>),
          LastLoginDate: Today,
        };
      } else {
        Data.LastLoginDate = Today;
      }

      await route.fulfill({ response: Response, json: Data });
    });
  };

  const LoginAsAdmin = async (page: Page) => {
    await page.goto('/login');
    await page.getByPlaceholder('Digite seu e-mail').fill(AdminEmail!);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(
      page.getByRole('heading', { name: 'Digite sua senha' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Digite sua senha' }).locator('..')
    ).toHaveCSS('opacity', '1');
    await page.getByPlaceholder('Senha', { exact: true }).fill(AdminPassword!);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('user-menu-toggle')).toBeVisible();
  };

  const CloseDailyBonusIfVisible = async (page: Page) => {
    const DailyBonusBackdrop = page.locator(
      'div.fixed.inset-0.z-50[class*="bg-black/60"]'
    );
    if (await DailyBonusBackdrop.isVisible().catch(() => false)) {
      await DailyBonusBackdrop.click({
        force: true,
        position: { x: 10, y: 10 },
      });
      await expect(DailyBonusBackdrop).toBeHidden();
    }
  };

  const Logout = async (page: Page) => {
    await CloseDailyBonusIfVisible(page);
    await page.getByTestId('user-menu-toggle').click();
    await expect(page.getByTestId('user-menu')).toBeVisible();
    await page.getByRole('menuitem', { name: 'Sair' }).click();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  };

  const WaitForSuccess = async (page: Page, Message: string) => {
    const SuccessMessage = page.getByText(Message, { exact: true });
    await expect(SuccessMessage).toBeVisible();
    await expect(SuccessMessage.locator('..')).toHaveCSS('opacity', '1');
  };

  const CloseSuccessModal = async (page: Page) => {
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.getByRole('button', { name: 'OK' })).toBeHidden();
  };

  const OpenTableEdit = async (page: Page, TableName: string) => {
    const TableCard = page
      .getByRole('heading', { name: TableName, exact: true })
      .locator('..');
    await TableCard.getByRole('button', { name: 'Editar' }).click();
    const EditModal = page
      .getByRole('heading', { name: 'Editar Mesa' })
      .locator('..');
    await expect(EditModal).toBeVisible();
    await expect(EditModal).toHaveCSS('opacity', '1');
    return EditModal;
  };

  const OpenSlotTables = async (page: Page) => {
    await page.goto('/slotmachine-tables');
    await expect(
      page.getByRole('heading', { name: 'Escolha sua mesa' })
    ).toBeVisible();
  };

  test('administrator deactivates a table and it stops appearing to a player', async ({
    page,
  }, TestInfo) => {
    test.setTimeout(120_000);
    const TableName = `e2e-lifecycle-${Date.now()}`;
    await PreventDailyBonusModal(page);
    await LoginAsAdmin(page);
    await OpenSlotTables(page);
    await page.getByRole('button', { name: '+ Criar Mesa' }).click();
    await expect(
      page.getByRole('heading', { name: 'Criar Mesa' })
    ).toBeVisible();
    await CaptureScreenshot(page, TestInfo, '01-create-table-modal');

    await page.getByPlaceholder('Nome da mesa').fill(TableName);
    await page.getByPlaceholder('Aposta mínima').fill('100');
    await page.getByPlaceholder('Fichas mínimas').fill('500');
    await page.getByPlaceholder('Valor do reroll').fill('50');
    await CaptureScreenshot(page, TestInfo, '02-create-table-filled');
    await page.getByRole('button', { name: 'Criar', exact: true }).click();

    await WaitForSuccess(page, 'Mesa criada com sucesso!');
    await CaptureScreenshot(page, TestInfo, '03-table-created-success');
    await CloseSuccessModal(page);
    await expect(
      page.getByRole('heading', { name: TableName, exact: true })
    ).toBeVisible();
    await page.goto('/');
    await Logout(page);

    const PlayerAccount: Account = await CreateAccount(page);

    await OpenSlotTables(page);
    await expect(
      page.getByRole('heading', { name: TableName, exact: true })
    ).toBeVisible();
    await CaptureScreenshot(page, TestInfo, '04-player-sees-active-table');
    await page.goto('/');
    await Logout(page);

    await LoginAsAdmin(page);
    await OpenSlotTables(page);
    const EditModal = await OpenTableEdit(page, TableName);
    await CaptureScreenshot(page, TestInfo, '05-admin-edit-table');
    await EditModal.getByRole('button', { name: 'Desativar' }).click();
    await WaitForSuccess(page, 'Mesa desativada com sucesso!');
    await CaptureScreenshot(page, TestInfo, '06-table-deactivated-success');
    await CloseSuccessModal(page);
    await page.goto('/');
    await Logout(page);

    await page.goto('/login');
    await page.getByPlaceholder('Digite seu e-mail').fill(PlayerAccount.Email);
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(
      page.getByRole('heading', { name: 'Digite sua senha' })
    ).toBeVisible();
    await page
      .getByPlaceholder('Senha', { exact: true })
      .fill(PlayerAccount.Password);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL('/');
    await OpenSlotTables(page);
    await expect(
      page.getByRole('heading', { name: TableName, exact: true })
    ).toHaveCount(0);
    await CaptureScreenshot(page, TestInfo, '07-player-no-longer-sees-table');
    await page.goto('/');
    await Logout(page);

    await LoginAsAdmin(page);
    await OpenSlotTables(page);
    const DeleteModal = await OpenTableEdit(page, TableName);
    await DeleteModal.getByRole('button', { name: 'Excluir' }).click();
    await WaitForSuccess(page, 'Mesa removida com sucesso.');
    await CaptureScreenshot(page, TestInfo, '08-table-deleted-success');
    await CloseSuccessModal(page);
  });
});
