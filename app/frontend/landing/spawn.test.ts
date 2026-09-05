import { describe, expect, it } from 'vitest';
import { scatterSpawn, type Scatter, type Spawn } from './spawn';

const base: Spawn = { x: 240, y: 70, z: 35800, yaw: (-50 * Math.PI) / 180 };
const scatter: Scatter = { side: 80, along: 50, altitude: 15, aimKm: 12, upk: 20 };
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

const aimOf = (s: Spawn) => ({ x: s.x - Math.sin(s.yaw), z: s.z - Math.cos(s.yaw) });

describe('scatterSpawn', () => {
  it('is the tuned start itself when the dice land in the middle', () => {
    const s = scatterSpawn(base, scatter, () => 0.5);
    expect(s.x).toBeCloseTo(base.x);
    expect(s.z).toBeCloseTo(base.z);
    expect(s.y).toBeCloseTo(base.y);
    expect(s.yaw).toBeCloseTo(base.yaw);
  });

  it('stays within the scatter box around the start', () => {
    for (const r of [() => 0, () => 1, seq(0, 1, 0.3), seq(0.9, 0.1, 0.7)]) {
      const s = scatterSpawn(base, scatter, r);
      expect(Math.hypot(s.x - base.x, s.z - base.z)).toBeLessThanOrEqual(Math.hypot(scatter.side, scatter.along) + 1e-9);
      expect(Math.abs(s.y - base.y)).toBeLessThanOrEqual(scatter.altitude);
    }
  });

  it('aims every spawn at the same landmark the tuned start looks at', () => {
    const fx = -Math.sin(base.yaw);
    const fz = -Math.cos(base.yaw);
    const aim = { x: base.x + fx * 12 * 20, z: base.z + fz * 12 * 20 };
    for (const r of [() => 0, () => 1, seq(0.2, 0.8, 0.5), seq(0.95, 0.05, 0.4)]) {
      const s = scatterSpawn(base, scatter, r);
      const want = Math.atan2(-(aim.x - s.x), -(aim.z - s.z));
      expect(Math.atan2(Math.sin(s.yaw - want), Math.cos(s.yaw - want))).toBeCloseTo(0, 9);
      // and the heading really points from the spawn toward the landmark
      const f = aimOf(s);
      expect((f.x - s.x) * (aim.x - s.x) + (f.z - s.z) * (aim.z - s.z)).toBeGreaterThan(0);
    }
  });

  it('moves sideways across the heading, not along it, for a pure side roll', () => {
    const s = scatterSpawn(base, { ...scatter, along: 0, altitude: 0 }, seq(1, 0.5, 0.5));
    const fx = -Math.sin(base.yaw);
    const fz = -Math.cos(base.yaw);
    const dx = s.x - base.x;
    const dz = s.z - base.z;
    expect(dx * fx + dz * fz).toBeCloseTo(0); // no component along the heading
    expect(Math.hypot(dx, dz)).toBeCloseTo(scatter.side);
  });
});
