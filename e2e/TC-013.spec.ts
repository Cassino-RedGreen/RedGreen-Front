import { test, expect, type Response } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';
import { CreateAccount } from './helpers/CreateAccount';
import { GetGambitCardCenter } from './helpers/GambitBoard';
import { BumisEffect } from './helpers/GambitEffects';

test.use({ video: 'off' });

const MinimumCards = 5;
const CardsToBuy = 15;
const CardPrice = 10;
const GridCards = 25;
const EventCardsCount = 3;
const EventStages = 2;
const EventTimeout = 30_000;
const ClickTimeout = 2_000;

type GambitSessionBody = {
  BurnSlotsAvailable: number;
  CardsPurchased: number;
  FirstEventFlip?: number;
  Status: string;
};

type GambitPendingInteraction = {
  RequiredSelections: number;
};

type GambitGrid = {
  PendingEvent: unknown | null;
  PendingInteraction: GambitPendingInteraction | null;
  Revealed: { Effect?: string | null; Position: number }[];
  Unrevealed?: { Locked?: boolean; Position: number }[];
};

type GambitBurnBody = {
  CurrentGridSnapshot?: GambitGrid | null;
  Grid?: GambitGrid | null;
  Status: string;
};

type GambitResolveEffectBody = Partial<GambitBurnBody> & {
  PeekResult?: { Position?: number } | null;
  Session?: GambitBurnBody;
};

const GetGrid = (State: GambitBurnBody) =>
  State.Grid ?? State.CurrentGridSnapshot;

const GetLockedPositions = (Grid: GambitGrid | null | undefined) =>
  Grid?.Unrevealed?.filter((Card) => Card.Locked).map(
    (Card) => Card.Position
  ) ?? [];

