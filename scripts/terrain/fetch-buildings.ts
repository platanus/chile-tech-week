// Builds the buildings layer of the streamed Chile dataset: a "block carpet" per tile plus the
// named tall buildings, from Overture Maps (OSM + Microsoft + Google footprints, ODbL/CDLA).
// Run: npm run buildings:fetch      (after npm run terrain:fetch; re-runs are offline)
//
// 1. DuckDB copies every building in the corridor's lon/lat box from Overture's parquet on S3 into
//    scripts/terrain/.cache (bbox, height, floors, class, name: no geometry, so ~200 MB, not GB), and each
//    insert (Rapa Nui) as its own small extract, so adding an insert never rescans the country.
// 2. Each footprint lands in its 250 m cell of the corridor grid: built-up fraction (footprint area
//    over cell area) and max height. Heights are explicit when tagged, else floors x 3.2 m, else a
//    class/size heuristic (most houses have neither tag; for a carpet that is fine).
// 3. Per tile with any built cell: b/<ty>-<tx>.bin = JSON header (the tile's landmarks: named
//    buildings over LANDMARK_M, with footprint size) + gzipped u8 pairs [fraction, height/2 m].
// 4. index.json gets `buildings` (bytes per tile, 0 = none) and the directory is re-published
//    under a new hash so the CDN never serves a stale index.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { DuckDBInstance } from '@duckdb/node-api'
import { CACHE, HALF_WIDTH_KM, KM_PER_SAMPLE, LAT_N, LAT_S, TILE, TILES_X, TILES_Y, TILE_KM, corridorBox, currentDir, insertBoxes, pack, publish, toKm } from './corridor.ts'

const RELEASE = '2026-08-19.0'
const LANDMARK_M = 60 // named buildings at least this tall (or LANDMARK_FLOORS) are listed by name
const LANDMARK_FLOORS = 18
const MIN_FRACTION = 0.03 // cells below this built-up fraction stay empty
const FLOOR_M = 3.2
const LOCAL = `${CACHE}/overture-${RELEASE}-buildings-cl.parquet`
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
const LOCALS = [LOCAL, ...insertBoxes().map((b) => `${CACHE}/overture-${RELEASE}-buildings-${slug(b.name)}.parquet`)]

// ---------------------------------------------------------------- 1. extract (one file for the corridor, one per insert)
async function extract(file: string, box: { w: number; e: number; s: number; n: number }, label: string) {
  if (existsSync(file)) return
  console.log(`extracting Overture ${RELEASE} buildings for ${label}: lon ${box.w.toFixed(2)}..${box.e.toFixed(2)}, lat ${box.s.toFixed(2)}..${box.n.toFixed(2)} (scans S3)`)
  const t0 = Date.now()
  const inst = await DuckDBInstance.create(':memory:')
  const c = await inst.connect()
  await c.run("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2'; SET enable_object_cache=true;")
  mkdirSync(CACHE, { recursive: true })
  const tmp = `${file}.part`
  await c.run(`COPY (
    SELECT bbox.xmin AS xmin, bbox.ymin AS ymin, bbox.xmax AS xmax, bbox.ymax AS ymax,
           height, num_floors AS floors, class, names.primary AS name
    FROM read_parquet('s3://overturemaps-us-west-2/release/${RELEASE}/theme=buildings/type=building/*', hive_partitioning=1)
    WHERE bbox.xmin BETWEEN ${box.w.toFixed(3)} AND ${box.e.toFixed(3)} AND bbox.ymin BETWEEN ${box.s.toFixed(3)} AND ${box.n.toFixed(3)}
  ) TO '${tmp}' (FORMAT parquet, COMPRESSION zstd)`)
  renameSync(tmp, file)
  console.log(`  extracted in ${((Date.now() - t0) / 1000).toFixed(0)} s`)
}
await extract(LOCAL, { ...corridorBox(LAT_S, LAT_N), s: LAT_S, n: LAT_N }, 'the corridor')
for (const b of insertBoxes()) await extract(`${CACHE}/overture-${RELEASE}-buildings-${slug(b.name)}.parquet`, b, b.name)

