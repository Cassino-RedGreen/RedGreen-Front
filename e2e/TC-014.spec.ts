import { test, expect, type Response } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';
import { FormatChips, GetChipBalance, ParseChips } from './helpers/ChipBalance';
import { CreateAccount } from './helpers/CreateAccount';
import { DisableHttpCache } from './helpers/DisableHttpCache';
import { WaitForStableBox } from './helpers/WaitForStableBox';

test.use({ video: 'off' });

const SpinCost = 10;
const RerollCost = 5;
const TotalRerolls = 5;
const AnimationTimeout = 30_000;
const RerollButtons = [1, 2, 3];

type SessionMutation = {
  currentBalance: number;
  session: { CurrentRewardSnapshot: number; SlotSessionId: number };
};

type ActiveSessionBody = {
  CurrentRerollsSpent?: { Rerolls?: { Max: number; Used: number } } | null;
  SlotSessionId: number;
  Status: string;
} | null;

const DisplayLabel = (Reward: number) =>
  `Valor atual ${Math.min(1000, Math.max(0, Math.trunc(Reward)))}$`;

test.describe('TC-014 - Happy Path', () => {
  test('returns to the active slot session after leaving the machine', async ({
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
    await DisableHttpCache(RecordedContext);
    const RecordedPage = await RecordedContext.newPage();
    const Video = RecordedPage.video();

    const Capture = (Name: string) =>
      CaptureScreenshot(RecordedPage, TestInfo, Name);
    const ChipBalance = GetChipBalance(RecordedPage);
    const BonusTitle = RecordedPage.getByText('Bônus Diário', { exact: true });
    const CloseBonus = async () => {
      await expect(BonusTitle).toBeVisible();
      await RecordedPage.locator('button')
        .filter({ has: RecordedPage.locator('svg.lucide-x') })
        .click();
      await expect(BonusTitle).toBeHidden();
    };
    const SlotCard = RecordedPage.getByRole('heading', {
      name: 'Slot 1',
      exact: true,
    });
    const MachineImage = RecordedPage.getByAltText('Caca-niquel de teste');
    const SettleMachine = async () => {
      await ChipBalance.scrollIntoViewIfNeeded();
      await WaitForStableBox(MachineImage);
      await WaitForStableBox(ChipBalance);
    };
    const Lever = RecordedPage.getByRole('button', {
      name: 'Alavanca da maquina',
    });
    const CashOutButton = RecordedPage.getByRole('button', {
      name: 'Botao azul da maquina',
    });
    const ApproachButton = RecordedPage.getByRole('button', {
      name: 'Aproximar da Slot Machine',
    });
    const LitArrows = RecordedPage.locator('img[src$="SpriteCounterOn.png"]');
    const DarkArrows = RecordedPage.locator('img[src$="SpriteCounterOff.png"]');
    const Display = (Reward: number) =>
      RecordedPage.getByLabel(DisplayLabel(Reward), { exact: true });

    const OpenSlotTables = async () => {
      await RecordedPage.getByRole('heading', { name: 'Caça-Níquel' }).click();
      await expect(RecordedPage).toHaveURL('/slotmachine-tables');
      await expect(
        RecordedPage.getByRole('heading', { name: 'Escolha sua mesa' })
      ).toBeVisible();
      await expect(SlotCard).toBeVisible();
      await expect(
        SlotCard.locator('xpath=..').getByText('Bloqueado')
      ).toHaveCount(0);
    };

    try {
      await RecordedPage.goto('/');
      await expect(RecordedPage.getByTestId('user-menu-toggle')).toBeVisible();
      await expect(RecordedPage.getByText(Account.Nickname)).toBeVisible();

      await expect(BonusTitle).toBeVisible();
      await expect(ChipBalance).not.toHaveText('0');
      const BalanceStart = ParseChips(await ChipBalance.innerText());
      await CloseBonus();
      await expect(
        RecordedPage.getByRole('heading', { name: 'Caça-Níquel' })
      ).toBeVisible();
      await Capture('01-home');

      await OpenSlotTables();
      await Capture('02-slot-tables');

      await SlotCard.click();
      await expect(RecordedPage).toHaveURL('/slot-machine-room');
      await expect(ApproachButton).toBeVisible();
      await expect(RecordedPage.locator('canvas')).toBeVisible();
      await expect(Lever).toBeEnabled({ timeout: AnimationTimeout });
      await Capture('03-slot-room-intro');

      await ApproachButton.click();
      await expect(ApproachButton).toBeHidden();
      await expect(Lever).toBeEnabled({ timeout: AnimationTimeout });
      await expect(ChipBalance).toHaveText(FormatChips(BalanceStart));
      await SettleMachine();
      await Capture('04-slot-room-ready');

      const SpinResponsePromise = RecordedPage.waitForResponse(
        (Candidate) =>
          /\/slot-machines\/\d+\/sessions$/.test(Candidate.url()) &&
          Candidate.request().method() === 'POST'
      );
      await Lever.click();
      const SpinResponse = await SpinResponsePromise;
      expect(SpinResponse.ok()).toBe(true);
      const SpinBody = (await SpinResponse.json()) as SessionMutation;
      const SessionId = SpinBody.session.SlotSessionId;
      let ExpectedBalance = BalanceStart - SpinCost;
      let CurrentReward = SpinBody.session.CurrentRewardSnapshot;
      expect(SpinBody.currentBalance).toBe(ExpectedBalance);
      await expect(CashOutButton).toBeEnabled({ timeout: AnimationTimeout });
      await expect(Display(CurrentReward)).toBeVisible();
      await expect(ChipBalance).toHaveText(FormatChips(ExpectedBalance));
      await expect(LitArrows).toHaveCount(0);
      await expect(DarkArrows).toHaveCount(TotalRerolls);
      await Capture('05-lever-pulled');

      for (const [Index, ButtonNumber] of RerollButtons.entries()) {
        const RerollResponsePromise = RecordedPage.waitForResponse(
          (Candidate) =>
            Candidate.url().endsWith(
              `/sessions/active/reroll/${ButtonNumber - 1}`
            ) && Candidate.request().method() === 'POST'
        );
        await RecordedPage.getByRole('button', {
          name: `Botao ${ButtonNumber} da maquina`,
        }).click();
        const RerollResponse = await RerollResponsePromise;
        expect(RerollResponse.ok()).toBe(true);
        const RerollBody = (await RerollResponse.json()) as SessionMutation;
        ExpectedBalance -= RerollCost;
        CurrentReward = RerollBody.session.CurrentRewardSnapshot;
        expect(RerollBody.session.SlotSessionId).toBe(SessionId);
        expect(RerollBody.currentBalance).toBe(ExpectedBalance);
        await expect(LitArrows).toHaveCount(Index + 1);
        await expect(CashOutButton).toBeEnabled({ timeout: AnimationTimeout });
        await expect(Display(CurrentReward)).toBeVisible();
        await expect(ChipBalance).toHaveText(FormatChips(ExpectedBalance));
        await Capture(
          `${String(Index + 6).padStart(2, '0')}-reroll-${Index + 1}-button-${ButtonNumber}`
        );
      }

      await expect(LitArrows).toHaveCount(RerollButtons.length);
      await expect(DarkArrows).toHaveCount(TotalRerolls - RerollButtons.length);

      await RecordedPage.getByRole('button', {
        name: '←',
        exact: true,
      }).click();
      await expect(RecordedPage).toHaveURL('/');
      await expect(
        RecordedPage.getByRole('heading', { name: 'Caça-Níquel' })
      ).toBeVisible();
      await CloseBonus();
      await Capture('09-home-after-leaving');

      const CreatedSessions: string[] = [];
      const ActiveResponses: Response[] = [];
      RecordedPage.on('request', (Candidate) => {
        if (
          Candidate.method() === 'POST' &&
          /\/slot-machines\/\d+\/sessions$/.test(Candidate.url())
        ) {
          CreatedSessions.push(Candidate.url());
        }
      });
      RecordedPage.on('response', (Candidate) => {
        if (
          Candidate.request().method() === 'GET' &&
          Candidate.url().endsWith('/sessions/active')
        ) {
          ActiveResponses.push(Candidate);
        }
      });

      await OpenSlotTables();
      await Capture('10-slot-tables-return');

      await SlotCard.click();
      await expect(RecordedPage).toHaveURL('/slot-machine-room');
      await expect(ApproachButton).toBeVisible();
      await ApproachButton.click();
      await expect(ApproachButton).toBeHidden();

      await expect(CashOutButton).toBeEnabled({ timeout: AnimationTimeout });
      await expect(Lever).toBeDisabled();
      await expect(LitArrows).toHaveCount(RerollButtons.length);
      await expect(DarkArrows).toHaveCount(TotalRerolls - RerollButtons.length);
      await expect(Display(CurrentReward)).toBeVisible();
      await expect(ChipBalance).toHaveText(FormatChips(ExpectedBalance));
      await SettleMachine();
      await Capture('11-session-restored');

      expect(CreatedSessions).toHaveLength(0);
      expect(ActiveResponses.length).toBeGreaterThan(0);

      for (const Candidate of ActiveResponses) {
        const ActiveBody = (await Candidate.json()) as ActiveSessionBody;
        expect(ActiveBody?.SlotSessionId).toBe(SessionId);
        expect(ActiveBody?.Status).toBe('InProgress');
        expect(ActiveBody?.CurrentRerollsSpent?.Rerolls?.Used).toBe(
          RerollButtons.length
        );
      }

      const CashOutResponsePromise = RecordedPage.waitForResponse(
        (Candidate) =>
          Candidate.url().endsWith('/sessions/active/cash-out') &&
          Candidate.request().method() === 'POST'
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
      await expect(DarkArrows).toHaveCount(TotalRerolls);
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
