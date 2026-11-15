import { describe, expect, it } from '@jest/globals';
import { classifyGambitRevealNature } from '../src/presentation/games/GambitGame/GambitRevealNature';

describe('classifyGambitRevealNature', () => {
  it('is neutral without card', () => {
    expect(classifyGambitRevealNature(null)).toBe('neutral');
  });

  it('is bad for negative points even with a good effect', () => {
    expect(classifyGambitRevealNature({ effect: 'jackpot', points: -10 })).toBe(
      'bad'
    );
  });

  it('is bad for harmful effects even with positive points', () => {
    expect(
      classifyGambitRevealNature({ effect: 'ratimundio', points: 20 })
    ).toBe('bad');
  });

  it('is good for positive points', () => {
    expect(classifyGambitRevealNature({ effect: null, points: 15 })).toBe(
      'good'
    );
  });

  it('is good for helpful effects without points', () => {
    expect(
      classifyGambitRevealNature({ effect: 'clarividencia', points: null })
    ).toBe('good');
  });

  it('is neutral for zero points and no effect', () => {
    expect(classifyGambitRevealNature({ effect: null, points: 0 })).toBe(
      'neutral'
    );
  });

  it('is neutral for effects that are neither good nor bad', () => {
    expect(
      classifyGambitRevealNature({ effect: 'mosca-joker', points: null })
    ).toBe('neutral');
  });
});
