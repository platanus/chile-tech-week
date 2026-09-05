import { describe, expect, it } from 'vitest';
import { PlaceIndex } from './places';

const places = [
  { name: 'Santiago', kmX: 18, kmZ: 1785, pop: 6_000_000 },
  { name: 'Valparaíso', kmX: -80, kmZ: 1770, pop: 300_000 },
  { name: 'Rancagua', kmX: 20, kmZ: 1860, pop: 240_000 },
  { name: 'Arica', kmX: -30, kmZ: 20, pop: 200_000 },
  { name: 'Punta Arenas', kmX: 60, kmZ: 4100, pop: 130_000 },
];

describe('PlaceIndex', () => {
  const index = new PlaceIndex(places);

  it('finds the nearest place whatever the input order', () => {
    expect(index.nearest(15, 1790)?.name).toBe('Santiago');
    expect(index.nearest(-70, 1775)?.name).toBe('Valparaíso');
    expect(index.nearest(0, 0)?.name).toBe('Arica');
    expect(index.nearest(100, 5000)?.name).toBe('Punta Arenas');
  });

  it('measures the distance in km', () => {
    expect(index.nearest(18, 1788)?.km).toBeCloseTo(3);
  });

  it('prefers a place further along z when it is closer overall', () => {
    // Rancagua is 75 km south of Santiago; a point between them but far east is nearer Rancagua
    expect(index.nearest(20, 1830)?.name).toBe('Rancagua');
  });

  it('agrees with a brute-force search', () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const many = Array.from({ length: 400 }, (_, i) => ({ name: `p${i}`, kmX: rnd() * 400 - 200, kmZ: rnd() * 4300, pop: 1 }));
    const idx = new PlaceIndex(many);
    for (let k = 0; k < 200; k++) {
      const x = rnd() * 400 - 200;
      const z = rnd() * 4300;
      const brute = many.reduce((b, p) => (Math.hypot(p.kmX - x, p.kmZ - z) < Math.hypot(b.kmX - x, b.kmZ - z) ? p : b));
      expect(idx.nearest(x, z)?.name).toBe(brute.name);
    }
  });

  it('is null without places', () => {
    expect(new PlaceIndex([]).nearest(0, 0)).toBeNull();
  });
});
