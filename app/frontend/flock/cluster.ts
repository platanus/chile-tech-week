// How the other condors are summarised on the map of Chile. The map is a few hundred pixels
// tall for a country 4,300 km long: a busy evening would paint it solid. Points are binned onto
// a grid of `cell` pixels and each bin becomes one mark at the centroid of its points, sized by
// how many it stands for. Pure, so it runs under Vitest; the drawing is in map.ts.

export interface Cluster {
  px: number;
  py: number;
  n: number;
  /** The colour of the one pilot in a bin of one; null for a crowd. */
  color: string | null;
}

export function clusterPoints(points: { px: number; py: number; color: string }[], cell: number): Cluster[] {
  const bins = new Map<number, { sx: number; sy: number; n: number; color: string | null }>();
  for (const p of points) {
    const key = Math.floor(p.px / cell) * 65536 + Math.floor(p.py / cell);
    const b = bins.get(key);
    if (b) {
      b.sx += p.px;
      b.sy += p.py;
      b.n++;
      b.color = null;
    } else bins.set(key, { sx: p.px, sy: p.py, n: 1, color: p.color });
  }
  const out: Cluster[] = [];
  for (const b of bins.values()) out.push({ px: b.sx / b.n, py: b.sy / b.n, n: b.n, color: b.color });
  return out.sort((a, b) => a.n - b.n); // crowds drawn last, over the singles
}

/** A mark's radius in px: a dot for one, growing slowly with the crowd it stands for. */
export const clusterRadius = (n: number) => Math.min(4.5, 1.6 + Math.log2(n) * 0.9);
