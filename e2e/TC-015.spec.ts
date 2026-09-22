import { test, expect, type Response } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';
import { FormatChips, GetChipBalance, ParseChips } from './helpers/ChipBalance';
import { CreateAccount } from './helpers/CreateAccount';
import { DisableHttpCache } from './helpers/DisableHttpCache';
import { GetGambitCardCenter } from './helpers/GambitBoard';
import { BumisEffect, GetExpectedEffectTitles } from './helpers/GambitEffects';
import { WaitForStableBox } from './helpers/WaitForStableBox';

test.use({ video: 'off' });

const MinimumCards = 5;
const CardsToBuy = 10;
const CardPrice = 10;
const FlipsBeforeLeaving = 5;
const EventCardsCount = 3;
const EventStages = 2;
const EventTimeout = 30_000;
const ClickTimeout = 2_000;
const ActionTimeout = 10_000;

type GambitPendingInteraction = {
  RequiredSelections: number;
};

type GambitGridCard = {
  Effect?: string | null;
  Locked?: boolean;
  Position: number;
};

type GambitGrid = {
  PendingEvent: unknown | null;
  PendingInteraction: GambitPendingInteraction | null;
  Revealed: GambitGridCard[];
  Unrevealed?: GambitGridCard[];
};

type GambitSessionState = {
  AccumulatedPoints: number;
  BurnSlotsAvailable: number;
  CardsPurchased: number;
  CurrentGridSnapshot?: GambitGrid | null;
  GambitSessionId: number | string;
  Grid?: GambitGrid | null;
  ManualFlipsCount: number;
  NextEffect: string | null;
  Result: number | null;
  Status: string;
};

type GambitResolveEffectBody = Partial<GambitSessionState> & {
  PeekResult?: { Position?: number } | null;
  Session?: GambitSessionState;
};

const GetGrid = (State: GambitSessionState | null) =>
  State?.Grid ?? State?.CurrentGridSnapshot;

const GetRevealedPositions = (State: GambitSessionState | null) =>
  GetGrid(State)
    ?.Revealed.map((Card) => Card.Position)
    .sort((Left, Right) => Left - Right) ?? [];

