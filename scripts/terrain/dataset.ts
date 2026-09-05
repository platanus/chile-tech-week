// The published dataset (public/terrain/cl-<hash>/) loaded as one corridor-wide grid, for the
// scripts that inspect or repair it offline (find-spikes.ts, despike.ts). Tiles overlap by one
// sample, so the grid has TILES * TILE + 1 samples a side; sea tiles stay at the sea floor.
import { readFileSync, readdirSync } from 'node:fs'
import { HALF_WIDTH_KM, KM_PER_SAMPLE, TILE, TILE_KM, currentDir, toLatLon, unpack } from './corridor.ts'

export type Peak = { name: string; kmX: number; kmZ: number; ele: number; tile: string }
export type TileHeader = { tx: number; ty: number; n: number; quant: number; maxMetres: number; peaks: [string, number, number, number][] }

export class Dataset {
  dir: string
  index: any
  quant: number
  cols: number
  rows: number
  grid: Int16Array
  headers = new Map<string, TileHeader>() // "ty-tx" of every land tile on disk
  peaks: Peak[] = []

  constructor() {
    const dir = currentDir()
    if (!dir) throw new Error('no public/terrain/cl-<hash> directory: run npm run terrain:fetch first')
    this.dir = dir
    this.index = JSON.parse(readFileSync(`${dir}/index.json`, 'utf8'))
    this.quant = this.index.quant
    this.cols = this.index.tilesX * TILE + 1
    this.rows = this.index.tilesY * TILE + 1
    this.grid = new Int16Array(this.cols * this.rows).fill(Math.round(-500 / this.quant))
    const S = TILE + 1
    for (const file of readdirSync(`${dir}/t`)) {
      const m = /^(\d+)-(\d+)\.bin$/.exec(file)
      if (!m) continue
      const ty = Number(m[1]), tx = Number(m[2])
      const { header, data } = unpack(readFileSync(`${dir}/t/${file}`))
      for (let j = 0; j < S; j++) this.grid.set(data.subarray(j * S, j * S + S), (ty * TILE + j) * this.cols + tx * TILE)
      this.headers.set(`${ty}-${tx}`, header)
      for (const [name, kmX, kmZ, ele] of header.peaks) this.peaks.push({ name, kmX, kmZ, ele, tile: `${ty}-${tx}` })
    }
  }

  /** metres at grid cell (i, j) */
  metres(i: number, j: number): number { return this.grid[j * this.cols + i] * this.quant }
  cellOf(kmX: number, kmZ: number) { return { i: Math.round((kmX + HALF_WIDTH_KM) / KM_PER_SAMPLE), j: Math.round(kmZ / KM_PER_SAMPLE) } }
  kmOf(i: number, j: number) { return { kmX: i * KM_PER_SAMPLE - HALF_WIDTH_KM, kmZ: j * KM_PER_SAMPLE } }
  /** "lat,lon  km x,z  tile ty-tx" of a cell, for reports */
  where(i: number, j: number): string {
    const { kmX, kmZ } = this.kmOf(i, j)
    const { lat, lon } = toLatLon(kmX, kmZ)
    return `${lat.toFixed(4)},${lon.toFixed(4)}  km ${kmX.toFixed(1)},${kmZ.toFixed(1)}  tile ${Math.floor(kmZ / TILE_KM)}-${Math.floor((kmX + HALF_WIDTH_KM) / TILE_KM)}`
  }
  /** the samples (metres) in the square ring of radius r around (i, j), the centre excluded */
  ring(i: number, j: number, r: number): number[] {
    const out: number[] = []
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (!di && !dj) continue
      const ii = i + di, jj = j + dj
      if (ii < 0 || jj < 0 || ii >= this.cols || jj >= this.rows) continue
      out.push(this.metres(ii, jj))
    }
    return out
  }
  /** the highest sample on the perimeter of the square of radius r around (i, j) */
  perimMax(i: number, j: number, r: number): number {
    let mx = -Infinity
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.abs(di) !== r && Math.abs(dj) !== r) continue
      const ii = i + di, jj = j + dj
      if (ii < 0 || jj < 0 || ii >= this.cols || jj >= this.rows) continue
      const v = this.metres(ii, jj)
      if (v > mx) mx = v
    }
    return mx
  }
  /** the samples of the square window of radius r that `keep` accepts, for a fill value */
  windowMedian(i: number, j: number, r: number, keep: (ii: number, jj: number) => boolean): number {
    const v: number[] = []
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      const ii = i + di, jj = j + dj
      if (ii < 0 || jj < 0 || ii >= this.cols || jj >= this.rows || !keep(ii, jj)) continue
      v.push(this.metres(ii, jj))
    }
    v.sort((a, b) => a - b)
    return v.length ? (v.length & 1 ? v[v.length >> 1] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : NaN
  }
  ringMax(i: number, j: number, r: number): number { return Math.max(...this.ring(i, j, r)) }
  ringMin(i: number, j: number, r: number): number { return Math.min(...this.ring(i, j, r)) }
  ringMedian(i: number, j: number, r: number): number {
    const v = this.ring(i, j, r).sort((a, b) => a - b)
    return v.length & 1 ? v[v.length >> 1] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2
  }

  // ---------------------------------------------------------------- what cannot be real
  /** a sample `minRise` above every one of its 8 neighbours (250 m away): a one-sample needle */
  needle(i: number, j: number, minRise: number): boolean {
    const v = this.metres(i, j)
    return v > 0 && v - this.ringMax(i, j, 1) >= minRise
  }
  /** a sample `minRise` below all 8 neighbours, or at sea level with every neighbour above `floor`: a pit */
  pit(i: number, j: number, minRise: number, floor: number): boolean {
    const v = this.metres(i, j), mn = this.ringMin(i, j, 1)
    return mn - v >= minRise || (v <= 0 && mn >= floor)
  }
  /**
   * Garbage two to seven samples wide hides each bad sample behind another: none clears its
   * 3 x 3 ring. Such a blob still stands `minRise` above, and at twice the height of, everything
   * on the ring 500 m to 1 km out — no relief does that on every side — unless a named summit
   * within 1 km vouches for it (the isolation-filtered peaks list keeps exactly the summits that
   * dominate their surroundings). Returns the ring radius that exposed it, or 0.
   */
  blob(i: number, j: number, minRise: number): number {
    const v = this.metres(i, j)
    if (v < minRise) return 0
    for (let r = 2; r <= 4; r++) {
      const mx = this.perimMax(i, j, r)
      if (v - mx >= minRise && v >= 2 * mx) return this.vouched(i, j, v) ? 0 : r
    }
    return 0
  }
  private peakCells: Map<string, Peak[]> | null = null
  /** is there a named summit within 1 km whose elevation accounts for a sample of v metres? */
  vouched(i: number, j: number, v: number): boolean {
    if (!this.peakCells) {
      this.peakCells = new Map()
      for (const p of this.peaks) {
        const c = this.cellOf(p.kmX, p.kmZ), key = `${c.i >> 2},${c.j >> 2}`
        if (!this.peakCells.has(key)) this.peakCells.set(key, [])
        this.peakCells.get(key)!.push(p)
      }
    }
    const ci = i >> 2, cj = j >> 2
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      for (const p of this.peakCells.get(`${ci + di},${cj + dj}`) ?? []) {
        const c = this.cellOf(p.kmX, p.kmZ)
        if (Math.abs(c.i - i) <= 4 && Math.abs(c.j - j) <= 4 && p.ele >= 0.8 * v) return true
      }
    }
    return false
  }
}
