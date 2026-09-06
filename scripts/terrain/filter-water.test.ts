// Run: node --experimental-strip-types --test scripts/terrain/filter-water.test.ts
import { deepStrictEqual, equal } from 'node:assert/strict'
import { test } from 'node:test'
import { filterSmallWater } from './filter-water.ts'

test('removes small fragments of a body while preserving its main lake', () => {
  const ids = new Uint32Array([
    1, 1, 0, 1, 0, 0,
    1, 1, 0, 0, 1, 1,
    0, 0, 0, 0, 0, 0,
  ])
  deepStrictEqual(filterSmallWater(ids, 6, 4), { patches: 2, cells: 3 })
  equal(ids.filter(Boolean).length, 4)
})

test('keeps a four-cell lake across the actual 256-cell tile boundary', () => {
  const ids = new Uint32Array(512 * 2)
  for (const k of [255, 256, 767, 768]) ids[k] = 1
  deepStrictEqual(filterSmallWater(ids, 512, 4), { patches: 0, cells: 0 })
  equal(ids.filter(Boolean).length, 4)
})

test('does not connect across row edges or join different bodies', () => {
  const ids = new Uint32Array([
    0, 0, 1, 1,
    1, 1, 0, 0,
    2, 2, 3, 3,
  ])
  deepStrictEqual(filterSmallWater(ids, 4, 4), { patches: 4, cells: 8 })
  equal(ids.filter(Boolean).length, 0)
})
