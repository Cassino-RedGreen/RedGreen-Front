import { describe, expect, it } from '@jest/globals';
import {
  getSlotMachineTextureIndexBySymbolId,
  getSlotMachineTextureUrls,
  SLOT_MACHINE_SYMBOLS,
} from '../src/presentation/games/SlotMachineGame/SlotMachineGameConfig';

describe('SlotMachineGameConfig', () => {
  it('lists one texture per symbol in the symbols order', () => {
    expect(getSlotMachineTextureUrls()).toEqual(
      SLOT_MACHINE_SYMBOLS.map((symbol) => symbol.textureUrl)
    );
    expect(new Set(getSlotMachineTextureUrls()).size).toBe(
      SLOT_MACHINE_SYMBOLS.length
    );
  });

  it('finds the texture index of each symbol', () => {
    SLOT_MACHINE_SYMBOLS.forEach((symbol, index) => {
      expect(getSlotMachineTextureIndexBySymbolId(symbol.id)).toBe(index);
    });
  });

  it('returns -1 for an unknown symbol', () => {
    expect(getSlotMachineTextureIndexBySymbolId('diamond' as never)).toBe(-1);
  });
});
