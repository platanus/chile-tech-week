// The low-poly wireframe: the landing scene's terrain, flattened into SVG so it can live in
// the brand (backdrops, dividers, marks, social cards). Sea on the left, cordillera on the
// right, like the scene's coast. Pure and deterministic (seeded), no DOM: the generator page
// draws it inline and serialises it with toSvg. Ported from the low-poly-montains prototype.

export type WireOptions = {
  width: number;
  height: number;
  seed?: number;
  /** Columns of vertices across */
  cols?: number;
  /** Rows of vertices in depth */
  rows?: number;
  /** 'ridge': a perspective terrain seen from the condor. 'flat': a jittered triangulated plane, good for tiles. */
  mode?: 'ridge' | 'flat';
  /** Where the horizon sits, 0..1 of height (ridge mode) */
  horizon?: number;
  /** Peak amplitude as a fraction of height */
  amplitude?: number;
  /** Stroke width in user units */
  stroke?: number;
  /** Fill faces with `fill` so nearer geometry hides farther lines (lines mode). Default true. */
  occlude?: boolean;
  /** Face colour in lines mode; the background the asset is meant for. Default black. */
  fill?: string;
  /** Stroke colour; defaults to the brand red */
  strokeColor?: string;
  /** 'lines': hairlines over occluding faces. 'sheets': each triangle is a translucent sheet shaded by its facing. */
  fillMode?: 'lines' | 'sheets';
  /** Sheet opacity range [flat/away, facing the light] */
  sheetOpacity?: [number, number];
  /** 0 = rolling hills, 1 = knife-edge cordillera. Default 0.5. */
  steep?: number;
  /** Where the coast is, 0..1 across: sea to its left, the climb starts there. Default 0.22. */
  coast?: number;
  /** A solid background behind the mesh (toSvg only); none by default */
  background?: string | null;
};

/** One bucket of same-opacity triangles, in painter's order */
export type Facet = { d: string; opacity: number };

type P = [number, number];
type V3 = [number, number, number];

// --- deterministic noise
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const smooth = (t: number) => t * t * (3 - 2 * t);
function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const a = hash(x0, y0, seed);
  const b = hash(x0 + 1, y0, seed);
  const c = hash(x0, y0 + 1, seed);
  const d = hash(x0 + 1, y0 + 1, seed);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
function fbm(x: number, y: number, seed: number, octaves = 3): number {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    v += amp * valueNoise(x * f, y * f, seed + i * 101);
    amp *= 0.5;
    f *= 2.1;
  }
  return v;
}

/** Height field: sea on the left, cordillera on the right. Built to read as the Andes: a spine
 *  of high peaks running into the depth, sharp ridged noise on top, a fast climb from the
 *  coastal plain. u across 0..1, v depth 0..1 (0 near, 1 far). */
function terrain(u: number, v: number, seed: number, steep = 0.5, coast = 0.22): number {
  const ridge = (n: number, k: number) => Math.pow(1 - Math.abs(n * 2 - 1), k); // V-shaped, sharpened by k
  const big = ridge(fbm(u * 3.2 + 3, v * 2.6 + 7, seed), 1 + steep); // main massifs
  const mid = ridge(fbm(u * 7 + 11, v * 6 + 2, seed + 31), 0.8 + 0.8 * steep); // secondary crests
  const fine = ridge(fbm(u * 15, v * 13, seed + 77), 1); // jagged rock
  // the spine: a range whose crest wanders as it recedes
  const crest = 0.44 + coast + 0.1 * Math.sin(v * 5.5 + seed * 0.3) + 0.06 * Math.sin(v * 13 + 1.7);
  const spine = Math.exp(-Math.pow((u - crest) / 0.16, 2));
  // coastal plain climbs quickly into the foothills
  const climb = smooth(Math.min(1, Math.max(0, (u - coast) / 0.22)));
  const sea = fbm(u * 10, v * 10, seed + 55) * 0.04;
  const sp = 0.1 + 0.6 * steep; // how much the spine dominates
  const mountains = 0.12 + 0.42 * big + 0.18 * mid + (0.02 + 0.08 * steep) * fine + spine * (sp + sp * big);
  // normalise so `amplitude` still means "peak height as a fraction of the canvas"
  return Math.min(1, sea + (climb * mountains) / (0.95 + 1.3 * sp));
}

