import { test, expect } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';
import { CreateAccount } from './helpers/CreateAccount';
import { DisableHttpCache } from './helpers/DisableHttpCache';
import { WaitForStableBox } from './helpers/WaitForStableBox';

test.use({ video: 'off' });

const NicknameTakenMessage = 'Nickname already taken';

test.describe('TC-017 - Unhappy Path', () => {
  test('rejects a signup with a nickname already taken', async ({
    page,
    browser,
  }, TestInfo) => {
    test.setTimeout(300_000);

    const AccountA = await CreateAccount(page);
    const AccountB = {
      Email: `b-${AccountA.Nickname}@example.com`,
      Name: 'E2E User B',
      Nickname: AccountA.Nickname,
      Password: AccountA.Password,
    };

    const { baseURL, viewport } = TestInfo.project.use;
    const RecordedContext = await browser.newContext({
      baseURL,
      viewport,
      recordVideo: { dir: TestInfo.outputPath('video') },
    });
    await DisableHttpCache(RecordedContext);
    const RecordedPage = await RecordedContext.newPage();
    const Video = RecordedPage.video();

    const Capture = (Name: string) =>
      CaptureScreenshot(RecordedPage, TestInfo, Name);
    const EmailStepField = RecordedPage.getByPlaceholder('Digite seu e-mail');
    const ContinueButton = RecordedPage.getByRole('button', {
      name: 'Continuar',
    });
    const SignupTitle = RecordedPage.getByRole('heading', {
      name: 'Criar conta',
    });
    const NicknameField = RecordedPage.getByPlaceholder('Nickname');
    const EmailField = RecordedPage.getByPlaceholder('E-mail');
    const NicknameTakenToast = RecordedPage.getByText(NicknameTakenMessage, {
      exact: true,
    });

    try {
      await RecordedPage.goto('/login');
      await EmailStepField.fill(AccountB.Email);
      await ContinueButton.click();
      await expect(SignupTitle).toBeVisible();

      await RecordedPage.getByPlaceholder('Nome').fill(AccountB.Name);
      await NicknameField.fill(AccountB.Nickname);
      await RecordedPage.getByPlaceholder('DD/MM/AAAA').fill(
        AccountA.BirthDate
      );
      await EmailField.fill(AccountB.Email);
      await RecordedPage.getByPlaceholder('Senha', { exact: true }).fill(
        AccountB.Password
      );
      await RecordedPage.getByPlaceholder('Confirmar senha').fill(
        AccountB.Password
      );
      await WaitForStableBox(SignupTitle);
      await Capture('01-signup-with-taken-nickname');

      const RegisterResponsePromise = RecordedPage.waitForResponse(
        (Candidate) =>
          Candidate.url().endsWith('/auth/register') &&
          Candidate.request().method() === 'POST'
      );
      await RecordedPage.getByRole('button', { name: 'Criar conta' }).click();
      const RegisterResponse = await RegisterResponsePromise;
      expect(RegisterResponse.status()).toBe(400);
      const RegisterBody = (await RegisterResponse.json()) as {
        message: string;
      };
      expect(RegisterBody.message).toBe(NicknameTakenMessage);

      await expect(NicknameTakenToast).toBeVisible();
      await WaitForStableBox(NicknameTakenToast);
      await Capture('02-nickname-already-taken');

      await expect(RecordedPage).toHaveURL('/login');
      await expect(SignupTitle).toBeVisible();
      await expect(NicknameField).toHaveValue(AccountB.Nickname);
      await expect(EmailField).toHaveValue(AccountB.Email);
      const CookieNames = (await RecordedContext.cookies()).map(
        (Cookie) => Cookie.name
      );
      expect(CookieNames).not.toContain('token');

      await RecordedPage.goto('/login');
      await EmailStepField.fill(AccountB.Email);
      const CheckEmailResponsePromise = RecordedPage.waitForResponse(
        (Candidate) =>
          Candidate.url().includes('/auth/check-email') &&
          Candidate.request().method() === 'GET'
      );
      await ContinueButton.click();
      const CheckEmailResponse = await CheckEmailResponsePromise;
      expect(CheckEmailResponse.ok()).toBe(true);
      const CheckEmailBody = (await CheckEmailResponse.json()) as {
        taken: boolean;
      };
      expect(CheckEmailBody.taken).toBe(false);
      await expect(SignupTitle).toBeVisible();
      await WaitForStableBox(SignupTitle);
      await Capture('03-account-b-was-not-created');
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
