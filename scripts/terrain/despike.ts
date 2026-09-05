// Repairs the published dataset in place, no downloads: the AWS terrarium tiles carry SRTM void
// garbage over the Patagonian fjords (pixels of 7,000 m or -2,000 m next to 500 m terrain), and
// fetch-terrain.ts's max-biased resampling turns each into a one-sample needle or pit.
// Run: npm run terrain:despike [-- --min-rise 400 --dry-run]
//
// A sample is garbage when it stands `--min-rise` metres above, or below, every one of its
// eight neighbours (250 m away): no relief does that on all sides at once. It is replaced by the
// median of those neighbours. Garbage a few samples wide (a blob) hides each bad sample behind
// another; Dataset.blob catches it against the ring 500 m to 1 km out, and every sample of the
// blob is filled with the median of the sound samples within 1 km. The pass repeats until
// nothing changes. Land samples at or below sea level whose neighbours are all well above it
// are pits from negative garbage and get the same treatment — the scene would draw them as a lake.
// The tiles and the overview are re-encoded from the repaired grid into the dataset directory
// itself (the buildings and places layers stay as they are) and it is republished under a new
// cl-<hash> (corridor.ts publish: renamed, terrain-url.ts updated).
import { rmSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { TILE, pack, paethEncode, publish } from './corridor.ts'
import { Dataset } from './dataset.ts'

const args = process.argv.slice(2)
const arg = (name: string, def: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def }
const MIN_RISE = Number(arg('--min-rise', '400'))
const PIT_FLOOR = 150 // a sample at or below sea level with every neighbour above this is a pit
const DRY = args.includes('--dry-run')
const PEAK_BIAS = 0.5 // overview blocks blend cell mean and max, as fetch-terrain.ts does

const ds = new Dataset()
const { grid, cols, rows, quant } = ds
console.log(`${ds.dir}: ${ds.headers.size} land tiles, grid ${cols} x ${rows}`)

// only samples that belong to a tile on disk are ever written back (the shared edge sample
// belongs to both tiles; the sea-tile fill around a land tile is not a pit)
function onLand(i: number, j: number): boolean {
  const tx = Math.floor(i / TILE), ty = Math.floor(j / TILE)
  for (const y of j % TILE === 0 ? [ty - 1, ty] : [ty]) for (const x of i % TILE === 0 ? [tx - 1, tx] : [tx]) if (ds.headers.has(`${y}-${x}`)) return true
  return false
}

// ---------------------------------------------------------------- repair
type Fix = { i: number; j: number; kind: string; from: number; to: number }
const fixes: Fix[] = []
const bad = new Uint8Array(cols * rows) // this pass's garbage: a blob is filled from what is not garbage
for (let pass = 1; pass <= 8; pass++) {
  const found: Fix[] = []
  bad.fill(0)
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if (!onLand(i, j)) continue
    const kind = ds.needle(i, j, MIN_RISE) ? 'needle' : ds.pit(i, j, MIN_RISE, PIT_FLOOR) ? 'pit' : ds.blob(i, j, MIN_RISE) ? 'blob' : ''
    if (!kind) continue
    bad[j * cols + i] = 1
    found.push({ i, j, kind, from: ds.metres(i, j), to: NaN })
  }
  for (const f of found) f.to = f.kind === 'blob' ? ds.windowMedian(f.i, f.j, 4, (ii, jj) => !bad[jj * cols + ii]) : ds.ringMedian(f.i, f.j, 1)
  for (const f of found) if (isFinite(f.to)) grid[f.j * cols + f.i] = Math.round(f.to / quant)
  fixes.push(...found)
  const blobs = found.filter((f) => f.kind === 'blob').length
  console.log(`pass ${pass}: ${found.length} samples repaired${blobs ? ` (${blobs} in blobs)` : ''}`)
  if (!found.length) break
}
fixes.sort((a, b) => Math.abs(b.from - b.to) - Math.abs(a.from - a.to))
for (const f of DRY ? fixes : fixes.slice(0, 15)) console.log(`  ${f.kind.padEnd(6)} ${String(f.from).padStart(6)} m -> ${String(f.to).padStart(5)} m   ${ds.where(f.i, f.j)}`)
if (!DRY && fixes.length > 15) console.log(`  … ${fixes.length - 15} more`)
if (DRY) { console.log('dry run: nothing written'); process.exit(0) }
if (!fixes.length) { console.log('nothing to repair'); process.exit(0) }

// ---------------------------------------------------------------- re-encode and publish
const S = TILE + 1
const index = ds.index
const OV = Math.round(index.overview.kmPerSample / index.kmPerSample), OV_PER_TILE = TILE / OV
const ovCols: number = index.overview.cols, ovRows: number = index.overview.rows
const overview = new Int16Array(ovCols * ovRows).fill(Math.round(-500 / quant))
const dir = ds.dir
const sizes: number[] = []
let land = 0, dropped = 0, totalBytes = 0
for (let ty = 0; ty < index.tilesY; ty++) for (let tx = 0; tx < index.tilesX; tx++) {
  const header = ds.headers.get(`${ty}-${tx}`)
  if (!header) { sizes.push(0); continue }
  const data = new Int16Array(S * S)
  let max = -Infinity
  for (let j = 0; j < S; j++) {
    const row = grid.subarray((ty * TILE + j) * cols + tx * TILE, (ty * TILE + j) * cols + tx * TILE + S)
    data.set(row, j * S)
    for (const v of row) if (v > max) max = v
  }
  const maxMetres = max * quant
  if (maxMetres <= 0) { sizes.push(0); dropped++; rmSync(`${dir}/t/${ty}-${tx}.bin`); continue } // its only land was garbage: now an all-sea tile
  for (let j = 0; j < OV_PER_TILE; j++) for (let i = 0; i < OV_PER_TILE; i++) {
    let sum = 0, n = 0, mx = -Infinity
    for (let y = 0; y < OV; y++) for (let x = 0; x < OV; x++) { const v = data[(j * OV + y) * S + i * OV + x]; sum += v; n++; if (v > mx) mx = v }
    overview[(ty * OV_PER_TILE + j) * ovCols + tx * OV_PER_TILE + i] = Math.round((sum / n) * (1 - PEAK_BIAS) + mx * PEAK_BIAS)
  }
  const file = pack({ ...header, maxMetres }, gzipSync(paethEncode(data, S, S), { level: 9 }))
  writeFileSync(`${dir}/t/${ty}-${tx}.bin`, file)
  sizes.push(file.length)
  totalBytes += file.length
  land++
}
const ovFile = pack({ cols: ovCols, rows: ovRows, kmPerSample: index.overview.kmPerSample, quant }, gzipSync(paethEncode(overview, ovCols, ovRows), { level: 9 }))
writeFileSync(`${dir}/overview.bin`, ovFile)
writeFileSync(`${dir}/index.json`, JSON.stringify({ ...index, overview: { ...index.overview, bytes: ovFile.length }, sizes }))
const out = publish(dir)
console.log(`wrote ${out}: ${fixes.length} samples repaired, ${land} land tiles${dropped ? ` (${dropped} became sea)` : ''}, ${(totalBytes / 1048576).toFixed(1)} MB + overview ${(ovFile.length / 1024).toFixed(0)} KB`)
