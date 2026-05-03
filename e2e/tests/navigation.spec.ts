import { test, expect } from '@playwright/test';

test.describe('navigation', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator('nav')).toBeVisible();
  });

  test('nav links are visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Bills' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Members' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Votes' })).toBeVisible();
  });

  test('navigates to bills page via nav link', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Bills' }).click();
    await expect(page).toHaveURL('/bills');
    await expect(page.getByRole('heading', { name: 'Bills' })).toBeVisible();
  });

  test('navigates to members page via nav link', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Members' }).click();
    await expect(page).toHaveURL('/members');
    await expect(page.getByRole('heading', { name: 'Members of Congress' })).toBeVisible();
  });

  test('navigates to votes page via nav link', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Votes' }).click();
    await expect(page).toHaveURL('/votes');
    await expect(page.getByRole('heading', { name: 'Congressional Votes' })).toBeVisible();
  });

  test('direct navigation to /bills', async ({ page }) => {
    await page.goto('/bills');
    await expect(page.getByRole('heading', { name: 'Bills' })).toBeVisible();
  });

  test('direct navigation to /members', async ({ page }) => {
    await page.goto('/members');
    await expect(page.getByRole('heading', { name: 'Members of Congress' })).toBeVisible();
  });

  test('direct navigation to /votes', async ({ page }) => {
    await page.goto('/votes');
    await expect(page.getByRole('heading', { name: 'Congressional Votes' })).toBeVisible();
  });
});
