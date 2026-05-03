import { test, expect } from '@playwright/test';

test.describe('auth', () => {
  test('shows user name and log out button when authenticated', async ({ page }) => {
    await page.goto('/');
    // Wait for the auth check to settle
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dev User' })).toBeVisible();
  });

  test('shows log in button when server returns unauthenticated', async ({ page }) => {
    // In dev mode the server auto-logs in dev@local.dev even without a cookie,
    // so clearing cookies alone doesn't produce an unauthenticated state.
    // Route the auth check to return 401 to simulate a logged-out browser.
    await page.route('**/api/auth/me', route =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not authenticated' }) })
    );
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  });

  test('log out clears session and shows log in', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Log out' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  });

  test('profile link is visible when authenticated', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('link', { name: 'Dev User' })).toBeVisible();
  });

  test('profile link navigates to /profile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'Dev User' }).click();
    await expect(page).toHaveURL('/profile');
  });

  test('log in button navigates to /login', async ({ page }) => {
    await page.route('**/api/auth/me', route =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not authenticated' }) })
    );
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL('/login');
  });
});
