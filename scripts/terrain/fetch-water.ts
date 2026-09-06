// Builds the water layer of the streamed Chile dataset: lakes as a raster mask and rivers as
// draped polylines, per tile, from Overture Maps' water theme (OSM natural=water / waterway).
// Run: npm run water:fetch      (after npm run terrain:fetch; re-runs are offline)
//
// 1. DuckDB copies every lake, reservoir, pond and river in the corridor's lon/lat box from
//    Overture's parquet on S3 into scripts/terrain/.cache (subtype, name, flags and the geometry
//    as WKB), and each insert (Rapa Nui) as its own small extract. Streams, canals, springs and
//    the ocean stay out: the sea is already in the relief, and the streams are noise at 250 m.
// 2. Water bodies (polygons) of at least MIN_BODY_KM2 are rasterized onto the corridor's 250 m
//    cell grid (even-odd fill, so islands stay land). Each body's surface level is the median of
//    the published relief under it — the terrain we already have, no new elevation source —
//    so the client can flatten the noisy SRTM water surface to one plane. Bodies mostly under
//    sea level are inlets that the relief already draws as sea, and are dropped.
// 3. River centrelines (linestrings, permanent only) are simplified to SIMPLIFY_KM, cut at tile
//    edges (the crossing point goes to both pieces, so lines meet across tiles) and stored per
//    tile in 1/32-cell units (~8 m) as zigzag varint deltas.
// 4. Per tile with any water: w/<ty>-<tx>.bin = JSON header (the tile's bodies: name, level,
//    class; the rivers: name and point count) + gzip(u16 body id per cell ‖ river varints).
//    index.json gets `water` (bytes per tile, 0 = none) and the directory is re-published
//    under a new hash. The relief tile never waits for this file: the client loads it alongside
//    and draws land without it if it fails.
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { DuckDBInstance } from '@duckdb/node-api'
import { CACHE, HALF_WIDTH_KM, KM_PER_SAMPLE, LAT_N, LAT_S, TILE, TILES_X, TILES_Y, TILE_KM, corridorBox, currentDir, insertBoxes, pack, publish, toKm } from './corridor.ts'
import { Dataset } from './dataset.ts'
import { filterSmallWater } from './filter-water.ts'

const RELEASE = '2026-08-19.0'
const MIN_PATCH_CELLS = 4 // 0.25 km² at 250 m: omit isolated one-to-three-cell spots
const MIN_BODY_KM2 = MIN_PATCH_CELLS * KM_PER_SAMPLE ** 2
const SIMPLIFY_KM = 0.04 // Douglas-Peucker tolerance for the river lines
const Q = 32 // river coordinates in 1/Q cell: 7.8 m
const SEA_FRACTION = 0.5 // a body with more of its cells at or below sea level is an inlet, not a lake
const LOCAL = `${CACHE}/overture-${RELEASE}-water-cl.parquet`
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const LOCALS = [LOCAL, ...insertBoxes().map((b) => `${CACHE}/overture-${RELEASE}-water-${slug(b.name)}.parquet`)]
const SUBTYPES = ['lake', 'reservoir', 'pond', 'water', 'river']

