// Builds the snow layer of the streamed Chile dataset: where the white on the mountains starts.
// Run: npm run snow:fetch       (after npm run terrain:fetch; re-runs are offline)
//
// The scene used to whiten everything above one altitude for the whole country, which puts snow
// on the Atacama's 4,000 m pampa — where it essentially never snows — and leaves the Patagonian
// ice, which comes down to the fjords, bare. The snow line is not a constant: it runs at ~5,500 m
// in the dry north and reaches sea level in Tierra del Fuego. So measure it.
//
// 1. MODIS 8-day maximum snow extent (MOD10A2 / MYD10A2, Terra + Aqua) from NASA GIBS' WMS, no
//    key: one 0.01 deg (~1 km) image of the corridor per month, twelve months a year over YEARS.
//    In that colour map only "snow" gets a colour, so a pixel is snow exactly when it is not
//    transparent; no snow, cloud, water and fill all come back clear and are counted the same.
//    Both satellites and an 8-day maximum are what make the cloud gaps survivable: a cell is
//    only missed when it stayed clouded for eight days in both overpasses.
// 2. Snow frequency per 1 km sample = the fraction of those composites that saw snow there, and
//    its elevation comes from the relief we already publish (scripts/terrain/dataset.ts) — no new
//    elevation source, and the two agree by construction.
// 3. For every node of an 8 km grid, the WIN_KM window around it gives two histograms — its
//    ground over altitude, its snow over frequency — and snowline.ts turns them into the
//    altitude that leaves as much ground above it as MODIS finds snowy (see there for why the
//    inversion is by area and not by a threshold on altitude). A window with no snowy ground at
//    all only says its own highest ground stays bare, which becomes a floor.
// 4. Cloud only ever hides snow, so the frequencies are read against a clear-sky transmittance:
//    over ground that is white all year, how often MODIS saw it is how often MODIS can see.
// 5. Holes are filled from the neighbours and the field is smoothed; the floors go on last, so
//    smoothing can never paint white onto a range MODIS says is bare.
// 6. snow.bin = JSON header + gzip(Int16 metres / QUANT), two planes: the line and the half band
//    of the fade. salt.bin is the salars on their own 1 km grid — flat ground MODIS insists is
//    snow, which is exactly the salt that really is that white. index.json gets `snow` and
//    `salt`, and the directory is re-published under a new hash.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { HALF_WIDTH_KM, KM_PER_DEG, KM_PER_SAMPLE, LAT_N, LAT_S, TILES_Y, TILE_KM, CACHE, cached, corridorBox, currentDir, decodePng, lonC, pack, paethEncode, pool, publish, rad, toKm, unpack } from './corridor.ts'
import { Dataset } from './dataset.ts'
import { readWindow } from './snowline.ts'

// ---------------------------------------------------------------- config
const LAYERS = ['MODIS_Terra_L3_Snow_Extent_8Day', 'MODIS_Aqua_L3_Snow_Extent_8Day']
const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]
const DEG = 0.01 // sample grid of the downloaded imagery: ~1.1 km, twice the MODIS 500 m pixel
const WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi'
const SNOW_KM = 8 // output grid: the field is smooth, the relief under it is not
const WIN_KM = 35 // radius of the window whose histograms give one node its line
const BIN_M = 100 // altitude per band of the hypsometry
const BINS = 70
const F0 = 0.5 // "snowy" = snow in half the composites: the line the scene whitens above
const MIN_BAND = 80, MAX_BAND = 400
const FLOOR_MARGIN = 250 // a bare window keeps its line this far above its own highest ground
const MIN_RELIEF_M = 24 // ground flatter than this over 1.25 km is a salar, not a snowfield
const SALT_KM = 1 // the salt grid: the salars are drawn white, and their edges are crisp
const SALT_F = 0.5 // how much of the year flat ground has to read white to be one
const NO_SNOW_M = 9000 // higher than anything in the country: never white
const CLEAR_KM = 100 // radius the clear-sky transmittance is taken over (see 4)
const CLEAR_MIN = 0.4 // and the least of it that is believable
const QUANT = 4 // metres per stored unit
const SMOOTH_NODES = 1.5 // Gaussian sigma of the final smoothing, in grid nodes (12 km)

