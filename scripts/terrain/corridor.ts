// The corridor that the streamed Chile dataset lives in, shared by the build scripts.
//
// World km: x east of a hand-drawn centreline that follows the country (roughly the central
// valley), z south of LAT_N. Tiles are TILE x TILE cells of KM_PER_SAMPLE km. Every layer
// (relief, buildings) uses this grid so the client can address them with the same tile keys.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { gunzipSync } from 'node:zlib'

// centreline, north -> south
export const CENTER: [number, number][] = [
  [-17.4, -69.9], [-19.0, -69.7], [-21.0, -69.5], [-23.0, -69.3], [-25.0, -69.5], [-27.0, -69.9],
  [-29.0, -70.5], [-31.0, -70.8], [-33.0, -70.8], [-33.5, -70.85], [-35.0, -71.3], [-37.0, -72.1],
  [-39.0, -72.5], [-41.0, -72.9], [-43.0, -73.0], [-45.0, -73.0], [-47.0, -73.3], [-49.0, -73.6],
  [-51.0, -73.0], [-52.5, -71.8], [-54.0, -69.6], [-56.2, -68.0],
]
export const LAT_N = -17.4
export const LAT_S = -56.2
export const HALF_WIDTH_KM = 256
export const KM_PER_SAMPLE = 0.25
export const TILE = 256
export const TILE_KM = TILE * KM_PER_SAMPLE
export const TILES_X = Math.ceil((2 * HALF_WIDTH_KM) / TILE_KM)
export const TILES_Y = Math.ceil(((LAT_N - LAT_S) * 111.32) / TILE_KM)
export const KM_PER_DEG = 111.32
export const CACHE = 'scripts/terrain/.cache'
export const PUBLIC_DIR = 'public/terrain'

export const rad = (d: number) => (d * Math.PI) / 180

// Inserts: places far outside the corridor drawn inside it. Rapa Nui is 3,700 km out in the
// Pacific; here a 22 km circle at its true latitude, 225 km off Caldera, maps onto the island's
// real coordinates (relief, peaks, places), so it is reachable in a flight. Its longitude is a
// fiction by design; everything about the island itself is real.
export const INSERTS = [{ name: 'Rapa Nui', lat: -27.11, lon: -109.35, kmX: -225, radiusKm: 22 }]
const insZ = (ins: { lat: number }) => (LAT_N - ins.lat) * 111.32
export function insertAtKm(kmX: number, kmZ: number) {
  return INSERTS.find((ins) => Math.hypot(kmX - ins.kmX, kmZ - insZ(ins)) <= ins.radiusKm) ?? null
}
export function insertAtLatLon(lat: number, lon: number) {
  return INSERTS.find((ins) => Math.hypot((lon - ins.lon) * 111.32 * Math.cos(rad(lat)), (lat - ins.lat) * 111.32) <= ins.radiusKm) ?? null
}
export function lonC(lat: number) {
  if (lat >= CENTER[0][0]) return CENTER[0][1]
  for (let i = 1; i < CENTER.length; i++) {
    const [a, la] = CENTER[i - 1], [b, lb] = CENTER[i]
    if (lat >= b) return la + ((lb - la) * (lat - a)) / (b - a)
  }
  return CENTER[CENTER.length - 1][1]
}
export const toLatLon = (kmX: number, kmZ: number) => {
  const ins = insertAtKm(kmX, kmZ)
  if (ins) {
    const lat = ins.lat - (kmZ - insZ(ins)) / KM_PER_DEG
    return { lat, lon: ins.lon + (kmX - ins.kmX) / (KM_PER_DEG * Math.cos(rad(lat))) }
  }
  const lat = LAT_N - kmZ / KM_PER_DEG
  return { lat, lon: lonC(lat) + kmX / (KM_PER_DEG * Math.cos(rad(lat))) }
}
export const toKm = (lat: number, lon: number) => {
  const ins = insertAtLatLon(lat, lon)
  if (ins) return { kmX: ins.kmX + (lon - ins.lon) * KM_PER_DEG * Math.cos(rad(lat)), kmZ: insZ(ins) + (ins.lat - lat) * KM_PER_DEG }
  return { kmX: (lon - lonC(lat)) * KM_PER_DEG * Math.cos(rad(lat)), kmZ: (LAT_N - lat) * KM_PER_DEG }
}
/** lon/lat boxes of the inserts, for the data fetches that otherwise follow the corridor */
export const insertBoxes = () => INSERTS.map((ins) => {
  const dlat = ins.radiusKm / KM_PER_DEG, dlon = ins.radiusKm / (KM_PER_DEG * Math.cos(rad(ins.lat)))
  return { name: ins.name, s: ins.lat - dlat, n: ins.lat + dlat, w: ins.lon - dlon, e: ins.lon + dlon }
})
export const tileOf = (kmX: number, kmZ: number) => ({ tx: Math.floor((kmX + HALF_WIDTH_KM) / TILE_KM), ty: Math.floor(kmZ / TILE_KM) })
/** lon/lat bounding box of the corridor between two latitudes */
export function corridorBox(latS: number, latN: number) {
  let w = Infinity, e = -Infinity
  for (let lat = latS; lat <= latN + 1e-9; lat += 0.25) {
    const half = HALF_WIDTH_KM / (KM_PER_DEG * Math.cos(rad(lat)))
    w = Math.min(w, lonC(lat) - half); e = Math.max(e, lonC(lat) + half)
  }
  return { w, e }
}

