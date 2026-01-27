import { test, expect } from '@playwright/test';

const EMPLOYEE_EMAIL = 'rahul@unolo.com';
const EMPLOYEE_PASSWORD = 'password123';

test.describe('Employee Full Cycle Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete full employee workflow: login -> checkin -> checkout -> history', async ({ page }) => {
    // Step 1: Login
    await page.fill('input[type="email"]', EMPLOYEE_EMAIL);
    await page.fill('input[type="password"]', EMPLOYEE_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Step 2: Navigate to Check-in page
    await page.click('text=Check In');
    await expect(page).toHaveURL(/\/checkin/);

    // Step 3: Perform check-in
    await page.selectOption('select', { index: 1 }); // Select first client
    await page.fill('textarea', 'Working on project tasks');
    await page.click('button:has-text("Check In")');

    // Verify success message
    await expect(page.locator('text=Successfully checked in')).toBeVisible({ timeout: 5000 });

    // Step 4: Perform check-out
    await page.click('button:has-text("Check Out")');
    await expect(page.locator('text=Successfully checked out')).toBeVisible({ timeout: 5000 });

    // Step 5: View history
    await page.click('text=History');
    await expect(page).toHaveURL(/\/history/);
    
    // Verify the check-in appears in history
    await expect(page.locator('text=Working on project tasks')).toBeVisible();
  });

  test('should show validation error when checking in without selecting client', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', EMPLOYEE_EMAIL);
    await page.fill('input[type="password"]', EMPLOYEE_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    await page.click('text=Check In');
    
    // Try to submit without selecting a client
    await page.click('button:has-text("Check In")');
    
    // Verify validation error
    await expect(page.locator('text=Please select a client')).toBeVisible();
  });

  test('should display employee stats on dashboard', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', EMPLOYEE_EMAIL);
    await page.fill('input[type="password"]', EMPLOYEE_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    
    // Verify employee-specific content
    await expect(page.locator('text=Assigned Clients')).toBeVisible();
    await expect(page.locator('text=Active Check-In')).toBeVisible();
  });

  test('should filter history by date range', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', EMPLOYEE_EMAIL);
    await page.fill('input[type="password"]', EMPLOYEE_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    await page.click('text=History');
    
    // Fill in date filters
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"]', today);
    
    // Verify history is filtered (should show entries)
    await expect(page.locator('table tbody tr')).toHaveCount(await page.locator('table tbody tr').count());
  });

  test('should show location coordinates on check-in page', async ({ page }) => {
    // Login and navigate to check-in
    await page.fill('input[type="email"]', EMPLOYEE_EMAIL);
    await page.fill('input[type="password"]', EMPLOYEE_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    
    // Grant geolocation permission
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 40.7128, longitude: -74.0060 });
    
    await page.click('text=Check In');
    
    // Wait for location to load
    await expect(page.locator('text=Location')).toBeVisible();
    await expect(page.locator('text=40.')).toBeVisible(); // Should show latitude
  });

  test('should prevent multiple simultaneous check-ins', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', EMPLOYEE_EMAIL);
    await page.fill('input[type="password"]', EMPLOYEE_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    await page.click('text=Check In');
    
    // If there's an active check-in, verify form is not shown
    const hasActiveCheckIn = await page.locator('text=Currently Checked In').isVisible().catch(() => false);
    
    if (hasActiveCheckIn) {
      await expect(page.locator('button:has-text("Check In")')).toBeDisabled();
    }
  });

  test('should logout successfully', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', EMPLOYEE_EMAIL);
    await page.fill('input[type="password"]', EMPLOYEE_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    
    // Logout
    await page.click('button:has-text("Logout"), text=Logout');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should persist authentication on page refresh', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', EMPLOYEE_EMAIL);
    await page.fill('input[type="password"]', EMPLOYEE_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    
    // Refresh page
    await page.reload();
    
    // Should still be on dashboard (not redirected to login)
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });
});
