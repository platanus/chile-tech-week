// Real Chile for the landing scene, streamed tile by tile from a static CDN directory
// (public/terrain/cl-<hash>/, built by scripts/fetch-terrain.ts).
//
// World km: x east of the corridor centreline, z south of the northern edge. Tiles are 64 km
// squares of 257 x 257 samples (one-sample overlap, so a bilinear read never leaves its tile),
// Int16 metres / quant, Paeth-predicted and gzipped behind a JSON header that also lists the
// tile's named peaks. A 2 km overview of the whole country stands in for tiles that have not
// arrived yet, and the index says which tiles are open sea so they are never requested.
import base from './terrain-url'

type Index = {
  name: string; attribution: string; kmPerSample: number; tile: number; tilesX: number; tilesY: number
  halfWidthKm: number; latN: number; kmPerDeg: number; center: [number, number][]; quant: number
  overview: { cols: number; rows: number; kmPerSample: number; bytes: number }
  sizes: number[]; peaks: number
  /** bytes of the buildings layer per tile (0 = none), when scripts/fetch-buildings.ts has run */
  buildings?: number[]
  /** populated places [name, kmX, kmZ, population, always?], when scripts/fetch-places.ts has run */
  places?: [string, number, number, number, number?][]
  /** places far outside the corridor drawn inside it (Rapa Nui): a circle at kmX on its true latitude */
  inserts?: { name: string; lat: number; lon: number; kmX: number; radiusKm: number }[]
  /** the country's outline as rings of [kmX, kmZ], largest first, when scripts/fetch-outline.ts has run */
  outline?: [number, number][][]
  /** size of peaks.json (every summit, for the search), when it exists */
  peaksBytes?: number
  /** bytes of the water layer per tile (0 = none), when scripts/fetch-water.ts has run */
  water?: number[]
  /** size of lakes.json (every named lake, for the search), when it exists */
  lakesBytes?: number
  /** the measured snow line, when scripts/terrain/fetch-snow.ts has run */
  snow?: { cols: number; rows: number; kmPerSample: number; bytes: number }
  /** the salars, white all year, from the same run */
  salt?: { cols: number; rows: number; kmPerSample: number; bytes: number }
}
/** a named lake or reservoir from lakes.json: centre, area and surface level */
export type NamedLake = { name: string; kmX: number; kmZ: number; areaKm2: number; level: number }
export type Summit = { name: string; kmX: number; kmZ: number; ele: number }
export type City = { name: string; kmX: number; kmZ: number; pop: number; always: boolean }
export type Peak = { name: string; kmX: number; kmZ: number; ele: number; tile: string }
/** a named tall building: height and footprint in metres */
export type Landmark = { name: string; kmX: number; kmZ: number; h: number; w: number; d: number; tile: string }
type Grid = { cols: number; rows: number; data: Int16Array }
/** the snow layer: two grids of metres over the whole corridor, the line and its half band */
type Snow = { line: Grid; band: Grid; kmPerSample: number }
/** the salt layer: one flag per 1 km cell of the corridor */
type Salt = Grid & { kmPerSample: number }
/** buildings layer: per 250 m cell, built-up fraction (0..255) and max height in 2 m units */
type Built = { n: number; data: Uint8Array; landmarks: Landmark[] }
/** a lake or reservoir: its surface level in metres (0 for a river polygon, which slopes) and where its cells are */
export type Lake = { name: string; level: number; cls: string; kmX: number; kmZ: number; areaKm2: number; salt: boolean; tile: string }
/** a river centreline piece inside one tile: [kmX, kmZ, kmX, kmZ, ...] and its km bounding box */
export type River = { name: string; pts: Float32Array; x0: number; z0: number; x1: number; z1: number; tile: string }
/** water layer: per 250 m cell the tile-local id (1-based) of the water body covering it, plus the rivers */
type Water = { n: number; ids: Uint16Array; lakes: Lake[]; rivers: River[] }
type Tile = Grid & { tx: number; ty: number; peaks: Peak[]; built: Built | null; water: Water | null; used: number }

