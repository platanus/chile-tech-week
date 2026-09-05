import { describe, expect, it } from 'vitest';
import { landingBeside, OFFSET } from './visit';

describe('landingBeside', () => {
  const L = 1000;

  it('lands behind and beside a bird flying north, on its heading and altitude', () => {
    const p = landingBeside({ x: 100, y: 150, z: 400, yaw: 0 }, 420, L);
    expect(p.yaw).toBe(0);
    expect(p.y).toBe(150);
    expect(p.z).toBeCloseTo(400 + OFFSET.behind); // behind = +z when flying toward −z
    expect(Math.abs(p.x - 100)).toBeCloseTo(OFFSET.side);
    expect(Math.hypot(p.x - 100, p.z - 400)).toBeGreaterThan(10); // never on top of them
  });

  it('keeps the offset on any heading', () => {
    const t = { x: 0, y: 100, z: 0, yaw: 1.3 };
    const p = landingBeside(t, 0, L);
    expect(Math.hypot(p.x, p.z)).toBeCloseTo(Math.hypot(OFFSET.behind, OFFSET.side));
    // the target is ahead: the vector to it projects positively onto the landing heading
    const fx = -Math.sin(p.yaw);
    const fz = -Math.cos(p.yaw);
    expect((t.x - p.x) * fx + (t.z - p.z) * fz).toBeCloseTo(OFFSET.behind);
  });

  it('faces north at a roster sighting, coming from the south', () => {
    const p = landingBeside({ x: 0, y: 100, z: 500, yaw: null }, 500, L);
    expect(p.yaw).toBe(0);
    expect(p.z).toBeCloseTo(500 + OFFSET.behind);
  });

  it('lands in the viewer\'s copy of the strip', () => {
    const p = landingBeside({ x: 0, y: 100, z: 100, yaw: 0 }, 2000 - 90, L);
    // the mirrored copy of z=100 is 2000−100=1900, right by the viewer; the heading flips with it
    expect(Math.abs(p.z - 1900)).toBeLessThan(OFFSET.behind + 1);
    expect(Math.abs(Math.abs(p.yaw) - Math.PI)).toBeLessThan(1e-9);
  });
});

describe('landingBeside precision', () => {
  it('marks a roster sighting as not precise and a remote in view as precise', () => {
    expect(landingBeside({ x: 0, y: 0, z: 0, yaw: null }, 0, 1000).precise).toBe(false);
    expect(landingBeside({ x: 0, y: 0, z: 0, yaw: 0.4 }, 0, 1000).precise).toBe(true);
  });
});
