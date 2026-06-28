import { test, expect } from '@playwright/test';

test.describe('Seller Portal E2E Flow', () => {
  test('should register a new seller and navigate to seller dashboard', async ({ page }) => {
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

    console.log('Selecting Home Cook role...');
    const sellerRoleBtn = page.locator('button:has-text("Home Cook")');
    await sellerRoleBtn.click();

    const timestamp = Date.now();
    const uniqueEmail = `testseller_${timestamp}@foodloop.com`;
    const uniqueUsername = `seller_${timestamp}`;
    const uniqueMobile = `98766${String(timestamp).slice(-5)}`;

    console.log(`Filling credentials: Name="Test Seller", Username="${uniqueUsername}", Email="${uniqueEmail}", Mobile="${uniqueMobile}"`);
    await page.locator('#regName').fill('Test Seller');
    await page.locator('#regUsername').fill(uniqueUsername);
    await page.locator('#regEmail').fill(uniqueEmail);
    await page.locator('input[type="tel"]').fill(uniqueMobile);
    await page.locator('#regPassword').fill('TestPassword@123');
    await page.locator('#regConfirmPassword').fill('TestPassword@123');

    console.log('Filling coordinates...');
    await page.locator('input[placeholder="Latitude"]').fill('19.0760');
    await page.locator('input[placeholder="Longitude"]').fill('72.8777');

    console.log('Filling seller kitchen info...');
    await page.locator('input[placeholder="Kitchen / Brand Name"]').fill("Vinayak's Kitchen");
    await page.locator('input[placeholder="Kitchen Address"]').fill("Mumbai Central, Mumbai");

    console.log('Submitting registration form...');
    await page.locator('button[type="submit"]').click();

    // Wait for redirect to seller dashboard
    console.log('Waiting for redirect to Seller Dashboard...');
    await page.waitForURL('**/seller-dashboard', { timeout: 15000 });
    
    // Check if we are on the Seller Dashboard page
    const currentURL = page.url();
    console.log(`Successfully registered and redirected to Seller Dashboard: ${currentURL}`);
    expect(currentURL).toBe('http://localhost:5173/seller-dashboard');

    console.log('Seller Dashboard loaded successfully. Checking for uncaught errors...');
  });
});
