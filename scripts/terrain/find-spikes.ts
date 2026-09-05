// Scans the published dataset (public/terrain/cl-<hash>/) for terrain that cannot be real:
// Run: npm run terrain:spikes [-- --min-rise 400 --min-peak-excess 300 --at -49.143,-74.318 --radius 6]
//
// 1. Elevation spikes: a sample that stands `--min-rise` metres above (or below) every one of
//    its eight neighbours (250 m away) is a needle no mountain makes — the SRTM void garbage in
//    the source tiles produces them (see despike.ts, which repairs them in place). Garbage a few
//    samples wide is a blob: nothing beside it clears the 3 x 3 ring, but it stands `--min-rise`
//    above, and at twice the height of, the whole ring 500 m to 1 km out (Dataset.blob).
//    Each is reported once (flagged samples within 1 km are grouped) with its rise over the
//    3 x 3 and 5 x 5 rings, sorted by rise.
// 2. Peak spikes: the scene pins a named summit's nearest vertex to its OSM `ele`, so a peak
//    whose elevation exceeds the relief under it by `--min-peak-excess` metres draws a spike of
//    its own (a wrong `ele`, or a node placed off its mountain).
// 3. `--at lat,lon` prints the samples around a point (`--radius` cells each way) so a spike
//    reported from the game can be looked at in the data.
import { KM_PER_SAMPLE, toKm, toLatLon } from './corridor.ts'
import { Dataset, type Peak } from './dataset.ts'

// ---------------------------------------------------------------- args
const args = process.argv.slice(2)
const arg = (name: string, def: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def }
const MIN_RISE = Number(arg('--min-rise', '400'))
const MIN_PEAK_EXCESS = Number(arg('--min-peak-excess', '300'))
const AT = arg('--at', '')
const RADIUS = Number(arg('--radius', '6'))

const ds = new Dataset()
console.log(`${ds.dir}: ${ds.headers.size} land tiles, ${ds.peaks.length} peaks, grid ${ds.cols} x ${ds.rows} samples of ${KM_PER_SAMPLE} km`)

// ---------------------------------------------------------------- 1. elevation spikes and pits
type Spike = { i: number; j: number; v: number; kind: string; rise1: number; rise2: number }
const spikes: Spike[] = []
for (let j = 0; j < ds.rows; j++) for (let i = 0; i < ds.cols; i++) {
  const v = ds.metres(i, j)
  let kind = ''
  if (ds.needle(i, j, MIN_RISE)) kind = 'needle'
  else if (ds.pit(i, j, MIN_RISE, 150)) kind = 'pit'
  else if (ds.blob(i, j, MIN_RISE)) kind = 'blob'
  if (kind) spikes.push({ i, j, v, kind, rise1: v - (kind === 'pit' ? ds.ringMin(i, j, 1) : ds.ringMax(i, j, 1)), rise2: v - (kind === 'pit' ? ds.ringMin(i, j, 2) : ds.perimMax(i, j, 2)) })
}
spikes.sort((a, b) => Math.abs(b.rise2) - Math.abs(a.rise2))
const groupCells = Math.ceil(1 / KM_PER_SAMPLE)
const grouped: Spike[] = []
for (const s of spikes) if (!grouped.some((g) => Math.abs(g.i - s.i) <= groupCells && Math.abs(g.j - s.j) <= groupCells)) grouped.push(s)
console.log(`\n== ${grouped.length} elevation spikes of >= ${MIN_RISE} m: needles and pits against all 8 neighbours, blobs against the 500 m-1 km ring (${spikes.length} samples)`)
console.log('   kind    height   rise/3x3  rise/500m   lat,lon  km x,z  tile')
for (const s of grouped) console.log(`  ${s.kind.padEnd(6)} ${String(s.v).padStart(6)} m  ${String(s.rise1).padStart(6)} m  ${String(s.rise2).padStart(6)} m   ${ds.where(s.i, s.j)}`)

// ---------------------------------------------------------------- 2. peaks above their terrain
type Bad = Peak & { under: number; excess: number }
const bad: Bad[] = []
for (const p of ds.peaks) {
  const { i, j } = ds.cellOf(p.kmX, p.kmZ)
  // the scene snaps the summit to its nearest 400 m vertex, so the relief within 500 m counts
  const under = Math.max(ds.metres(i, j), ds.ringMax(i, j, 2))
  const excess = p.ele - under
  if (excess >= MIN_PEAK_EXCESS) bad.push({ ...p, under, excess })
}
bad.sort((a, b) => b.excess - a.excess)
console.log(`\n== ${bad.length} named peaks whose OSM elevation exceeds the relief under them by >= ${MIN_PEAK_EXCESS} m (of ${ds.peaks.length})`)
console.log('   ele    terrain  excess   name   lat,lon  km x,z  tile')
for (const p of bad) {
  const { lat, lon } = toLatLon(p.kmX, p.kmZ)
  console.log(`  ${String(p.ele).padStart(5)} m  ${String(p.under).padStart(5)} m  ${String(p.excess).padStart(5)} m   ${p.name}   ${lat.toFixed(4)},${lon.toFixed(4)}  km ${p.kmX},${p.kmZ}  tile ${p.tile}`)
}

// ---------------------------------------------------------------- 3. a neighbourhood on request
if (AT) {
  const [lat, lon] = AT.split(',').map(Number)
  const { kmX, kmZ } = toKm(lat, lon)
  const { i, j } = ds.cellOf(kmX, kmZ)
  console.log(`\n== samples around ${lat},${lon} (km ${kmX.toFixed(1)},${kmZ.toFixed(1)}; ${ds.where(i, j)}); rows run north to south, columns west to east, metres`)
  for (let dj = -RADIUS; dj <= RADIUS; dj++) {
    const row: string[] = []
    for (let di = -RADIUS; di <= RADIUS; di++) {
      const ii = i + di, jj = j + dj
      row.push(ii < 0 || jj < 0 || ii >= ds.cols || jj >= ds.rows ? '     ' : String(ds.metres(ii, jj)).padStart(5))
    }
    console.log(`  ${row.join(' ')}${dj === 0 ? '   <- this row' : ''}`)
  }
  for (const p of ds.peaks) {
    const d = Math.hypot(p.kmX - kmX, p.kmZ - kmZ)
    if (d > RADIUS * KM_PER_SAMPLE) continue
    const c = ds.cellOf(p.kmX, p.kmZ)
    console.log(`  peak ${p.name} ${p.ele} m at km ${p.kmX},${p.kmZ} (${d.toFixed(1)} km away), terrain ${ds.metres(c.i, c.j)} m`)
  }
}
