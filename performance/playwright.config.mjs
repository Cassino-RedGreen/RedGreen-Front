import { defineConfig, chromium } from '@playwright/test';
import path from 'node:path';

const output = process.env.PERF_RUN_DIR;
if (!output) throw new Error('Use node run.mjs to validate the target first');

export default defineConfig({
  testDir: '.',
  testMatch: 'scenarios.mjs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  outputDir: path.join(output, 'browser', 'test-results'),
  reporter: [
    ['list'],
    [
      'html',
      { outputFolder: path.join(output, 'browser', 'html'), open: 'never' },
    ],
    ['json', { outputFile: path.join(output, 'browser', 'results.json') }],
  ],
  use: {
    baseURL: process.env.PERF_BASE_URL,
    viewport: { width: 1365, height: 768 },
    headless: true,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    launchOptions: {
      executablePath: chromium.executablePath(),
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
      ],
    },
  },
});