// Published snow lines, for the report at the end to hold itself against. The inversion lands
// within ~300 m of them the length of the country, except in the dry Andes around Ojos del
// Salado, where the published figure is the equilibrium line — the altitude snow survives the
// summer at, ~6,000 m and the highest on Earth — while what MODIS sees, and what the scene
// should draw, is winter snow a few hundred metres lower.
const REFERENCE: [string, number, number, number][] = [
  ['Parinacota', -18.17, -69.15, 5400],
  ['Ojos del Salado', -27.11, -68.54, 5600],
  ['Andes de Santiago', -33.3, -70.05, 3200],
  ['Nevados de Chillán', -36.86, -71.38, 2400],
  ['Villarrica', -39.42, -71.93, 1700],
  ['Campo de Hielo Norte', -47.0, -73.4, 1000],
  ['Torres del Paine', -51.0, -73.0, 900],
  ['Cordillera Darwin', -54.5, -69.5, 700],
]

// ---------------------------------------------------------------- 1. the composites
/** the 8-day composite (start day 1, 9, 17 … 361) nearest the 15th of each month */
function compositeDates(year: number): string[] {
  const jan1 = Date.UTC(year, 0, 1)
  return Array.from({ length: 12 }, (_, m) => {
    const doy = (Date.UTC(year, m, 15) - jan1) / 86400000 + 1
    const start = Math.min(361, 1 + 8 * Math.round((doy - 1) / 8))
    return new Date(jan1 + (start - 1) * 86400000).toISOString().slice(0, 10)
  })
}

const box = corridorBox(LAT_S, LAT_N)
// snap the corridor's lon/lat box out to whole DEG cells (in hundredths, so 0.01 stays exact)
const lonW = Math.floor(box.w * 100) / 100, lonE = Math.ceil(box.e * 100) / 100
const latN = Math.ceil(LAT_N * 100) / 100, latS = Math.floor(LAT_S * 100) / 100
const W = Math.round((lonE - lonW) / DEG), H = Math.round((latN - latS) / DEG)
const BBOX = `${lonW.toFixed(2)},${latS.toFixed(2)},${lonE.toFixed(2)},${latN.toFixed(2)}`
const url = (layer: string, date: string) =>
  `${WMS}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=${layer}&SRS=EPSG:4326&BBOX=${BBOX}&WIDTH=${W}&HEIGHT=${H}&FORMAT=image/png&TIME=${date}`

const shots = LAYERS.flatMap((layer) => YEARS.flatMap((y) => compositeDates(y).map((date) => ({ layer, date }))))
console.log(`snow: ${shots.length} MODIS composites over ${W} x ${H} samples (${DEG} deg, lon ${lonW}..${lonE}, lat ${latS}..${latN})`)

// the tally of the composites, cached beside the images: decoding 240 PNGs is minutes, and
// everything below it is tuning
const TALLY = `${CACHE}/snow-tally.bin`
const stamp = JSON.stringify({ W, H, DEG, lonW, latN, shots: shots.length, layers: LAYERS, years: YEARS })
let snow = new Uint16Array(W * H)
let used = 0
if (existsSync(TALLY)) {
  const { header, data } = unpack(readFileSync(TALLY))
  if (JSON.stringify(header.stamp) === stamp) {
    snow = new Uint16Array(data.buffer, data.byteOffset, W * H)
    used = header.used
  }
}
if (!used) {
  await pool(shots, 6, async ({ layer, date }) => {
    await cached(url(layer, date), `gibs/${layer}-${date}.png`, true)
  })
  for (const { layer, date } of shots) {
    const { w, h, ch, px } = decodePng(readFileSync(`${CACHE}/gibs/${layer}-${date}.png`))
    if (w !== W || h !== H) throw new Error(`${layer} ${date}: got ${w} x ${h}, wanted ${W} x ${H}`)
    // the snow-extent colour map paints only "snow" opaque; no snow, cloud, water and fill are clear
    let seen = 0
    for (let i = 0; i < W * H; i++) if (px[i * ch + 3]) seen++
    // a composite with no snow anywhere in Chile is a hole in the archive, not a thaw
    if (!seen) continue
    used++
    for (let i = 0; i < W * H; i++) if (px[i * ch + 3]) snow[i]++
  }
  const view = new Int16Array(snow.buffer, snow.byteOffset, W * H)
  writeFileSync(TALLY, pack({ stamp: JSON.parse(stamp), used, cols: W, rows: H }, gzipSync(paethEncode(view, W, H), { level: 6 })))
}
console.log(`  ${used}/${shots.length} composites carried snow`)
if (!used) throw new Error('no usable composites')

