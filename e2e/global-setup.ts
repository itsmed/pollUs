import { chromium } from '@playwright/test';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';

export default async function globalSetup(): Promise<void> {
  // Seed the dev user so the server's auto-login middleware can find it.
  // The server sets the votr_user_id cookie automatically on every subsequent
  // request when dev@local.dev exists in the database.
  const response = await fetch(`${API_URL}/api/auth/dev-login`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(
      `Failed to seed dev user (${response.status}). Is the server running at ${API_URL}?`
    );
  }

  // Warm up a browser session so the auto-login cookie is written before tests
  // begin, avoiding a race between the first navigation and the /api/auth/me call.
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(process.env.E2E_BASE_URL ?? 'http://localhost:3000');
  // Wait for the client to finish the /api/auth/me request
  await page.waitForLoadState('networkidle');
  await browser.close();
}
