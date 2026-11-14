import { test, expect } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';
import { CreateAccount } from './helpers/CreateAccount';
import { BumisEffect, GetExpectedEffectTitles } from './helpers/GambitEffects';
import {
  CreateGambitPlayer,
  GetGrid,
  type GambitSessionState,
} from './helpers/GambitPlayer';

const MinimumCards = 5;
const CardsToBuy = 25;
const CardPrice = 10;

test.describe('TC-012 - Happy Path', () => {
  test('finds the first effect card of a high stakes gambit session', async ({
    page,
  }, TestInfo) => {
    test.setTimeout(300_000);

    const Account = await CreateAccount(page);
    const Capture = (Name: string) => CaptureScreenshot(page, TestInfo, Name);

    await page.goto('/');
    await expect(page.getByTestId('user-menu-toggle')).toBeVisible();
    await expect(page.getByText(Account.Nickname)).toBeVisible();

    const BonusTitle = page.getByText('Bônus Diário', {
      exact: true,
    });
    await expect(BonusTitle).toBeVisible();
    await page
      .locator('button')
      .filter({ has: page.locator('svg.lucide-x') })
      .click();
    await expect(BonusTitle).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Gambit' })).toBeVisible();
    await Capture('01-home');

    await page.getByRole('heading', { name: 'Gambit' }).click();
    await expect(page).toHaveURL('/gambit-tables');
    await expect(
      page.getByRole('heading', { name: 'Escolha sua mesa' })
    ).toBeVisible();
    await expect(page.getByText('Bloqueado')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'High Stake Gambit' })
    ).toBeVisible();
    await Capture('02-gambit-tables');

    await page
      .getByRole('heading', {
        name: 'High Stake Gambit',
      })
      .click();
    await expect(page).toHaveURL('/gambit-room');
    await expect(page.getByText(`${MinimumCards} cartas`)).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await Capture('03-gambit-room');

    const AddCard = page.getByRole('button', {
      name: '+',
      exact: true,
    });
    for (let Step = MinimumCards; Step < CardsToBuy; Step += 1) {
      await AddCard.click();
    }
    await expect(page.getByText(`${CardsToBuy} cartas`)).toBeVisible();
    await expect(AddCard).toBeDisabled();
    await expect(
      page
        .getByText('Aposta', { exact: true })
        .locator('xpath=following-sibling::span')
    ).toHaveText(String(CardsToBuy * CardPrice));
    await Capture('04-quantity-selected');

    const SessionResponsePromise = page.waitForResponse(
      (Response) =>
        /\/gambit-tables\/\d+\/sessions$/.test(Response.url()) &&
        Response.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Confirmar' }).click();
    const SessionResponse = await SessionResponsePromise;
    expect(SessionResponse.ok()).toBe(true);
    const SessionBody = (await SessionResponse.json()) as
      | GambitSessionState
      | { session: GambitSessionState };
    const Session =
      'session' in SessionBody ? SessionBody.session : SessionBody;
    expect(Session.CardsPurchased).toBe(CardsToBuy);
    expect(Session.Status).toBe('InProgress');
    await expect(
      page.getByText(`0/${Session.BurnSlotsAvailable}`, {
        exact: true,
      })
    ).toBeVisible();
    await expect(page.getByText('NENHUM')).toBeVisible();
    await Capture('05-session-started');

    const Player = CreateGambitPlayer(page);
    const { Cinematic } = Player;

    let State = Session;
    let TargetEffect: string | null = null;

    for (let Flip = 0; Flip < CardsToBuy && TargetEffect === null; Flip += 1) {
      const Flipped = await Player.FlipNext(State);
      State = Flipped.State;

      if (
        Flipped.Effect &&
        (Flipped.Effect === State.NextEffect ||
          Flipped.Effect === BumisEffect) &&
        !GetGrid(State)?.PendingEvent
      ) {
        TargetEffect = Flipped.Effect;
        continue;
      }

      if (Flipped.Effect) {
        await Player.DismissCinematic();
      }

      State = await Player.ResolvePending(State);

      if (State.Status !== 'InProgress') {
        throw new Error(`The session ended after card ${Flipped.Position}`);
      }
    }

    if (TargetEffect === null) {
      throw new Error(
        `No effect card reached "Efeito Atual" among the ${CardsToBuy} cards`
      );
    }

    const ExpectedTitles = new RegExp(
      `^(${GetExpectedEffectTitles(TargetEffect).join('|')})$`
    );
    await expect(Cinematic).toBeVisible();
    await expect(Cinematic.getByRole('img')).toHaveAttribute(
      'alt',
      ExpectedTitles
    );
    await Capture('06-effect-card-found');

    await Cinematic.getByRole('button', { name: 'Pular' }).click();
    await expect(Cinematic).toBeHidden();
    const CurrentEffectButton = page.getByRole('button', {
      name: /^Ver efeito atual /,
    });
    const CurrentEffectImage = CurrentEffectButton.getByRole('img');
    await expect(CurrentEffectButton).toBeVisible();
    await expect(CurrentEffectImage).toHaveAttribute('alt', ExpectedTitles);
    await expect(CurrentEffectImage).toHaveAttribute('src', /\S/);
    await expect
      .poll(() =>
        CurrentEffectImage.evaluate(
          (Image) => (Image as HTMLImageElement).naturalWidth
        )
      )
      .toBeGreaterThan(0);
    await expect(page.getByText('NENHUM')).toBeHidden();
    await Capture('07-current-effect-displayed');
  });
});
