import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:4176', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } }
  ],
  webServer: {
    command: 'env DISABLE_HMR=true HOST=127.0.0.1 PORT=4176 node --import tsx server.ts',
    url: 'http://127.0.0.1:4176',
    reuseExistingServer: true
  }
});
