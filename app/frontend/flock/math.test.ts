import { describe, expect, it } from 'vitest';
import { advance, blend, fold, localize, nearestCopy, relate, shouldSend, wrapAngle, type Pose } from './math';

const L = 87040;
const ph = { turnRate: 0.9, bank: 0.7 };
const pose = (over: Partial<Pose> = {}): Pose => ({ x: 0, y: 100, z: 0, yaw: 0, pitch: 0, roll: 0, speed: 40, ...over });

describe('fold', () => {
  it('mirrors past the ends and repeats every two lengths', () => {
    expect(fold(100, L)).toBeCloseTo(100);
    expect(fold(L + 100, L)).toBeCloseTo(L - 100);
    expect(fold(-100, L)).toBeCloseTo(100);
    expect(fold(2 * L + 42, L)).toBeCloseTo(42);
  });
});

describe('nearestCopy', () => {
  it('keeps a pose in the same copy when that is nearest', () => {
    expect(nearestCopy(500, 400, L)).toEqual({ z: 500, mirrored: false });
  });

  it('picks the mirrored copy across a fold', () => {
    // I am just past the south end (z = L + 20); a pilot at L − 30 is 50 units away in my copy
    expect(nearestCopy(L - 30, L + 20, L)).toEqual({ z: L + 30, mirrored: true });
    // and behind the north end
    expect(nearestCopy(60, -10, L)).toEqual({ z: -60, mirrored: true });
  });

  it('finds the copy two lengths over', () => {
    expect(nearestCopy(10, 2 * L + 5, L)).toEqual({ z: 2 * L + 10, mirrored: false });
  });
});

describe('localize', () => {
  it('returns the same object when nothing changes', () => {
    const p = pose({ z: 500 });
    expect(localize(p, 400, L)).toBe(p);
  });

  it('flips heading and bank in a mirrored copy so the bird flies over the same ground', () => {
    const p = pose({ z: L - 30, yaw: 0.3, roll: 0.2 });
    const q = localize(p, L + 20, L);
    expect(q.z).toBeCloseTo(L + 30);
    expect(wrapAngle(q.yaw - (Math.PI - 0.3))).toBeCloseTo(0);
    expect(q.roll).toBeCloseTo(-0.2);
    expect(fold(q.z, L)).toBeCloseTo(fold(p.z, L));
  });
});

describe('advance', () => {
  it('reproduces straight flight exactly', () => {
    const q = advance(pose({ speed: 40 }), 1, ph);
    expect(q.z).toBeCloseTo(-40);
    expect(q.x).toBeCloseTo(0);
    expect(q.y).toBeCloseTo(100);
  });

  it('climbs with pitch', () => {
    const q = advance(pose({ pitch: Math.PI / 6 }), 1, ph);
    expect(q.y).toBeCloseTo(120);
    expect(q.z).toBeCloseTo(-40 * Math.cos(Math.PI / 6));
  });

  it('bends the path with the bank, matching the scene: a full bank yaws at turnRate', () => {
    const q = advance(pose({ roll: 0.7 }), 1, ph);
    expect(q.yaw).toBeCloseTo(0.9);
    expect(q.x).toBeLessThan(0); // positive yaw swings the bird toward -x
  });

  it('is the identity for a non-positive step', () => {
    const p = pose();
    expect(advance(p, 0, ph)).toBe(p);
  });
});

describe('blend', () => {
  it('eases position and takes angles the short way round', () => {
    const q = blend(pose({ yaw: 3.1 }), pose({ x: 10, yaw: -3.1 }), 0.5);
    expect(q.x).toBe(5);
    expect(Math.abs(wrapAngle(q.yaw))).toBeGreaterThan(3.1); // through ±π, not through 0
  });

  it('snaps across a jump', () => {
    const target = pose({ x: 500 });
    expect(blend(pose(), target, 0.1)).toBe(target);
  });
});

describe('shouldSend', () => {
  it('lets an input change through almost at once', () => {
    expect(shouldSend(1050, 1000, { changed: true, urgent: true, spectator: false })).toBe(true);
    expect(shouldSend(1030, 1000, { changed: true, urgent: true, spectator: false })).toBe(false);
  });

  it('paces ordinary flight at the base rate and idles at the heartbeat', () => {
    expect(shouldSend(1090, 1000, { changed: true, urgent: false, spectator: false })).toBe(false);
    expect(shouldSend(1100, 1000, { changed: true, urgent: false, spectator: false })).toBe(true);
    expect(shouldSend(1900, 1000, { changed: false, urgent: false, spectator: false })).toBe(false);
    expect(shouldSend(2000, 1000, { changed: false, urgent: false, spectator: false })).toBe(true);
  });

  it('only pings once a second as a spectator', () => {
    expect(shouldSend(1500, 1000, { changed: true, urgent: true, spectator: true })).toBe(false);
    expect(shouldSend(2000, 1000, { changed: true, urgent: true, spectator: true })).toBe(true);
  });
});

describe('relate', () => {
  const L = 1000;
  it('reads a target dead ahead, above, on the local copy', () => {
    const r = relate({ x: 0, y: 100, z: 0, yaw: 0 }, { x: 0, y: 160, z: -300 }, L);
    expect(r.ground).toBeCloseTo(300);
    expect(r.climb).toBe(60);
    expect(r.bearing).toBeCloseTo(0);
    expect(r.distance).toBeCloseTo(Math.hypot(300, 60));
  });
  it('signs the bearing positive to the right', () => {
    // heading north (−z), a target due east (+x) is on the right
    expect(relate({ x: 0, y: 0, z: 0, yaw: 0 }, { x: 100, y: 0, z: 0 }, L).bearing).toBeCloseTo(Math.PI / 2);
    expect(relate({ x: 0, y: 0, z: 0, yaw: 0 }, { x: -100, y: 0, z: 0 }, L).bearing).toBeCloseTo(-Math.PI / 2);
    // heading west (yaw +90°), the same eastern target is behind
    expect(Math.abs(relate({ x: 0, y: 0, z: 0, yaw: Math.PI / 2 }, { x: 100, y: 0, z: 0 }, L).bearing)).toBeCloseTo(Math.PI);
  });
  it('uses the nearest copy of the target along z', () => {
    const r = relate({ x: 0, y: 0, z: 1985, yaw: 0 }, { x: 0, y: 0, z: 10 }, L);
    expect(r.ground).toBeCloseTo(5); // the mirrored copy at 1990, not the straight one at 2010
    expect(r.bearing).toBeCloseTo(Math.PI); // and it is behind a bird flying toward −z
  });
});
