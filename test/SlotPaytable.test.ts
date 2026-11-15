import { describe, expect, it } from '@jest/globals';
import { getSlotMachineTextureUrls } from '../src/presentation/games/SlotMachineGame/SlotMachineGameConfig';
import { SLOT_PAYTABLE_ENTRIES } from '../src/presentation/games/SlotMachineGame/SlotPaytable';

const getEntry = (id: string) =>
  SLOT_PAYTABLE_ENTRIES.find((entry) => entry.id === id);

describe('SlotPaytable', () => {
  it('has unique entry ids', () => {
    const ids = SLOT_PAYTABLE_ENTRIES.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('shows the prize of each combination', () => {
    expect(
      Object.fromEntries(
        SLOT_PAYTABLE_ENTRIES.map((entry) => [entry.id, entry.prize])
      )
    ).toEqual({
      'orange-3': '+5',
      'orange-4': '+8',
      'oranges-3': '+10',
      'oranges-4': '+15',
      pig: '+20 cada',
      multiplier: 'x2',
      rat: 'x0',
      cheese: '+10 por rato',
      egg: '+0',
      'watermelon-4': '+100',
    });
  });

  it('repeats the symbol by the size of the combination', () => {
    expect(getEntry('orange-3')?.symbols).toHaveLength(3);
    expect(getEntry('orange-4')?.symbols).toHaveLength(4);
    expect(getEntry('oranges-3')?.symbols).toHaveLength(3);
    expect(getEntry('oranges-4')?.symbols).toHaveLength(4);
    expect(getEntry('watermelon-4')?.symbols).toHaveLength(4);
    expect(new Set(getEntry('watermelon-4')?.symbols).size).toBe(1);
  });

  it('shows the cheese combined with the rat', () => {
    expect(getEntry('cheese')?.symbols).toEqual([
      '/SlotMachine/SpriteSlotCheese.png',
      '+',
      '/SlotMachine/SpriteSlotRat.png',
    ]);
  });

  it('only uses textures that exist in the slot reels', () => {
    const reelTextures = getSlotMachineTextureUrls();
    const paytableTextures = SLOT_PAYTABLE_ENTRIES.flatMap(
      (entry) => entry.symbols
    ).filter((symbol) => symbol !== '+');

    paytableTextures.forEach((texture) => {
      expect(reelTextures).toContain(texture);
    });
  });
});
