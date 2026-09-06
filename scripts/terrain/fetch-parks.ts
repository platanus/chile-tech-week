// Adds the protected areas to the streamed Chile dataset: the national parks and reserves the
// flight crosses, so they can be searched, flown to and labelled.
// Run: npm run parks:fetch      (after npm run terrain:fetch; re-runs are offline)
//
// OSM boundary=national_park / boundary=protected_area relations with a name, from Overpass, for
// the whole corridor. Only the ones a country actually protects as a park, reserve, monument or
// sanctuary are kept (protect_class 1 to 6, biosphere reserves left out: they overlap the parks
// they are named after). Overpass answers a query with a relation's centre *or* its bounding
// box, never both, so the strips ask for centres and one follow-up query asks the survivors for
// their boxes by id. A park is stored as its centre, how many km across it is, and its title
// split off its name — ~250 entries and ~17 KB, small enough for index.json, and it has to be
// there before any tile is, the way the cities are.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { HALF_WIDTH_KM, KM_PER_DEG, LAT_N, LAT_S, TILES_Y, TILE_KM, cached, corridorBox, currentDir, insertBoxes, publish, rad, toKm } from './corridor.ts'

const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
const MIN_KM = 4 // smaller than this across is a town park, not a landscape
const CLASSES = new Set(['1', '1a', '1b', '2', '3', '4', '5', '6'])
// What a protected area calls itself, in front of what it is called. "Parque Nacional Torres
// del Paine" is the park Torres del Paine; "Área Marina Costera Protegida de Múltiples Usos
// Francisco Coloane" is Francisco Coloane. Everything up to the last of these words is the
// title, and an article right after a "de" goes with the title too ("Reserva Nacional Los
// Flamencos" keeps its Los, "Reserva Natural de la Defensa …" keeps neither).
const TITLE_WORD = /^(parques?|reservas?|monumentos?|santuarios?|áreas?|areas?|sitios?|bien(es)?|nacional(es)?|natural(es)?|marin[ao]s?|costeras?|protegid[ao]s?|provincial(es)?|forestal(es)?|estrictas?|múltiples|multiples|usos|biológicas?|silvestres?|humedal(es)?|refugios?|conservación|biósfera|biosfera|ramsar|y|de|del)$/i
const ARTICLE = /^(la|las|los|el)$/i