test.describe('TC-013 - Happy Path', () => {
  test('chooses one card on each stage of the gambit special event', async ({
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

    try {
      await RecordedPage.goto('/');
      await expect(RecordedPage.getByTestId('user-menu-toggle')).toBeVisible();
      await expect(RecordedPage.getByText(Account.Nickname)).toBeVisible();

      const BonusTitle = RecordedPage.getByText('Bônus Diário', {
        exact: true,
      });
      await expect(BonusTitle).toBeVisible();
      await RecordedPage.locator('button')
        .filter({ has: RecordedPage.locator('svg.lucide-x') })
        .click();
      await expect(BonusTitle).toBeHidden();
      await expect(
        RecordedPage.getByRole('heading', { name: 'Gambit' })
      ).toBeVisible();
      await Capture('01-home');

      await RecordedPage.getByRole('heading', { name: 'Gambit' }).click();
      await expect(RecordedPage).toHaveURL('/gambit-tables');
      await expect(
        RecordedPage.getByRole('heading', { name: 'Escolha sua mesa' })
      ).toBeVisible();
      await expect(RecordedPage.getByText('Bloqueado')).toHaveCount(0);
      await expect(
        RecordedPage.getByRole('heading', { name: 'High Stake Gambit' })
      ).toBeVisible();
      await Capture('02-gambit-tables');

      await RecordedPage.getByRole('heading', {
        name: 'High Stake Gambit',
      }).click();
      await expect(RecordedPage).toHaveURL('/gambit-room');
      await expect(
        RecordedPage.getByText(`${MinimumCards} cartas`)
      ).toBeVisible();
      await expect(RecordedPage.locator('canvas')).toBeVisible();
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
        (Response) =>
          /\/gambit-tables\/\d+\/sessions$/.test(Response.url()) &&
          Response.request().method() === 'POST'
      );
      await RecordedPage.getByRole('button', { name: 'Confirmar' }).click();
      const SessionResponse = await SessionResponsePromise;
      expect(SessionResponse.ok()).toBe(true);
      const SessionBody = (await SessionResponse.json()) as
        | GambitSessionBody
        | { session: GambitSessionBody };
      const Session =
        'session' in SessionBody ? SessionBody.session : SessionBody;
      expect(Session.CardsPurchased).toBe(CardsToBuy);
      expect(Session.Status).toBe('InProgress');
      await expect(
        RecordedPage.getByText(`0/${Session.BurnSlotsAvailable}`, {
          exact: true,
        })
      ).toBeVisible();
      await expect(RecordedPage.getByText('NENHUM')).toBeVisible();
      await Capture('05-session-started');

      const Canvas = RecordedPage.locator('canvas');
      const CanvasBox = await Canvas.boundingBox();

      if (!CanvasBox) {
        throw new Error('The gambit board canvas has no bounding box');
      }

      const Cinematic = RecordedPage.getByTestId('gambit-reveal-cinematic');
      const EventDialog = RecordedPage.getByRole('dialog').filter({
        has: RecordedPage.getByRole('heading', { name: 'Escolha Uma Carta' }),
      });
      const EventCards = EventDialog.getByRole('button', {
        name: /^Escolher /,
      });

      const DeadPositions: number[] = [];

      const FlipCard = async (Index: number) => {
        let BurnResponse: Response | undefined;

        await expect(async () => {
          [BurnResponse] = await Promise.all([
            RecordedPage.waitForResponse(
              (Candidate) =>
                Candidate.url().endsWith(
                  `/gambit/sessions/active/burn/${Index}`
                ) && Candidate.request().method() === 'POST',
              { timeout: 5_000 }
            ),
            Canvas.click({
              position: GetGambitCardCenter(CanvasBox, Index),
              timeout: ClickTimeout,
            }),
          ]);
        }).toPass({ timeout: 30_000 });

        if (!BurnResponse) {
          throw new Error(`No burn response for card ${Index}`);
        }

        return BurnResponse;
      };

      const DismissCinematic = async () => {
        await expect(Cinematic).toBeVisible();
        await Cinematic.getByRole('button', { name: 'Pular' }).click();
        await expect(Cinematic).toBeHidden();
      };

      const UnmaskBumis = async (Index: number) => {
        await expect(async () => {
          await Canvas.click({
            position: GetGambitCardCenter(CanvasBox, Index),
            timeout: ClickTimeout,
          });
          await expect(Cinematic).toBeVisible({ timeout: 1_000 });
        }).toPass({ timeout: 30_000 });
        await DismissCinematic();
      };

      const ResolveInteraction = async (
        Interaction: GambitPendingInteraction,
        Unrevealed: { Locked?: boolean; Position: number }[]
      ) => {
        const Positions = Unrevealed.filter(
          (Card) => !Card.Locked && !DeadPositions.includes(Card.Position)
        )
          .slice(0, Interaction.RequiredSelections)
          .map((Card) => Card.Position);

        if (Positions.length < Interaction.RequiredSelections) {
          throw new Error(
            'Not enough closed cards for the pending interaction'
          );
        }

        let ResolveResponse: Response | undefined;

        for (const [Step, Position] of Positions.entries()) {
          const IsLastSelection = Step === Positions.length - 1;

          await expect(async () => {
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
                  position: GetGambitCardCenter(CanvasBox, Position),
                  timeout: ClickTimeout,
                }),
              ]);
              return;
            }

            await Canvas.click({
              position: GetGambitCardCenter(CanvasBox, Position),
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

        const ResolvedState =
          ResolveBody.Session ?? (ResolveBody as GambitBurnBody);

        if (
          ResolveBody.PeekResult &&
          'Position' in ResolveBody.PeekResult &&
          !GetGrid(ResolvedState)?.PendingEvent
        ) {
          const ClosePeek = RecordedPage.getByRole('button', {
            name: 'Fechar espiada',
          });
          await ClosePeek.click({ timeout: 10_000 });
          await expect(ClosePeek).toBeHidden();
        }

        return ResolvedState;
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

      let EventTriggered = false;
      let BumisPending = false;
      let Flips = 0;
      let LockedPositions: number[] = [];

      for (
        let Index = 0;
        Index < GridCards && Flips < Session.BurnSlotsAvailable;
        Index += 1
      ) {
        if (LockedPositions.includes(Index) || DeadPositions.includes(Index)) {
          continue;
        }

        if (BumisPending) {
          await UnmaskBumis(Index);
          DeadPositions.push(Index);
          BumisPending = false;
          continue;
        }

        const BurnResponse = await FlipCard(Index);
        Flips += 1;
        expect(BurnResponse.ok()).toBe(true);
        const BurnBody = (await BurnResponse.json()) as GambitBurnBody;
        const FlippedEffect = GetGrid(BurnBody)?.Revealed.find(
          (Card) => Card.Position === Index
        )?.Effect;

        if (FlippedEffect) {
          await DismissCinematic();
        }

        BumisPending = FlippedEffect === BumisEffect;

        let SessionState = BurnBody;

        for (;;) {
          const PendingGrid = GetGrid(SessionState);

          if (PendingGrid?.PendingEvent) {
            EventTriggered = true;
            break;
          }

          if (!PendingGrid?.PendingInteraction) {
            break;
          }

          SessionState = await ResolveInteraction(
            PendingGrid.PendingInteraction,
            PendingGrid.Unrevealed ?? []
          );
        }

        if (EventTriggered) {
          break;
        }

        LockedPositions = GetLockedPositions(GetGrid(SessionState));

        if (SessionState.Status !== 'InProgress') {
          throw new Error(`The session ended after card ${Index}`);
        }
      }

      if (!EventTriggered) {
        throw new Error(
          `No special event after ${Flips} flips (BurnSlotsAvailable: ${Session.BurnSlotsAvailable}, FirstEventFlip: ${Session.FirstEventFlip})`
        );
      }

      await WaitForEventCards(1);
      await Capture('06-event-green-table');
      await EventCards.first().click({ force: true, timeout: ClickTimeout });

      await WaitForEventCards(2);
      await Capture('07-event-red-table');

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
      await Capture('08-back-to-burning');
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
