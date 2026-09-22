import { test, expect, type Response } from '@playwright/test';
import { CaptureScreenshot } from './helpers/CaptureScreenshot';
import { CreateAccount } from './helpers/CreateAccount';
import { GetGambitCardCenter } from './helpers/GambitBoard';
import { BumisEffect, GetExpectedEffectTitles } from './helpers/GambitEffects';

test.use({ video: 'off' });

const MinimumCards = 5;
const CardsToBuy = 25;
const CardPrice = 10;

type GambitSessionBody = {
  BurnSlotsAvailable: number;
  CardsPurchased: number;
  Status: string;
};

type GambitPendingEvent = {
  BadOptions: string[];
  GoodOptions: string[];
};

type GambitPendingInteraction = {
  RequiredSelections: number;
};

type GambitGrid = {
  PendingEvent: GambitPendingEvent | null;
  PendingInteraction: GambitPendingInteraction | null;
  Revealed: { Effect?: string | null; Position: number }[];
  Unrevealed?: { Locked?: boolean; Position: number }[];
};

type GambitBurnBody = {
  CurrentGridSnapshot?: GambitGrid | null;
  Grid?: GambitGrid | null;
  NextEffect: string | null;
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

test.describe('TC-012 - Happy Path', () => {
  test('finds the first effect card of a high stakes gambit session', async ({
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
      await expect(AddCard).toBeDisabled();
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
            Canvas.click({ position: GetGambitCardCenter(CanvasBox, Index) }),
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

      const ResolveEvent = async (Event: GambitPendingEvent) => {
        const GoodEffect = Event.GoodOptions.find(
          (Option) => Option !== BumisEffect
        );
        const BadEffect = Event.BadOptions.find(
          (Option) => Option !== BumisEffect
        );

        if (!GoodEffect || !BadEffect) {
          throw new Error('The pending event has no option with a fixed title');
        }

        const [GoodTitle] = GetExpectedEffectTitles(GoodEffect);
        const [BadTitle] = GetExpectedEffectTitles(BadEffect);
        const ChooseCards = async () => {
          await RecordedPage.getByRole('button', {
            name: `Escolher ${GoodTitle}`,
          }).click();
          await RecordedPage.getByRole('button', {
            name: `Escolher ${BadTitle}`,
          }).click({ timeout: 30_000 });
        };
        const [ResolveResponse] = await Promise.all([
          RecordedPage.waitForResponse(
            (Candidate) =>
              Candidate.url().endsWith(
                '/gambit/sessions/active/resolve-event'
              ) && Candidate.request().method() === 'POST',
            { timeout: 60_000 }
          ),
          ChooseCards(),
        ]);
        expect(ResolveResponse.ok()).toBe(true);

        return (await ResolveResponse.json()) as GambitBurnBody;
      };

      const ResolveInteraction = async (
        Interaction: GambitPendingInteraction,
        Unrevealed: { Locked?: boolean; Position: number }[]
      ) => {
        const Positions = Unrevealed.filter((Card) => !Card.Locked)
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
                }),
              ]);
              return;
            }

            await Canvas.click({
              position: GetGambitCardCenter(CanvasBox, Position),
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
          const ClosePeek = RecordedPage.getByRole('button', {
            name: 'Fechar espiada',
          });
          await ClosePeek.click();
          await expect(ClosePeek).toBeHidden();
        }

        return ResolveBody.Session ?? (ResolveBody as GambitBurnBody);
      };

      let TargetEffect: string | null = null;
      let LockedPositions: number[] = [];

      for (
        let Index = 0;
        Index < CardsToBuy && TargetEffect === null;
        Index += 1
      ) {
        if (LockedPositions.includes(Index)) {
          continue;
        }

        const BurnResponse = await FlipCard(Index);
        expect(BurnResponse.ok()).toBe(true);
        const BurnBody = (await BurnResponse.json()) as GambitBurnBody;
        const Grid = GetGrid(BurnBody);
        const FlippedEffect = Grid?.Revealed.find(
          (Card) => Card.Position === Index
        )?.Effect;
        const PendingEvent = Grid?.PendingEvent;

        if (
          FlippedEffect &&
          (FlippedEffect === BurnBody.NextEffect ||
            FlippedEffect === BumisEffect) &&
          !PendingEvent
        ) {
          TargetEffect = FlippedEffect;
          continue;
        }

        if (FlippedEffect) {
          await DismissCinematic();
        }

        let SessionState = BurnBody;

        for (;;) {
          const PendingGrid = GetGrid(SessionState);

          if (PendingGrid?.PendingEvent) {
            SessionState = await ResolveEvent(PendingGrid.PendingEvent);
          } else if (PendingGrid?.PendingInteraction) {
            SessionState = await ResolveInteraction(
              PendingGrid.PendingInteraction,
              PendingGrid.Unrevealed ?? []
            );
          } else {
            break;
          }
        }

        LockedPositions = GetLockedPositions(GetGrid(SessionState));

        if (SessionState.Status !== 'InProgress') {
          throw new Error(`The session ended after card ${Index}`);
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
      const CurrentEffectButton = RecordedPage.getByRole('button', {
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
      await expect(RecordedPage.getByText('NENHUM')).toBeHidden();
      await Capture('07-current-effect-displayed');
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
