import type { Page, TestInfo } from '@playwright/test';

export const CaptureScreenshot = async (
  Page: Page,
  TestInfo: TestInfo,
  Name: string
) => {
  const ScreenshotPath = TestInfo.outputPath(`${Name}.png`);

  await Page.screenshot({
    path: ScreenshotPath,
    animations: 'disabled',
  });
  await TestInfo.attach(Name, {
    path: ScreenshotPath,
    contentType: 'image/png',
  });
};
