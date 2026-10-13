import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['blob'], ['junit', { outputFile: 'junit.xml' }], ['list']]
    : [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    extraHTTPHeaders: { Accept: 'application/json' },
  },

  projects: [
    { name: 'api', testDir: './tests/api', use: { baseURL: BASE_URL } },
    { name: 'generated', testDir: './tests/generated', use: { baseURL: BASE_URL } },
    { name: 'contract', testDir: './tests/contract', use: { baseURL: BASE_URL } },
    { name: 'ui', testDir: './tests/ui', use: { ...devices['Desktop Chrome'], baseURL: BASE_URL } },
    { name: 'visual', testDir: './tests/visual', use: { ...devices['Desktop Chrome'], baseURL: BASE_URL } },
  ],

  webServer: process.env.QA_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npm run demo:server',
        url: `${BASE_URL}/health`,
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
