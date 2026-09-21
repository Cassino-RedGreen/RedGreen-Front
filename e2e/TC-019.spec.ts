import { test, expect } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';
import { CreateAccount } from './helpers/CreateAccount';
import { WaitForStableBox } from './helpers/WaitForStableBox';

test.use({ video: 'off' });

const BirthDate = '01/01/2001';
const NewPassword = 'e2e-new-password-456';
const ProfileUpdatedMessage = 'PERFIL ATUALIZADO COM SUCESSO!';
const InvalidPasswordMessage = 'SENHA INVÁLIDA.';

test.describe('TC-019 - Unhappy Path', () => {
  test('rejects the old password after the player changes it', async ({
    page,
    browser,
  }, TestInfo) => {
    test.setTimeout(300_000);

    const Account = await CreateAccount(page);
    const StorageState = await page.context().storageState();

    const { baseURL, viewport } = TestInfo.project.use;
    const RecordedContext = await browser.newContext({
      baseURL,
      viewport,
      storageState: StorageState,
      recordVideo: { dir: TestInfo.outputPath('video') },
    });
    const RecordedPage = await RecordedContext.newPage();
    const Video = RecordedPage.video();

    const Capture = (Name: string) =>
      CaptureScreenshot(RecordedPage, TestInfo, Name);
    const BonusTitle = RecordedPage.getByText('Bônus Diário', { exact: true });
    const CloseBonus = async () => {
      await expect(BonusTitle).toBeVisible();
      await RecordedPage.locator('button')
        .filter({ has: RecordedPage.locator('svg.lucide-x') })
        .click();
      await expect(BonusTitle).toBeHidden();
    };
    const UserMenuToggle = RecordedPage.getByTestId('user-menu-toggle');
    const UserMenu = RecordedPage.getByTestId('user-menu');
    const EditProfileTitle = RecordedPage.getByRole('heading', {
      name: 'Editar perfil',
    });
    const BirthDateField = RecordedPage.getByPlaceholder('DD/MM/AAAA');
    const NewPasswordField = RecordedPage.getByPlaceholder(
      'Nova senha (opcional)'
    );
    const ConfirmNewPasswordField = RecordedPage.getByPlaceholder(
      'Confirmar nova senha'
    );
    const CurrentPasswordField = RecordedPage.getByPlaceholder('Senha atual');
    const ProfileUpdatedToast = RecordedPage.getByText(ProfileUpdatedMessage, {
      exact: true,
    });
    const LoginButton = RecordedPage.getByRole('button', { name: 'Entrar' });
    const PasswordStepTitle = RecordedPage.getByRole('heading', {
      name: 'Digite sua senha',
    });
    const PasswordField = RecordedPage.getByPlaceholder('Senha', {
      exact: true,
    });
    const InvalidPasswordToast = RecordedPage.getByText(
      InvalidPasswordMessage,
      { exact: true }
    );

    try {
      await RecordedPage.goto('/');
      await expect(UserMenuToggle).toBeVisible();
      await expect(RecordedPage.getByText(Account.Nickname)).toBeVisible();
      await CloseBonus();
      await Capture('01-home');

      await UserMenuToggle.click();
      await expect(UserMenu).toBeVisible();
      await RecordedPage.getByRole('menuitem', {
        name: 'Editar perfil',
      }).click();
      await expect(EditProfileTitle).toBeVisible();
      await expect(BirthDateField).toHaveValue(BirthDate);

      await NewPasswordField.fill(NewPassword);
      await ConfirmNewPasswordField.fill(NewPassword);
      await CurrentPasswordField.fill(Account.Password);
      await WaitForStableBox(EditProfileTitle);
      await Capture('02-new-password-filled');

      const UpdateResponsePromise = RecordedPage.waitForResponse(
        (Candidate) =>
          Candidate.url().endsWith('/user') &&
          Candidate.request().method() === 'PATCH'
      );
      await RecordedPage.getByRole('button', {
        name: 'Salvar alteracoes',
      }).click();
      const UpdateResponse = await UpdateResponsePromise;
      expect(UpdateResponse.ok()).toBe(true);
      await expect(ProfileUpdatedToast).toHaveCSS('opacity', '1');
      await Capture('03-profile-updated');
      await expect(EditProfileTitle).toBeHidden({ timeout: 5_000 });

      await UserMenuToggle.click();
      await expect(UserMenu).toBeVisible();
      await RecordedPage.getByRole('menuitem', { name: 'Sair' }).click();
      await expect(LoginButton).toBeVisible();
      await expect(UserMenuToggle).toHaveCount(0);
      await Capture('04-visitor-home-after-logout');

      await LoginButton.click();
      await expect(RecordedPage).toHaveURL('/login');
      await RecordedPage.getByPlaceholder('Digite seu e-mail').fill(
        Account.Email
      );
      await RecordedPage.getByRole('button', { name: 'Continuar' }).click();
      await expect(PasswordStepTitle).toBeVisible();
      await PasswordField.fill(Account.Password);
      await WaitForStableBox(PasswordStepTitle);
      await Capture('05-old-password-filled');

      const OldPasswordLoginPromise = RecordedPage.waitForResponse(
        (Candidate) =>
          Candidate.url().endsWith('/auth/login') &&
          Candidate.request().method() === 'POST'
      );
      await LoginButton.click();
      const OldPasswordLogin = await OldPasswordLoginPromise;
      expect(OldPasswordLogin.status()).toBe(401);
      await expect(InvalidPasswordToast).toBeVisible();
      await WaitForStableBox(InvalidPasswordToast);
      await expect(RecordedPage).toHaveURL('/login');
      const CookieNames = (await RecordedContext.cookies()).map(
        (Cookie) => Cookie.name
      );
      expect(CookieNames).not.toContain('token');
      await Capture('06-old-password-rejected');

      await PasswordField.fill(NewPassword);
      const NewPasswordLoginPromise = RecordedPage.waitForResponse(
        (Candidate) =>
          Candidate.url().endsWith('/auth/login') &&
          Candidate.request().method() === 'POST'
      );
      await LoginButton.click();
      const NewPasswordLogin = await NewPasswordLoginPromise;
      expect(NewPasswordLogin.ok()).toBe(true);
      await expect(RecordedPage).toHaveURL('/');
      await expect(UserMenuToggle).toBeVisible();
      await expect(RecordedPage.getByText(Account.Nickname)).toBeVisible();
      await CloseBonus();
      await Capture('07-home-logged-in-with-new-password');
    } finally {
      await RecordedContext.close();

      if (Video) {
        await TestInfo.attach('video', {
          path: await Video.path(),
          contentType: 'video/webm',
        });
      }
    }
  });
});
