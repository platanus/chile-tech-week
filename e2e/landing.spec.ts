import { expect, test } from '@playwright/test';

// The landing's copy and the way into the platform. The condor scene itself is not
// asserted on (WebGL under headless Chromium is a separate check, see AGENTS.md).
test('the landing carries the 2026 copy, the dates, and links into the programme and the form', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#hero .lede')).toHaveText('La semana descentralizada con los mejores eventos tech del país.');
  const dates = page.locator('#hero .dates');
  await expect(dates).toBeVisible();
  await expect(dates).toContainText('16');
  await expect(dates).toContainText('22');
  await expect(dates).toContainText('noviembre 2026');

  await expect(page.locator('#hero .cta a', { hasText: 'Ver eventos' })).toHaveAttribute('href', '/events');
  await expect(page.locator('#hero .cta a', { hasText: 'Organiza un evento' })).toHaveAttribute('href', '/events/new');
  await expect(page).toHaveTitle(/Chile Tech Week 2026/);

  await page.locator('#hero .cta a', { hasText: 'Ver eventos' }).click();
  await expect(page).toHaveURL(/\/events$/);
});

test('the landing hero fits a phone without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#hero .dates')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
