// Fuzzy matching for the in-game place search: accent-insensitive, every query word must appear
// as a subsequence of the name, and matches at word starts and in a row score higher, so
// "pto montt" finds Puerto Montt and "condor" finds Cerro Cóndor before Cerro Condoriri.

/** lower-case without diacritics */
export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export type Match = { score: number; indices: number[] }

/** greedy subsequence match of one word, or null; indices are positions in `text` */
function matchWord(word: string, text: string, from: number): { score: number; indices: number[]; end: number } | null {
  let score = 0, prev = -2
  const indices: number[] = []
  let i = from
  for (const ch of word) {
    const at = text.indexOf(ch, i)
    if (at < 0) return null
    const wordStart = at === 0 || text[at - 1] === ' ' || text[at - 1] === '-'
    score += wordStart ? 3 : at === prev + 1 ? 2 : 1
    if (at > i) score -= Math.min(2, (at - i) * 0.1) // a gap costs a little
    indices.push(at)
    prev = at
    i = at + 1
  }
  if (text.startsWith(word)) score += 2
  return { score, indices, end: i }
}

/** how well `query` matches `text` (both folded by the caller), or null when it does not */
export function fuzzyMatch(query: string, text: string): Match | null {
  const words = query.split(/\s+/).filter(Boolean)
  if (!words.length) return null
  let score = 0
  const indices: number[] = []
  for (const w of words) {
    // each word may start anywhere: the best of the candidate starts wins
    let best: ReturnType<typeof matchWord> = null
    for (let from = text.indexOf(w[0]); from >= 0; from = text.indexOf(w[0], from + 1)) {
      const m = matchWord(w, text, from)
      if (m && (!best || m.score > best.score)) best = m
    }
    if (!best) return null
    score += best.score
    indices.push(...best.indices)
  }
  // shorter names win ties: "Santiago" before "Santiago del Estero"
  return { score: score - text.length * 0.01, indices: [...new Set(indices)].sort((a, b) => a - b) }
}

export type Searchable = { key: string }
/** the `limit` best items for `query`, best first, each with its match */
export function fuzzySearch<T extends Searchable>(query: string, items: T[], limit: number): { item: T; match: Match }[] {
  const q = fold(query).trim()
  if (!q) return []
  const out: { item: T; match: Match }[] = []
  for (const item of items) {
    const match = fuzzyMatch(q, item.key)
    if (match) out.push({ item, match })
  }
  out.sort((a, b) => b.match.score - a.match.score)
  return out.slice(0, limit)
}
