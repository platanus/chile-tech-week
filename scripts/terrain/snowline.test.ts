// Run: node --experimental-strip-types --test scripts/terrain/snowline.test.ts
import { equal, ok } from 'node:assert/strict'
import { test } from 'node:test'
import { areaAbove, elevationForArea, fadeBand, readWindow } from './snowline.ts'

const OPTS = { binM: 100, f0: 0.5, transmittance: 1, minBand: 60, maxBand: 500 }
/** a window whose ground rises evenly from `z0` to `z1` metres, `per` samples a band */
function slope(z0: number, z1: number, per = 20) {
  const hyps = new Array(70).fill(0)
  for (let b = Math.floor(z0 / 100); b < Math.floor(z1 / 100); b++) hyps[b] = per
  return hyps
}
/** a frequency histogram (51 buckets, 0..1) where `snowy` of the ground is white `f` of the year */
function freqs(snowy: number, f: number, total = 1000) {
  const freq = new Array(51).fill(0)
  freq[0] = Math.round(total * (1 - snowy))
  freq[Math.round(f * 50)] = Math.round(total * snowy)
  return freq
}

test('reads the area MODIS finds snowy off the frequency histogram', () => {
  equal(areaAbove(freqs(0.3, 0.9), 0.5), 0.3)
  equal(areaAbove(freqs(0.3, 0.4), 0.5), 0) // white two fifths of the year is not snowy
})

test('the line is the altitude that leaves exactly that much ground above it', () => {
  const hyps = slope(0, 4000) // 40 bands, evenly filled
  equal(elevationForArea(hyps, 100, 0.25), 3000)
  equal(elevationForArea(hyps, 100, 1), 0)
  equal(elevationForArea(hyps, 100, 0), 4000) // nothing snowy: above the highest ground
})

test('a quarter of the window snowy puts the line at the top quarter of its ground', () => {
  const got = readWindow(slope(0, 4000), freqs(0.25, 0.9), OPTS)!
  equal(got.line, 3000)
  equal(got.area, 0.25)
  equal(got.top, 4000)
})

test('bare ground reports no snowy area at all, and the line above its top', () => {
  const got = readWindow(slope(0, 1500), freqs(0, 0), OPTS)!
  equal(got.area, 0)
  equal(got.line, 1500)
})

test('ground white all year long puts the line under all of it', () => {
  const got = readWindow(slope(200, 1600), freqs(1, 1), OPTS)!
  equal(got.area, 1)
  equal(got.line, 200)
})

test('cloud is divided out: two thirds of a clear sky is still snowy', () => {
  const clouded = freqs(0.25, 0.35) // white 35 % of the composites, but only 66 % are clear
  equal(readWindow(slope(0, 4000), clouded, OPTS)!.area, 0)
  equal(readWindow(slope(0, 4000), clouded, { ...OPTS, transmittance: 0.66 })!.area, 0.25)
})

test('the band follows how much altitude the window spans', () => {
  const mountainside = fadeBand(slope(0, 4000), 100, 0.25) // 4 km of relief in the window
  const lowHills = fadeBand(slope(0, 800), 100, 0.25) // 800 m of it
  ok(mountainside > lowHills, `${mountainside} vs ${lowHills}`)
})

test('an empty window says nothing', () => {
  equal(readWindow(new Array(70).fill(0), freqs(0, 0), OPTS), null)
})
