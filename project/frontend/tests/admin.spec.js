import { test, expect } from '@playwright/test';

test.describe('Admin Portal E2E Flow', () => {
  test('should login as admin and load dashboard tabs without errors', async ({ page }) => {
    // Capture browser console logs during the test
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    // Capture uncaught errors
    const uncaughtErrors = [];
    page.on('pageerror', err => {
      uncaughtErrors.push(err.message);
    });

    console.log('Navigating to auth page...');
    await page.goto('/auth');
    await expect(page).toHaveURL(/.*auth/);

    console.log('Filling admin credentials...');
    await page.locator('#email').fill('vinayak@foodloop.com');
    await page.locator('#password').fill('Vinayak@123');
    
    console.log('Submitting login form...');
    await page.locator('button[type="submit"]').click();

    // Wait for redirect to admin portal
    console.log('Waiting for redirect to /admin...');
    await page.waitForURL('**/admin', { timeout: 15000 });
    await expect(page).toHaveURL(/.*admin/);

    console.log('Admin portal loaded successfully. Verifying title or header...');
    await expect(page.locator('h1')).toBeVisible();

    // Test switching tabs on the Admin page
    const tabs = [
      { text: 'Pending Approval', selector: 'text=Pending Approval' },
      { text: 'Location Changes', selector: 'text=Location Changes' },
      { text: 'All Users', selector: 'text=All Users' },
      { text: 'Trust Watchlist', selector: 'text=Trust Watchlist' },
      { text: 'Analytics', selector: 'text=Analytics' },
      { text: 'Coupons', selector: 'text=Coupons' },
      { text: 'Disputes', selector: 'text=Disputes' },
      { text: 'Audit Log', selector: 'text=Audit Log' }
    ];

    for (const tab of tabs) {
      console.log(`Clicking tab: ${tab.text}`);
      const tabElement = page.locator(tab.selector).first();
      if (await tabElement.isVisible()) {
        await tabElement.click();
        await page.waitForTimeout(500); // Allow brief render transition
      }
    }

    console.log('Verification finished. Checking for uncaught console errors...');
    expect(uncaughtErrors).toEqual([]);
  });
});
