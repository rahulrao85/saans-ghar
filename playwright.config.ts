import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against the production build and server with no keys:
 * the AI routes answer from the built-in rules. Air data is intercepted in the
 * browser (e2e/fixtures.ts) so the tests never depend on CPCB being up.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  // Reduced motion: axe must not sample colours mid theme-transition.
  use: { baseURL: 'http://localhost:4174', trace: 'retain-on-failure', reducedMotion: 'reduce' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node dist/server.mjs',
    url: 'http://localhost:4174/api/health',
    env: { PORT: '4174', GEMINI_API_KEY: '', DATA_GOV_API_KEY: '' },
    reuseExistingServer: !process.env.CI,
  },
});
