import { test, expect } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';
import { WaitForStableBox } from './helpers/WaitForStableBox';

test.use({ video: 'on' });

const TotalRerolls = 5;
const RerollButtonNumber = 1;
const ForcedClickTimeout = 2_000;

test.describe('TC-018 - Unhappy Path', () => {
  test('blocks a visitor from using the slot machine', async ({
    page,
  }, TestInfo) => {
    test.setTimeout(300_000);

    const Capture = (Name: string) => CaptureScreenshot(page, TestInfo, Name);
    const SlotHeading = page.getByRole('heading', { name: 'Caça-Níquel' });
    const ApproachButton = page.getByRole('button', {
      name: 'Aproximar da Slot Machine',
    });
    const MachineImage = page.getByAltText('Caca-niquel de teste');
    const Lever = page.getByRole('button', { name: 'Alavanca da maquina' });
    const RerollButton = page.getByRole('button', {
      name: `Botao ${RerollButtonNumber} da maquina`,
    });
    const RerollSprite = RerollButton.locator('img');
    const LitArrows = page.locator('img[src$="SpriteCounterOn.png"]');
    const DarkArrows = page.locator('img[src$="SpriteCounterOff.png"]');
    const EmptyDisplay = page.getByLabel('Valor atual 0$', { exact: true });
    const UnauthorizedMessage = page.getByText('Unauthorized', { exact: true });

    const BlockedRequests: string[] = [];
    page.on('request', (Candidate) => {
      const IsBlocked =
        Candidate.method() === 'POST' &&
        (/\/slot-machines\/\d+\/sessions$/.test(Candidate.url()) ||
          /\/sessions\/active\/reroll\/\d+$/.test(Candidate.url()) ||
          Candidate.url().endsWith('/sessions/active/cash-out'));

      if (IsBlocked) {
        BlockedRequests.push(`${Candidate.method()} ${Candidate.url()}`);
      }
    });

    const ExpectMachineUntouched = async () => {
      await expect(LitArrows).toHaveCount(0);
      await expect(DarkArrows).toHaveCount(TotalRerolls);
      await expect(EmptyDisplay).toBeVisible();
      expect(BlockedRequests).toEqual([]);
    };

    await page.goto('/');
    await expect(SlotHeading).toBeVisible();
    await expect(page.getByText('Entrar', { exact: true })).toBeVisible();
    await expect(page.getByTestId('user-menu-toggle')).toHaveCount(0);
    await expect(page.getByText('Bônus Diário', { exact: true })).toHaveCount(
      0
    );
    await Capture('01-visitor-home');

    const ActiveSessionResponsePromise = page.waitForResponse(
      (Candidate) =>
        Candidate.url().endsWith('/sessions/active') &&
        Candidate.request().method() === 'GET'
    );
    await SlotHeading.click();
    const ActiveSessionResponse = await ActiveSessionResponsePromise;
    expect(ActiveSessionResponse.status()).toBe(401);
    await expect(page).toHaveURL('/slot-machine-room');
    await expect(
      page.getByRole('heading', { name: 'Escolha sua mesa' })
    ).toHaveCount(0);
    await expect(UnauthorizedMessage).toBeVisible();
    await expect(ApproachButton).toBeVisible();
    await WaitForStableBox(MachineImage);
    await UnauthorizedMessage.scrollIntoViewIfNeeded();
    await WaitForStableBox(MachineImage);
    await Capture('02-visitor-slot-machine');

    await ApproachButton.click();
    await expect(ApproachButton).toBeHidden();
    await WaitForStableBox(MachineImage);
    await expect(UnauthorizedMessage).toBeVisible();
    await Capture('03-machine-approached');

    await expect(Lever).toBeDisabled();
    await expect(Lever).toHaveAttribute('aria-disabled', 'true');
    await Lever.click({ force: true, timeout: ForcedClickTimeout });
    await ExpectMachineUntouched();
    await expect(UnauthorizedMessage).toBeVisible();
    await Capture('04-lever-attempt');

    await expect(RerollButton).toBeDisabled();
    await expect(RerollButton).toHaveAttribute('aria-disabled', 'true');
    await expect(RerollSprite).toHaveAttribute(
      'src',
      /SpriteRedButtonOff\.png$/
    );
    await RerollButton.hover();
    await expect(RerollSprite).toHaveAttribute('src', /SpriteRedButton\.png$/);
    await Capture('05-reroll-hover');

    await RerollButton.click({ force: true, timeout: ForcedClickTimeout });
    await page.mouse.move(0, 0);
    await expect(RerollSprite).toHaveAttribute(
      'src',
      /SpriteRedButtonOff\.png$/
    );
    await ExpectMachineUntouched();
    await expect(page).toHaveURL('/slot-machine-room');
    await expect(UnauthorizedMessage).toBeVisible();
    await UnauthorizedMessage.scrollIntoViewIfNeeded();
    await WaitForStableBox(MachineImage);
    await Capture('06-reroll-attempt');
  });
});