// ---------------------------------------------------------------- 1. extract (one file for the corridor, one per insert)
async function extract(file: string, box: { w: number; e: number; s: number; n: number }, label: string) {
  if (existsSync(file)) return
  console.log(`extracting Overture ${RELEASE} water for ${label}: lon ${box.w.toFixed(2)}..${box.e.toFixed(2)}, lat ${box.s.toFixed(2)}..${box.n.toFixed(2)} (scans S3)`)
  const t0 = Date.now()
  const inst = await DuckDBInstance.create(':memory:')
  const c = await inst.connect()
  await c.run("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; SET s3_region='us-west-2'; SET enable_object_cache=true;")
  mkdirSync(CACHE, { recursive: true })
  const tmp = `${file}.part`
  await c.run(`COPY (
    SELECT subtype, class, is_salt AS salt, is_intermittent AS inter, names.primary AS name, ST_AsWKB(geometry) AS wkb
    FROM read_parquet('s3://overturemaps-us-west-2/release/${RELEASE}/theme=base/type=water/*', hive_partitioning=1)
    WHERE subtype IN (${SUBTYPES.map((s) => `'${s}'`).join(', ')})
      AND bbox.xmin BETWEEN ${box.w.toFixed(3)} AND ${box.e.toFixed(3)} AND bbox.ymin BETWEEN ${box.s.toFixed(3)} AND ${box.n.toFixed(3)}
  ) TO '${tmp}' (FORMAT parquet, COMPRESSION zstd)`)
  renameSync(tmp, file)
  console.log(`  extracted in ${((Date.now() - t0) / 1000).toFixed(0)} s`)
}
await extract(LOCAL, { ...corridorBox(LAT_S, LAT_N), s: LAT_S, n: LAT_N }, 'the corridor')
for (const b of insertBoxes()) await extract(`${CACHE}/overture-${RELEASE}-water-${slug(b.name)}.parquet`, b, b.name)

// ---------------------------------------------------------------- geometry helpers (corridor km)
type Pt = [number, number]
const COLS = TILES_X * TILE, ROWS = TILES_Y * TILE
const K = KM_PER_SAMPLE
const inCorridor = ([x, z]: Pt) => Math.abs(x) < HALF_WIDTH_KM && z >= 0 && z < TILES_Y * TILE_KM

function simplify(pts: Pt[], tol: number): Pt[] {
  if (pts.length <= 2) return pts
  const keep = new Uint8Array(pts.length)
  keep[0] = keep[pts.length - 1] = 1
  const stack: [number, number][] = [[0, pts.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    const [ax, ay] = pts[a], [bx, by] = pts[b]
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy
    let worst = -1, dmax = tol
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i]
      let d: number
      if (len2 === 0) d = Math.hypot(px - ax, py - ay)
      else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
        d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
      }
      if (d > dmax) { dmax = d; worst = i }
    }
    if (worst >= 0) { keep[worst] = 1; stack.push([a, worst], [worst, b]) }
  }
  return pts.filter((_, i) => keep[i])
}
/** shoelace area of a ring in km² */
function ringArea(r: Pt[]): number {
  let a = 0
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1])
  return Math.abs(a) / 2
}
const toPt = ([lon, lat]: number[]): Pt => { const { kmX, kmZ } = toKm(lat, lon); return [kmX, kmZ] }

// ---------------------------------------------------------------- 2. water bodies onto the cell grid
// cell (i, j) covers km x in [i*K - HALF, (i+1)*K - HALF), z in [j*K, (j+1)*K); the centre decides
type Body = { id: number; name: string; cls: string; salt: boolean; inter: boolean; areaKm2: number; cells: number; sea: number; levels: number[]; sumI: number; sumJ: number }
const ids = new Uint32Array(COLS * ROWS) // body id per cell, 0 = none
const bodies: Body[] = []
const relief = new Dataset()
console.log(`relief: ${relief.dir} (${relief.headers.size} land tiles)`)

function rasterize(body: Body, rings: Pt[][]) {
  // ring vertices in cell-centre coordinates; even-odd scanline per integer row
  const R = rings.map((r) => r.map(([x, z]) => [(x + HALF_WIDTH_KM) / K - 0.5, z / K - 0.5] as Pt))
  let vMin = Infinity, vMax = -Infinity
  for (const r of R) for (const [, v] of r) { if (v < vMin) vMin = v; if (v > vMax) vMax = v }
  const paint = (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= COLS || j >= ROWS) return
    const k = j * COLS + i
    ids[k] = body.id
    body.cells++
    body.sumI += i; body.sumJ += j
    const m = relief.metres(i, j)
    if (m <= 0) body.sea++
    body.levels.push(m)
  }
  for (let j = Math.max(0, Math.ceil(vMin)); j <= Math.min(ROWS - 1, Math.floor(vMax)); j++) {
    const xs: number[] = []
    for (const r of R) for (let a = 0, b = r.length - 1; a < r.length; b = a++) {
      const [ua, va] = r[a], [ub, vb] = r[b]
      if ((va <= j) === (vb <= j)) continue
      xs.push(ua + ((j - va) * (ub - ua)) / (vb - va))
    }
    xs.sort((p, q) => p - q)
    for (let s = 0; s + 1 < xs.length; s += 2) for (let i = Math.ceil(xs[s]); i <= Math.floor(xs[s + 1]); i++) paint(i, j)
  }
}

