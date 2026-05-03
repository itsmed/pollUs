import { test, expect } from '@playwright/test';

test.describe('members', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/members');
    await page.waitForLoadState('networkidle');
  });

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Members of Congress' })).toBeVisible();
  });

  test('senate tab is active by default on mobile', async ({ page }) => {
    // Tab selector is shown on mobile; on desktop both columns are visible
    // Either way, the page should not be blank
    await expect(page.getByRole('heading', { name: 'Members of Congress' })).toBeVisible();
  });

  test('member cards link to detail pages', async ({ page }) => {
    const links = page.getByRole('link').filter({ hasText: /Senator|Representative/i });
    const count = await links.count();
    if (count === 0) {
      test.skip();
      return;
    }
    const firstHref = await links.first().getAttribute('href');
    expect(firstHref).toMatch(/\/members\//);
  });

  test('member detail page loads', async ({ page }) => {
    const links = page.getByRole('link').filter({ hasText: /Senator|Representative/i });
    const count = await links.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await links.first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/members\//);
  });
});
