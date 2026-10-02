import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run against the real local Supabase stack:
//   npx supabase start && npm run functions:serve   (in another terminal)
//   npm run db:users
//   npm run test:e2e
// The Vite dev server is started here if it is not already running on 5917.
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5917',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5917',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
