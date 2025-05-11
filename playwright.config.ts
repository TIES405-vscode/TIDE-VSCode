import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/test/e2e', 
  timeout: 60000,
  use: {
    headless: false, 
  },
  workers: 1, 
  projects: [
    {
      name: 'electron',
      use: {
        launchOptions: {
          args: [],
        }
      },
    },
  ],
});
