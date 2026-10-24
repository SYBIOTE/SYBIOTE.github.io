/**
 * Compiles knowledge/*.md (what the AI twin knows, in Rahul's own words) into src/data/knowledge.json,
 * which api/chat.ts imports. Runs before every build, and on every change while `vite` is running.
 *
 * Each file may start with frontmatter:
 *   always: true            loaded into every conversation (keep these short)
 *   aliases: rate, salary   loaded when the visitor (or the last reply) mentions one of these
 * Files in knowledge/work/ and knowledge/projects/ are named after a job or project id and also load
 * whenever that job or project comes up. HTML comments are notes to yourself and are never sent;
 * headings with nothing under them are dropped, and so are files left empty.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// Loaded into every request, so it counts against the free tiers' token limits on every message
const ALWAYS_BUDGET_CHARS = 6000

const parseFrontmatter = (source) => {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { meta: {}, body: source }
  const meta = {}
  for (const line of match[1].split(/\r?\n/)) {
    const at = line.indexOf(':')
    if (at > 0) meta[line.slice(0, at).trim()] = line.slice(at + 1).trim()
  }
  return { meta, body: source.slice(match[0].length) }
}

/** Drops comments, headings with nothing under them, and extra blank lines. */
export const cleanBody = (body) => {
  const lines = body.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/)
  const level = (line) => line.match(/^(#{1,6})\s/)?.[1].length ?? 0
  // A heading stays if text follows it before the next heading of the same or a higher level
  const hasContent = (i) => {
    for (let j = i + 1; j < lines.length; j++) {
      const next = level(lines[j])
      if (next && next <= level(lines[i])) return false
      if (!next && lines[j].trim()) return true
    }
    return false
  }
  const kept = lines.filter((line, i) => !level(line) || hasContent(i)).map((line) => line.trimEnd())
  if (!kept.some((line) => !level(line) && line.trim())) return ''
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export const compileKnowledge = (dir) => {
  const notes = []
  const walk = (folder) => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(folder, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.md') && entry.name !== 'README.md') {
        const { meta, body } = parseFrontmatter(fs.readFileSync(full, 'utf8'))
        const text = cleanBody(body)
        if (!text) continue
        const rel = path.relative(dir, full).split(path.sep).join('/')
        const id = rel.replace(/\.md$/, '')
        const name = path.basename(id)
        notes.push({
          id,
          always: meta.always === 'true',
          aliases: (meta.aliases ?? '')
            .replace(/^\[|\]$/g, '')
            .split(',')
            .map((a) => a.trim().toLowerCase())
            .filter(Boolean),
          ...(rel.startsWith('work/') && { job: name }),
          ...(rel.startsWith('projects/') && { project: name }),
          text
        })
      }
    }
  }
  if (fs.existsSync(dir)) walk(dir)
  return notes
}

export const writeKnowledge = (dir = path.join(root, 'knowledge'), out = path.join(root, 'src/data/knowledge.json')) => {
  const notes = compileKnowledge(dir)
  const json = JSON.stringify(notes, null, 2) + '\n'
  // Unchanged output: leave the file alone so the dev server doesn't reload for nothing
  if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== json) fs.writeFileSync(out, json)
  const alwaysChars = notes.filter((n) => n.always).reduce((sum, n) => sum + n.text.length, 0)
  if (alwaysChars > ALWAYS_BUDGET_CHARS) {
    console.warn(`[knowledge] always-loaded notes are ${alwaysChars} chars (budget ${ALWAYS_BUDGET_CHARS}): move detail into aliased files`)
  }
  return notes
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const notes = writeKnowledge()
  console.log(`[knowledge] ${notes.length} notes -> src/data/knowledge.json`)
}