// ---------------------------------------------------------------- 2. aggregate
type Landmark = { name: string; kmX: number; kmZ: number; h: number; w: number; d: number }
const cellsPerTile = TILE * TILE
const fraction = new Map<number, Float32Array>() // tile index -> built-up fraction per cell
const height = new Map<number, Float32Array>()
const landmarks = new Map<number, Landmark[]>()
const cellArea = (KM_PER_SAMPLE * 1000) ** 2
const t1 = Date.now()
const inst = await DuckDBInstance.create(':memory:')
const c = await inst.connect()
const res = await c.stream(`SELECT xmin, ymin, xmax, ymax, height, floors, class, name FROM read_parquet([${LOCALS.map((f) => `'${f}'`).join(', ')}])`)
let rows = 0, withH = 0, withF = 0
for (;;) {
  const chunk = await res.fetchChunk()
  if (!chunk || chunk.rowCount === 0) break
  for (const [xmin, ymin, xmax, ymax, h, floors, cls, name] of chunk.getRows() as [number, number, number, number, number | null, number | null, string | null, string | null][]) {
    rows++
    const lat = (ymin + ymax) / 2, lon = (xmin + xmax) / 2
    const { kmX, kmZ } = toKm(lat, lon)
    if (Math.abs(kmX) >= HALF_WIDTH_KM || kmZ < 0 || kmZ >= TILES_Y * TILE_KM) continue
    const wM = (xmax - xmin) * 111320 * Math.cos((lat * Math.PI) / 180), dM = (ymax - ymin) * 111320
    const area = wM * dM * 0.7 // a footprint fills about 70 % of its bbox
    let hM: number
    if (h != null && h > 0) { hM = h; withH++ }
    else if (floors != null && floors > 0) { hM = floors * FLOOR_M; withF++ }
    else hM = area > 3000 ? 12 : area > 600 ? 7 : 4
    const tx = Math.floor((kmX + HALF_WIDTH_KM) / TILE_KM), ty = Math.floor(kmZ / TILE_KM)
    const ti = ty * TILES_X + tx
    const cx = Math.floor((kmX + HALF_WIDTH_KM - tx * TILE_KM) / KM_PER_SAMPLE), cz = Math.floor((kmZ - ty * TILE_KM) / KM_PER_SAMPLE)
    const ci = Math.min(cz, TILE - 1) * TILE + Math.min(cx, TILE - 1)
    if (!fraction.has(ti)) { fraction.set(ti, new Float32Array(cellsPerTile)); height.set(ti, new Float32Array(cellsPerTile)) }
    const f = fraction.get(ti)!, hh = height.get(ti)!
    f[ci] += area / cellArea
    // a named tower is drawn as its own landmark, so it must not turn its whole cell into a slab
    const landmark = !!name && ((h != null && h >= LANDMARK_M) || (floors != null && floors >= LANDMARK_FLOORS))
    if (landmark) {
      if (!landmarks.has(ti)) landmarks.set(ti, [])
      landmarks.get(ti)!.push({ name: name!, kmX: +kmX.toFixed(3), kmZ: +kmZ.toFixed(3), h: Math.round(hM), w: Math.round(wM), d: Math.round(dM) })
    } else if (hM > hh[ci]) hh[ci] = hM
  }
}
console.log(`${rows} buildings in ${((Date.now() - t1) / 1000).toFixed(0)} s: ${withH} with height, ${withF} with floors, ${fraction.size} tiles touched`)

// ---------------------------------------------------------------- 3. write tiles
const dir = currentDir()
if (!dir) throw new Error('no published terrain directory: run npm run terrain:fetch first')
mkdirSync(`${dir}/b`, { recursive: true })
const sizes = new Array<number>(TILES_X * TILES_Y).fill(0)
let total = 0, built = 0, nLandmarks = 0
for (const [ti, f] of fraction) {
  const hh = height.get(ti)!
  const u8 = new Uint8Array(cellsPerTile * 2)
  let any = 0
  for (let i = 0; i < cellsPerTile; i++) {
    const fr = Math.min(f[i], 1)
    if (fr < MIN_FRACTION) continue
    u8[i * 2] = Math.round(fr * 255)
    u8[i * 2 + 1] = Math.min(255, Math.round(hh[i] / 2))
    any++
  }
  if (!any) continue
  const marks = (landmarks.get(ti) ?? []).sort((a, b) => b.h - a.h).slice(0, 60).map((m) => [m.name, m.kmX, m.kmZ, m.h, m.w, m.d])
  const ty = Math.floor(ti / TILES_X), tx = ti % TILES_X
  const file = pack({ tx, ty, n: TILE, cells: any, landmarks: marks }, gzipSync(Buffer.from(u8), { level: 9 }))
  writeFileSync(`${dir}/b/${ty}-${tx}.bin`, file)
  sizes[ti] = file.length
  total += file.length; built += any; nLandmarks += marks.length
}
const index = JSON.parse(readFileSync(`${dir}/index.json`, 'utf8'))
index.buildings = sizes
index.buildingsSource = `Overture Maps ${RELEASE} (OSM, Microsoft, Google Open Buildings)`
writeFileSync(`${dir}/index.json`, JSON.stringify(index))
const out = publish(dir)
console.log(`wrote ${out}/b: ${sizes.filter(Boolean).length} tiles, ${built} built cells, ${nLandmarks} landmarks, ${(total / 1024).toFixed(0)} KB`)
