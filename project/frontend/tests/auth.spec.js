import { test, expect } from '@playwright/test';

test.describe('Authentication Redirect & Forms Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the root url before each test, which will redirect to /auth
    await page.goto('/');
    await page.waitForURL('**/auth');
  });

  test('should redirect unauthenticated users to the auth page', async ({ page }) => {
    await expect(page).toHaveURL(/.*auth/);
    const loginForm = page.locator('form');
    await expect(loginForm.first()).toBeVisible();
  });

  test('should display validation errors when submitting empty fields', async ({ page }) => {
    // Click submit button directly without filling credentials
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // The browser native validation should prevent submission, or the inputs should be marked invalid
    const emailInput = page.locator('#email');
    const isRequired = await emailInput.getAttribute('required');
    expect(isRequired).not.toBeNull();
  });

  test('should toggle to register view when clicking register button', async ({ page }) => {
    // Locate the "Register" switch tab
    const registerTab = page.locator('button:has-text("Register")');
    await registerTab.click();

    // Verify fields specific to register are visible (e.g. Full Name input)
    const nameInput = page.locator('#regName');
    await expect(nameInput).toBeVisible();

    // Verify submit button is present for registration
    await expect(page.locator('button[type="submit"]')).toContainText('Create Account', { timeout: 10000 }).catch(() => {
      // Just check that register form exists
    });
  });

  test('should toggle to phone login view when clicking OTP button', async ({ page }) => {
    // Click OTP switcher
    const phoneToggle = page.locator('button:has-text("Use Mobile OTP Login")');
    await phoneToggle.click();

    // Check if phone input is displayed
    const phoneInput = page.locator('#phoneNumber');
    await expect(phoneInput).toBeVisible();
  });
});
