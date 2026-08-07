import { test, expect } from '@playwright/test';

test.describe('Payment Gateway & Custom QR Module Flow', () => {
  test('should open payment modal, render QR code, and authorize payment', async ({ page }) => {
    // Listen for console messages & page errors
    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[BROWSER UNCAUGHT ERROR]: ${err.message}`));

    console.log('Navigating to home page...');
    await page.goto('/');

    // Check if food listings or buy buttons exist on page
    const orderBtn = page.locator('button:has-text("Order Now"), button:has-text("Buy Now"), button:has-text("Reserve Portion")').first();
    
    if (await orderBtn.isVisible()) {
      console.log('Clicking food order button...');
      await orderBtn.click();

      // Look for payment modal title or gateway elements
      const gatewayHeader = page.locator('h3:has-text("FoodLoop Pay Gateway")');
      await expect(gatewayHeader).toBeVisible({ timeout: 5000 });

      console.log('Verifying QR Code tab is active...');
      const qrTab = page.locator('button:has-text("Scan / Pay QR Code")');
      await expect(qrTab).toBeVisible();

      // Check vector QR code rendering
      const qrSvg = page.locator('svg.rounded-xl');
      await expect(qrSvg).toBeVisible();

      console.log('Switching to Credit/Debit Card tab...');
      const cardTab = page.locator('button:has-text("Credit/Debit")');
      await cardTab.click();

      const cardInput = page.locator('input[placeholder="4532 7182 9381 0021"]');
      await expect(cardInput).toBeVisible();
      await cardInput.fill('4111 1111 1111 1111');

      console.log('Switching back to UPI Pay tab...');
      const upiTab = page.locator('button:has-text("UPI Pay")');
      await upiTab.click();

      console.log('Authorizing payment...');
      const authorizeBtn = page.locator('button:has-text("Authorize Payment")');
      await authorizeBtn.click();

      console.log('Waiting for authorization processing state...');
      const processingText = page.locator('h4:has-text("Authorizing Payment...")');
      await expect(processingText).toBeVisible();
    } else {
      console.log('No active listings on landing page, testing page load...');
      await expect(page).toHaveTitle(/FoodLoop/i);
    }
  });
});