// ---------------------------------------------------------------- 2. elevation under each sample
const ds = new Dataset()
console.log(`  relief: ${ds.cols} x ${ds.rows} samples from ${ds.dir}`)
const elev = new Float32Array(W * H).fill(NaN)
// flat ground MODIS keeps calling snow: a salar. Left out of the snow statistics below, but
// drawn — Uyuni, Coipasa and Surire really are that white, and they are white all year.
const salty = new Uint8Array(W * H)
const R = 2 // the 5 x 5 relief cells (1.25 km) under one sample
const block = new Float64Array((2 * R + 1) ** 2)
for (let py = 0; py < H; py++) {
  const lat = latN - (py + 0.5) * DEG
  const kmZ = (LAT_N - lat) * KM_PER_DEG
  const j = Math.round(kmZ / KM_PER_SAMPLE)
  if (j - R < 0 || j + R >= ds.rows) continue
  // the corridor's centreline at this latitude, and the km an east step of one sample is worth
  const kmPerLon = KM_PER_DEG * Math.cos(rad(lat))
  const lonc = lonC(lat)
  for (let px = 0; px < W; px++) {
    const kmX = (lonW + (px + 0.5) * DEG - lonc) * kmPerLon
    const i = Math.round((kmX + HALF_WIDTH_KM) / KM_PER_SAMPLE)
    if (i - R < 0 || i + R >= ds.cols) continue
    let land = 0, lo = Infinity, hi = -Infinity
    for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
      const v = ds.metres(i + di, j + dj)
      block[(dj + R) * (2 * R + 1) + di + R] = Math.max(0, v)
      if (v > 0) land++
      lo = Math.min(lo, v); hi = Math.max(hi, v)
    }
    // a sample that is mostly sea says nothing about a snow line
    if (land <= block.length / 2) continue
    // nor does one on ground flat to a few metres over a kilometre: that is a salar or a dry
    // lake bed, never a snowfield, and MODIS reads bright salt as snow (it calls the Salar de
    // Uyuni snow in 84 % of the composites, which would put the whole altiplano under white)
    if (hi - lo < MIN_RELIEF_M) {
      if (snow[py * W + px] / used >= SALT_F) salty[py * W + px] = 1
      continue
    }
    // the upper quartile of the block, not its mean: a MODIS pixel is flagged snow from the
    // highest ground in it, so that is the altitude its flag is about
    block.sort()
    elev[py * W + px] = block[Math.floor(block.length * 0.75)]
  }
}
// ---------------------------------------------------------------- 3. one reading per grid node
// Pass one collects, for the WIN_KM window around every node of the output grid, two histograms:
// how its ground is spread over altitude, and how its snow is spread over frequency. It also
// notes how often the window's most persistent snow was seen at all — over ground that is white
// all year that is simply how often MODIS gets a clear look — and the best such figure within
// CLEAR_KM is the region's clear-sky transmittance, which the frequencies are read against.
// Without it Tierra del Fuego, where MODIS sees the ground two composites in three, reads bare.
const COLS = Math.round((2 * HALF_WIDTH_KM) / SNOW_KM) + 1
const ROWS = Math.round((TILES_Y * TILE_KM) / SNOW_KM) + 1
const BUCKETS = 51 // resolution of the frequency histogram: 2 % of the year
const MIN_SAMPLES = 60 // a window with less land than this (open sea, mostly) says nothing
const hyps = new Uint16Array(COLS * ROWS * BINS) // per node: ground per 100 m band
const freqs = new Uint16Array(COLS * ROWS * BUCKETS) // per node: ground per 2 % of snow frequency
const clear = new Float32Array(COLS * ROWS)
for (let nj = 0; nj < ROWS; nj++) {
  const lat = LAT_N - (nj * SNOW_KM) / KM_PER_DEG
  const py0 = Math.round((latN - lat) / DEG)
  const dpy = Math.round(WIN_KM / KM_PER_DEG / DEG)
  const kmPerLon = KM_PER_DEG * Math.cos(rad(lat))
  const dpx = Math.round(WIN_KM / kmPerLon / DEG)
  const lonc = lonC(lat)
  for (let ni = 0; ni < COLS; ni++) {
    const px0 = Math.round((lonc + (ni * SNOW_KM - HALF_WIDTH_KM) / kmPerLon - lonW) / DEG)
    const n = nj * COLS + ni
    const hy = hyps.subarray(n * BINS, (n + 1) * BINS), fr = freqs.subarray(n * BUCKETS, (n + 1) * BUCKETS)
    let total = 0
    for (let py = Math.max(0, py0 - dpy); py <= Math.min(H - 1, py0 + dpy); py++) {
      for (let px = Math.max(0, px0 - dpx); px <= Math.min(W - 1, px0 + dpx); px++) {
        const k = py * W + px, e = elev[k]
        if (!(e >= 0)) continue
        hy[Math.min(BINS - 1, Math.floor(e / BIN_M))]++
        fr[Math.round((snow[k] / used) * (BUCKETS - 1))]++
        total++
      }
    }
    if (total < MIN_SAMPLES) { hy.fill(0); fr.fill(0); continue }
    // the snowiest 0.5 % of the window: ground that white can only be missed by cloud
    let acc = 0
    for (let b = BUCKETS - 1; b >= 0; b--) {
      acc += fr[b]
      if (acc >= 0.005 * total) { clear[n] = b / (BUCKETS - 1); break }
    }
  }
}
// transmittance: the clearest reading within CLEAR_KM, since cloud is a property of the sky and
// only ground that is always white can measure it (separable, so two max passes over the grid)
const reach = Math.round(CLEAR_KM / SNOW_KM)
const trans = new Float32Array(COLS * ROWS)
const tmpT = new Float32Array(COLS * ROWS)
for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
  let mx = 0
  for (let t = -reach; t <= reach; t++) mx = Math.max(mx, clear[j * COLS + Math.min(COLS - 1, Math.max(0, i + t))])
  tmpT[j * COLS + i] = mx
}
for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
  let mx = 0
  for (let t = -reach; t <= reach; t++) mx = Math.max(mx, tmpT[Math.min(ROWS - 1, Math.max(0, j + t)) * COLS + i])
  trans[j * COLS + i] = Math.min(1, Math.max(CLEAR_MIN, mx))
}