const rad = (d: number) => (d * Math.PI) / 180

async function unpackRaw(buf: ArrayBuffer): Promise<{ header: any; raw: ArrayBuffer }> {
  const u8 = new Uint8Array(buf)
  if (String.fromCharCode(...u8.subarray(0, 4)) !== 'CTW1') throw new Error('bad terrain file')
  const len = new DataView(buf).getUint32(4, true)
  const header = JSON.parse(new TextDecoder().decode(u8.subarray(8, 8 + len)))
  const gz = u8.subarray(8 + len)
  const raw = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
  return { header, raw }
}
async function unpack(buf: ArrayBuffer): Promise<{ header: any; data: Int16Array }> {
  const { header, raw } = await unpackRaw(buf)
  const cols: number = header.cols ?? header.n, rows: number = header.rows ?? header.n
  const data = new Int16Array(raw) // residuals, un-predicted in place
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const k = y * cols + x
    const a = x > 0 ? data[k - 1] : 0, b = y > 0 ? data[k - cols] : 0, c = x > 0 && y > 0 ? data[k - cols - 1] : 0
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
    data[k] += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
  }
  return { header, data }
}

function bilinear(g: Grid, fx: number, fy: number): number {
  fx = Math.min(Math.max(fx, 0), g.cols - 1); fy = Math.min(Math.max(fy, 0), g.rows - 1)
  const x0 = Math.floor(fx), y0 = Math.floor(fy)
  const x1 = Math.min(x0 + 1, g.cols - 1), y1 = Math.min(y0 + 1, g.rows - 1)
  const tx = fx - x0, ty = fy - y0
  const d = g.data, r0 = y0 * g.cols, r1 = y1 * g.cols
  const top = d[r0 + x0] + (d[r0 + x1] - d[r0 + x0]) * tx
  const bot = d[r1 + x0] + (d[r1 + x1] - d[r1 + x0]) * tx
  return top + (bot - top) * ty
}

export class ChileTerrain {
  index: Index | null = null
  overview: Grid | null = null
  /** where the white starts, measured (fetch-snow.ts); null until snow.bin lands, or without it */
  snow: Snow | null = null
  /** the salars, as white as the snow and white all year */
  salt: Salt | null = null
  readonly tiles = new Map<string, Tile>()
  /** every named peak of the loaded tiles */
  peaks: Peak[] = []
  /** every named tall building of the loaded tiles */
  landmarks: Landmark[] = []
  /** every lake and reservoir of the loaded tiles (a body spanning tiles is listed once per tile) */
  lakes: Lake[] = []
  /** every river piece of the loaded tiles */
  rivers: River[] = []
  /** every populated place of the country, most populous first (known before any tile loads) */
  cities: City[] = []
  /** resolves once the index and the overview are in (preloaded from the HTML, ~100 KB) */
  readonly ready: Promise<void>
  bytes = 0
  private loading = new Map<string, Promise<void>>()
  private waiters: (() => void)[] = []
  private tick = 0
  /** wanted tiles from the last update(), nearest first; the queue drains itself as fetches finish */
  private queue: { tx: number; ty: number }[] = []
  static readonly IN_FLIGHT = 6

  constructor(private onTile: (tx: number, ty: number) => void) {
    this.ready = (async () => {
      const [idx, ov, sn, sa] = await Promise.all([
        fetch(`${base}/index.json`).then((r) => r.json() as Promise<Index>),
        fetch(`${base}/overview.bin`).then((r) => r.arrayBuffer()).then(unpack),
        // the snow line is small and preloaded with the other two, but nothing waits for it:
        // without it the scene falls back to its own altitude
        fetch(`${base}/snow.bin`).then((r) => (r.ok ? r.arrayBuffer().then(unpack) : null)).catch(() => null),
        fetch(`${base}/salt.bin`).then((r) => (r.ok ? r.arrayBuffer().then(unpack) : null)).catch(() => null),
      ])
      this.index = idx
      this.overview = { cols: ov.header.cols, rows: ov.header.rows, data: ov.data }
      this.snow = sn && this.readSnow(sn.header, sn.data)
      this.salt = sa && { cols: sa.header.cols, rows: sa.header.rows, data: sa.data, kmPerSample: sa.header.kmPerSample }
      this.cities = (idx.places ?? []).map(([name, kmX, kmZ, pop, always]) => ({ name, kmX, kmZ, pop, always: !!always }))
      this.bytes += idx.overview.bytes + (idx.snow?.bytes ?? 0) + (idx.salt?.bytes ?? 0)
    })()
  }

