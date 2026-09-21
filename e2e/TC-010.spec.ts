import { test, expect, type Page } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';
import { CreateAccount } from './helpers/CreateAccount';

test.describe('TC-010 - Happy Path', () => {
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

  const OpenEditProfile = async (page: Page) => {
    await page.getByTestId('user-menu-toggle').click();
    await expect(page.getByTestId('user-menu')).toBeVisible();
    await page.getByRole('menuitem', { name: 'Editar perfil' }).click();

    const EditProfileModal = page
      .getByRole('heading', { name: 'Editar perfil' })
      .locator('..');
    await expect(EditProfileModal).toBeVisible();
    await expect(EditProfileModal).toHaveCSS('opacity', '1');
    return EditProfileModal;
  };

  test('user edits name and birth date with the current password', async ({
    page,
  }, TestInfo) => {
    await PreventDailyBonusModal(page);
    const Account = await CreateAccount(page);
    const UpdatedName = `Updated E2E ${Date.now()}`;
    const UpdatedBirthDate = '02/02/2002';

    const EditProfileModal = await OpenEditProfile(page);
    await CaptureScreenshot(page, TestInfo, '01-edit-profile-modal');

    await EditProfileModal.getByPlaceholder('Nome').fill(UpdatedName);
    await EditProfileModal.getByPlaceholder('DD/MM/AAAA').fill(
      UpdatedBirthDate
    );
    await EditProfileModal.getByPlaceholder('Senha atual').fill(
      Account.Password
    );
    await CaptureScreenshot(page, TestInfo, '02-edit-profile-filled');

    await EditProfileModal.getByRole('button', {
      name: 'Salvar alteracoes',
    }).click();

    const SuccessMessage = page.getByText('PERFIL ATUALIZADO COM SUCESSO!', {
      exact: true,
    });
    await expect(SuccessMessage).toBeVisible();
    await expect(SuccessMessage).toHaveCSS('opacity', '1');
    await CaptureScreenshot(page, TestInfo, '03-profile-updated-success');

    await expect(
      page.getByRole('heading', { name: 'Editar perfil' })
    ).toBeHidden({ timeout: 5000 });
    await CaptureScreenshot(page, TestInfo, '04-profile-modal-closed');

    const ReopenedProfileModal = await OpenEditProfile(page);
    await expect(ReopenedProfileModal.getByPlaceholder('Nome')).toHaveValue(
      UpdatedName
    );
    await expect(
      ReopenedProfileModal.getByPlaceholder('DD/MM/AAAA')
    ).toHaveValue(UpdatedBirthDate);
    await CaptureScreenshot(page, TestInfo, '05-reopened-profile-updated');

    await ReopenedProfileModal.getByRole('button', {
      name: 'Fechar',
    }).click();
    await expect(
      page.getByRole('heading', { name: 'Editar perfil' })
    ).toBeHidden();
  });
});
