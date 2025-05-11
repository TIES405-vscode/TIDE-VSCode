import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { downloadAndUnzipVSCode } from "@vscode/test-electron";
import path from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  electronApp = await electron.launch({
    executablePath: await downloadAndUnzipVSCode(),
    args: [
      '--extensionDevelopmentPath=' + path.resolve(__dirname, '../../../..'), 
      '--user-data-dir=C:\\tmp\\vscode-e2e-user-data', // Path to the user data directory
      '--extensions-dir=C:\\tmp\\vscode-e2e-extensions', // Path to the extensions directory
    ]
  });
  page = await electronApp.firstWindow();
});

test.afterAll(async () => {
   await electronApp.close();
});

test('test opens TIM-IDE extension', async () => 
{
        // Waiting for the VSCode window to be fully loaded
        await page.waitForSelector('.monaco-workbench', { state: 'visible' });
        await page.waitForSelector('.monaco-list-row');
        // Clicking TIM-IDE icon in the activity bar (NOTE: Not sure if these waitfor and clicks actually work or not)
        await page.locator('.action-item[aria-label="TIM-IDE"]').waitFor({ state: 'visible' });
        await page.locator('.action-item[aria-label="TIM-IDE"]').click();
        await page.waitForTimeout(12000); 
        await page.screenshot({ path: 'vscode-e2e-screenshot.png' });
});