// Writes peaks.json (every named summit, for the in-game search) into the published dataset from
// its tile headers, and republishes. fetch-terrain.ts does the same on a rebuild; this is for a
// dataset built before peaks.json existed.
// Run: npm run peaks:index
import { readFileSync, writeFileSync } from 'node:fs'
import { currentDir, publish, writePeaksIndex } from './corridor.ts'

const dir = currentDir()
if (!dir) throw new Error('no published terrain directory: run npm run terrain:fetch first')
const index = JSON.parse(readFileSync(`${dir}/index.json`, 'utf8'))
index.peaksBytes = writePeaksIndex(dir)
writeFileSync(`${dir}/index.json`, JSON.stringify(index))
const out = publish(dir)
console.log(`wrote ${out}/peaks.json (${(index.peaksBytes / 1024).toFixed(0)} KB, ${index.peaks} peaks)`)