// ---------------------------------------------------------------- download with cache
export async function cached(url: string, key: string, bin: boolean, init?: RequestInit): Promise<Buffer> {
  const file = `${CACHE}/${key}`
  if (existsSync(file)) return readFileSync(file)
  let lastErr: unknown
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, init)
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${(await res.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (!bin) JSON.parse(buf.toString()) // an HTML error page is not a result
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, buf)
      return buf
    } catch (e) {
      lastErr = e
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
    }
  }
  throw new Error(`failed ${url}: ${lastErr}`)
}

export async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  await Promise.all(Array.from({ length: n }, async () => {
    for (;;) {
      const k = i++
      if (k >= items.length) return
      out[k] = await fn(items[k])
    }
  }))
  return out
}

// ---------------------------------------------------------------- file format: 'CTW1' + u32 header length + JSON header + payload
export function paethEncode(v: Int16Array, cols: number, rows: number): Buffer {
  const out = Buffer.alloc(v.length * 2)
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const i = y * cols + x
    const a = x > 0 ? v[i - 1] : 0, b = y > 0 ? v[i - cols] : 0, c = x > 0 && y > 0 ? v[i - cols - 1] : 0
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
    out.writeInt16LE(v[i] - (pa <= pb && pa <= pc ? a : pb <= pc ? b : c), i * 2)
  }
  return out
}
/** the JSON header of a tile or overview file, without touching its samples */
export function readHeader(buf: Buffer): any {
  if (buf.toString('latin1', 0, 4) !== 'CTW1') throw new Error('bad terrain file')
  return JSON.parse(buf.toString('utf8', 8, 8 + buf.readUInt32LE(4)))
}
/**
 * peaks.json: every named summit of the dataset as [name, kmX, kmZ, ele], gathered from the tile
 * headers (where the scene reads them tile by tile), for the in-game search, which needs them
 * all at once. Returns its size in bytes.
 */
export function writePeaksIndex(dir: string): number {
  const rows: [string, number, number, number][] = []
  for (const file of readdirSync(`${dir}/t`)) if (/^\d+-\d+\.bin$/.test(file)) rows.push(...(readHeader(readFileSync(`${dir}/t/${file}`)).peaks as [string, number, number, number][]))
  rows.sort((a, b) => b[3] - a[3])
  const json = JSON.stringify(rows)
  writeFileSync(`${dir}/peaks.json`, json)
  return Buffer.byteLength(json)
}
/** the inverse of pack + paethEncode: a tile or overview file back to its header and samples */
export function unpack(buf: Buffer): { header: any; data: Int16Array } {
  if (buf.toString('latin1', 0, 4) !== 'CTW1') throw new Error('bad terrain file')
  const len = buf.readUInt32LE(4)
  const header = JSON.parse(buf.toString('utf8', 8, 8 + len))
  const raw = gunzipSync(buf.subarray(8 + len))
  const data = new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2)
  const cols: number = header.cols ?? header.n, rows: number = header.rows ?? header.n
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const i = y * cols + x
    const a = x > 0 ? data[i - 1] : 0, b = y > 0 ? data[i - cols] : 0, c = x > 0 && y > 0 ? data[i - cols - 1] : 0
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
    data[i] += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
  }
  return { header, data }
}
export function pack(header: object, blob: Buffer): Buffer {
  const h = Buffer.from(JSON.stringify(header))
  const len = Buffer.alloc(4)
  len.writeUInt32LE(h.length)
  return Buffer.concat([Buffer.from('CTW1'), len, h, blob])
}

// ---------------------------------------------------------------- the published directory
/** the current public/terrain/cl-<hash> directory, if any */
export function currentDir(): string | null {
  if (!existsSync(PUBLIC_DIR)) return null
  return readdirSync(PUBLIC_DIR).filter((d) => /^cl-[0-9a-f]+$/.test(d)).map((d) => `${PUBLIC_DIR}/${d}`)[0] ?? null
}
/**
 * Seal a dataset directory: its index.json decides the content hash, the directory is renamed
 * to cl-<hash>, older ones are removed, and the loader (app/frontend/terrain/terrain-url.ts) follows; the Rails layout reads its preload hrefs from that file.
 */
export function publish(tmpDir: string): string {
  const indexJson = readFileSync(`${tmpDir}/index.json`, 'utf8')
  const dir = `cl-${createHash('md5').update(indexJson).digest('hex').slice(0, 8)}`
  mkdirSync(PUBLIC_DIR, { recursive: true })
  for (const old of readdirSync(PUBLIC_DIR)) if (/^cl-[0-9a-f]+$/.test(old) && `${PUBLIC_DIR}/${old}` !== tmpDir) rmSync(`${PUBLIC_DIR}/${old}`, { recursive: true })
  if (tmpDir !== `${PUBLIC_DIR}/${dir}`) renameSync(tmpDir, `${PUBLIC_DIR}/${dir}`)
  writeFileSync('app/frontend/terrain/terrain-url.ts', `// generated by the scripts in scripts/\nexport default '/terrain/${dir}'\n`)
  return `${PUBLIC_DIR}/${dir}`
}
