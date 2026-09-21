import { test, expect } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';
import { FormatChips, GetChipBalance, ParseChips } from './helpers/ChipBalance';
import { CreateAccount } from './helpers/CreateAccount';

test.use({ video: 'off' });

const SpinCost = 10;
const RerollCost = 5;
const AnimationTimeout = 30_000;
const RerollButtons = [1, 2, 3, 4, 1];

type SessionMutation = {
  currentBalance: number;
  session: { CurrentRewardSnapshot: number };
};

const DisplayLabel = (Reward: number) =>
  `Valor atual ${Math.min(1000, Math.max(0, Math.trunc(Reward)))}$`;

test.describe('TC-011 - Happy Path', () => {
  test('plays a full slot session from the slot 1 table to the cash-out', async ({
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
    const ChipBalance = GetChipBalance(RecordedPage);
    const Lever = RecordedPage.getByRole('button', {
      name: 'Alavanca da maquina',
    });
    const CashOutButton = RecordedPage.getByRole('button', {
      name: 'Botao azul da maquina',
    });
    const LitArrows = RecordedPage.locator('img[src$="SpriteCounterOn.png"]');
    const DarkArrows = RecordedPage.locator('img[src$="SpriteCounterOff.png"]');
    const Display = (Reward: number) =>
      RecordedPage.getByLabel(DisplayLabel(Reward), { exact: true });

    try {
      await RecordedPage.goto('/');
      await expect(RecordedPage.getByTestId('user-menu-toggle')).toBeVisible();
      await expect(RecordedPage.getByText(Account.Nickname)).toBeVisible();

      await expect(
        RecordedPage.getByText('Bônus Diário', { exact: true })
      ).toBeVisible();
      await expect(ChipBalance).not.toHaveText('0');
      const BalanceBeforeBonus = ParseChips(await ChipBalance.innerText());
      await Capture('01-home-daily-bonus');

      const ClaimResponsePromise = RecordedPage.waitForResponse(
        (Response) =>
          Response.url().endsWith('/user/daily-login') &&
          Response.request().method() === 'POST'
      );
      await RecordedPage.getByRole('button', { name: 'Resgatar' }).click();
      const ClaimResponse = await ClaimResponsePromise;
      expect(ClaimResponse.ok()).toBe(true);
      const ClaimBody = (await ClaimResponse.json()) as {
        Reward?: number;
        reward?: number;
      };
      const BonusReward = Number(ClaimBody.Reward ?? ClaimBody.reward);
      const BalanceAfterBonus = BalanceBeforeBonus + BonusReward;
      await expect(
        RecordedPage.getByText(`+${FormatChips(BonusReward)} fichas!`)
      ).toBeVisible();
      await expect(ChipBalance).toHaveText(FormatChips(BalanceAfterBonus));
      await Capture('02-daily-bonus-claimed');

      await RecordedPage.locator('button')
        .filter({ has: RecordedPage.locator('svg.lucide-x') })
        .click();
      await expect(
        RecordedPage.getByText('Bônus Diário', { exact: true })
      ).toBeHidden();

      await RecordedPage.getByRole('heading', { name: 'Caça-Níquel' }).click();
      await expect(RecordedPage).toHaveURL('/slotmachine-tables');
      await expect(
        RecordedPage.getByRole('heading', { name: 'Escolha sua mesa' })
      ).toBeVisible();
      await expect(RecordedPage.getByText('Bloqueado')).toHaveCount(0);
      await expect(
        RecordedPage.getByRole('heading', { name: 'Slot 1', exact: true })
      ).toBeVisible();
      await Capture('03-slot-tables');

      await RecordedPage.getByRole('heading', {
        name: 'Slot 1',
        exact: true,
      }).click();
      await expect(RecordedPage).toHaveURL('/slot-machine-room');
      const ApproachButton = RecordedPage.getByRole('button', {
        name: 'Aproximar da Slot Machine',
      });
      await expect(ApproachButton).toBeVisible();
      await expect(RecordedPage.locator('canvas')).toBeVisible();
      await expect(Lever).toBeEnabled({ timeout: AnimationTimeout });
      await Capture('04-slot-room-intro');

      await ApproachButton.click();
      await expect(ApproachButton).toBeHidden();
      await expect(Lever).toBeEnabled({ timeout: AnimationTimeout });
      await expect(ChipBalance).toHaveText(FormatChips(BalanceAfterBonus));
      await Capture('05-slot-room-ready');

      const SpinResponsePromise = RecordedPage.waitForResponse(
        (Response) =>
          /\/slot-machines\/\d+\/sessions$/.test(Response.url()) &&
          Response.request().method() === 'POST'
      );
      await Lever.click();
      const SpinResponse = await SpinResponsePromise;
      expect(SpinResponse.ok()).toBe(true);
      const SpinBody = (await SpinResponse.json()) as SessionMutation;
      let ExpectedBalance = BalanceAfterBonus - SpinCost;
      let CurrentReward = SpinBody.session.CurrentRewardSnapshot;
      expect(SpinBody.currentBalance).toBe(ExpectedBalance);
      await expect(CashOutButton).toBeEnabled({ timeout: AnimationTimeout });
      await expect(Display(CurrentReward)).toBeVisible();
      await expect(ChipBalance).toHaveText(FormatChips(ExpectedBalance));
      await expect(LitArrows).toHaveCount(0);
      await expect(DarkArrows).toHaveCount(5);
      await Capture('06-lever-pulled');

      for (const [Index, ButtonNumber] of RerollButtons.entries()) {
        const RerollResponsePromise = RecordedPage.waitForResponse(
          (Response) =>
            Response.url().endsWith(
              `/sessions/active/reroll/${ButtonNumber - 1}`
            ) && Response.request().method() === 'POST'
        );
        await RecordedPage.getByRole('button', {
          name: `Botao ${ButtonNumber} da maquina`,
        }).click();
        const RerollResponse = await RerollResponsePromise;
        expect(RerollResponse.ok()).toBe(true);
        const RerollBody = (await RerollResponse.json()) as SessionMutation;
        ExpectedBalance -= RerollCost;
        CurrentReward = RerollBody.session.CurrentRewardSnapshot;
        expect(RerollBody.currentBalance).toBe(ExpectedBalance);
        await expect(LitArrows).toHaveCount(Index + 1);
        await expect(CashOutButton).toBeEnabled({ timeout: AnimationTimeout });
        await expect(Display(CurrentReward)).toBeVisible();
        await expect(ChipBalance).toHaveText(FormatChips(ExpectedBalance));
        await Capture(
          `${String(Index + 7).padStart(2, '0')}-reroll-${Index + 1}-button-${ButtonNumber}`
        );
      }

      await expect(LitArrows).toHaveCount(5);
      await expect(DarkArrows).toHaveCount(0);

      const CashOutResponsePromise = RecordedPage.waitForResponse(
        (Response) =>
          Response.url().endsWith('/sessions/active/cash-out') &&
          Response.request().method() === 'POST'
      );
      await CashOutButton.click();
      const CashOutResponse = await CashOutResponsePromise;
      expect(CashOutResponse.ok()).toBe(true);
      const CashOutBody = (await CashOutResponse.json()) as {
        finalBalance: number;
      };
      expect(CashOutBody.finalBalance).toBe(ExpectedBalance + CurrentReward);
      await expect(ChipBalance).toHaveText(
        FormatChips(CashOutBody.finalBalance)
      );
      await Capture('12-cash-out');

      await expect(Display(0)).toBeVisible();
      await expect(LitArrows).toHaveCount(0);
      await expect(DarkArrows).toHaveCount(5);
      await expect(Lever).toBeEnabled({ timeout: AnimationTimeout });
      await expect(CashOutButton).toBeDisabled();
      await Capture('13-machine-reset');
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
