// Adds populated places to the streamed Chile dataset, for city labels and horizon waypoints.
// Run: npm run places:fetch      (after npm run terrain:fetch; re-runs are offline)
//
// OSM place=city/town nodes with a name and a population, from Overpass, for the whole corridor
// (that includes Mendoza and the Bolivian altiplano towns: fine, they are on the horizon too).
// The list is small (~1,000 entries, ~30 KB), so it lives in index.json rather than in tiles:
// the next city must be known before its tile is anywhere near loaded.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { HALF_WIDTH_KM, LAT_N, LAT_S, TILES_Y, TILE_KM, cached, corridorBox, currentDir, insertAtLatLon, insertBoxes, publish, toKm } from './corridor.ts'

const OVERPASS = ['https://overpass.kumi.systems/api/interpreter', 'https://overpass-api.de/api/interpreter']
const MIN_POP = 2000

type Place = { name: string; kmX: number; kmZ: number; pop: number; kind: string; always?: boolean }
const places: Place[] = []
const boxes: { s: number; n: number; w: number; e: number }[] = []
for (let s = LAT_S; s < LAT_N - 1e-9; s += 4) {
  const n = Math.min(LAT_N, s + 4)
  boxes.push({ s, n, ...corridorBox(s, n) })
}
boxes.push(...insertBoxes())
for (const { s, n, w, e } of boxes) {
  const bb = `${s.toFixed(2)},${w.toFixed(2)},${n.toFixed(2)},${e.toFixed(2)}`
  const q = `[out:json][timeout:120];node["place"~"^(city|town|village)$"]["name"]["population"](${bb});out;`
  const key = `places/${createHash('md5').update(q).digest('hex')}.json`
  let buf: Buffer | null = null
  for (const ep of OVERPASS) {
    try {
      buf = await cached(ep, key, false, { method: 'POST', body: `data=${encodeURIComponent(q)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'chile-tech-week-terrain/1.0 (build script)' } })
      break
    } catch (err) { console.warn(`  overpass ${ep} failed for ${bb}: ${(err as Error).message.slice(0, 160)}`) }
  }
  if (!buf) throw new Error(`no places for strip ${bb}`)
  let count = 0
  for (const el of JSON.parse(buf.toString()).elements as { lat: number; lon: number; tags: Record<string, string> }[]) {
    const pop = parseInt(String(el.tags.population).replace(/[^\d]/g, ''), 10)
    const ins = insertAtLatLon(el.lat, el.lon)
    if (!isFinite(pop) || (pop < MIN_POP && !ins)) continue
    const { kmX, kmZ } = toKm(el.lat, el.lon)
    if (Math.abs(kmX) >= HALF_WIDTH_KM || kmZ < 0 || kmZ >= TILES_Y * TILE_KM) continue
    // an insert's places always get a label, whatever their size: they are why the insert exists
    places.push({ name: ins ? `${ins.name} · ${el.tags['name:es'] ?? el.tags.name}` : el.tags['name:es'] ?? el.tags.name, kmX: +kmX.toFixed(2), kmZ: +kmZ.toFixed(2), pop: isFinite(pop) ? pop : 0, kind: el.tags.place, always: !!ins })
    count++
  }
  console.log(`  places ${s.toFixed(0)}..${n.toFixed(0)}: ${count}`)
}
// one entry per name: keep the most populous (OSM sometimes has a town node and a city node)
places.sort((a, b) => b.pop - a.pop)
const seen = new Set<string>()
const kept = places.filter((p) => (seen.has(p.name) ? false : (seen.add(p.name), true)))
console.log(`places: ${kept.length} with population >= ${MIN_POP}; top: ${kept.slice(0, 8).map((p) => `${p.name} ${(p.pop / 1000).toFixed(0)}k`).join(', ')}`)

const dir = currentDir()
if (!dir) throw new Error('no published terrain directory: run npm run terrain:fetch first')
const index = JSON.parse(readFileSync(`${dir}/index.json`, 'utf8'))
index.places = kept.map((p) => (p.always ? [p.name, p.kmX, p.kmZ, p.pop, 1] : [p.name, p.kmX, p.kmZ, p.pop]))
index.placesSource = '© OpenStreetMap contributors (place nodes with population)'
writeFileSync(`${dir}/index.json`, JSON.stringify(index))
const out = publish(dir)
console.log(`wrote ${out}/index.json with ${kept.length} places (${(JSON.stringify(index.places).length / 1024).toFixed(0)} KB)`)
