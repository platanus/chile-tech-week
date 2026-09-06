import { expect, test } from '@playwright/test';

// Leaving the landing, and the programme's list animating between filters.
test('the landing dims before it hands over', async ({ page }) => {
  // The navigation is blocked so the landing stays put and the fade can be read: with the
  // scene running, sampling it across a real navigation is a race.
  await page.route('**/events', (route) => route.abort());
  await page.goto('/');
  await page.waitForTimeout(1200);

  await page.click('a[data-exit][href="/events"]', { noWaitAfter: true });
  await page.waitForTimeout(300);

  const opacity = await page.evaluate(() => Number(getComputedStyle(document.getElementById('fade')!).opacity));
  expect(opacity).toBeGreaterThan(0.3);
  expect(page.url()).toMatch(/localhost:\d+\/$/);
});

test('the landing hands over to the programme', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1200);

  await page.click('a[data-exit][href="/events"]');
  await page.waitForURL('**/events');

  // A real navigation, so the scene is gone with its document instead of freezing on top.
  expect(await page.evaluate(() => document.querySelectorAll('canvas').length)).toBe(0);
  expect(await page.evaluate(() => document.body.className)).not.toContain('game');
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole('heading', { level: 1, name: 'Eventos' })).toBeVisible();
});

test('the list animates when the filters change', async ({ page }) => {
  await page.goto('/events');
  const rows = page.locator('[data-flip-key]');
  const all = await rows.count();
  expect(all).toBeGreaterThan(3);

  await page.getByRole('button', { name: /^Mié 18/ }).click();
  // Rows that stay slide, rows that go fade out: both are running animations.
  expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)).toBeGreaterThan(0);

  await page.waitForTimeout(500);
  const monday = await rows.count();
  expect(monday).toBeGreaterThan(0);
  expect(monday).toBeLessThan(all);
  // The ghosts clean themselves up.
  expect(await page.locator('[aria-hidden="true"][style*="position: absolute"]').count()).toBe(0);
});
