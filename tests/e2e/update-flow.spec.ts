import { test, expect, Page } from '@playwright/test';

// Mock data for testing
const mockUpdateInfo = {
  hasUpdate: true,
  currentVersion: '2.0.0',
  latestVersion: '2.1.0',
  release: {
    tag_name: 'v2.1.0',
    name: 'Version 2.1.0',
    body: '## Features\n\n- **New feature**\n- *Another feature*\n\n```code block```\n\n[Link](https://example.com)',
    published_at: '2024-01-01T00:00:00Z',
    html_url: 'https://github.com/test/repo/releases/tag/v2.1.0',
    assets: []
  }
};

const mockReleaseNotes = 'Features\n\n- New feature\n- Another feature\n\nLink';

// Helper function to mock Electron APIs
async function mockElectronAPIs(page: Page) {
  await page.addInitScript(() => {
    // Mock window.electronAPI
    (window as any).electronAPI = {
      update: {
        getCurrentVersion: () => Promise.resolve('2.0.0'),
        checkForUpdates: () => Promise.resolve(mockUpdateInfo),
        getReleaseNotes: () => Promise.resolve(mockReleaseNotes),
      },
      shell: {
        openExternal: (url: string) => {
          console.log('Opening external URL:', url);
          return Promise.resolve();
        },
      },
      config: {
        get: () => Promise.resolve({
          hideUpdateUntilNextRelease: false,
          autoCheckOnStartup: true,
        }),
        update: (data: any) => Promise.resolve(data),
      },
    };
  });
}

