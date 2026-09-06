import { expect, type Page, test } from '@playwright/test';

// The render quality ladder (scene.ts): the GPU's name picks a starting rung, the frame times walk
// up or down from it, and the rung it stops on is remembered. These need a real WebGL context —
// headless Chromium gets one from ANGLE's software renderer, which is also a device slow enough
// that the ladder has to walk all the way down, so the walk itself is under test here.
test.use({
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  viewport: { width: 900, height: 600 },
});

type Quality = {
  level: number; tier: number; name: string; step: string; source: string;
  locked: boolean; calibrating: boolean; ceiling: number; steps: number; verdict: string;
  cost: number; budget: number; dprCap: number; pixelRatio: number;
  viewDistance: number; fog: number; pendingView: number | null; pendingFog: number | null;
};
declare global {
  interface Window {
    condorScene: { quality(): Quality; calibrate(from?: number): void; pick(level: number): void; forget(): void };
  }
}

const quality = (page: Page) => page.evaluate(() => window.condorScene.quality());
async function scene(page: Page) {
  await page.waitForFunction(() => !!window.condorScene, null, { timeout: 30_000 });
}
const settled = (page: Page, timeout = 60_000) =>
  page.waitForFunction(() => window.condorScene.quality().locked && !window.condorScene.quality().calibrating, null, { timeout });

test('the ladder measures the device, settles, and the next visit starts there', async ({ page }) => {
  await page.goto('/');
  await scene(page);
  await settled(page);

  const measured = await quality(page);
  expect(measured.source).toBe('measured');
  expect(measured.calibrating).toBe(false);
  expect(measured.cost).toBeGreaterThan(0); // it really timed frames rather than giving up
  expect(measured.verdict).toContain('SwiftShader');
  expect(measured.name).toBe('low'); // a software renderer belongs at the bottom
  expect(measured.pixelRatio).toBeLessThanOrEqual(1);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('condor.quality.v2') ?? 'null'));
  expect(stored).toMatchObject({ level: measured.level });
  expect(stored.gpu).toContain('SwiftShader');

  // second visit: the same rung, straight away, and nothing is measured again
  await page.reload();
  await scene(page);
  let measuredAgain = false;
  for (let i = 0; i < 20; i++) {
    if ((await quality(page)).calibrating) measuredAgain = true;
    await page.waitForTimeout(250);
  }
  const remembered = await quality(page);
  expect(measuredAgain).toBe(false);
  expect(remembered.source).toBe('remembered');
  expect(remembered.level).toBe(measured.level);
  expect(remembered.locked).toBe(true);
});

test('a device that cannot keep up walks back down the ladder', async ({ page }) => {
  await page.goto('/');
  await scene(page);
  await settled(page);

  await page.evaluate(() => window.condorScene.calibrate(7)); // put it on the top rung and let it judge
  expect((await quality(page)).level).toBe(7);
  await settled(page, 90_000);

  const q = await quality(page);
  expect(q.level).toBeLessThan(7);
  expect(q.steps).toBeGreaterThan(0);
  expect(q.ceiling).toBeLessThan(7); // a rung that failed is never climbed back to
  expect(q.locked).toBe(true);
});

// The fog the auto mode keeps at a view distance, and a wait for the scene to be sitting at it
// with nothing in flight (a software renderer takes its time building a ring).
const fogFor = (viewDistance: number) => 2.5 / viewDistance;
const restAt = (page: Page, viewDistance: number) =>
  page.waitForFunction(
    (vd) => {
      const q = window.condorScene.quality();
      return q.viewDistance === vd && q.pendingView === null && q.pendingFog === null && Math.abs(q.fog - 2.5 / vd) < 1e-7;
    },
    viewDistance,
    { timeout: 180_000 },
  );

test('dropping a tier thickens the fog before the horizon moves', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/');
  await scene(page);
  await settled(page);

  await page.evaluate(() => window.condorScene.pick(2)); // medium, 2000 units
  await restAt(page, 2000);

  await page.evaluate(() => window.condorScene.pick(1)); // low, 1400: a tier down
  const first = await quality(page);
  expect(first.viewDistance).toBe(2000); // nothing on screen has moved yet
  expect(first.pendingView).toBe(1400);
  expect(first.fog).toBeCloseTo(fogFor(2000), 6);

  const trail: { fog: number; vd: number }[] = [];
  for (let i = 0; i < 400 && (trail.at(-1)?.vd ?? 2000) === 2000; i++) {
    const q = await quality(page);
    trail.push({ fog: q.fog, vd: q.viewDistance });
    await page.waitForTimeout(50);
  }
  const shrunk = trail.findIndex((s) => s.vd === 1400);
  expect(shrunk).toBeGreaterThan(0); // it did shrink, and not on the first sample
  // the fog was already at the thicker end when the ring shrank, and it got there gradually
  expect(trail[shrunk].fog).toBeCloseTo(fogFor(1400), 6);
  const rise = fogFor(1400) - fogFor(2000);
  const steps = trail.slice(0, shrunk + 1).map((s, i, a) => (i ? s.fog - a[i - 1].fog : 0));
  expect(Math.max(...steps)).toBeLessThan(rise * 0.9); // no single jump from one end to the other
  expect(steps.filter((d) => d > 0).length).toBeGreaterThan(2); // it eased across several frames
});

test('climbing a tier builds the new ring under the old fog', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/');
  await scene(page);
  await settled(page);

  await page.evaluate(() => window.condorScene.pick(1)); // low, 1400 units
  await restAt(page, 1400);

  await page.evaluate(() => window.condorScene.pick(2)); // medium, 2000: a tier up
  const first = await quality(page);
  expect(first.viewDistance).toBe(2000); // the wider ring starts building at once …
  expect(first.fog).toBeCloseTo(fogFor(1400), 6); // … out of sight, behind the fog it had
  expect(first.pendingFog).toBeCloseTo(fogFor(2000), 6);

  // the fog only thins once every chunk of the new ring is there
  await restAt(page, 2000);
});