// pass two: the inversion, now that the cloud is accounted for
const line = new Float32Array(COLS * ROWS).fill(NaN)
const band = new Float32Array(COLS * ROWS).fill(NaN)
const floors = new Float32Array(COLS * ROWS).fill(-Infinity)
let measured = 0, bare = 0
for (let n = 0; n < COLS * ROWS; n++) {
  const got = readWindow(hyps.subarray(n * BINS, (n + 1) * BINS), freqs.subarray(n * BUCKETS, (n + 1) * BUCKETS), {
    binM: BIN_M, f0: F0, transmittance: trans[n], minBand: MIN_BAND, maxBand: MAX_BAND,
  })
  if (!got) continue
  // no snow at all: all the window says is that its own ground stays bare
  if (got.area <= 0) { floors[n] = got.top + FLOOR_MARGIN; bare++; continue }
  line[n] = got.line
  band[n] = got.band
  measured++
}
console.log(`  ${measured} nodes measured a line, ${bare} are bare ground, ${COLS * ROWS - measured - bare} are open sea`)

// ---------------------------------------------------------------- 4. fill, smooth, then clamp
/** spread the measured values outwards until every node has one (breadth-first from the edge) */
function fill(v: Float32Array) {
  const queue: number[] = []
  for (let n = 0; n < v.length; n++) if (Number.isFinite(v[n])) queue.push(n)
  for (let head = 0; head < queue.length; head++) {
    const n = queue[head], i = n % COLS, j = (n / COLS) | 0
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
      const ii = i + di, jj = j + dj
      if (ii < 0 || jj < 0 || ii >= COLS || jj >= ROWS) continue
      const m = jj * COLS + ii
      if (Number.isFinite(v[m])) continue
      v[m] = v[n]
      queue.push(m)
    }
  }
}
/** separable Gaussian over the grid */
function smooth(v: Float32Array, sigma: number) {
  const r = Math.ceil(3 * sigma)
  const k = Array.from({ length: 2 * r + 1 }, (_, t) => Math.exp(-((t - r) ** 2) / (2 * sigma * sigma)))
  const tmp = new Float32Array(v.length)
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
    let s = 0, wsum = 0
    for (let t = -r; t <= r; t++) {
      const ii = Math.min(COLS - 1, Math.max(0, i + t))
      s += k[t + r] * v[j * COLS + ii]; wsum += k[t + r]
    }
    tmp[j * COLS + i] = s / wsum
  }
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
    let s = 0, wsum = 0
    for (let t = -r; t <= r; t++) {
      const jj = Math.min(ROWS - 1, Math.max(0, j + t))
      s += k[t + r] * tmp[jj * COLS + i]; wsum += k[t + r]
    }
    v[j * COLS + i] = s / wsum
  }
}
fill(line); fill(band)
smooth(line, SMOOTH_NODES); smooth(band, SMOOTH_NODES)
// the floors go on last: smoothing may spread a measured line over a range MODIS never saw white,
// and raising it there only ever removes snow
for (let n = 0; n < line.length; n++) if (floors[n] > line[n]) line[n] = Math.min(NO_SNOW_M, floors[n])

