import {defineConfig, devices} from '@playwright/test';

const STATIC_PORT = process.env.STATIC_PORT || '5299';
const baseURL = `http://127.0.0.1:${STATIC_PORT}/json-workbench/`;

export default defineConfig({
  testDir: './tests/browser',
  timeout: 90000,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL,
    trace: 'off',
  },
  webServer: {
    command: `npm run build && PORT=${STATIC_PORT} node scripts/pages-static-server.mjs`,
    port: Number(STATIC_PORT),
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {width: 1440, height: 900},
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {width: 390, height: 844},
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});