import { test, expect } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';
import { FormatChips, GetChipBalance } from './helpers/ChipBalance';
import { CreateAccountWithChips } from './helpers/CreateAccountWithChips';
import { WaitForStableBox } from './helpers/WaitForStableBox';

test.use({ video: 'off' });

const InitialChips = 5;
const TotalRerolls = 5;
const FreeTableName = process.env.E2E_FREE_SLOT_TABLE ?? 'Slot 0';
const LockedTableNames = ['Slot 1', 'Slot 2', 'Slot 3'];
const AnimationTimeout = 30_000;
const InsufficientChipsMessage = 'Insufficient chips to start a new session';

test.describe('TC-020 - Unhappy Path', () => {
  test('blocks a slot round when the player has not enough chips', async ({
    browser,
    request,
  }, TestInfo) => {
    test.setTimeout(300_000);

    const Account = await CreateAccountWithChips(request, InitialChips);

    const { baseURL, viewport } = TestInfo.project.use;
    const RecordedContext = await browser.newContext({
      baseURL,
      viewport,
      recordVideo: { dir: TestInfo.outputPath('video') },
    });
    await RecordedContext.addCookies([
      { name: 'token', value: Account.Token, url: baseURL },
    ]);
    const RecordedPage = await RecordedContext.newPage();
    const Video = RecordedPage.video();

    const Capture = (Name: string) =>
      CaptureScreenshot(RecordedPage, TestInfo, Name);
    const ChipBalance = GetChipBalance(RecordedPage);
    const BonusTitle = RecordedPage.getByText('Bônus Diário', { exact: true });
    const TableHeading = (Name: string) =>
      RecordedPage.getByRole('heading', { name: Name, exact: true });
    const LockedBadge = (Name: string) =>
      TableHeading(Name).locator('xpath=..').getByText('Bloqueado');
    const ApproachButton = RecordedPage.getByRole('button', {
      name: 'Aproximar da Slot Machine',
    });
    const MachineImage = RecordedPage.getByAltText('Caca-niquel de teste');
    const Lever = RecordedPage.getByRole('button', {
      name: 'Alavanca da maquina',
    });
    const CashOutButton = RecordedPage.getByRole('button', {
      name: 'Botao azul da maquina',
    });
    const LitArrows = RecordedPage.locator('img[src$="SpriteCounterOn.png"]');
    const DarkArrows = RecordedPage.locator('img[src$="SpriteCounterOff.png"]');
    const EmptyDisplay = RecordedPage.getByLabel('Valor atual 0$', {
      exact: true,
    });
    const RefusalMessage = RecordedPage.getByText(InsufficientChipsMessage, {
      exact: true,
    });
    const SettleMachine = async () => {
      await ChipBalance.scrollIntoViewIfNeeded();
      await WaitForStableBox(MachineImage);
      await WaitForStableBox(ChipBalance);
    };

    try {
      await RecordedPage.goto('/');
      await expect(RecordedPage.getByTestId('user-menu-toggle')).toBeVisible();
      await expect(RecordedPage.getByText(Account.Nickname)).toBeVisible();
      await expect(BonusTitle).toBeVisible();
      await RecordedPage.locator('button')
        .filter({ has: RecordedPage.locator('svg.lucide-x') })
        .click();
      await expect(BonusTitle).toBeHidden();
      await expect(ChipBalance).toHaveText(FormatChips(InitialChips));
      await Capture('01-home-low-balance');

      await RecordedPage.getByRole('heading', { name: 'Caça-Níquel' }).click();
      await expect(RecordedPage).toHaveURL('/slotmachine-tables');
      await expect(
        RecordedPage.getByRole('heading', { name: 'Escolha sua mesa' })
      ).toBeVisible();
      await expect(TableHeading(FreeTableName)).toBeVisible();
      await expect(LockedBadge(FreeTableName)).toHaveCount(0);
      for (const Name of LockedTableNames) {
        await expect(LockedBadge(Name)).toHaveCount(1);
      }
      await Capture('02-slot-tables-locked');

      await TableHeading(LockedTableNames[0]).click({ force: true });
      await expect(RecordedPage).toHaveURL('/slotmachine-tables');

      await TableHeading(FreeTableName).click();
      await expect(RecordedPage).toHaveURL('/slot-machine-room');
      await expect(ApproachButton).toBeVisible();
      await ApproachButton.click();
      await expect(ApproachButton).toBeHidden();
      await expect(Lever).toBeEnabled({ timeout: AnimationTimeout });
      await expect(ChipBalance).toHaveText(FormatChips(InitialChips));
      await SettleMachine();
      await Capture('03-slot-room-ready');

      const SpinResponsePromise = RecordedPage.waitForResponse(
        (Candidate) =>
          /\/slot-machines\/\d+\/sessions$/.test(Candidate.url()) &&
          Candidate.request().method() === 'POST'
      );
      await Lever.click();
      const SpinResponse = await SpinResponsePromise;
      expect(SpinResponse.status()).toBe(400);
      const SpinBody = (await SpinResponse.json()) as { message: string };
      expect(SpinBody.message).toBe(InsufficientChipsMessage);

      await expect(RefusalMessage).toBeVisible();
      await expect(Lever).toBeEnabled({ timeout: AnimationTimeout });
      await expect(CashOutButton).toBeDisabled();
      await expect(LitArrows).toHaveCount(0);
      await expect(DarkArrows).toHaveCount(TotalRerolls);
      await expect(EmptyDisplay).toBeVisible();
      await expect(ChipBalance).toHaveText(FormatChips(InitialChips));
      await RefusalMessage.scrollIntoViewIfNeeded();
      await WaitForStableBox(MachineImage);
      await Capture('04-insufficient-chips-message');

      await SettleMachine();
      await Capture('05-balance-unchanged');
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
