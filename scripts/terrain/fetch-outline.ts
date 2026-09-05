// Adds Chile's outline to the streamed dataset, for the in-game map.
// Run: npm run outline:fetch      (after npm run terrain:fetch; re-runs are offline)
//
// Natural Earth 1:50m admin-0 countries (public domain): Chile's polygons, outer rings only.
// Every point is converted to corridor km, so a ring inside an insert (Rapa Nui) lands where
// the game draws the island; the client projects the km back to lat/lon for the map, which
// gives the mainland its true shape. Rings are simplified to SIMPLIFY_KM (Douglas-Peucker)
// and islets under MIN_RING_KM across are dropped: ~1,500 points, ~20 KB in index.json.
import { readFileSync, writeFileSync } from 'node:fs'
import { HALF_WIDTH_KM, TILES_Y, TILE_KM, cached, currentDir, insertAtLatLon, publish, toKm } from './corridor.ts'

const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson'
const SIMPLIFY_KM = 1.5
const MIN_RING_KM = 6

type Pt = [number, number]
// Douglas-Peucker on an open or closed chain of km points
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

const geo = JSON.parse((await cached(URL, 'outline/ne_50m_admin_0_countries.geojson', false)).toString())
const chile = geo.features.find((f: any) => f.properties.ADMIN === 'Chile' || f.properties.NAME === 'Chile' || f.properties.ISO_A3 === 'CHL')
if (!chile) throw new Error('no Chile feature in the Natural Earth file')
const polys: number[][][][] = chile.geometry.type === 'Polygon' ? [chile.geometry.coordinates] : chile.geometry.coordinates
const rings: Pt[][] = []
let dropped = 0, insertRings = 0
for (const poly of polys) {
  const outer = poly[0] // holes (lakes) are not drawn
  const insert = insertAtLatLon(outer[0][1], outer[0][0])
  const km: Pt[] = outer.map(([lon, lat]) => { const { kmX, kmZ } = toKm(lat, lon); return [kmX, kmZ] })
  // a ring belongs on the map when it lies in the corridor (Juan Fernández is 670 km out: not)
  const inside = km.filter(([x, z]) => Math.abs(x) < HALF_WIDTH_KM && z >= 0 && z < TILES_Y * TILE_KM).length
  if (inside < km.length * 0.5) { dropped++; continue }
  let xa = Infinity, xb = -Infinity, za = Infinity, zb = -Infinity
  for (const [x, z] of km) { xa = Math.min(xa, x); xb = Math.max(xb, x); za = Math.min(za, z); zb = Math.max(zb, z) }
  if (!insert && Math.max(xb - xa, zb - za) < MIN_RING_KM) { dropped++; continue }
  if (insert) insertRings++
  rings.push(simplify(km, SIMPLIFY_KM).map(([x, z]) => [+x.toFixed(1), +z.toFixed(1)]))
}
rings.sort((a, b) => b.length - a.length)
const points = rings.reduce((n, r) => n + r.length, 0)
console.log(`outline: ${rings.length} rings, ${points} points (${dropped} rings dropped, ${insertRings} in inserts), ${(JSON.stringify(rings).length / 1024).toFixed(0)} KB`)

const dir = currentDir()
if (!dir) throw new Error('no published terrain directory: run npm run terrain:fetch first')
const index = JSON.parse(readFileSync(`${dir}/index.json`, 'utf8'))
index.outline = rings
index.outlineSource = 'Natural Earth 1:50m admin-0 countries (public domain)'
writeFileSync(`${dir}/index.json`, JSON.stringify(index))
const out = publish(dir)
console.log(`wrote ${out}/index.json with the outline`)
