import { test, expect } from '@playwright/test';

test.describe('Buyer Portal E2E Flow', () => {
  test('should register a new buyer and navigate to home feed', async ({ page }) => {
    // Capture browser console logs during the test
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
    });

    // Capture uncaught errors
    page.on('pageerror', err => {
      console.error(`[BROWSER UNCAUGHT ERROR]: ${err.message}`);
    });

    console.log('Navigating to auth page...');
    await page.goto('/auth');
    await expect(page).toHaveURL(/.*auth/);

    console.log('Toggling to Register view...');
    const registerTab = page.locator('button:has-text("Register")');
    await registerTab.click();

    const timestamp = Date.now();
    const uniqueEmail = `testbuyer_${timestamp}@foodloop.com`;
    const uniqueUsername = `buyer_${timestamp}`;
    const uniqueMobile = `98765${String(timestamp).slice(-5)}`;

    console.log(`Filling credentials: Name="Test Buyer", Username="${uniqueUsername}", Email="${uniqueEmail}", Mobile="${uniqueMobile}"`);
    await page.locator('#regName').fill('Test Buyer');
    await page.locator('#regUsername').fill(uniqueUsername);
    await page.locator('#regEmail').fill(uniqueEmail);
    await page.locator('input[type="tel"]').fill(uniqueMobile);
    await page.locator('#regPassword').fill('TestPassword@123');
    await page.locator('#regConfirmPassword').fill('TestPassword@123');

    console.log('Manually filling location coordinates...');
    await page.locator('input[placeholder="Latitude"]').fill('19.0760');
    await page.locator('input[placeholder="Longitude"]').fill('72.8777');

    console.log('Submitting registration form...');
    await page.locator('button[type="submit"]').click();

    // Wait for redirect to home feed
    console.log('Waiting for redirect to Home...');
    await page.waitForURL('**/', { timeout: 15000 });
    
    // Check if we are on the Home page
    const currentURL = page.url();
    console.log(`Successfully registered and redirected to Home: ${currentURL}`);
    expect(currentURL).toBe('http://localhost:5173/');

    console.log('Home feed page loaded successfully. Checking for uncaught errors...');
  });
});
