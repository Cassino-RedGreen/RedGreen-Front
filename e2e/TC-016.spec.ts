import { test, expect } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';
import { CreateAccount } from './helpers/CreateAccount';
import { WaitForStableBox } from './helpers/WaitForStableBox';

test.use({ video: 'off' });

const InvalidBirthDate = '31/02/2000';
const WriteMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];

test.describe('TC-016 - Unhappy Path', () => {
  test('rejects an impossible birth date when editing the profile', async ({
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
    const UserMenu = RecordedPage.getByTestId('user-menu');
    const EditProfileItem = RecordedPage.getByRole('menuitem', {
      name: 'Editar perfil',
    });
    const EditProfileTitle = RecordedPage.getByRole('heading', {
      name: 'Editar perfil',
    });
    const BirthDateField = RecordedPage.getByPlaceholder('DD/MM/AAAA');
    const CurrentPasswordField = RecordedPage.getByPlaceholder('Senha atual');
    const InvalidDateToast = RecordedPage.getByText('ERRO DATA INVALIDA.', {
      exact: true,
    });

    try {
      await RecordedPage.goto('/');
      await expect(RecordedPage.getByTestId('user-menu-toggle')).toBeVisible();
      await expect(RecordedPage.getByText(Account.Nickname)).toBeVisible();

      await expect(BonusTitle).toBeVisible();
      await RecordedPage.locator('button')
        .filter({ has: RecordedPage.locator('svg.lucide-x') })
        .click();
      await expect(BonusTitle).toBeHidden();
      await Capture('01-home');

      await RecordedPage.getByTestId('user-menu-toggle').click();
      await expect(UserMenu).toBeVisible();
      await expect(EditProfileItem).toBeVisible();
      await WaitForStableBox(UserMenu);
      await Capture('02-user-menu');

      await EditProfileItem.click();
      await expect(EditProfileTitle).toBeVisible();
      await expect(BirthDateField).toHaveValue(Account.BirthDate);
      await WaitForStableBox(EditProfileTitle);
      await Capture('03-edit-profile-original-birth-date');

      await BirthDateField.fill(InvalidBirthDate);
      await expect(BirthDateField).toHaveValue(InvalidBirthDate);
      await CurrentPasswordField.fill(Account.Password);
      await Capture('04-invalid-birth-date-filled');

      const WriteRequests: string[] = [];
      RecordedPage.on('request', (Candidate) => {
        if (WriteMethods.includes(Candidate.method())) {
          WriteRequests.push(`${Candidate.method()} ${Candidate.url()}`);
        }
      });

      await RecordedPage.getByRole('button', {
        name: 'Salvar alteracoes',
      }).click();
      await expect(InvalidDateToast).toBeVisible();
      await WaitForStableBox(InvalidDateToast);
      await Capture('05-invalid-date-error');

      await expect(EditProfileTitle).toBeVisible();
      await expect(BirthDateField).toHaveValue(InvalidBirthDate);
      await expect(
        RecordedPage.getByText('PERFIL ATUALIZADO COM SUCESSO!')
      ).toHaveCount(0);
      await expect(RecordedPage).toHaveURL('/');
      expect(WriteRequests).toEqual([]);
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