type Park = { id: number; title: string; name: string; kmX: number; kmZ: number; km: number }
/** "Parque Nacional Torres del Paine" -> { title: "parque nacional", name: "Torres del Paine" } */
function split(full: string) {
  const words = full.split(/\s+/)
  let i = 0
  while (i < words.length - 1 && TITLE_WORD.test(words[i])) i++
  // "Reserva Natural de la Defensa …" keeps neither its de nor its la; "Reserva Nacional Los
  // Flamencos", whose title does not end in one, keeps its Los
  if (i > 0 && i < words.length - 1 && /^(de|del)$/i.test(words[i - 1]) && ARTICLE.test(words[i])) i++
  return { title: words.slice(0, i).join(' ').toLowerCase(), name: words.slice(i).join(' ') }
}
const parks: Park[] = []
const boxes: { s: number; n: number; w: number; e: number }[] = []
for (let s = LAT_S; s < LAT_N - 1e-9; s += 4) {
  const n = Math.min(LAT_N, s + 4)
  boxes.push({ s, n, ...corridorBox(s, n) })
}
boxes.push(...insertBoxes())
for (const { s, n, w, e } of boxes) {
  const bb = `${s.toFixed(2)},${w.toFixed(2)},${n.toFixed(2)},${e.toFixed(2)}`
  const q = `[out:json][timeout:180];(relation["boundary"="national_park"]["name"](${bb});relation["boundary"="protected_area"]["name"](${bb}););out tags bb center;`
  const key = `parks/${createHash('md5').update(q).digest('hex')}.json`
  let buf: Buffer | null = null
  for (const ep of OVERPASS) {
    try {
      buf = await cached(ep, key, false, { method: 'POST', body: `data=${encodeURIComponent(q)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'chile-tech-week-terrain/1.0 (build script)' } })
      break
    } catch (err) { console.warn(`  overpass ${ep} failed for ${bb}: ${(err as Error).message.slice(0, 160)}`) }
  }
  if (!buf) throw new Error(`no parks for strip ${bb}`)
  let count = 0
  type El = { center?: { lat: number; lon: number }; bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number }; tags: Record<string, string> }
  for (const el of JSON.parse(buf.toString()).elements as El[]) {
    const t = el.tags
    const full = t['name:es'] ?? t.name
    if (!el.center || !full) continue
    // a biosphere reserve (class 98) wraps the park it is named after; the park itself is enough
    if (t.boundary !== 'national_park' && !CLASSES.has(String(t.protect_class))) continue
    const { kmX, kmZ } = toKm(el.center.lat, el.center.lon)
    if (Math.abs(kmX) >= HALF_WIDTH_KM || kmZ < 0 || kmZ >= TILES_Y * TILE_KM) continue
    const { title, name } = split(full)
    parks.push({ id: el.id, title: title || (t.protection_title ?? 'área protegida').toLowerCase(), name, kmX: +kmX.toFixed(2), kmZ: +kmZ.toFixed(2), km: 0 })
    count++
  }
  console.log(`  parks ${s.toFixed(0)}..${n.toFixed(0)}: ${count}`)
}
// how big each one is: Overpass gives a relation's centre or its box, so the boxes come back in
// one query by id (fast: no area to scan), in chunks so no single answer is huge
async function overpass(q: string): Promise<Buffer> {
  const key = `parks/${createHash('md5').update(q).digest('hex')}.json`
  for (const ep of OVERPASS) {
    try {
      return await cached(ep, key, false, { method: 'POST', body: `data=${encodeURIComponent(q)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'chile-tech-week-terrain/1.0 (build script)' } })
    } catch (err) { console.warn(`  overpass ${ep} failed: ${(err as Error).message.slice(0, 160)}`) }
  }
  throw new Error('overpass: every endpoint failed')
}
for (let i = 0; i < parks.length; i += 150) {
  const chunk = parks.slice(i, i + 150)
  const buf = await overpass(`[out:json][timeout:180];relation(id:${chunk.map((p) => p.id).join(',')});out ids bb;`)
  const boxes = new Map<number, { minlat: number; minlon: number; maxlat: number; maxlon: number }>()
  for (const el of JSON.parse(buf.toString()).elements as { id: number; bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number } }[]) {
    if (el.bounds) boxes.set(el.id, el.bounds)
  }
  for (const p of chunk) {
    const b = boxes.get(p.id)
    if (!b) continue
    const lat = (b.minlat + b.maxlat) / 2
    p.km = Math.round(Math.max((b.maxlat - b.minlat) * KM_PER_DEG, (b.maxlon - b.minlon) * KM_PER_DEG * Math.cos(rad(lat))))
  }
  console.log(`  boxes ${i + chunk.length}/${parks.length}`)
}
const sized = parks.filter((p) => p.km >= MIN_KM)
console.log(`  ${parks.length - sized.length} of ${parks.length} are under ${MIN_KM} km across, or lost their box`)
parks.length = 0
parks.push(...sized)

// one entry per name: the largest wins (a park and its reserve often share a name)
parks.sort((a, b) => b.km - a.km)
const seen = new Set<string>()
const kept = parks.filter((p) => (seen.has(p.name) ? false : (seen.add(p.name), true)))
console.log(`parks: ${kept.length}; largest: ${kept.slice(0, 6).map((p) => `${p.name} ${p.km} km`).join(', ')}`)

const dir = currentDir()
if (!dir) throw new Error('no published terrain directory: run npm run terrain:fetch first')
const index = JSON.parse(readFileSync(`${dir}/index.json`, 'utf8'))
index.parks = kept.map((p) => [p.name, p.title, p.kmX, p.kmZ, p.km])
writeFileSync(`${dir}/index.json`, JSON.stringify(index))
const out = publish(dir)
console.log(`wrote ${out}/index.json with ${kept.length} parks (${(JSON.stringify(index.parks).length / 1024).toFixed(1)} KB)`)
