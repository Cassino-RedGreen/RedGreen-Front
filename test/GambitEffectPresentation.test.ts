import { describe, expect, it } from '@jest/globals';
import { FALLBACK_GAMBIT_EFFECT_CARD_SPRITE } from '../src/presentation/games/GambitGame/GambitEffectCardAssets';
import {
  BUMIS_DISGUISE_EFFECTS,
  getBumisDisguisedEffect,
  getDisplayedGambitEffectViewModel,
  getGambitEffectPresentation,
  getGambitEffectPresentationForDisplay,
  getGambitEffectPresentationFromViewModel,
  getGambitEffectPresentationFromViewModelForDisplay,
} from '../src/presentation/games/GambitGame/GambitEffectPresentation';
import type { GambitCardEffectViewModel } from '../src/presentation/games/GambitGame/GambitTypes';

describe('GambitEffectPresentation', () => {
  it('presents a backend effect with its copy and sprite', () => {
    expect(getGambitEffectPresentation('JACKPOT')).toEqual({
      description: expect.any(String),
      spritePath: '/Gambit/Jackpot.png',
      subtitle: 'Efeito positivo',
      title: 'Jackpot',
      viewModel: 'jackpot',
    });
  });

  it('marks harmful effects as negative', () => {
    expect(getGambitEffectPresentation('RATIMUNDIO').subtitle).toBe(
      'Efeito negativo'
    );
  });

  it('rejects an empty backend effect', () => {
    expect(() => getGambitEffectPresentation(null as never)).toThrow(
      'Unknown Gambit effect "null".'
    );
    expect(() => getGambitEffectPresentationForDisplay(null as never)).toThrow(
      'Unknown Gambit effect "null".'
    );
  });

  it('uses a generic copy and sprite for an effect without registration', () => {
    const unknownEffect = 'super-carta-nova' as GambitCardEffectViewModel;

    expect(getGambitEffectPresentationFromViewModel(unknownEffect)).toEqual({
      description: 'Efeito especial do Gambit.',
      spritePath: FALLBACK_GAMBIT_EFFECT_CARD_SPRITE,
      subtitle: 'Efeito especial',
      title: 'Super Carta Nova',
      viewModel: unknownEffect,
    });
  });

  describe('Bumis Infiltrados disguise', () => {
    it('disguises a closed Bumis card as a positive effect', () => {
      const displayed = getDisplayedGambitEffectViewModel('bumis-infiltrados', {
        position: 4,
        sessionId: 10,
      });

      expect(BUMIS_DISGUISE_EFFECTS).toContain(displayed);
    });

    it('shows the real effect once Bumis is revealed', () => {
      expect(
        getDisplayedGambitEffectViewModel('bumis-infiltrados', {
          revealed: true,
        })
      ).toBe('bumis-infiltrados');
    });

    it('never disguises other effects', () => {
      expect(getDisplayedGambitEffectViewModel('melancidio')).toBe(
        'melancidio'
      );
    });

    it('keeps the same disguise for the same card', () => {
      const options = { position: 7, salt: 'board', sessionId: 'abc' };

      expect(getBumisDisguisedEffect(options)).toBe(
        getBumisDisguisedEffect(options)
      );
    });

    it('works without session, position or salt', () => {
      expect(BUMIS_DISGUISE_EFFECTS).toContain(getBumisDisguisedEffect());
    });

    it('varies the disguise between board positions', () => {
      const disguises = new Set(
        Array.from({ length: 25 }, (_, position) =>
          getBumisDisguisedEffect({ position, sessionId: 1 })
        )
      );

      expect(disguises.size).toBeGreaterThan(1);
    });

    it('presents the disguise for display and the truth after reveal', () => {
      const options = { position: 2, sessionId: 99 };
      const disguised = getGambitEffectPresentationForDisplay(
        'BUMIS_INFILTRADOS',
        options
      );

      expect(disguised.viewModel).toBe(getBumisDisguisedEffect(options));
      expect(
        getGambitEffectPresentationFromViewModelForDisplay(
          'bumis-infiltrados',
          { ...options, revealed: true }
        ).title
      ).toBe('Bumis Infiltrados');
    });
  });
});
