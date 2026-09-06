// The 2026 marks, written to public/brand/<mark>[-<variant>].{svg,png} for /brand and
// /brand/icon to preview and hand out. Run: npm run brand:marks   (re-runs are offline)
//
//   logo             the landing's stacked logo: CHILE / TECH / WEEK / 2026, every line spaced
//                    to the widest, the hollow 20 and the red 26
//   logo-horizontal  CHILE TECH WEEK 26 on one line, the 26 red
//   icon             CLTW over 2026 on a square, for favicons, profiles and calendars
//
// Each in three variants: on black (the default file), transparent with white ink (for dark
// backgrounds) and light (black ink on transparent, for white paper). The glyphs are outlined
// from the same Unbounded 800 TTF Google Fonts serves the site, so the SVGs are paths only: no
// <text>, no font to install, and they rasterise the same everywhere.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import opentype, { type Font, type Glyph } from 'opentype.js'

const RED = '#EE2B2B'
const TRACKING = -0.03 // em, the logo's letter-spacing
const PITCH = 0.9 // baseline to baseline, in em — the logo's 90px per 100px line
const CACHE = 'scripts/brand/.cache'
const OUT = 'public/brand'
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Unbounded:wght@800'

// ---------------------------------------------------------------- the font
async function unboundedExtraBold(): Promise<Font> {
  const file = `${CACHE}/Unbounded-800.ttf`
  if (!existsSync(file)) {
    // with a browser UA the CSS points at woff2; anything else gets the TTF opentype.js reads
    const css = await (await fetch(FONT_CSS, { headers: { 'User-Agent': 'curl/8' } })).text()
    const url = css.match(/url\((https:[^)]+\.ttf)\)/)?.[1]
    if (!url) throw new Error(`no truetype url in ${FONT_CSS}:\n${css}`)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
    mkdirSync(CACHE, { recursive: true })
    writeFileSync(file, Buffer.from(await res.arrayBuffer()))
    console.log(`fetched ${url}`)
  }
  const buf = readFileSync(file)
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
}

// ---------------------------------------------------------------- layout
type Placed = { glyph: Glyph; x: number }
type Line = { glyphs: Placed[]; x1: number; x2: number; y1: number; y2: number }

/** glyph origins along a baseline at y = 0, plus the line's ink box; `extra` is spread between glyphs */
function layout(font: Font, text: string, size: number, extra = 0): Line {
  const scale = size / font.unitsPerEm
  const glyphs: Placed[] = []
  let x = 0
  let x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity
  let prev: Glyph | null = null
  for (const ch of text) {
    const glyph = font.charToGlyph(ch)
    if (prev) x += font.getKerningValue(prev, glyph) * scale + TRACKING * size + extra
    glyphs.push({ glyph, x })
    const bb = glyph.getBoundingBox()
    if (Number.isFinite(bb.x1) && bb.x2 > bb.x1) { // a space has no ink
      x1 = Math.min(x1, x + bb.x1 * scale); x2 = Math.max(x2, x + bb.x2 * scale)
      y1 = Math.min(y1, -bb.y2 * scale); y2 = Math.max(y2, -bb.y1 * scale) // font y up, svg y down
    }
    x += (glyph.advanceWidth ?? 0) * scale
    prev = glyph
  }
  return { glyphs, x1, x2, y1, y2 }
}

/** every line spaced to the widest one's ink width — the logo's textLength/lengthAdjust=spacing */
function justify(font: Font, lines: string[], size: number): Line[] {
  const natural = lines.map((t) => layout(font, t, size))
  const width = Math.max(...natural.map((l) => l.x2 - l.x1))
  return lines.map((t, i) => layout(font, t, size, (width - (natural[i].x2 - natural[i].x1)) / (t.length - 1)))
}

/** the glyph's outline translated and scaled by hand: opentype.js 2's toPathData corrupts a path it has
 *  already serialised once, and every repeated letter (the E in TECH and WEEK) hits that */
function glyphPath(glyph: Glyph, x0: number, y0: number, size: number, unitsPerEm: number): string {
  const s = size / unitsPerEm
  const X = (x: number) => (x0 + x * s).toFixed(1)
  const Y = (y: number) => (y0 - y * s).toFixed(1) // font y up, svg y down
  let d = ''
  for (const c of glyph.path.commands) {
    if (c.type === 'M' || c.type === 'L') d += `${c.type}${X(c.x)} ${Y(c.y)}`
    else if (c.type === 'Q') d += `Q${X(c.x1)} ${Y(c.y1)} ${X(c.x)} ${Y(c.y)}`
    else if (c.type === 'C') d += `C${X(c.x1)} ${Y(c.y1)} ${X(c.x2)} ${Y(c.y2)} ${X(c.x)} ${Y(c.y)}`
    else d += 'Z'
  }
  return d
}

const pathData = (font: Font, line: Line, dx: number, baseline: number, size: number, from = 0, to = line.glyphs.length) =>
  line.glyphs.slice(from, to).map(({ glyph, x }) => glyphPath(glyph, dx + x, baseline, size, font.unitsPerEm)).join('')

// ---------------------------------------------------------------- the marks
/** ink: the words; hollow: stroked only (the 20); red: the 26 */
type Layers = { ink: string; hollow?: string; red: string }
type Mark = { width: number; height: number; stroke: number; layers: Layers; title: string; png: number }

