import { test, expect } from '@playwright/test';

test.describe('Error Handling & Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show error on invalid login credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@company.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Invalid credentials, text=Invalid email or password')).toBeVisible();
  });

  test('should validate email format on login', async ({ page }) => {
    await page.fill('input[type="email"]', 'not-an-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Browser native validation or custom error should appear
    const emailInput = page.locator('input[type="email"]');
    const validationMessage = await emailInput.evaluate((el) => el.validationMessage);
    expect(validationMessage).toBeTruthy();
  });

  test('should require all login fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation messages
    const emailInput = page.locator('input[type="email"]');
    const emailValidation = await emailInput.evaluate((el) => el.validationMessage);
    
    expect(emailValidation).toBeTruthy();
  });

  test('should handle network error gracefully on dashboard', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"]', 'rahul@unolo.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    
    // Simulate network failure by going offline
    await page.context().setOffline(true);
    
    // Try to refresh or navigate
    await page.reload();
    
    // Should show error message or offline indicator
    const errorMessage = page.locator('text=Error, text=Failed, text=Unable, text=Network error');
    const dashboardStillVisible = page.locator('text=Dashboard');
    
    // Either show error or cached content
    const hasError = await errorMessage.first().isVisible().catch(() => false);
    const hasCached = await dashboardStillVisible.isVisible().catch(() => false);
    
    expect(hasError || hasCached).toBeTruthy();
    
    // Restore connection
    await page.context().setOffline(false);
  });

  test('should show error when checking in fails', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', 'rahul@unolo.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    await page.click('text=Check In');
    
    // Simulate network failure before checking in
    await page.context().setOffline(true);
    
    // Try to check in
    await page.selectOption('select', { index: 1 });
    await page.fill('textarea', 'Test check-in');
    await page.click('button:has-text("Check In")');
    
    // Should show error message
    await expect(page.locator('text=Failed, text=Error, text=Unable')).toBeVisible({ timeout: 10000 });
    
    // Restore connection
    await page.context().setOffline(false);
  });

  test('should handle empty history gracefully', async ({ page }) => {
    // Login (use a user with no history if possible, or use any user)
    await page.fill('input[type="email"]', 'rahul@unolo.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    await page.click('text=History');
    
    // Should show either history or "No records" message
    const table = page.locator('table');
    const noRecords = page.locator('text=No records, text=No history, text=No data');
    
    const hasTable = await table.isVisible().catch(() => false);
    const hasNoRecords = await noRecords.first().isVisible().catch(() => false);
    
    expect(hasTable || hasNoRecords).toBeTruthy();
  });
});
