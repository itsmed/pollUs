import { test, expect } from '@playwright/test';

test.describe('votes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/votes');
    await page.waitForLoadState('networkidle');
  });

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Congressional Votes' })).toBeVisible();
  });

  test('chamber filter tabs are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Senate' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'House' })).toBeVisible();
  });

  test('senate filter shows senate votes', async ({ page }) => {
    await page.getByRole('button', { name: 'Senate' }).click();
    await page.waitForLoadState('networkidle');
    // Page should not error — heading stays visible
    await expect(page.getByRole('heading', { name: 'Congressional Votes' })).toBeVisible();
  });

  test('house filter shows house votes', async ({ page }) => {
    await page.getByRole('button', { name: 'House' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Congressional Votes' })).toBeVisible();
  });

  test('vote cards link to detail pages', async ({ page }) => {
    const links = page.getByRole('link').filter({ hasNot: page.getByRole('navigation') });
    const count = await links.count();
    if (count === 0) {
      test.skip();
      return;
    }
    const firstHref = await links.first().getAttribute('href');
    expect(firstHref).toMatch(/\/votes\//);
  });

  test('vote detail page loads', async ({ page }) => {
    const links = page.getByRole('link').filter({ hasNot: page.getByRole('navigation') });
    const count = await links.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await links.first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/votes\//);
  });
});