/** CHILE / TECH / WEEK / 2026 as the landing draws it: size 100, lines 90 apart, block hugging */
function stackedLogo(font: Font): Mark {
  const size = 100, pad = 30
  const [chile, tech, week, year] = justify(font, ['CHILE', 'TECH', 'WEEK', '2026'], size)
  const lines = [chile, tech, week, year]
  const x0 = Math.min(...lines.map((l) => l.x1))
  const top = chile.y1, bottom = 3 * PITCH * size + year.y2
  const dx = pad - x0, dy = pad - top
  const at = (l: Line, i: number, from?: number, to?: number) => pathData(font, l, dx, dy + i * PITCH * size, size, from, to)
  return {
    title: 'Chile Tech Week 2026',
    width: Math.round(Math.max(...lines.map((l) => l.x2)) - x0 + 2 * pad),
    height: Math.round(bottom - top + 2 * pad),
    stroke: 0.03 * size, // the landing's stroke-width 3 on the hollow 20
    layers: { ink: at(chile, 0) + at(tech, 1) + at(week, 2), hollow: at(year, 3, 0, 2), red: at(year, 3, 2) },
    png: 2048,
  }
}

/** CHILE TECH WEEK 26 on one line, the 26 red */
function horizontalLogo(font: Font): Mark {
  const size = 100, pad = 30
  const line = layout(font, 'CHILE TECH WEEK 26', size)
  const dx = pad - line.x1, dy = pad - line.y1
  const n = line.glyphs.length
  return {
    title: 'Chile Tech Week 26',
    width: Math.round(line.x2 - line.x1 + 2 * pad),
    height: Math.round(line.y2 - line.y1 + 2 * pad),
    stroke: 0.03 * size,
    layers: { ink: pathData(font, line, dx, dy, size, 0, n - 2), red: pathData(font, line, dx, dy, size, n - 2) },
    png: 3200,
  }
}

/** CLTW over 2026 on a 1024 square, the letters spanning the middle 75% */
function icon(font: Font): Mark {
  const SIZE = 1024, PAD = 128
  const probe = ['CLTW', '2026'].map((t) => layout(font, t, 100))
  const size = (100 * (SIZE - 2 * PAD)) / Math.max(...probe.map((l) => l.x2 - l.x1))
  const [top, bottom] = justify(font, ['CLTW', '2026'], size)
  const pitch = PITCH * size
  // the block — top line's ink top to bottom line's ink bottom — sits centred on the square
  const shift = (SIZE - (pitch + bottom.y2 - top.y1)) / 2 - top.y1
  return {
    title: 'Chile Tech Week 2026',
    width: SIZE,
    height: SIZE,
    stroke: 0.045 * size, // heavier than the logo's 0.03: an icon is seen far smaller
    layers: {
      ink: pathData(font, top, PAD - top.x1, shift, size),
      hollow: pathData(font, bottom, PAD - bottom.x1, shift + pitch, size, 0, 2),
      red: pathData(font, bottom, PAD - bottom.x1, shift + pitch, size, 2),
    },
    png: SIZE,
  }
}

// ---------------------------------------------------------------- variants and files
const VARIANTS = {
  black: { suffix: '', ink: '#fff', background: '#000' }, // the default: on the brand's black
  transparent: { suffix: '-transparent', ink: '#fff', background: null }, // for dark backgrounds
  light: { suffix: '-light', ink: '#000', background: null }, // for white paper
} as const

function svgOf(m: Mark, v: (typeof VARIANTS)[keyof typeof VARIANTS]): string {
  const bg = v.background ? `\n<rect width="${m.width}" height="${m.height}" fill="${v.background}"/>` : ''
  // The hollow digits are a ring of `stroke` around the glyph, not a stroke on its contours:
  // Unbounded's 2 is drawn as overlapping shapes, and a plain stroke traces the overlap too.
  // So: stroke twice as wide, then mask the glyph's own interior away, leaving the outer half.
  const hollow = m.layers.hollow
    ? `\n<defs><mask id="hollow"><rect width="${m.width}" height="${m.height}" fill="#fff"/><path fill="#000" d="${m.layers.hollow}"/></mask></defs>` +
      `\n<path fill="none" stroke="${v.ink}" stroke-width="${(2 * m.stroke).toFixed(1)}" stroke-linejoin="round" mask="url(#hollow)" d="${m.layers.hollow}"/>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${m.width} ${m.height}" width="${m.width}" height="${m.height}">
<title>${m.title}</title>${bg}
<path fill="${v.ink}" d="${m.layers.ink}"/>${hollow}
<path fill="${RED}" d="${m.layers.red}"/>
</svg>
`
}

const font = await unboundedExtraBold()
const marks = { logo: stackedLogo(font), 'logo-horizontal': horizontalLogo(font), icon: icon(font) }
mkdirSync(OUT, { recursive: true })
for (const [id, mark] of Object.entries(marks)) {
  for (const v of Object.values(VARIANTS)) {
    const svg = svgOf(mark, v)
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: mark.png } }).render().asPng()
    writeFileSync(`${OUT}/${id}${v.suffix}.svg`, svg)
    writeFileSync(`${OUT}/${id}${v.suffix}.png`, png)
    console.log(`${id}${v.suffix}: ${mark.width}×${mark.height}, svg ${svg.length} B, png ${mark.png} px ${png.length} B`)
  }
}