// ---------------------------------------------------------------- 3. rivers cut into tiles
type Piece = { name: string; pts: Pt[] }
const rivers = new Map<number, Piece[]>() // tile index -> pieces
const tileAt = ([x, z]: Pt) => ({ tx: Math.floor((x + HALF_WIDTH_KM) / TILE_KM), ty: Math.floor(z / TILE_KM) })
function cutRiver(name: string, line: Pt[]) {
  let cur: { ti: number; pts: Pt[] } | null = null
  const emit = (a: Pt, b: Pt) => {
    const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    if (!inCorridor(mid)) { cur = null; return }
    const { tx, ty } = tileAt(mid)
    const ti = ty * TILES_X + tx
    if (cur && cur.ti === ti) cur.pts.push(b)
    else {
      cur = { ti, pts: [a, b] }
      if (!rivers.has(ti)) rivers.set(ti, [])
      rivers.get(ti)!.push({ name, pts: cur.pts })
    }
  }
  for (let s = 0; s + 1 < line.length; s++) {
    const a = line[s], b = line[s + 1]
    const ts: number[] = []
    // every tile edge between a and b, in x and in z
    for (const [pa, pb, off] of [[a[0], b[0], HALF_WIDTH_KM], [a[1], b[1], 0]] as [number, number, number][]) {
      if (pa === pb) continue
      const lo = Math.min(pa, pb), hi = Math.max(pa, pb)
      for (let e = Math.ceil((lo + off) / TILE_KM) * TILE_KM - off; e < hi; e += TILE_KM) if (e > lo) ts.push((e - pa) / (pb - pa))
    }
    ts.sort((p, q) => p - q)
    let prev = a
    for (const t of ts) {
      const m: Pt = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
      emit(prev, m); prev = m
    }
    emit(prev, b)
  }
}

// ---------------------------------------------------------------- read the extracts
const t1 = Date.now()
const inst = await DuckDBInstance.create(':memory:')
const c = await inst.connect()
await c.run('INSTALL spatial; LOAD spatial;')
const res = await c.stream(`SELECT subtype, class, salt, inter, name, ST_AsGeoJSON(ST_GeomFromWKB(wkb)) AS geo FROM read_parquet([${LOCALS.map((f) => `'${f}'`).join(', ')}])`)
let rows = 0, polys = 0, lines = 0, small = 0, intermittent = 0, riverPts = 0
const polygons: { body: Body; rings: Pt[][] }[] = []
for (;;) {
  const chunk = await res.fetchChunk()
  if (!chunk || chunk.rowCount === 0) break
  for (const [subtype, cls, salt, inter, name, geo] of chunk.getRows() as [string, string, boolean | null, boolean | null, string | null, string][]) {
    rows++
    const g = JSON.parse(geo) as { type: string; coordinates: any }
    if (g.type === 'LineString' || g.type === 'MultiLineString') {
      if (subtype !== 'river') continue
      if (inter) { intermittent++; continue }
      for (const part of g.type === 'LineString' ? [g.coordinates] : g.coordinates) {
        const km = simplify((part as number[][]).map(toPt), SIMPLIFY_KM)
        if (km.length >= 2 && km.some(inCorridor)) { cutRiver(name ?? '', km); lines++; riverPts += km.length }
      }
      continue
    }
    if (g.type !== 'Polygon' && g.type !== 'MultiPolygon') continue
    for (const poly of g.type === 'Polygon' ? [g.coordinates] : g.coordinates) {
      const rings = (poly as number[][][]).map((r) => r.map(toPt))
      const area = ringArea(rings[0]) - rings.slice(1).reduce((s, r) => s + ringArea(r), 0)
      if (area < MIN_BODY_KM2) { small++; continue }
      if (!rings[0].some(inCorridor)) continue
      const body: Body = { id: 0, name: name ?? '', cls: subtype === 'water' ? 'lake' : subtype, salt: !!salt, inter: !!inter, areaKm2: area, cells: 0, sea: 0, levels: [], sumI: 0, sumJ: 0 }
      polygons.push({ body, rings })
      polys++
    }
  }
}
console.log(`${rows} features in ${((Date.now() - t1) / 1000).toFixed(0)} s: ${polys} bodies (${small} under ${MIN_BODY_KM2} km²), ${lines} river lines with ${riverPts} points (${intermittent} intermittent dropped)`)