export type WireMesh = {
  width: number;
  height: number;
  /** Rows of triangles as path `d` strings, far to near (lines mode) */
  rows: string[];
  /** Shaded translucent triangles, far to near, bucketed by opacity (sheets mode) */
  facets?: Facet[];
};

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
function norm3(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
const f = (n: number) => Math.round(n * 10) / 10;

export function buildMesh(o: WireOptions): WireMesh {
  const {
    width: W,
    height: H,
    seed = 7,
    cols = 28,
    rows = 14,
    mode = 'ridge',
    horizon = 0.42,
    amplitude = 0.6,
    steep = 0.5,
    coast = 0.22,
  } = o;

  // vertex grid (screen) + world coords for shading: [x across, height, depth]
  const grid: P[][] = [];
  const world: V3[][] = [];
  for (let j = 0; j <= rows; j++) {
    const line: P[] = [];
    const wline: V3[] = [];
    const t = j / rows; // 0 near … 1 far
    for (let i = 0; i <= cols; i++) {
      const u = i / cols;
      // jitter so the triangles are not a regular lattice
      const jx = (hash(i, j, seed + 1) - 0.5) * 0.8;
      const jy = (hash(i, j, seed + 2) - 0.5) * 0.8;
      if (mode === 'flat') {
        const x = ((i + jx) / cols) * W;
        const y = ((j + jy) / rows) * H;
        line.push([x, y]);
        wline.push([x, fbm(u * 3, t * 3, seed + 9) * H * 0.6, y]);
      } else {
        // perspective: far rows compress towards the horizon and towards the centre
        const depth = 1 - Math.pow(1 - t, 1.9);
        const scale = 1 - depth * 0.78;
        const yBase = H * horizon + (H - H * horizon) * (1 - depth);
        const h = terrain(u, t, seed, steep, coast) * amplitude * H * scale;
        const x = W / 2 + ((u - 0.5) * W * (0.55 + 0.45 * (1 - depth)) * 1.6 + jx * (W / cols) * scale);
        const y = yBase - h + jy * (H / rows) * scale * 0.4;
        line.push([x, y]);
        wline.push([u * W, terrain(u, t, seed, steep, coast) * amplitude * H, t * H * 1.2]);
      }
    }
    grid.push(line);
    world.push(wline);
  }

  const sheets = o.fillMode === 'sheets';
  const [oMin, oMax] = o.sheetOpacity ?? [0.06, 0.55];
  const L = norm3([-0.45, 0.8, -0.4]); // light from upper-left, slightly towards the viewer
  const buckets = 7;
  const facets: Facet[] = [];

  // triangles, one path per row, far to near (painter's order)
  const rowPaths: string[] = [];
  for (let j = rows - 1; j >= 0; j--) {
    let d = '';
    const perBucket: string[] = Array.from({ length: buckets }, () => '');
    for (let i = 0; i < cols; i++) {
      const idx: [number, number][] = [
        [j, i],
        [j, i + 1],
        [j + 1, i],
        [j + 1, i + 1],
      ];
      const flip = hash(i, j, seed + 3) > 0.5;
      const tris: [number, number, number][] = flip
        ? [
            [0, 1, 2],
            [1, 3, 2],
          ]
        : [
            [0, 1, 3],
            [0, 3, 2],
          ];
      for (const tri of tris) {
        const pts = tri.map((k) => grid[idx[k][0]][idx[k][1]]);
        const seg = `M${f(pts[0][0])} ${f(pts[0][1])}L${f(pts[1][0])} ${f(pts[1][1])}L${f(pts[2][0])} ${f(pts[2][1])}Z`;
        d += seg;
        if (sheets) {
          const w = tri.map((k) => world[idx[k][0]][idx[k][1]]);
          const n = norm3(cross(sub(w[1], w[0]), sub(w[2], w[0])));
          const lit = Math.abs(n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
          const hNorm = Math.min(1, (w[0][1] + w[1][1] + w[2][1]) / (3 * amplitude * H + 1e-6));
          const shade = 0.7 * lit + 0.3 * hNorm;
          const bucket = Math.min(buckets - 1, Math.floor(shade * buckets));
          perBucket[bucket] += seg;
        }
      }
    }
    rowPaths.push(d);
    if (sheets) {
      perBucket.forEach((pd, b) => {
        if (pd) facets.push({ d: pd, opacity: +(oMin + ((oMax - oMin) * b) / (buckets - 1)).toFixed(3) });
      });
    }
  }
  return { width: W, height: H, rows: rowPaths, facets: sheets ? facets : undefined };
}

export const BRAND_RED = '#EE2B2B';

/** Full standalone SVG markup for download or copy. */
export function toSvg(o: WireOptions): string {
  const m = buildMesh(o);
  const stroke = o.strokeColor ?? BRAND_RED;
  const sw = o.stroke ?? 1;
  const bg = o.background ? `\n  <rect width="${m.width}" height="${m.height}" fill="${o.background}"/>` : '';
  const open = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${m.width} ${m.height}" width="${m.width}" height="${m.height}"`;
  if (m.facets) {
    const paths = m.facets.map((fc) => `  <path d="${fc.d}" fill-opacity="${fc.opacity}"/>`).join('\n');
    return `${open}>${bg}
<g fill="${stroke}" stroke="${stroke}" stroke-opacity="0.5" stroke-width="${sw}" stroke-linejoin="round">
${paths}
</g>
</svg>
`;
  }
  const fill = o.occlude === false ? 'none' : (o.fill ?? '#000000');
  const paths = m.rows.map((d) => `  <path d="${d}"/>`).join('\n');
  return `${open}>${bg}
<g fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round">
${paths}
</g>
</svg>
`;
}
