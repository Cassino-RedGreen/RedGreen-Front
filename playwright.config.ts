import { defineConfig, devices } from '@playwright/test';

const BaseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const IsCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: IsCi,
  retries: IsCi ? 1 : 0,
  workers: IsCi ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  use: {
    baseURL: BaseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // O build de producao exige VITE_API_BASE_URL (src/config.ts lanca sem ela),
    // entao o bundle da suite e gerado aqui, com a variavel definida.
    command: IsCi
      ? 'npm run build && npm run preview -- --port 5173'
      : 'npm run dev -- --port 5173',
    url: BaseUrl,
    reuseExistingServer: !IsCi,
    timeout: 120_000,
    env: {
      VITE_API_BASE_URL:
        process.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
    },
  },
});
