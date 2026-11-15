import { describe, expect, it } from '@jest/globals';
import {
  gambitTableThemes,
  getGambitTableTheme,
  getNextGambitTableType,
} from '../src/presentation/games/GambitGame/GambitTableConfig';

describe('GambitTableConfig', () => {
  it('returns the theme of each table type', () => {
    expect(getGambitTableTheme('normal')).toBe(gambitTableThemes.normal);
    expect(getGambitTableTheme('bad')).toBe(gambitTableThemes.bad);
    expect(getGambitTableTheme('bad').spritePath).toBe(
      '/Gambit/SpriteTableBad.png'
    );
  });

  it('pushes the bad table harder than the normal one', () => {
    expect(gambitTableThemes.bad.impactPushOffset).toBeGreaterThan(
      gambitTableThemes.normal.impactPushOffset
    );
  });

  it('turns a normal table into a bad one and keeps the bad table', () => {
    expect(getNextGambitTableType('normal')).toBe('bad');
    expect(getNextGambitTableType('bad')).toBe('bad');
  });
});