test.describe('Update Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await mockElectronAPIs(page);
  });

  test('complete update flow - update available', async ({ page }) => {
    // Navigate to the main application
    await page.goto('/');

    // Wait for the application to load
    await page.waitForSelector('[data-testid="managed-environment"]', { timeout: 10000 });

    // Check that update check is triggered on app load
    await page.waitForFunction(() => {
      return window.electronAPI?.update?.checkForUpdates?.mock?.calls?.length > 0;
    });

    // Verify update dialog appears
    await expect(page.locator('text=Update Available')).toBeVisible();
    await expect(page.locator('text=A new version of Schedule I Developer Environment is available!')).toBeVisible();

    // Verify version information is displayed
    await expect(page.locator('text=Current Version: v2.0.0')).toBeVisible();
    await expect(page.locator('text=Latest Version: v2.1.0')).toBeVisible();
    await expect(page.locator('text=Released: 1/1/2024')).toBeVisible();

    // Verify release notes are loaded and formatted
    await expect(page.locator('text=Release Notes:')).toBeVisible();
    await expect(page.locator('text=Features')).toBeVisible();
    await expect(page.locator('text=New feature')).toBeVisible();
    await expect(page.locator('text=Another feature')).toBeVisible();
    await expect(page.locator('text=Link')).toBeVisible();

    // Test download button functionality
    const downloadButton = page.locator('button:has-text("Download Update")');
    await expect(downloadButton).toBeVisible();
    await expect(downloadButton).toHaveAttribute('title', 'Open GitHub release page to download the update');

    // Mock the shell.openExternal call
    const openExternalSpy = await page.evaluate(() => {
      return (window as any).electronAPI.shell.openExternal;
    });

    await downloadButton.click();

    // Verify external URL was opened
    await page.waitForFunction(() => {
      return (window as any).electronAPI?.shell?.openExternal?.mock?.calls?.length > 0;
    });

    // Test close button
    const closeButton = page.locator('button:has-text("Close")');
    await closeButton.click();
    await expect(page.locator('text=Update Available')).not.toBeVisible();
  });

  test('hide until next release functionality', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="managed-environment"]', { timeout: 10000 });

    // Wait for update dialog to appear
    await expect(page.locator('text=Update Available')).toBeVisible();

    // Click "Hide Until Next Release"
    const hideButton = page.locator('button:has-text("Hide Until Next Release")');
    await hideButton.click();

    // Verify dialog closes
    await expect(page.locator('text=Update Available')).not.toBeVisible();

    // Verify config was updated
    await page.waitForFunction(() => {
      return (window as any).electronAPI?.config?.update?.mock?.calls?.length > 0;
    });

    const configUpdateCall = await page.evaluate(() => {
      return (window as any).electronAPI.config.update.mock.calls[0][0];
    });

    expect(configUpdateCall).toEqual({ hideUpdateUntilNextRelease: true });
  });

  test('no update available scenario', async ({ page }) => {
    // Mock no update available
    await page.addInitScript(() => {
      (window as any).electronAPI.update.checkForUpdates = () => Promise.resolve({
        hasUpdate: false,
        currentVersion: '2.1.0',
        latestVersion: '2.1.0'
      });
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="managed-environment"]', { timeout: 10000 });

    // Wait a bit to ensure update check completes
    await page.waitForTimeout(2000);

    // Verify no update dialog appears
    await expect(page.locator('text=Update Available')).not.toBeVisible();
  });

  test('update check error handling', async ({ page }) => {
    // Mock update check error
    await page.addInitScript(() => {
      (window as any).electronAPI.update.checkForUpdates = () => Promise.reject(new Error('Network error'));
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="managed-environment"]', { timeout: 10000 });

    // Wait a bit to ensure error handling completes
    await page.waitForTimeout(2000);

    // Verify no update dialog appears on error
    await expect(page.locator('text=Update Available')).not.toBeVisible();

    // Verify error was logged (check console)
    const consoleLogs = await page.evaluate(() => {
      return (window as any).console?.error?.mock?.calls || [];
    });

    expect(consoleLogs.some((call: any[]) => 
      call.some((arg: any) => typeof arg === 'string' && arg.includes('Failed to check for updates'))
    )).toBeTruthy();
  });

  test('release notes loading states', async ({ page }) => {
    // Mock delayed release notes loading
    await page.addInitScript(() => {
      let resolveNotes;
      const notesPromise = new Promise(resolve => {
        resolveNotes = resolve;
      });
      
      (window as any).electronAPI.update.getReleaseNotes = () => notesPromise;
      
      // Resolve after a delay
      setTimeout(() => resolveNotes(mockReleaseNotes), 1000);
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="managed-environment"]', { timeout: 10000 });

    // Wait for update dialog
    await expect(page.locator('text=Update Available')).toBeVisible();

    // Verify loading state
    await expect(page.locator('text=Loading release notes...')).toBeVisible();
    await expect(page.locator('.animate-spin')).toBeVisible();

    // Wait for notes to load
    await expect(page.locator('text=Features')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Loading release notes...')).not.toBeVisible();
  });

  test('release notes loading error', async ({ page }) => {
    // Mock release notes loading error
    await page.addInitScript(() => {
      (window as any).electronAPI.update.getReleaseNotes = () => Promise.reject(new Error('Notes failed'));
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="managed-environment"]', { timeout: 10000 });

    // Wait for update dialog
    await expect(page.locator('text=Update Available')).toBeVisible();

    // Wait for error state
    await expect(page.locator('text=Failed to load release notes.')).toBeVisible({ timeout: 5000 });
  });

  test('dialog accessibility', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="managed-environment"]', { timeout: 10000 });

    // Wait for update dialog
    await expect(page.locator('text=Update Available')).toBeVisible();

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify focus is on download button
    const downloadButton = page.locator('button:has-text("Download Update")');
    await expect(downloadButton).toBeFocused();

    // Test Enter key on download button
    await page.keyboard.press('Enter');

    // Verify external URL was opened
    await page.waitForFunction(() => {
      return (window as any).electronAPI?.shell?.openExternal?.mock?.calls?.length > 0;
    });

    // Test Escape key to close
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Update Available')).not.toBeVisible();
  });

  test('multiple update checks', async ({ page }) => {
    let checkCount = 0;
    
    await page.addInitScript(() => {
      (window as any).electronAPI.update.checkForUpdates = () => {
        checkCount++;
        return Promise.resolve(mockUpdateInfo);
      };
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="managed-environment"]', { timeout: 10000 });

    // Wait for first check
    await page.waitForFunction(() => checkCount > 0);

    // Close dialog
    await page.locator('button:has-text("Close")').click();
    await expect(page.locator('text=Update Available')).not.toBeVisible();

    // Trigger another check (simulate user action)
    await page.evaluate(() => {
      // Simulate checking for updates again
      return (window as any).electronAPI.update.checkForUpdates();
    });

    // Verify dialog appears again
    await expect(page.locator('text=Update Available')).toBeVisible();

    // Verify only one additional check was made
    await page.waitForFunction(() => checkCount === 2);
  });

  test('dialog with missing release data', async ({ page }) => {
    // Mock update info without release data
    await page.addInitScript(() => {
      (window as any).electronAPI.update.checkForUpdates = () => Promise.resolve({
        hasUpdate: true,
        currentVersion: '2.0.0',
        latestVersion: '2.1.0'
      });
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="managed-environment"]', { timeout: 10000 });

    // Wait for update dialog
    await expect(page.locator('text=Update Available')).toBeVisible();

    // Verify version info is still displayed
    await expect(page.locator('text=Current Version: v2.0.0')).toBeVisible();
    await expect(page.locator('text=Latest Version: v2.1.0')).toBeVisible();

    // Verify no release notes section
    await expect(page.locator('text=Release Notes:')).not.toBeVisible();

    // Verify download button still works (should handle missing URL gracefully)
    const downloadButton = page.locator('button:has-text("Download Update")');
    await downloadButton.click();

    // Should not crash or open external URL
    await page.waitForTimeout(1000);
  });

  test('performance with large release notes', async ({ page }) => {
    const largeNotes = 'A'.repeat(10000);
    
    await page.addInitScript(() => {
      (window as any).electronAPI.update.getReleaseNotes = () => Promise.resolve(largeNotes);
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="managed-environment"]', { timeout: 10000 });

    // Wait for update dialog
    await expect(page.locator('text=Update Available')).toBeVisible();

    // Wait for notes to load
    await page.waitForFunction(() => {
      const notesElement = document.querySelector('.max-h-40');
      return notesElement && notesElement.textContent?.includes('A');
    });

    // Verify scrolling works
    const notesContainer = page.locator('.max-h-40');
    await notesContainer.evaluate(el => el.scrollTop = 1000);
    
    // Should not crash or have performance issues
    await page.waitForTimeout(1000);
  });
});
