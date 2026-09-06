import { describe, expect, it } from 'vitest';
import { buildMesh, toSvg } from './mesh';

const base = { width: 1600, height: 600, seed: 7, cols: 34, rows: 16 };

describe('buildMesh', () => {
  it('is deterministic for a seed and changes with it', () => {
    expect(buildMesh(base)).toEqual(buildMesh({ ...base }));
    expect(buildMesh({ ...base, seed: 8 }).rows).not.toEqual(buildMesh(base).rows);
  });

  it('draws one path per row of triangles, far to near, inside the canvas', () => {
    const mesh = buildMesh(base);
    expect(mesh.rows).toHaveLength(16);
    expect(mesh.facets).toBeUndefined();
    const ys = mesh.rows.flatMap((d) => [...d.matchAll(/[ML][-\d.]+ ([-\d.]+)/g)].map((m) => Number(m[1])));
    expect(Math.max(...ys)).toBeLessThanOrEqual(600 + 60); // the near row's jitter may spill a little
    expect(Math.min(...ys)).toBeGreaterThan(0);
  });

  it('buckets sheets by shade, within the opacity range', () => {
    const mesh = buildMesh({ ...base, fillMode: 'sheets', sheetOpacity: [0.1, 0.5] });
    expect(mesh.facets!.length).toBeGreaterThan(16);
    for (const facet of mesh.facets!) {
      expect(facet.opacity).toBeGreaterThanOrEqual(0.1);
      expect(facet.opacity).toBeLessThanOrEqual(0.5);
      expect(facet.d.startsWith('M')).toBe(true);
    }
  });

  it('moves the climb with the coast: sea stays flat up to it', () => {
    const near = (coast: number) => {
      const mesh = buildMesh({ ...base, coast });
      // the last row is the nearest; its vertices' heights above the base line
      const pts = [...mesh.rows[mesh.rows.length - 1].matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
      const lift = (from: number, to: number) => {
        const ys = pts.filter(([x]) => x >= from * 1600 && x <= to * 1600).map(([, y]) => y);
        return Math.max(...ys) - Math.min(...ys);
      };
      return { left: lift(0.15, 0.45), right: lift(0.55, 0.85) };
    };
    const centred = near(0.5);
    expect(centred.left).toBeLessThan(600 * 0.1); // sea: a ripple at most
    expect(centred.right).toBeGreaterThan(600 * 0.25); // the cordillera
    expect(near(0.22).left).toBeGreaterThan(centred.left); // the default already climbs there
  });

  it('keeps a flat tile inside its square', () => {
    const mesh = buildMesh({ width: 400, height: 400, mode: 'flat', cols: 6, rows: 6 });
    const xs = mesh.rows.flatMap((d) => [...d.matchAll(/[ML]([-\d.]+) /g)].map((m) => Number(m[1])));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(-40);
    expect(Math.max(...xs)).toBeLessThanOrEqual(440);
  });
});

describe('toSvg', () => {
  it('writes a standalone SVG: brand red hairlines over black faces by default', () => {
    const svg = toSvg(base);
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 1600 600"/);
    expect(svg).toContain('fill="#000000" stroke="#EE2B2B"');
    expect(svg).not.toContain('<rect');
  });

  it('adds a background rect and drops the faces on request', () => {
    expect(toSvg({ ...base, background: '#000' })).toContain('<rect width="1600" height="600" fill="#000"/>');
    expect(toSvg({ ...base, occlude: false, strokeColor: '#fff' })).toContain('fill="none" stroke="#fff"');
  });

  it('writes sheets as translucent facets in the ink', () => {
    const svg = toSvg({ ...base, fillMode: 'sheets', strokeColor: '#525252' });
    expect(svg).toContain('fill="#525252" stroke="#525252" stroke-opacity="0.5"');
    expect(svg).toMatch(/fill-opacity="0\.\d+"/);
  });
});
