import { test, expect, type Response } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';
import { FormatChips, GetChipBalance, ParseChips } from './helpers/ChipBalance';
import { CreateAccount } from './helpers/CreateAccount';
import { DisableHttpCache } from './helpers/DisableHttpCache';
import { BumisEffect, GetExpectedEffectTitles } from './helpers/GambitEffects';
import {
  CreateGambitPlayer,
  GetGrid,
  type GambitSessionState,
} from './helpers/GambitPlayer';
import { WaitForStableBox } from './helpers/WaitForStableBox';

const MinimumCards = 5;
const CardsToBuy = 10;
const CardPrice = 10;
const FlipsBeforeLeaving = 5;
const EventTimeout = 30_000;

const GetRevealedPositions = (State: GambitSessionState | null) =>
  GetGrid(State)
    ?.Revealed.map((Card) => Card.Position)
    .sort((Left, Right) => Left - Right) ?? [];

test.describe('TC-015 - Happy Path', () => {
  test('returns to the active gambit session after leaving the table', async ({
    page,
  }, TestInfo) => {
    test.setTimeout(300_000);

    const Account = await CreateAccount(page);
    await DisableHttpCache(page.context());

    const Capture = (Name: string) => CaptureScreenshot(page, TestInfo, Name);
    const ChipBalance = GetChipBalance(page);
    const BonusTitle = page.getByText('Bônus Diário', { exact: true });
    const CloseBonus = async () => {
      await expect(BonusTitle).toBeVisible();
      await page
        .locator('button')
        .filter({ has: page.locator('svg.lucide-x') })
        .click();
      await expect(BonusTitle).toBeHidden();
    };
    const GambitHeading = page.getByRole('heading', {
      name: 'Gambit',
      exact: true,
    });
    const TableHeading = page.getByRole('heading', {
      name: 'High Stake Gambit',
      exact: true,
    });
    const BackArrow = page.getByRole('button', {
      name: '←',
      exact: true,
    });
    const Burns = (State: GambitSessionState) =>
      page.getByText(`${State.ManualFlipsCount}/${State.BurnSlotsAvailable}`, {
        exact: true,
      });
    const TotalScore = page.getByTestId('gambit-total-score');
    const Player = CreateGambitPlayer(page);
    const { Canvas } = Player;

    const OpenGambitTables = async () => {
      await GambitHeading.click();
      await expect(page).toHaveURL('/gambit-tables');
      await expect(
        page.getByRole('heading', { name: 'Escolha sua mesa' })
      ).toBeVisible();
      await expect(TableHeading).toBeVisible();
      await expect(
        TableHeading.locator('xpath=..').getByText('Bloqueado')
      ).toHaveCount(0);
    };

    await page.goto('/');
    await expect(page.getByTestId('user-menu-toggle')).toBeVisible();
    await expect(page.getByText(Account.Nickname)).toBeVisible();

    await expect(BonusTitle).toBeVisible();
    await expect(ChipBalance).not.toHaveText('0');
    const BalanceStart = ParseChips(await ChipBalance.innerText());
    await CloseBonus();
    await expect(GambitHeading).toBeVisible();
    await Capture('01-home');

    await OpenGambitTables();
    await Capture('02-gambit-tables');

    await TableHeading.click();
    await expect(page).toHaveURL('/gambit-room');
    await expect(page.getByText(`${MinimumCards} cartas`)).toBeVisible();
    await expect(Canvas).toBeVisible();
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
    await expect(
      page
        .getByText('Aposta', { exact: true })
        .locator('xpath=following-sibling::span')
    ).toHaveText(String(CardsToBuy * CardPrice));
    await Capture('04-quantity-selected');

    const SessionResponsePromise = page.waitForResponse(
      (Candidate) =>
        /\/gambit-tables\/\d+\/sessions$/.test(Candidate.url()) &&
        Candidate.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Confirmar' }).click();
    const SessionResponse = await SessionResponsePromise;
    expect(SessionResponse.ok()).toBe(true);
    const SessionBody = (await SessionResponse.json()) as {
      currentBalance: number;
      session: GambitSessionState;
    };
    const SessionId = SessionBody.session.GambitSessionId;
    const BalanceAfterPurchase = SessionBody.currentBalance;
    let State = SessionBody.session;
    expect(State.CardsPurchased).toBe(CardsToBuy);
    expect(State.Status).toBe('InProgress');
    expect(BalanceAfterPurchase).toBe(BalanceStart - CardsToBuy * CardPrice);
    await expect(Burns(State)).toBeVisible();
    await expect(page.getByText('NENHUM')).toBeVisible();
    await Capture('05-session-started');

    const FlipNext = async () => {
      const Flipped = await Player.FlipNext(State);
      State = Flipped.State;

      if (Flipped.Effect) {
        await Player.DismissCinematic();
      }

      State = await Player.ResolvePending(State);
    };

    while (State.ManualFlipsCount < FlipsBeforeLeaving) {
      await FlipNext();
      await expect(Burns(State)).toBeVisible();
      await expect(page.getByTestId('gambit-score-feedback')).toHaveCount(0);
      await Capture(
        `${String(5 + State.ManualFlipsCount).padStart(2, '0')}-flip-${State.ManualFlipsCount}`
      );
    }

    expect(State.Status).toBe('InProgress');
    expect(GetGrid(State)?.PendingEvent).toBeFalsy();
    expect(GetGrid(State)?.PendingInteraction).toBeFalsy();
    const StateBeforeLeaving = State;

    await BackArrow.click();
    await expect(page).toHaveURL('/gambit-tables');
    await expect(TableHeading).toBeVisible();
    await BackArrow.click();
    await expect(page).toHaveURL('/');
    await expect(GambitHeading).toBeVisible();
    await CloseBonus();
    await Capture(
      `${String(6 + FlipsBeforeLeaving).padStart(2, '0')}-home-after-leaving`
    );

    const CreatedSessions: string[] = [];
    const ActiveResponses: Response[] = [];
    const CashOutResponses: Response[] = [];
    page.on('request', (Candidate) => {
      if (
        Candidate.method() === 'POST' &&
        /\/gambit-tables\/\d+\/sessions$/.test(Candidate.url())
      ) {
        CreatedSessions.push(Candidate.url());
      }
    });
    page.on('response', (Candidate) => {
      const Request = Candidate.request();

      if (
        Request.method() === 'GET' &&
        Candidate.url().endsWith('/gambit/sessions/active')
      ) {
        ActiveResponses.push(Candidate);
      }

      if (
        Request.method() === 'POST' &&
        Candidate.url().endsWith('/gambit/sessions/active/cash-out')
      ) {
        CashOutResponses.push(Candidate);
      }
    });

    await OpenGambitTables();
    await Capture(
      `${String(7 + FlipsBeforeLeaving).padStart(2, '0')}-gambit-tables-return`
    );

    await TableHeading.click();
    await expect(page).toHaveURL('/gambit-room');
    Player.ForgetBumis();

    await expect(Burns(StateBeforeLeaving)).toBeVisible({
      timeout: EventTimeout,
    });
    await expect(TotalScore).toHaveText(
      FormatChips(StateBeforeLeaving.AccumulatedPoints)
    );
    await expect(ChipBalance).toHaveText(FormatChips(BalanceAfterPurchase));

    if (StateBeforeLeaving.NextEffect) {
      const CurrentEffectButton = page.getByRole('button', {
        name: /^Ver efeito atual /,
      });
      await expect(CurrentEffectButton).toBeVisible();

      if (StateBeforeLeaving.NextEffect !== BumisEffect) {
        const ExpectedTitles = new RegExp(
          `^(${GetExpectedEffectTitles(StateBeforeLeaving.NextEffect).join('|')})$`
        );
        await expect(CurrentEffectButton.getByRole('img')).toHaveAttribute(
          'alt',
          ExpectedTitles
        );
      }
    } else {
      await expect(page.getByText('NENHUM')).toBeVisible();
    }

    await WaitForStableBox(Canvas);
    await WaitForStableBox(ChipBalance);
    await Capture(
      `${String(8 + FlipsBeforeLeaving).padStart(2, '0')}-session-restored`
    );

    expect(CreatedSessions).toHaveLength(0);
    expect(ActiveResponses.length).toBeGreaterThan(0);

    for (const Candidate of ActiveResponses) {
      const ActiveBody = (await Candidate.json()) as GambitSessionState | null;

      if (!ActiveBody) {
        throw new Error('The backend returned no active gambit session');
      }

      expect(ActiveBody.GambitSessionId).toBe(SessionId);
      expect(ActiveBody.Status).toBe('InProgress');
      expect(ActiveBody.CardsPurchased).toBe(CardsToBuy);
      expect(ActiveBody.ManualFlipsCount).toBe(
        StateBeforeLeaving.ManualFlipsCount
      );
      expect(GetRevealedPositions(ActiveBody)).toEqual(
        GetRevealedPositions(StateBeforeLeaving)
      );
      expect(ActiveBody.NextEffect).toBe(StateBeforeLeaving.NextEffect);
    }

    while (State.Status === 'InProgress') {
      await FlipNext();
    }

    expect(State.Status).toBe('Finished');

    if (Player.IsBumisPending()) {
      await Player.UnmaskBumis(State);
    }

    await expect
      .poll(() => CashOutResponses.length, { timeout: EventTimeout })
      .toBeGreaterThan(0);
    const CashOutResponse = CashOutResponses[0];
    expect(CashOutResponse.ok()).toBe(true);
    const CashOutBody = (await CashOutResponse.json()) as {
      finalBalance: number;
      reward: number;
    };
    expect(CashOutBody.reward).toBe(State.Result);
    expect(CashOutBody.finalBalance).toBe(
      BalanceAfterPurchase + CashOutBody.reward
    );
    await expect(
      page
        .getByText('Resultado', { exact: true })
        .locator('xpath=following-sibling::span')
    ).toHaveText(FormatChips(CashOutBody.reward));
    await expect(
      page.getByRole('button', { name: 'Nova partida' })
    ).toBeVisible();
    await expect(ChipBalance).toHaveText(FormatChips(CashOutBody.finalBalance));
    await expect(page.getByTestId('gambit-score-feedback')).toHaveCount(0);
    await page
      .getByRole('button', {
        name: 'Nova partida',
      })
      .scrollIntoViewIfNeeded();
    await Capture(
      `${String(9 + FlipsBeforeLeaving).padStart(2, '0')}-session-finished`
    );
  });
});