// ---------------------------------------------------------------- 5. write and publish
const grid = new Int16Array(COLS * ROWS * 2)
for (let n = 0; n < COLS * ROWS; n++) {
  grid[n] = Math.round(Math.min(NO_SNOW_M, Math.max(0, line[n])) / QUANT)
  grid[COLS * ROWS + n] = Math.round(Math.min(MAX_BAND, Math.max(MIN_BAND, band[n])) / QUANT)
}
const header = { cols: COLS, rows: ROWS * 2, plane: ROWS, kmPerSample: SNOW_KM, quant: QUANT, f0: F0 }
const file = pack(header, gzipSync(paethEncode(grid, COLS, ROWS * 2), { level: 9 }))

// the salars, on their own 1 km grid: a flag per cell, in the corridor's own coordinates
const SCOLS = Math.round((2 * HALF_WIDTH_KM) / SALT_KM), SROWS = Math.round((TILES_Y * TILE_KM) / SALT_KM)
const salt = new Int16Array(SCOLS * SROWS)
let saltCells = 0
for (let j = 0; j < SROWS; j++) {
  const lat = LAT_N - ((j + 0.5) * SALT_KM) / KM_PER_DEG
  const py = Math.round((latN - lat) / DEG)
  if (py < 0 || py >= H) continue
  const kmPerLon = KM_PER_DEG * Math.cos(rad(lat)), lonc = lonC(lat)
  for (let i = 0; i < SCOLS; i++) {
    const kmX = (i + 0.5) * SALT_KM - HALF_WIDTH_KM
    const px = Math.round((lonc + kmX / kmPerLon - lonW) / DEG)
    if (px < 0 || px >= W || !salty[py * W + px]) continue
    salt[j * SCOLS + i] = 1
    saltCells++
  }
}
const saltFile = pack({ cols: SCOLS, rows: SROWS, kmPerSample: SALT_KM }, gzipSync(paethEncode(salt, SCOLS, SROWS), { level: 9 }))

const dir = currentDir()
if (!dir) throw new Error('no published terrain directory: run npm run terrain:fetch first')
writeFileSync(`${dir}/snow.bin`, file)
writeFileSync(`${dir}/salt.bin`, saltFile)
const index = JSON.parse(readFileSync(`${dir}/index.json`, 'utf8'))
index.snow = { cols: COLS, rows: ROWS, kmPerSample: SNOW_KM, bytes: file.length }
index.salt = { cols: SCOLS, rows: SROWS, kmPerSample: SALT_KM, bytes: saltFile.length }
writeFileSync(`${dir}/index.json`, JSON.stringify(index))
const out = publish(dir)

