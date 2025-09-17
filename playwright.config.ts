import path from 'path';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: path.join(__dirname, 'tests/e2e'),
  timeout: 90_000,
  fullyParallel: false,
  reporter: [['list']],
  expect: {
    timeout: 5_000,
  },
  use: {
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
