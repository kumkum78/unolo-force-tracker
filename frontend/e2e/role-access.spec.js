import { test, expect } from '@playwright/test';

const EMPLOYEE_EMAIL = 'rahul@unolo.com';
const EMPLOYEE_PASSWORD = 'password123';
const MANAGER_EMAIL = 'manager@unolo.com';
const MANAGER_PASSWORD = 'password123';

test.describe('Role-Based Access Control', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access dashboard directly
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should prevent access to protected routes without auth', async ({ page }) => {
    await page.goto('/checkin');
    await expect(page).toHaveURL(/\/login/);
    
    await page.goto('/history');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show different navigation for employee vs manager', async ({ page }) => {
    // Test employee navigation
    await page.goto('/');
    await page.fill('input[type="email"]', EMPLOYEE_EMAIL);
    await page.fill('input[type="password"]', EMPLOYEE_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    
    // Employee should see Check In link
    await expect(page.locator('text=Check In')).toBeVisible();
    
    // Logout
    await page.click('button:has-text("Logout")');
    
    // Test manager navigation
    await page.waitForURL(/\/login/);
    await page.fill('input[type="email"]', MANAGER_EMAIL);
    await page.fill('input[type="password"]', MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    
    // Manager should NOT see Check In link
    const checkInLink = page.locator('text=Check In');
    const isVisible = await checkInLink.isVisible().catch(() => false);
    expect(isVisible).toBeFalsy();
  });

  test('should show role-appropriate dashboard content', async ({ page }) => {
    // Test employee dashboard
    await page.goto('/');
    await page.fill('input[type="email"]', EMPLOYEE_EMAIL);
    await page.fill('input[type="password"]', EMPLOYEE_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    
    // Employee should see their assigned clients
    await expect(page.locator('text=Assigned Clients, text=Active Check-In')).toBeVisible();
    
    // Logout
    await page.click('button:has-text("Logout"), text=Logout');
    
    // Test manager dashboard
    await page.waitForURL(/\/login/);
    await page.fill('input[type="email"]', MANAGER_EMAIL);
    await page.fill('input[type="password"]', MANAGER_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    
    // Manager should see team activity
    await expect(page.locator('text=Team Activity, text=Team')).toBeVisible();
  });

  test('should clear auth state on logout', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('input[type="email"]', EMPLOYEE_EMAIL);
    await page.fill('input[type="password"]', EMPLOYEE_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/dashboard/);
    
    // Logout
    await page.click('button:has-text("Logout"), text=Logout');
    await page.waitForURL(/\/login/);
    
    // Try to access dashboard again
    await page.goto('/dashboard');
    
    // Should be redirected back to login
    await expect(page).toHaveURL(/\/login/);
  });
});
