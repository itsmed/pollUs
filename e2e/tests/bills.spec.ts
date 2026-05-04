import { test, expect } from '@playwright/test';

test.describe('bills', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bills');
    await page.waitForLoadState('networkidle');
  });

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Bills' })).toBeVisible();
  });

  test('shows loading state or bill list', async ({ page }) => {
    // Either shows bills or an empty/error state — never a blank page
    const heading = page.getByRole('heading', { name: 'Bills' });
    await expect(heading).toBeVisible();
    const content = page.locator('main, [role="main"]').first();
    await expect(content).not.toBeEmpty();
  });

  test('bill cards link to detail pages', async ({ page }) => {
    // Only run if bills are present
    const links = page.getByRole('link').filter({ hasText: /HR|S\.|HJ|SJ/i });
    const count = await links.count();
    if (count === 0) {
      test.skip();
      return;
    }
    const firstHref = await links.first().getAttribute('href');
    expect(firstHref).toMatch(/\/bills\//);
  });

  test('bill detail page loads when navigating to a bill', async ({ page }) => {
    const links = page.getByRole('link').filter({ hasText: /HR|S\.|HJ|SJ/i });
    const count = await links.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await links.first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/bills\//);
  });
});