test.describe('TC-015 - Happy Path', () => {
  test('returns to the active gambit session after leaving the table', async ({
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
    const GambitHeading = RecordedPage.getByRole('heading', {
      name: 'Gambit',
      exact: true,
    });
    const TableHeading = RecordedPage.getByRole('heading', {
      name: 'High Stake Gambit',
      exact: true,
    });
    const BackArrow = RecordedPage.getByRole('button', {
      name: '←',
      exact: true,
    });
    const Canvas = RecordedPage.locator('canvas');
    const Cinematic = RecordedPage.getByTestId('gambit-reveal-cinematic');
    const EventDialog = RecordedPage.getByRole('dialog').filter({
      has: RecordedPage.getByRole('heading', { name: 'Escolha Uma Carta' }),
    });
    const EventCards = EventDialog.getByRole('button', {
      name: /^Escolher /,
    });
    const Burns = (State: GambitSessionState) =>
      RecordedPage.getByText(
        `${State.ManualFlipsCount}/${State.BurnSlotsAvailable}`,
        { exact: true }
      );
    const TotalScore = RecordedPage.getByTestId('gambit-total-score');

    const OpenGambitTables = async () => {
      await GambitHeading.click();
      await expect(RecordedPage).toHaveURL('/gambit-tables');
      await expect(
        RecordedPage.getByRole('heading', { name: 'Escolha sua mesa' })
      ).toBeVisible();
      await expect(TableHeading).toBeVisible();
      await expect(
        TableHeading.locator('xpath=..').getByText('Bloqueado')
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
      await expect(GambitHeading).toBeVisible();
      await Capture('01-home');

      await OpenGambitTables();
      await Capture('02-gambit-tables');

      await TableHeading.click();
      await expect(RecordedPage).toHaveURL('/gambit-room');
      await expect(
        RecordedPage.getByText(`${MinimumCards} cartas`)
      ).toBeVisible();
      await expect(Canvas).toBeVisible();
      await RecordedPage.waitForLoadState('networkidle');
      await Capture('03-gambit-room');

      const AddCard = RecordedPage.getByRole('button', {
        name: '+',
        exact: true,
      });
      for (let Step = MinimumCards; Step < CardsToBuy; Step += 1) {
        await AddCard.click();
      }
      await expect(
        RecordedPage.getByText(`${CardsToBuy} cartas`)
      ).toBeVisible();
      await expect(
        RecordedPage.getByText('Aposta', { exact: true }).locator(
          'xpath=following-sibling::span'
        )
      ).toHaveText(String(CardsToBuy * CardPrice));
      await Capture('04-quantity-selected');

      const SessionResponsePromise = RecordedPage.waitForResponse(
        (Candidate) =>
          /\/gambit-tables\/\d+\/sessions$/.test(Candidate.url()) &&
          Candidate.request().method() === 'POST'
      );
      await RecordedPage.getByRole('button', { name: 'Confirmar' }).click();
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
      await expect(RecordedPage.getByText('NENHUM')).toBeVisible();
      await Capture('05-session-started');

      const DeadPositions: number[] = [];
      let BumisPending = false;
      let PeekOpen = false;

      const GetCanvasBox = async () => {
        const Box = await Canvas.boundingBox();

        if (!Box) {
          throw new Error('The gambit board canvas has no bounding box');
        }

        return Box;
      };

      const GetNextPosition = () =>
        (GetGrid(State)?.Unrevealed ?? [])
          .filter(
            (Card) => !Card.Locked && !DeadPositions.includes(Card.Position)
          )
          .map((Card) => Card.Position)
          .sort((Left, Right) => Left - Right)[0];

      const FlipCard = async (Position: number) => {
        let BurnResponse: Response | undefined;

        await expect(async () => {
          const Box = await GetCanvasBox();

          [BurnResponse] = await Promise.all([
            RecordedPage.waitForResponse(
              (Candidate) =>
                Candidate.url().endsWith(
                  `/gambit/sessions/active/burn/${Position}`
                ) && Candidate.request().method() === 'POST',
              { timeout: 5_000 }
            ),
            Canvas.click({
              position: GetGambitCardCenter(Box, Position),
              timeout: ClickTimeout,
            }),
          ]);
        }).toPass({ timeout: 30_000 });

        if (!BurnResponse) {
          throw new Error(`No burn response for card ${Position}`);
        }

        return BurnResponse;
      };

      const DismissCinematic = async () => {
        await expect(Cinematic).toBeVisible();
        await Cinematic.getByRole('button', { name: 'Pular' }).click({
          timeout: ActionTimeout,
        });
        await expect(Cinematic).toBeHidden();
      };

      const UnmaskBumis = async () => {
        const Position = GetNextPosition();

        if (Position === undefined) {
          throw new Error('No closed card left to unmask the Bumis effect');
        }

        await expect(async () => {
          const Box = await GetCanvasBox();

          await Canvas.click({
            position: GetGambitCardCenter(Box, Position),
            timeout: ClickTimeout,
          });
          await expect(Cinematic).toBeVisible({ timeout: 1_000 });
        }).toPass({ timeout: 30_000 });
        await DismissCinematic();
        DeadPositions.push(Position);
        BumisPending = false;
      };

      const ResolveInteraction = async (
        Interaction: GambitPendingInteraction,
        Unrevealed: GambitGridCard[]
      ) => {
        const Positions = Unrevealed.filter(
          (Card) => !Card.Locked && !DeadPositions.includes(Card.Position)
        )
          .map((Card) => Card.Position)
          .sort((Left, Right) => Left - Right)
          .slice(0, Interaction.RequiredSelections);

        if (Positions.length < Interaction.RequiredSelections) {
          throw new Error(
            'Not enough closed cards for the pending interaction'
          );
        }

        let ResolveResponse: Response | undefined;

        for (const [Step, Position] of Positions.entries()) {
          const IsLastSelection = Step === Positions.length - 1;

          await expect(async () => {
            const Box = await GetCanvasBox();

            if (IsLastSelection) {
              [ResolveResponse] = await Promise.all([
                RecordedPage.waitForResponse(
                  (Candidate) =>
                    Candidate.url().endsWith(
                      '/gambit/sessions/active/resolve-effect'
                    ) && Candidate.request().method() === 'POST',
                  { timeout: 5_000 }
                ),
                Canvas.click({
                  position: GetGambitCardCenter(Box, Position),
                  timeout: ClickTimeout,
                }),
              ]);
              return;
            }

            await Canvas.click({
              position: GetGambitCardCenter(Box, Position),
              timeout: ClickTimeout,
            });
            await expect(
              RecordedPage.getByText(
                `${Step + 1}/${Interaction.RequiredSelections}`,
                { exact: true }
              )
            ).toBeVisible({ timeout: 1_000 });
          }).toPass({ timeout: 30_000 });
        }

        if (!ResolveResponse) {
          throw new Error('No resolve-effect response for the interaction');
        }

        expect(ResolveResponse.ok()).toBe(true);
        const ResolveBody =
          (await ResolveResponse.json()) as GambitResolveEffectBody;

        if (ResolveBody.PeekResult && 'Position' in ResolveBody.PeekResult) {
          PeekOpen = true;
        }

        return ResolveBody.Session ?? (ResolveBody as GambitSessionState);
      };

      const ClosePeekIfOpen = async () => {
        if (!PeekOpen) {
          return;
        }

        const ClosePeek = RecordedPage.getByRole('button', {
          name: 'Fechar espiada',
        });
        await ClosePeek.click({ timeout: ActionTimeout });
        await expect(ClosePeek).toBeHidden();
        PeekOpen = false;
      };

      const WaitForEventCards = async (Stage: number) => {
        await expect(
          EventDialog.getByText(`Escolha ${Stage} de ${EventStages}`, {
            exact: true,
          })
        ).toBeVisible({ timeout: EventTimeout });
        await expect(EventCards).toHaveCount(EventCardsCount, {
          timeout: EventTimeout,
        });

        for (let Card = 0; Card < EventCardsCount; Card += 1) {
          await expect(EventCards.nth(Card)).toBeEnabled({
            timeout: EventTimeout,
          });
          await expect(EventCards.nth(Card)).toHaveCSS('opacity', '1', {
            timeout: EventTimeout,
          });
        }
      };

      const ResolveEvent = async () => {
        await WaitForEventCards(1);
        await EventCards.first().click({ force: true, timeout: ClickTimeout });
        await WaitForEventCards(2);

        const ResolveEventResponsePromise = RecordedPage.waitForResponse(
          (Candidate) =>
            Candidate.url().endsWith('/gambit/sessions/active/resolve-event') &&
            Candidate.request().method() === 'POST',
          { timeout: EventTimeout }
        );
        await EventCards.first().click({ force: true, timeout: ClickTimeout });
        const ResolveEventResponse = await ResolveEventResponsePromise;
        expect(ResolveEventResponse.ok()).toBe(true);
        await expect(EventDialog).toBeHidden({ timeout: EventTimeout });

        return (await ResolveEventResponse.json()) as GambitSessionState;
      };

      const ResolvePending = async () => {
        for (;;) {
          const Grid = GetGrid(State);

          if (Grid?.PendingEvent) {
            State = await ResolveEvent();
          } else if (Grid?.PendingInteraction) {
            State = await ResolveInteraction(
              Grid.PendingInteraction,
              Grid.Unrevealed ?? []
            );
          } else {
            await ClosePeekIfOpen();

            return;
          }
        }
      };

      const FlipNext = async () => {
        if (BumisPending) {
          await UnmaskBumis();
        }

        const Position = GetNextPosition();

        if (Position === undefined) {
          throw new Error('No closed card left to flip');
        }

        const BurnResponse = await FlipCard(Position);
        expect(BurnResponse.ok()).toBe(true);
        State = (await BurnResponse.json()) as GambitSessionState;
        const FlippedEffect = GetGrid(State)?.Revealed.find(
          (Card) => Card.Position === Position
        )?.Effect;

        if (FlippedEffect) {
          await DismissCinematic();
        }

        BumisPending = FlippedEffect === BumisEffect;
        await ResolvePending();
      };

      while (State.ManualFlipsCount < FlipsBeforeLeaving) {
        await FlipNext();
        await expect(Burns(State)).toBeVisible();
        await expect(
          RecordedPage.getByTestId('gambit-score-feedback')
        ).toHaveCount(0);
        await Capture(
          `${String(5 + State.ManualFlipsCount).padStart(2, '0')}-flip-${State.ManualFlipsCount}`
        );
      }

      expect(State.Status).toBe('InProgress');
      expect(GetGrid(State)?.PendingEvent).toBeFalsy();
      expect(GetGrid(State)?.PendingInteraction).toBeFalsy();
      const StateBeforeLeaving = State;

      await BackArrow.click();
      await expect(RecordedPage).toHaveURL('/gambit-tables');
      await expect(TableHeading).toBeVisible();
      await BackArrow.click();
      await expect(RecordedPage).toHaveURL('/');
      await expect(GambitHeading).toBeVisible();
      await CloseBonus();
      await Capture(
        `${String(6 + FlipsBeforeLeaving).padStart(2, '0')}-home-after-leaving`
      );

      const CreatedSessions: string[] = [];
      const ActiveResponses: Response[] = [];
      const CashOutResponses: Response[] = [];
      RecordedPage.on('request', (Candidate) => {
        if (
          Candidate.method() === 'POST' &&
          /\/gambit-tables\/\d+\/sessions$/.test(Candidate.url())
        ) {
          CreatedSessions.push(Candidate.url());
        }
      });
      RecordedPage.on('response', (Candidate) => {
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
      await expect(RecordedPage).toHaveURL('/gambit-room');
      BumisPending = false;

      await expect(Burns(StateBeforeLeaving)).toBeVisible({
        timeout: EventTimeout,
      });
      await expect(TotalScore).toHaveText(
        FormatChips(StateBeforeLeaving.AccumulatedPoints)
      );
      await expect(ChipBalance).toHaveText(FormatChips(BalanceAfterPurchase));

      if (StateBeforeLeaving.NextEffect) {
        const CurrentEffectButton = RecordedPage.getByRole('button', {
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
        await expect(RecordedPage.getByText('NENHUM')).toBeVisible();
      }

      await WaitForStableBox(Canvas);
      await WaitForStableBox(ChipBalance);
      await Capture(
        `${String(8 + FlipsBeforeLeaving).padStart(2, '0')}-session-restored`
      );

      expect(CreatedSessions).toHaveLength(0);
      expect(ActiveResponses.length).toBeGreaterThan(0);

      for (const Candidate of ActiveResponses) {
        const ActiveBody =
          (await Candidate.json()) as GambitSessionState | null;

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

      if (BumisPending) {
        await UnmaskBumis();
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
        RecordedPage.getByText('Resultado', { exact: true }).locator(
          'xpath=following-sibling::span'
        )
      ).toHaveText(FormatChips(CashOutBody.reward));
      await expect(
        RecordedPage.getByRole('button', { name: 'Nova partida' })
      ).toBeVisible();
      await expect(ChipBalance).toHaveText(
        FormatChips(CashOutBody.finalBalance)
      );
      await expect(
        RecordedPage.getByTestId('gambit-score-feedback')
      ).toHaveCount(0);
      await RecordedPage.getByRole('button', {
        name: 'Nova partida',
      }).scrollIntoViewIfNeeded();
      await Capture(
        `${String(9 + FlipsBeforeLeaving).padStart(2, '0')}-session-finished`
      );
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