// largest first, so a small body inside a larger one keeps its own cells
polygons.sort((a, b) => b.body.areaKm2 - a.body.areaKm2)
for (const { body, rings } of polygons) {
  body.id = bodies.length + 1
  bodies.push(body)
  rasterize(body, rings)
}
// inlets: mostly at or below sea level, the relief already draws them as sea
const inlet = new Set<number>()
let dropped = 0
for (const b of bodies) if (b.cells && b.sea / b.cells > SEA_FRACTION) { inlet.add(b.id); dropped++ }
// Filter the final raster, including disconnected fragments of larger river polygons.
// Do this globally so a lake crossing a tile boundary is measured as one patch.
for (let k = 0; k < ids.length; k++) if (inlet.has(ids[k])) ids[k] = 0
const removed = filterSmallWater(ids, COLS, MIN_PATCH_CELLS)
console.log(`small patches: ${removed.patches} dropped (${removed.cells} cells; minimum ${MIN_PATCH_CELLS} connected cells)`)
// Recompute metadata from surviving cells, also accounting for overwritten polygons.
for (const b of bodies) { b.cells = 0; b.sumI = 0; b.sumJ = 0; b.levels = [] }
for (let k = 0; k < ids.length; k++) {
  if (!ids[k]) continue
  const b = bodies[ids[k] - 1], i = k % COLS, j = Math.floor(k / COLS)
  b.cells++; b.sumI += i; b.sumJ += j
  b.levels.push(relief.metres(i, j))
}
// a lake or reservoir is one plane; a river polygon slopes, so it gets no level (0) and is only painted
const level = new Map<number, number>()
for (const b of bodies) {
  if (inlet.has(b.id) || !b.cells || b.cls === 'river') continue
  const v = b.levels.sort((p, q) => p - q)
  level.set(b.id, Math.max(1, Math.round(v[v.length >> 1])))
}
console.log(`bodies: ${bodies.length} rasterized, ${dropped} inlets dropped; largest: ${bodies.slice(0, 6).map((b) => `${b.name || b.cls} ${b.areaKm2.toFixed(0)} km² @ ${level.get(b.id) ?? '-'} m`).join(', ')}`)

