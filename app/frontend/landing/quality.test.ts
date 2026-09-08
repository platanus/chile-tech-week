/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

// Exercise the scene's actual controller with deterministic frame timing, without needing
// a GPU (software WebGL cannot reproduce a Mac sustaining 120 fps).
const source = readFileSync(new URL('./scene.ts', import.meta.url), 'utf8');
const controller = source.slice(source.indexOf('// ---------------------------------------------------------------- quality'), source.indexOf("// the display's frame interval"));
function scene() {
  let now = 1000;
  const stored = new Map<string, string>();
  const context = {
    performance: { now: () => now },
    localStorage: { getItem: (key: string) => stored.get(key), setItem: (key: string, value: string) => stored.set(key, value) },
    innerWidth: 1500, innerHeight: 1000, devicePixelRatio: 2,
    P: { quality: 'auto', fogAuto: true, fogDensity: 0.00125, viewDistance: 2000, ambientFps: 30 },
    mode: 'game', lastPending: 0,
    scene: { fog: { density: 0.00125 } },
    clamp: (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v)),
    applyAtmosphere() {}, refreshGui() {},
  };
  const api = runInNewContext(`${controller}\n({ quality, adaptQuality, pickLevel, calibrate, settleQuality })`, context);
  api.quality.displayMs = 1000 / 120;
  api.quality.source = 'remembered';
  api.quality.locked = true;
  function advance(seconds: number, fps = 120) {
    for (let i = 0; i < Math.round(seconds * fps); i++) {
      now += 1000 / fps;
      // Model the terrain ring completing on the following frame.
      context.lastPending = 0;
      api.adaptQuality(1 / fps, true);
    }
  }
  return { ...api, advance, context, stored };
}

describe('automatic quality trials', () => {
  it('climbs from cached Medium through High to Ultra at 120 fps', () => {
    const s = scene();
    s.advance(12);
    expect(s.quality.level).toBe(5);
    expect(s.quality.trialFrom).toBe(4);
    s.advance(4);
    expect(s.quality.trialFrom).toBeNull();
    expect(s.quality.locked).toBe(true);
    s.advance(32);
    expect(s.quality.level).toBe(7);
    expect(s.quality.locked).toBe(true);
    expect(JSON.parse(s.stored.get('condor.quality.v2')).level).toBe(7);
  });

  it('rolls back a failed trial and waits a minute before retrying', () => {
    const s = scene();
    s.advance(12);
    s.advance(4, 30);
    expect(s.quality.level).toBe(4);
    expect(s.quality.trialFrom).toBeNull();
    s.advance(50);
    expect(s.quality.level).toBe(4);
    s.advance(12);
    expect(s.quality.level).toBe(5);
  });

  it('abandons a trial even when rendering becomes too slow to fill a sample window', () => {
    const s = scene();
    s.advance(12);
    s.advance(17, 2);
    expect(s.quality.level).toBe(4);
    expect(s.quality.trialFrom).toBeNull();
  });

  it('can trial higher quality at the ambient frame cap', () => {
    const s = scene();
    s.context.mode = 'ambient';
    s.advance(16, 30);
    expect(s.quality.level).toBe(5);
    expect(s.quality.locked).toBe(true);
  });

  it('does not treat persistent missed frames as spare capacity', () => {
    const s = scene();
    s.quality.level = 0;
    s.advance(20, 30);
    expect(s.quality.level).toBe(0);
  });

  it('leaves manual choices alone until auto is selected again', () => {
    const s = scene();
    s.pickLevel(4);
    s.advance(30);
    expect(s.quality.level).toBe(4);
    s.calibrate();
    expect(s.quality.manual).toBe(false);
  });

  it('discards smooth history across pauses and mode changes', () => {
    const s = scene();
    s.advance(10);
    s.quality.last = 0;
    s.advance(2);
    expect(s.quality.level).toBe(4);
    s.context.mode = 'ambient';
    s.advance(2, 30);
    expect(s.quality.level).toBe(4);
  });
});