// ---------------------------------------------------------------- the report
console.log(`wrote ${out}/snow.bin: ${COLS} x ${ROWS} nodes, ${(file.length / 1024).toFixed(1)} KB`)
console.log(`wrote ${out}/salt.bin: ${saltCells} km² of salar, ${(saltFile.length / 1024).toFixed(1)} KB`)
/** the value of the field at a lat/lon, as the client will read it */
const at = (v: Float32Array, lat: number, lon: number) => {
  const { kmX, kmZ } = toKm(lat, lon)
  const i = Math.min(COLS - 1, Math.max(0, Math.round((kmX + HALF_WIDTH_KM) / SNOW_KM)))
  const j = Math.min(ROWS - 1, Math.max(0, Math.round(kmZ / SNOW_KM)))
  return v[j * COLS + i]
}
console.log('  against the published snow lines:')
let se = 0
for (const [name, lat, lon, want] of REFERENCE) {
  const got = at(line, lat, lon)
  se += (got - want) ** 2
  console.log(`    ${name.padEnd(22)} ${Math.round(got).toString().padStart(5)} m   published ${want} m   ${(got - want > 0 ? '+' : '') + Math.round(got - want)} m  (clear sky ${(at(trans, lat, lon) * 100).toFixed(0)} %)`)
}
console.log(`    rms ${Math.round(Math.sqrt(se / REFERENCE.length))} m`)
// across the country: the line (and the ground under it) at a few km east of the centreline
const OFFSETS = [-80, -40, 0, 40, 80, 120]
console.log(`  across the corridor, km east of the centreline (line m / highest ground m):`)
console.log(`    lat  ${OFFSETS.map((o) => `${o > 0 ? '+' : ''}${o} km`.padStart(14)).join('')}`)
for (let lat = -18; lat >= -55; lat -= 2) {
  const nj = Math.round(((LAT_N - lat) * KM_PER_DEG) / SNOW_KM)
  if (nj < 0 || nj >= ROWS) continue
  const cells = OFFSETS.map((off) => {
    const ni = Math.round((off + HALF_WIDTH_KM) / SNOW_KM)
    if (ni < 0 || ni >= COLS) return ''.padStart(14)
    let high = 0
    for (let d = -16; d <= 16; d++) {
      const { i, j } = ds.cellOf(off + d * KM_PER_SAMPLE, nj * SNOW_KM)
      if (i >= 0 && j >= 0 && i < ds.cols && j < ds.rows) high = Math.max(high, ds.metres(i, j))
    }
    const v = line[nj * COLS + ni]
    return `${Math.round(v)}/${Math.round(high)}`.padStart(14)
  })
  console.log(`    ${lat.toString().padStart(4)}°${cells.join('')}`)
}
const bands = [...band].filter(Number.isFinite).sort((a, b) => a - b)
const bq = (f: number) => Math.round(bands[Math.floor(bands.length * f)])
console.log(`  fade band: ${bq(0)}..${bq(0.999)} m, quartiles ${bq(0.25)} / ${bq(0.5)} / ${bq(0.75)} m`)
// what the scene will actually paint: the share of the land the field puts above the line
console.log('  white ground per degree of latitude:')
let rows = ''
for (let lat = -18; lat >= -55; lat--) {
  let land = 0, white = 0
  const j0 = Math.round(((LAT_N - lat) * KM_PER_DEG) / KM_PER_SAMPLE)
  for (let j = j0; j < j0 + Math.round(KM_PER_DEG / KM_PER_SAMPLE) && j < ds.rows; j += 4) {
    for (let i = 0; i < ds.cols; i += 4) {
      const e = ds.metres(i, j)
      if (e <= 0) continue
      land++
      const ni = Math.min(COLS - 1, Math.max(0, Math.round((i * KM_PER_SAMPLE) / SNOW_KM)))
      const nj = Math.min(ROWS - 1, Math.round((j * KM_PER_SAMPLE) / SNOW_KM))
      if (e > line[nj * COLS + ni]) white++
    }
  }
  const pct = land ? (100 * white) / land : 0
  rows += `    ${lat.toString().padStart(4)}°  ${pct.toFixed(1).padStart(5)} %  ${'#'.repeat(Math.round(pct / 2))}\n`
}
console.log(rows.trimEnd())
