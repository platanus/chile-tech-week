// Builds the real Chile dataset streamed by the landing scene (src/terrain/chile.ts).
// Run: npm run terrain:fetch          (from the repo root; re-runs are offline: raw downloads live in scripts/.cache)
//
// The country is covered by a corridor that follows a hand-drawn centreline (CENTER below), so
// world coordinates are km east of the centreline (x) and km south of LAT_N (z). That keeps the
// 4,300 km strip about 512 km wide instead of a 1,000 km lat/lon box full of ocean.
//
// 1. Elevation: AWS Terrain Tiles ("terrarium" PNGs, SRTM-derived, no key) at zoom 10 (~90 m),
//    resampled onto the corridor grid at KM_PER_SAMPLE. Each sample blends the mean and max of
//    its source pixels so summits survive the downsampling.
// 2. Output tiles of TILE x TILE cells (257 x 257 samples, one-sample overlap so the client's
//    bilinear reads never cross a tile), each Int16 metres / QUANT, Paeth-predicted, gzip -9,
//    behind a small JSON header that also carries the tile's named peaks. All-sea tiles are not
//    written (size 0 in the index) so the client never fetches them.
// 3. An overview of the whole corridor at OVERVIEW_KM per sample, for the horizon and the first
//    frames while tiles stream in.
// 4. Peaks: OSM natural=peak / volcano with a name, via Overpass in 1° strips, kept when no
//    higher peak lies within ISOLATION_KM (a stand-in for prominence).
// 5. Everything goes to public/terrain/cl-<hash>/ (immutable on the CDN, see public/_headers);
//    the hash is written to app/frontend/terrain/terrain-url.ts (the layout's preload links read it).
//    The corridor geometry and the file format are shared with the other layers in corridor.ts.
import { createHash } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { gzipSync, inflateSync } from 'node:zlib'
import { CACHE, HALF_WIDTH_KM, KM_PER_DEG, KM_PER_SAMPLE, LAT_N, LAT_S, PUBLIC_DIR, TILE, TILES_X, TILES_Y, TILE_KM, CENTER, INSERTS, cached, corridorBox, insertBoxes, pack, paethEncode, pool, publish, toKm, toLatLon } from './corridor.ts'

// ---------------------------------------------------------------- config (the corridor itself lives in corridor.ts)
const OVERVIEW_KM = 2
const ZOOM = 10
const QUANT = 8 // metres per stored unit
const PEAK_BIAS = 0.5 // 0 = cell mean, 1 = cell max
const ISOLATION_KM = 5
const MUST_KEEP = new Set(['Cerro Provincia', 'Cerro Pochoco', 'Cerro Altar', 'Cerro La Paloma', 'Punta de Damas'])
const TILE_URL = (z: number, x: number, y: number) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']

// ---------------------------------------------------------------- mercator
const rad = (d: number) => (d * Math.PI) / 180
const N = 2 ** ZOOM
const pxX = (lon: number) => ((lon + 180) / 360) * N * 256
const pxY = (lat: number) => ((1 - Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2)) / Math.PI) / 2) * N * 256

// ---------------------------------------------------------------- minimal PNG decoder (8-bit RGB/RGBA, non-interlaced)
function decodePng(buf: Buffer): { w: number; h: number; ch: number; px: Uint8Array } {
  let pos = 8
  let w = 0, h = 0, ch = 3
  const idat: Buffer[] = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('latin1', pos + 4, pos + 8)
    const body = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      w = body.readUInt32BE(0); h = body.readUInt32BE(4)
      const depth = body[8], color = body[9], interlace = body[12]
      if (depth !== 8 || (color !== 2 && color !== 6) || interlace) throw new Error(`unsupported PNG depth=${depth} color=${color} interlace=${interlace}`)
      ch = color === 6 ? 4 : 3
    } else if (type === 'IDAT') idat.push(body)
    pos += 12 + len
  }
  const raw = inflateSync(Buffer.concat(idat))
  const stride = w * ch
  const px = new Uint8Array(w * h * ch)
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]
    const src = y * (stride + 1) + 1, dst = y * stride
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? px[dst + i - ch] : 0
      const b = y > 0 ? px[dst - stride + i] : 0
      const c = y > 0 && i >= ch ? px[dst - stride + i - ch] : 0
      let v = raw[src + i]
      if (f === 1) v += a
      else if (f === 2) v += b
      else if (f === 3) v += (a + b) >> 1
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      px[dst + i] = v & 255
    }
  }
  return { w, h, ch, px }
}

