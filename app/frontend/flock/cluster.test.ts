import { describe, expect, it } from 'vitest';
import { clusterPoints, clusterRadius } from './cluster';

describe('clusterPoints', () => {
  it('keeps singles apart and merges a crowd in one cell at its centroid', () => {
    const out = clusterPoints(
      [
        { px: 10, py: 10, color: '#a' },
        { px: 12, py: 11, color: '#b' },
        { px: 40, py: 300, color: '#c' },
      ],
      5,
    );
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ px: 40, py: 300, n: 1, color: '#c' });
    expect(out[1]).toEqual({ px: 11, py: 10.5, n: 2, color: null });
  });

  it('never merges across a cell edge', () => {
    const out = clusterPoints(
      [
        { px: 4.9, py: 0, color: '#a' },
        { px: 5.1, py: 0, color: '#b' },
      ],
      5,
    );
    expect(out).toHaveLength(2);
  });

  it('orders crowds after singles', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ px: (i % 5) * 20, py: 0, color: '#x' }));
    many.push({ px: 200, py: 200, color: '#y' });
    const out = clusterPoints(many, 5);
    expect(out.map((c) => c.n)).toEqual([1, 10, 10, 10, 10, 10]);
  });
});

describe('clusterRadius', () => {
  it('grows with the crowd and caps', () => {
    expect(clusterRadius(1)).toBeCloseTo(1.6);
    expect(clusterRadius(2)).toBeGreaterThan(clusterRadius(1));
    expect(clusterRadius(1000)).toBe(4.5);
  });
});
