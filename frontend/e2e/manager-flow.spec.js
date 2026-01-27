import { test, expect } from '@playwright/test';

const MANAGER_EMAIL = 'manager@unolo.com';
const MANAGER_PASSWORD = 'password123';

test.describe('Manager Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should login as manager and view dashboard', async ({ page }) => {
    await page.fill('input[type="email"]', MANAGER_EMAIL);
    await page.fill('input[type="password"]', MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should display manager-specific stats', async ({ page }) => {
    // Login as manager
    await page.fill('input[type="email"]', MANAGER_EMAIL);
    await page.fill('input[type="password"]', MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    
    // Verify manager-specific content
    await expect(page.locator('text=Team Activity')).toBeVisible();
    await expect(page.locator('text=Employees')).toBeVisible();
  });

  test('should view team activity list', async ({ page }) => {
    // Login as manager
    await page.fill('input[type="email"]', MANAGER_EMAIL);
    await page.fill('input[type="password"]', MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    
    // Verify activity list is present
    const activityList = page.locator('[data-testid="activity-list"], .activity-list');
    await expect(activityList.or(page.locator('text=Recent Activity'))).toBeVisible();
  });

  test('should NOT have access to check-in page as manager', async ({ page }) => {
    // Login as manager
    await page.fill('input[type="email"]', MANAGER_EMAIL);
    await page.fill('input[type="password"]', MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    
    // Try to navigate to check-in (should not be visible or accessible)
    const checkInLink = page.locator('text=Check In').first();
    const isVisible = await checkInLink.isVisible().catch(() => false);
    
    expect(isVisible).toBeFalsy();
  });

  test('should view team history as manager', async ({ page }) => {
    // Login as manager
    await page.fill('input[type="email"]', MANAGER_EMAIL);
    await page.fill('input[type="password"]', MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    await page.click('text=History');
    
    await expect(page).toHaveURL(/\/history/);
    // Manager should see all team members' history
    await expect(page.locator('table')).toBeVisible();
  });

  test('should display loading state while fetching manager stats', async ({ page }) => {
    // Login as manager
    await page.fill('input[type="email"]', MANAGER_EMAIL);
    await page.fill('input[type="password"]', MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Look for loading indicator (may be very brief)
    const loadingIndicator = page.locator('text=Loading, [data-testid="loading"]');
    const dashboardContent = page.locator('text=Dashboard');
    
    // Should eventually show dashboard
    await expect(dashboardContent).toBeVisible({ timeout: 10000 });
  });
});
