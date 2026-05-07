import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  use: {
    baseURL: 'https://exam-project-fawn.vercel.app',
    browserName: 'chromium',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15000,
  },
});