// ---------------------------------------------------------------- 4. write tiles
const dir = currentDir()
if (!dir) throw new Error('no published terrain directory: run npm run terrain:fetch first')
// A rebuild may leave a tile with no water; discard stale files from the previous layer.
rmSync(`${dir}/w`, { recursive: true, force: true })
mkdirSync(`${dir}/w`, { recursive: true })
const index = JSON.parse(readFileSync(`${dir}/index.json`, 'utf8'))
const sizes = new Array<number>(TILES_X * TILES_Y).fill(0)
const pushVarint = (out: number[], v: number) => { v = (v << 1) ^ (v >> 31); while (v >= 0x80) { out.push((v & 0x7f) | 0x80); v >>>= 7 } out.push(v) }
let total = 0, tilesOut = 0, waterCells = 0, pieces = 0, maxBodies = 0
for (let ty = 0; ty < TILES_Y; ty++) for (let tx = 0; tx < TILES_X; tx++) {
  const ti = ty * TILES_X + tx
  if (!index.sizes[ti]) continue // sea tile: never fetched, so never written
  // bodies: global ids to local ones, in order of first appearance
  const grid = new Uint16Array(TILE * TILE)
  const local = new Map<number, number>()
  let cells = 0
  for (let j = 0; j < TILE; j++) for (let i = 0; i < TILE; i++) {
    const id = ids[(ty * TILE + j) * COLS + tx * TILE + i]
    if (!id || inlet.has(id)) continue
    let l = local.get(id)
    if (l === undefined) { l = local.size + 1; local.set(id, l) }
    grid[j * TILE + i] = l
    cells++
  }
  const lakes = [...local.keys()].map((id) => {
    const b = bodies[id - 1]
    return [b.name, level.get(id) ?? 0, b.cls, +(b.sumI / b.cells * K - HALF_WIDTH_KM + K / 2).toFixed(2), +(b.sumJ / b.cells * K + K / 2).toFixed(2), +b.areaKm2.toFixed(2), (b.salt ? 1 : 0) | (b.inter ? 2 : 0)]
  })
  // rivers: tile-local 1/Q-cell coordinates, zigzag varint deltas, first point from the origin
  const x0 = tx * TILE_KM - HALF_WIDTH_KM, z0 = ty * TILE_KM, unit = K / Q, max = TILE * Q
  const bytes: number[] = []
  const list: [string, number][] = []
  for (const p of rivers.get(ti) ?? []) {
    const q: Pt[] = []
    for (const [x, z] of p.pts) {
      const u = Math.max(0, Math.min(max, Math.round((x - x0) / unit))), v = Math.max(0, Math.min(max, Math.round((z - z0) / unit)))
      const last = q[q.length - 1]
      if (!last || last[0] !== u || last[1] !== v) q.push([u, v])
    }
    if (q.length < 2) continue
    let pu = 0, pv = 0
    for (const [u, v] of q) { pushVarint(bytes, u - pu); pushVarint(bytes, v - pv); pu = u; pv = v }
    list.push([p.name, q.length])
    pieces++
  }
  if (!cells && !list.length) continue
  const payload = Buffer.concat([Buffer.from(grid.buffer), Buffer.from(bytes)])
  const file = pack({ tx, ty, n: TILE, q: Q, cells, lakes, rivers: list }, gzipSync(payload, { level: 9 }))
  writeFileSync(`${dir}/w/${ty}-${tx}.bin`, file)
  sizes[ti] = file.length
  total += file.length; tilesOut++; waterCells += cells
  maxBodies = Math.max(maxBodies, local.size)
}
// lakes.json: every named lake and reservoir as [name, kmX, kmZ, km², level], largest first, one
// per name, for the in-game search (peaks.json is its counterpart for the summits)
const seenName = new Set<string>()
const lakeRows: [string, number, number, number, number][] = []
for (const b of bodies) {
  const lv = level.get(b.id)
  if (!b.name || !lv || seenName.has(b.name)) continue
  seenName.add(b.name)
  lakeRows.push([b.name, +(b.sumI / b.cells * K - HALF_WIDTH_KM + K / 2).toFixed(2), +(b.sumJ / b.cells * K + K / 2).toFixed(2), +b.areaKm2.toFixed(2), lv])
}
const lakesJson = JSON.stringify(lakeRows)
writeFileSync(`${dir}/lakes.json`, lakesJson)
index.water = sizes
index.waterSource = `Overture Maps ${RELEASE} water (© OpenStreetMap contributors, ODbL)`
index.lakesBytes = Buffer.byteLength(lakesJson)
writeFileSync(`${dir}/index.json`, JSON.stringify(index))
const out = publish(dir)
console.log(`wrote ${out}/w: ${tilesOut} tiles, ${waterCells} water cells (up to ${maxBodies} bodies in a tile), ${pieces} river pieces, ${(total / 1024).toFixed(0)} KB; lakes.json: ${lakeRows.length} named lakes, ${(index.lakesBytes / 1024).toFixed(0)} KB`)