  private summits: Promise<Summit[]> | null = null
  /** every named summit of the country, highest first: peaks.json, fetched once on demand (~200 KB) */
  loadSummits(): Promise<Summit[]> {
    this.summits ??= fetch(`${base}/peaks.json`)
      .then((r) => (r.ok ? (r.json() as Promise<[string, number, number, number][]>) : []))
      .then((rows) => rows.map(([name, kmX, kmZ, ele]) => ({ name, kmX, kmZ, ele })))
      .catch(() => [])
    return this.summits
  }
  private namedLakes: Promise<NamedLake[]> | null = null
  /** every named lake and reservoir of the country, largest first: lakes.json, fetched once on demand */
  loadLakes(): Promise<NamedLake[]> {
    this.namedLakes ??= (this.index?.lakesBytes ? fetch(`${base}/lakes.json`) : Promise.reject(new Error('no lakes.json')))
      .then((r) => (r.ok ? (r.json() as Promise<[string, number, number, number, number][]>) : []))
      .then((rows) => rows.map(([name, kmX, kmZ, areaKm2, level]) => ({ name, kmX, kmZ, areaKm2, level })))
      .catch(() => [])
    return this.namedLakes
  }

  get tileKm() { return this.index!.tile * this.index!.kmPerSample }
  get widthKm() { return this.index!.tilesX * this.tileKm }
  get lengthKm() { return this.index!.tilesY * this.tileKm }
  get halfWidthKm() { return this.index!.halfWidthKm }

  // ---- geography
  lonC(lat: number) {
    const C = this.index!.center
    if (lat >= C[0][0]) return C[0][1]
    for (let i = 1; i < C.length; i++) {
      const [a, la] = C[i - 1], [b, lb] = C[i]
      if (lat >= b) return la + ((lb - la) * (lat - a)) / (b - a)
    }
    return C[C.length - 1][1]
  }
  latToKmZ(lat: number) { return (this.index!.latN - lat) * this.index!.kmPerDeg }
  kmZToLat(kmZ: number) { return this.index!.latN - kmZ / this.index!.kmPerDeg }
  toKm(lat: number, lon: number) { return { kmX: (lon - this.lonC(lat)) * this.index!.kmPerDeg * Math.cos(rad(lat)), kmZ: this.latToKmZ(lat) } }
  toLatLon(kmX: number, kmZ: number) { const lat = this.kmZToLat(kmZ); return { lat, lon: this.lonC(lat) + kmX / (this.index!.kmPerDeg * Math.cos(rad(lat))) } }

  // ---- tiles
  private key(tx: number, ty: number) { return `${ty}-${tx}` }
  private size(tx: number, ty: number) {
    const I = this.index!
    if (tx < 0 || ty < 0 || tx >= I.tilesX || ty >= I.tilesY) return 0
    return I.sizes[ty * I.tilesX + tx]
  }
  tileOf(kmX: number, kmZ: number) {
    return { tx: Math.floor((kmX + this.halfWidthKm) / this.tileKm), ty: Math.floor(kmZ / this.tileKm) }
  }
  /** km rect of a tile in world km */
  tileRect(tx: number, ty: number) {
    const t = this.tileKm
    return { x0: tx * t - this.halfWidthKm, z0: ty * t, x1: (tx + 1) * t - this.halfWidthKm, z1: (ty + 1) * t }
  }