// source tiles decoded to metres, kept in a small LRU (neighbouring output tiles share them)
const srcTiles = new Map<string, Float32Array>()
async function loadSrc(keys: string[]) {
  await pool(keys.filter((k) => !srcTiles.has(k)), 8, async (key) => {
    const [x, y] = key.split(',').map(Number)
    const png = decodePng(await cached(TILE_URL(ZOOM, x, y), `terrarium/${ZOOM}/${x}/${y}.png`, true))
    const el = new Float32Array(256 * 256)
    for (let i = 0; i < 256 * 256; i++) el[i] = png.px[i * png.ch] * 256 + png.px[i * png.ch + 1] + png.px[i * png.ch + 2] / 256 - 32768
    srcTiles.set(key, el)
  })
  while (srcTiles.size > 400) srcTiles.delete(srcTiles.keys().next().value!)
}
function elev(px: number, py: number): number {
  const t = srcTiles.get(`${Math.floor(px / 256)},${Math.floor(py / 256)}`)
  return t ? t[(py & 255) * 256 + (px & 255)] : 0
}

// ---------------------------------------------------------------- one output tile
const S = TILE + 1
function buildTile(tx: number, ty: number) {
  const x0 = tx * TILE_KM - HALF_WIDTH_KM, z0 = ty * TILE_KM
  const cx = new Float64Array(S * S), cy = new Float64Array(S * S)
  const keySet = new Set<string>() // source tiles touched (an insert tile draws from two places on Earth)
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const { lat, lon } = toLatLon(x0 + i * KM_PER_SAMPLE, z0 + j * KM_PER_SAMPLE)
    const x = pxX(lon), y = pxY(lat)
    cx[j * S + i] = x; cy[j * S + i] = y
    const X = Math.floor(x / 256), Y = Math.floor(y / 256)
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) keySet.add(`${X + dx},${Y + dy}`)
  }
  const keys = [...keySet]
  return {
    keys,
    sample() {
      const data = new Int16Array(S * S)
      let max = -Infinity
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
        const k = j * S + i
        // footprint: half the spacing to the neighbouring sample centres, in source pixels, capped
        // because across an insert's edge the neighbour is on the other side of the ocean
        const hx = Math.min(4, Math.abs(cx[k + (i < S - 1 ? 1 : -1)] - cx[k]) / 2), hy = Math.min(4, Math.abs(cy[k + (j < S - 1 ? S : -S)] - cy[k]) / 2)
        const xa = Math.floor(cx[k] - hx), xb = Math.max(xa + 1, Math.ceil(cx[k] + hx))
        const ya = Math.floor(cy[k] - hy), yb = Math.max(ya + 1, Math.ceil(cy[k] + hy))
        let sum = 0, n = 0, mx = -Infinity
        for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) { const v = elev(x, y); sum += v; n++; if (v > mx) mx = v }
        const v = Math.max(-500, Math.min(7000, (sum / n) * (1 - PEAK_BIAS) + mx * PEAK_BIAS))
        const q = Math.round(v / QUANT)
        data[k] = q
        if (q > max) max = q
      }
      return { data, maxMetres: max * QUANT }
    },
  }
}

