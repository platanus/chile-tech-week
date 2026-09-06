/** Remove tiny, edge-connected patches of each body across the whole corridor, before
 * splitting into tiles. Diagonal contact alone does not make a continuous water surface. */
export function filterSmallWater(ids: Uint32Array, cols: number, minCells: number) {
  const seen = new Uint8Array(ids.length)
  let patches = 0, cells = 0
  for (let start = 0; start < ids.length; start++) {
    const id = ids[start]
    if (!id || seen[start]) continue
    const patch = [start]
    seen[start] = 1
    const visit = (k: number) => {
      if (!seen[k] && ids[k] === id) { seen[k] = 1; patch.push(k) }
    }
    for (let p = 0; p < patch.length; p++) {
      const k = patch[p], x = k % cols
      if (x > 0) visit(k - 1)
      if (x + 1 < cols) visit(k + 1)
      if (k >= cols) visit(k - cols)
      if (k + cols < ids.length) visit(k + cols)
    }
    if (patch.length >= minCells) continue
    for (const k of patch) ids[k] = 0
    patches++; cells += patch.length
  }
  return { patches, cells }
}