  private builtSize(tx: number, ty: number) {
    const I = this.index!
    return I.buildings?.[ty * I.tilesX + tx] ?? 0
  }
  private waterSize(tx: number, ty: number) {
    const I = this.index!
    return I.water?.[ty * I.tilesX + tx] ?? 0
  }
  private refreshLists() {
    const tiles = [...this.tiles.values()]
    this.peaks = tiles.flatMap((t) => t.peaks)
    this.landmarks = tiles.flatMap((t) => t.built?.landmarks ?? [])
    this.lakes = tiles.flatMap((t) => t.water?.lakes ?? [])
    this.rivers = tiles.flatMap((t) => t.water?.rivers ?? [])
  }
  /** the water file of a tile: the body-id grid, then every river as zigzag varint deltas in 1/q cells */
  private decodeWater(tx: number, ty: number, key: string, header: any, raw: ArrayBuffer): Water {
    const n: number = header.n, q: number = header.q
    const ids = new Uint16Array(raw, 0, n * n)
    const lakes: Lake[] = (header.lakes as [string, number, string, number, number, number, number][]).map(([name, level, cls, kmX, kmZ, areaKm2, flags]) => ({ name, level, cls, kmX, kmZ, areaKm2, salt: !!(flags & 1), tile: key }))
    const R = this.tileRect(tx, ty), unit = this.index!.kmPerSample / q
    const b = new Uint8Array(raw, n * n * 2)
    let pos = 0
    const varint = () => {
      let v = 0, shift = 0, byte: number
      do { byte = b[pos++]; v |= (byte & 0x7f) << shift; shift += 7 } while (byte & 0x80)
      return (v >>> 1) ^ -(v & 1)
    }
    const rivers: River[] = (header.rivers as [string, number][]).map(([name, count]) => {
      const pts = new Float32Array(count * 2)
      let u = 0, v = 0, x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity
      for (let i = 0; i < count; i++) {
        u += varint(); v += varint()
        const x = R.x0 + u * unit, z = R.z0 + v * unit
        pts[i * 2] = x; pts[i * 2 + 1] = z
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z
      }
      return { name, pts, x0, z0, x1, z1, tile: key }
    })
    return { n, ids, lakes, rivers }
  }
  private fetchTile(tx: number, ty: number) {
    const key = this.key(tx, ty)
    if (this.tiles.has(key) || this.loading.has(key)) return
    const layer = (dir: string) => fetch(`${base}/${dir}/${key}.bin`).then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.arrayBuffer() }).then(unpackRaw)
    const p = (async () => {
      try {
        // relief and, where the index says a city is there, the buildings layer, together; the
        // water layer too, but land never waits for water: without it the tile is just dry
        const [rel, bld, wat] = await Promise.all([
          fetch(`${base}/t/${key}.bin`).then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.arrayBuffer() }).then(unpack),
          this.builtSize(tx, ty) > 0 ? layer('b') : Promise.resolve(null),
          this.waterSize(tx, ty) > 0 ? layer('w').catch((e) => { console.warn('water tile', key, e); return null }) : Promise.resolve(null),
        ])
        const { header, data } = rel
        const peaks: Peak[] = (header.peaks as [string, number, number, number][]).map(([name, kmX, kmZ, ele]) => ({ name, kmX, kmZ, ele, tile: key }))
        const built: Built | null = bld
          ? { n: bld.header.n, data: new Uint8Array(bld.raw), landmarks: (bld.header.landmarks as [string, number, number, number, number, number][]).map(([name, kmX, kmZ, h, w, d]) => ({ name, kmX, kmZ, h, w, d, tile: key })) }
          : null
        const water = wat ? this.decodeWater(tx, ty, key, wat.header, wat.raw) : null
        this.tiles.set(key, { tx, ty, cols: header.n, rows: header.n, data, peaks, built, water, used: this.tick })
        this.bytes += this.size(tx, ty) + this.builtSize(tx, ty) + (water ? this.waterSize(tx, ty) : 0)
        this.refreshLists()
        this.onTile(tx, ty)
        const w = this.waiters; this.waiters = []; w.forEach((f) => f())
      } catch (e) {
        console.warn('terrain tile', key, e)
      } finally {
        this.loading.delete(key)
        this.pump()
      }
    })()
    this.loading.set(key, p)
  }
  /** start fetches for the nearest wanted tiles until IN_FLIGHT are running */
  private pump() {
    for (const w of this.queue) {
      if (this.loading.size >= ChileTerrain.IN_FLIGHT) return
      if (!this.tiles.has(this.key(w.tx, w.ty))) this.fetchTile(w.tx, w.ty)
    }
  }

  /**
   * Keep the tiles within `radiusKm` of the camera plus those around a point `aheadKm` along the
   * heading, fetching nearest first (4 in flight), and drop tiles far behind. Cheap: call every frame.
   */
  update(kmX: number, kmZ: number, dirX: number, dirZ: number, radiusKm: number, aheadKm: number) {
    if (!this.index) return
    this.tick++
    const t = this.tileKm
    const pts = [[kmX, kmZ], [kmX + dirX * aheadKm, kmZ + dirZ * aheadKm]]
    const wanted: { tx: number; ty: number; d: number }[] = []
    const seen = new Set<string>()
    for (const [px, pz] of pts) {
      const { tx: cx, ty: cz } = this.tileOf(px, pz)
      const r = Math.ceil(radiusKm / t)
      for (let ty = cz - r; ty <= cz + r; ty++) for (let tx = cx - r; tx <= cx + r; tx++) {
        const key = this.key(tx, ty)
        if (seen.has(key) || this.size(tx, ty) === 0) continue
        const R = this.tileRect(tx, ty)
        const dx = Math.max(R.x0 - px, 0, px - R.x1), dz = Math.max(R.z0 - pz, 0, pz - R.z1)
        const d = Math.hypot(dx, dz)
        if (d > radiusKm) continue
        seen.add(key)
        // distance from the camera itself decides priority and eviction
        const cdx = Math.max(R.x0 - kmX, 0, kmX - R.x1), cdz = Math.max(R.z0 - kmZ, 0, kmZ - R.z1)
        wanted.push({ tx, ty, d: Math.hypot(cdx, cdz) })
      }
    }
    wanted.sort((a, b) => a.d - b.d)
    for (const w of wanted) {
      const tile = this.tiles.get(this.key(w.tx, w.ty))
      if (tile) tile.used = this.tick
    }
    this.queue = wanted.filter((w) => !this.tiles.has(this.key(w.tx, w.ty)))
    this.pump()
    // evict: not wanted any more and not touched for a while
    let dirty = false
    for (const [key, tile] of this.tiles) {
      if (tile.used === this.tick || this.tick - tile.used < 600) continue
      this.tiles.delete(key); dirty = true
    }
    if (dirty) this.refreshLists()
  }

  /** The lake, reservoir or river polygon covering the 250 m cell at world km, or null. */
  water(kmX: number, kmZ: number): Lake | null {
    const I = this.index
    if (!I) return null
    const { tx, ty } = this.tileOf(kmX, kmZ)
    const tile = this.tiles.get(this.key(tx, ty))
    if (!tile?.water) return null
    const R = this.tileRect(tx, ty), n = tile.water.n
    const cx = Math.floor((kmX - R.x0) / I.kmPerSample), cz = Math.floor((kmZ - R.z0) / I.kmPerSample)
    if (cx < 0 || cz < 0 || cx >= n || cz >= n) return null
    const id = tile.water.ids[cz * n + cx]
    return id ? tile.water.lakes[id - 1] : null
  }

  /** Built-up fraction (0..1) and max building height (m) of the 250 m cell at world km, or null. */
  built(kmX: number, kmZ: number): { fraction: number; height: number } | null {
    const I = this.index
    if (!I) return null
    const { tx, ty } = this.tileOf(kmX, kmZ)
    const tile = this.tiles.get(this.key(tx, ty))
    if (!tile?.built) return null
    const R = this.tileRect(tx, ty), n = tile.built.n
    const cx = Math.floor((kmX - R.x0) / I.kmPerSample), cz = Math.floor((kmZ - R.z0) / I.kmPerSample)
    if (cx < 0 || cz < 0 || cx >= n || cz >= n) return null
    const k = (cz * n + cx) * 2, d = tile.built.data
    if (!d[k]) return null
    return { fraction: d[k] / 255, height: d[k + 1] * 2 }
  }

  /** true when every land tile within radiusKm of the point is loaded */
  loaded(kmX: number, kmZ: number, radiusKm: number) {
    const { tx: cx, ty: cz } = this.tileOf(kmX, kmZ)
    const r = Math.ceil(radiusKm / this.tileKm)
    for (let ty = cz - r; ty <= cz + r; ty++) for (let tx = cx - r; tx <= cx + r; tx++) {
      if (this.size(tx, ty) === 0 || this.tiles.has(this.key(tx, ty))) continue
      const R = this.tileRect(tx, ty)
      if (Math.hypot(Math.max(R.x0 - kmX, 0, kmX - R.x1), Math.max(R.z0 - kmZ, 0, kmZ - R.z1)) <= radiusKm) return false
    }
    return true
  }
  /** resolves when loaded(...) holds, or after timeoutMs so an offline visitor still gets the overview */
  whenLoaded(kmX: number, kmZ: number, radiusKm: number, timeoutMs = 8000) {
    return new Promise<void>((resolve) => {
      const t = setTimeout(resolve, timeoutMs)
      const check = () => { if (this.loaded(kmX, kmZ, radiusKm)) { clearTimeout(t); resolve() } else this.waiters.push(check) }
      check()
    })
  }

  /** snow.bin: the line plane then the half-band plane, both metres / quant */
  private readSnow(header: any, data: Int16Array): Snow {
    const cols: number = header.cols, rows: number = header.plane, q: number = header.quant
    const plane = (n: number) => ({ cols, rows, data: data.subarray(n * cols * rows, (n + 1) * cols * rows) })
    if (q !== 1) for (let i = 0; i < data.length; i++) data[i] *= q
    return { line: plane(0), band: plane(1), kmPerSample: header.kmPerSample }
  }
  private readonly _snow = { line: 0, band: 0 }
  /**
   * The measured snow line at world km: the altitude (metres) above which the ground is white,
   * and half the altitude the fade takes. Null without the snow layer. Returns a shared object,
   * so read it before the next call.
   */
  snowAt(kmX: number, kmZ: number): { line: number; band: number } | null {
    const s = this.snow
    if (!s) return null
    const fx = (kmX + this.halfWidthKm) / s.kmPerSample, fy = kmZ / s.kmPerSample
    this._snow.line = bilinear(s.line, fx, fy)
    this._snow.band = bilinear(s.band, fx, fy)
    return this._snow
  }

  /** Is the 1 km cell at world km a salar: flat ground MODIS finds white all year round. */
  saltAt(kmX: number, kmZ: number): boolean {
    const g = this.salt
    if (!g) return false
    const i = Math.floor((kmX + this.halfWidthKm) / g.kmPerSample), j = Math.floor(kmZ / g.kmPerSample)
    return i >= 0 && j >= 0 && i < g.cols && j < g.rows && g.data[j * g.cols + i] !== 0
  }

  /** Elevation in metres at world km (x east of the centreline, z south of the north edge). */
  sample(kmX: number, kmZ: number): number {
    const I = this.index
    if (!I) return 0
    const { tx, ty } = this.tileOf(kmX, kmZ)
    if (this.size(tx, ty) === 0) return 0 // open sea, or outside the corridor
    const tile = this.tiles.get(this.key(tx, ty))
    if (tile) {
      const R = this.tileRect(tx, ty)
      return bilinear(tile, (kmX - R.x0) / I.kmPerSample, (kmZ - R.z0) / I.kmPerSample) * I.quant
    }
    const ov = this.overview!
    return bilinear(ov, (kmX + this.halfWidthKm) / I.overview.kmPerSample - 0.5, kmZ / I.overview.kmPerSample - 0.5) * I.quant
  }
}
