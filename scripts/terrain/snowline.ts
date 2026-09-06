// Turning "how often is this snowy" into "above which altitude is it white".
//
// fetch-snow.ts measures, for every 1 km sample of the country, the fraction of the year its
// MODIS composites report snow, and pairs it with the sample's elevation from the relief we
// already publish. Over a window of a few tens of km that gives two histograms: how the
// ground is spread over altitude, and how the snow is spread over frequency. From them:
//
//   the line — the altitude that leaves exactly as much ground above it as MODIS finds snowy.
//     Reading instead the altitude where snow frequency crosses a threshold would assume snow
//     only ever grows with altitude, and it does not: the granite towers of Paine and the
//     summits of Cordillera Darwin hold less of it than the ice below them. Matching areas does
//     not care where in the window the snow sits, only how much of it there is.
//   the band — the altitude it takes for that white area to double, which keeps the fade about
//     as wide across the ground everywhere instead of as many metres of altitude.
//
// Kept apart from the fetch so it can be tested without the network.

export type Reading = {
  /** the altitude that leaves the snowy fraction of the window's ground above it, metres */
  line: number
  /** half the altitude the ground takes to turn white, metres */
  band: number
  /** the top of the window's highest occupied band */
  top: number
  /** the fraction of the window MODIS finds snowy at f0 — 0 means bare ground */
  area: number
}

export type WindowOptions = {
  /** metres per band of the elevation histograms */
  binM: number
  /** snow frequency that counts as "snowy" */
  f0: number
  /** how much of the year MODIS gets a clear look here: the frequencies are read against it */
  transmittance: number
  minBand: number
  maxBand: number
}

/** the fraction of a frequency histogram (bucket b = frequency b / (n - 1)) at or above `f` */
export function areaAbove(freq: ArrayLike<number>, f: number): number {
  let total = 0, above = 0
  const last = freq.length - 1
  for (let b = 0; b <= last; b++) {
    total += freq[b]
    if (b / last >= f) above += freq[b]
  }
  return total ? above / total : 0
}

/**
 * The altitude that leaves `area` of the ground above it, read off an elevation histogram
 * (band b covers b * binM to (b + 1) * binM metres) by walking down from the top.
 */
export function elevationForArea(hyps: ArrayLike<number>, binM: number, area: number): number {
  let total = 0, top = 0, bottom = NaN
  for (let b = 0; b < hyps.length; b++) {
    if (!hyps[b]) continue
    total += hyps[b]
    top = (b + 1) * binM
    if (Number.isNaN(bottom)) bottom = b * binM
  }
  if (!total) return NaN
  const want = area * total
  if (want <= 0) return top
  let acc = 0
  for (let b = hyps.length - 1; b >= 0; b--) {
    if (!hyps[b]) continue
    if (acc + hyps[b] >= want) return (b + 1) * binM - ((want - acc) / hyps[b]) * binM
    acc += hyps[b]
  }
  return bottom
}

/**
 * Half the altitude it takes for the white area to double: the fade of the snow edge. Read off
 * the same hypsometry as the line, so it follows the ground — many metres where the window is
 * all mountainside, few over a plateau whose area is stacked into one band. Which is what keeps
 * the fade about the same width *across the ground* everywhere, instead of the same number of
 * metres of altitude, so it never smears into a haze on a gentle slope.
 */
export function fadeBand(hyps: ArrayLike<number>, binM: number, area: number): number {
  const wide = elevationForArea(hyps, binM, Math.min(1, area * 2))
  const tight = elevationForArea(hyps, binM, area / 2)
  return (tight - wide) / 2
}

/** Read one window's snow line off its histograms. */
export function readWindow(hyps: ArrayLike<number>, freq: ArrayLike<number>, o: WindowOptions): Reading | null {
  const t = Math.max(0.05, o.transmittance)
  const area = areaAbove(freq, o.f0 * t)
  const line = elevationForArea(hyps, o.binM, area)
  if (!Number.isFinite(line)) return null
  const fade = fadeBand(hyps, o.binM, area)
  return {
    line,
    band: Math.min(o.maxBand, Math.max(o.minBand, Number.isFinite(fade) ? fade : o.maxBand)),
    top: elevationForArea(hyps, o.binM, 0),
    area,
  }
}
