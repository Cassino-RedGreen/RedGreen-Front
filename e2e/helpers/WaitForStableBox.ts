import { expect, type Locator } from '@playwright/test';

export const WaitForStableBox = async (Target: Locator) => {
  let Previous = '';

  await expect
    .poll(
      async () => {
        const Current = JSON.stringify(await Target.boundingBox());
        const IsStable = Current === Previous;
        Previous = Current;

        return IsStable;
      },
      { timeout: 10_000 }
    )
    .toBe(true);
};
