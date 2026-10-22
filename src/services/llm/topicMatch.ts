/**
 * Finds which projects or jobs a message is about, from the aliases in src/data/assistantTopics.json.
 *
 * Aliases match as whole words, and longer names also match with a slip or two, since spoken
 * questions come through speech recognition ("asset hob" is AssetHub, "narakasur" is Narakashur).
 * api/chat.ts has a copy of this (Vercel functions there can't import TS from src).
 */

const words = (text: string) => text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)

const editDistance = (a: string, b: string) => {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = row
  }
  return prev[b.length]
}

// Slips allowed by alias length (without spaces): none for short names, where they'd match other words
const allowedSlips = (length: number) => (length >= 10 ? 2 : length >= 6 ? 1 : 0)

/** Where in `text` the alias appears (word index), or -1. */
const findAlias = (text: string[], alias: string): number => {
  const parts = words(alias)
  for (let i = 0; i + parts.length <= text.length; i++) if (parts.every((p, k) => text[i + k] === p)) return i
  const squashed = parts.join('')
  const slips = allowedSlips(squashed.length)
  if (!slips) return -1
  // Up to three words run together, since recognition splits and joins names ("asset hub" / "assethub")
  for (let i = 0; i < text.length; i++) {
    let joined = ''
    for (let n = 0; n < 3 && i + n < text.length; n++) {
      joined += text[i + n]
      if (Math.abs(joined.length - squashed.length) <= slips && editDistance(joined, squashed) <= slips) return i
    }
  }
  return -1
}

/** The topics `text` mentions, in the order it mentions them. */
export const findTopics = (text: string, table: Record<string, string[]>): string[] => {
  const tokens = words(text)
  const hits: { id: string; at: number; length: number }[] = []
  for (const [id, aliases] of Object.entries(table)) {
    let best: { at: number; length: number } | null = null
    for (const alias of aliases) {
      const at = findAlias(tokens, alias)
      if (at >= 0 && (!best || at < best.at || (at === best.at && alias.length > best.length))) best = { at, length: alias.length }
    }
    if (best) hits.push({ id, ...best })
  }
  // Earliest first; at the same place the longer name wins ("godot dojo" over "godot")
  return hits.sort((a, b) => a.at - b.at || b.length - a.length).map((h) => h.id)
}

/** Whether `text` contains any of `phrases` as whole words (no slips: for intent words like "experience"). */
export const mentionsAny = (text: string, phrases: string[]): boolean => {
  const tokens = words(text)
  return phrases.some((p) => {
    const parts = words(p)
    for (let i = 0; i + parts.length <= tokens.length; i++) if (parts.every((w, k) => tokens[i + k] === w)) return true
    return false
  })
}