// ---------------------------------------------------------------- peaks
type Peak = { name: string; lat: number; lon: number; ele: number; kmX: number; kmZ: number }
async function fetchPeaks(): Promise<Peak[]> {
  const all: Peak[] = []
  let missing = 0
  const boxes: { s: number; n: number; w: number; e: number }[] = []
  for (let s = LAT_S; s < LAT_N - 1e-9; s += 1) {
    const n = Math.min(LAT_N, s + 1)
    boxes.push({ s, n, ...corridorBox(s, n) }) // longitude range of the corridor within this strip
  }
  boxes.push(...insertBoxes())
  for (const { s, n, w, e } of boxes) {
    const bb = `${s.toFixed(2)},${w.toFixed(2)},${n.toFixed(2)},${e.toFixed(2)}`
    const q = `[out:json][timeout:180];(node["natural"="peak"]["name"](${bb});node["natural"="volcano"]["name"](${bb}););out;`
    const key = `peaks/${createHash('md5').update(q).digest('hex')}.json`
    let buf: Buffer | null = null
    for (const ep of OVERPASS) {
      try {
        buf = await cached(ep, key, false, { method: 'POST', body: `data=${encodeURIComponent(q)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'chile-tech-week-terrain/1.0 (build script)' } })
        break
      } catch (err) { console.warn(`  overpass ${ep} failed for ${bb}: ${(err as Error).message.slice(0, 160)}`) }
    }
    if (!buf) { missing++; console.warn(`  !! no peaks for strip ${bb} (re-run later to fill the cache)`); continue }
    let count = 0
    for (const el of JSON.parse(buf.toString()).elements as { lat: number; lon: number; tags: Record<string, string> }[]) {
      const ele = parseFloat(String(el.tags.ele ?? '').replace(',', '.'))
      if (!isFinite(ele) || ele < 100) continue
      const { kmX, kmZ } = toKm(el.lat, el.lon)
      if (Math.abs(kmX) >= HALF_WIDTH_KM || kmZ < 0 || kmZ >= TILES_Y * TILE_KM) continue
      all.push({ name: el.tags['name:es'] ?? el.tags.name, lat: el.lat, lon: el.lon, ele: Math.round(ele), kmX, kmZ })
      count++
    }
    console.log(`  peaks ${s.toFixed(0)}..${n.toFixed(0)}: ${count}`)
  }
  console.log(`peaks: ${all.length} named with elevation${missing ? `, ${missing} strips missing` : ''}`)
  // isolation filter with a spatial hash (highest first): keep a peak when no higher peak is within ISOLATION_KM
  all.sort((a, b) => b.ele - a.ele)
  const cellKm = ISOLATION_KM
  const cells = new Map<string, Peak[]>()
  const seen = new Set<string>()
  const kept: Peak[] = []
  for (const p of all) {
    const cxk = Math.floor(p.kmX / cellKm), czk = Math.floor(p.kmZ / cellKm)
    let ok = true
    for (let dz = -1; dz <= 1 && ok; dz++) for (let dx = -1; dx <= 1 && ok; dx++) {
      for (const k of cells.get(`${cxk + dx},${czk + dz}`) ?? []) {
        const ddx = p.kmX - k.kmX, ddz = p.kmZ - k.kmZ
        if (ddx * ddx + ddz * ddz < ISOLATION_KM * ISOLATION_KM) { ok = false; break }
      }
    }
    const id = `${p.name}@${p.ele}`
    if ((ok || MUST_KEEP.has(p.name)) && !seen.has(id)) {
      seen.add(id); kept.push(p)
      const key = `${cxk},${czk}`
      if (!cells.has(key)) cells.set(key, [])
      cells.get(key)!.push(p)
    }
  }
  console.log(`peaks: ${kept.length} kept after ${ISOLATION_KM} km isolation`)
  return kept
}

// ---------------------------------------------------------------- main
const t0 = Date.now()
console.log(`corridor: ${TILES_X} x ${TILES_Y} tiles of ${TILE_KM} km (${2 * HALF_WIDTH_KM} x ${TILES_Y * TILE_KM} km)`)
const peaks = await fetchPeaks()
const peaksByTile = new Map<string, Peak[]>()
for (const p of peaks) {
  const key = `${Math.floor((p.kmX + HALF_WIDTH_KM) / TILE_KM)},${Math.floor(p.kmZ / TILE_KM)}`
  if (!peaksByTile.has(key)) peaksByTile.set(key, [])
  peaksByTile.get(key)!.push(p)
}

const OV = Math.round(OVERVIEW_KM / KM_PER_SAMPLE) // cells per overview sample
const OV_PER_TILE = TILE / OV
const ovCols = TILES_X * OV_PER_TILE, ovRows = TILES_Y * OV_PER_TILE
const overview = new Int16Array(ovCols * ovRows).fill(Math.round(-500 / QUANT))
const tmp = `${PUBLIC_DIR}/.build`
rmSync(tmp, { recursive: true, force: true })
mkdirSync(`${tmp}/t`, { recursive: true })
const sizes: number[] = []
let totalBytes = 0, land = 0
for (let ty = 0; ty < TILES_Y; ty++) {
  for (let tx = 0; tx < TILES_X; tx++) {
    const tile = buildTile(tx, ty)
    await loadSrc(tile.keys)
    const { data, maxMetres } = tile.sample()
    if (maxMetres <= 0) { sizes.push(0); continue } // all sea: never written, never fetched
    // overview block: max-biased mean of each OV x OV group of cells
    for (let j = 0; j < OV_PER_TILE; j++) for (let i = 0; i < OV_PER_TILE; i++) {
      let sum = 0, n = 0, mx = -Infinity
      for (let y = 0; y < OV; y++) for (let x = 0; x < OV; x++) { const v = data[(j * OV + y) * S + i * OV + x]; sum += v; n++; if (v > mx) mx = v }
      overview[(ty * OV_PER_TILE + j) * ovCols + tx * OV_PER_TILE + i] = Math.round((sum / n) * (1 - PEAK_BIAS) + mx * PEAK_BIAS)
    }
    const tilePeaks = (peaksByTile.get(`${tx},${ty}`) ?? []).map((p) => [p.name, +p.kmX.toFixed(2), +p.kmZ.toFixed(2), p.ele])
    const file = pack({ tx, ty, n: S, quant: QUANT, maxMetres, peaks: tilePeaks }, gzipSync(paethEncode(data, S, S), { level: 9 }))
    writeFileSync(`${tmp}/t/${ty}-${tx}.bin`, file)
    sizes.push(file.length)
    totalBytes += file.length
    land++
  }
  const { lat } = toLatLon(0, (ty + 0.5) * TILE_KM)
  console.log(`row ${ty + 1}/${TILES_Y} (lat ${lat.toFixed(1)}): ${land} land tiles, ${(totalBytes / 1048576).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(0)} s`)
}
const ovFile = pack({ cols: ovCols, rows: ovRows, kmPerSample: OVERVIEW_KM, quant: QUANT }, gzipSync(paethEncode(overview, ovCols, ovRows), { level: 9 }))
writeFileSync(`${tmp}/overview.bin`, ovFile)

const index = {
  name: 'Chile',
  attribution: 'Elevation: AWS Terrain Tiles (SRTM). Peaks: © OpenStreetMap contributors (ODbL).',
  kmPerSample: KM_PER_SAMPLE, tile: TILE, tilesX: TILES_X, tilesY: TILES_Y, halfWidthKm: HALF_WIDTH_KM,
  latN: LAT_N, kmPerDeg: KM_PER_DEG, center: CENTER, inserts: INSERTS, quant: QUANT,
  overview: { cols: ovCols, rows: ovRows, kmPerSample: OVERVIEW_KM, bytes: ovFile.length },
  sizes, // tile bytes, row-major (ty, tx); 0 = sea, not on disk
  peaks: peaks.length,
}
writeFileSync(`${tmp}/index.json`, JSON.stringify(index))
const out = publish(tmp)
console.log(`wrote ${out}: ${land} land tiles of ${sizes.length}, ${(totalBytes / 1048576).toFixed(1)} MB + overview ${(ovFile.length / 1024).toFixed(0)} KB, ${peaks.length} peaks, ${((Date.now() - t0) / 1000).toFixed(0)} s`)
