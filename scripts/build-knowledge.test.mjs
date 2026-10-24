// @vitest-environment node
import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { cleanBody, compileKnowledge } from './build-knowledge.mjs'

describe('knowledge compiler', () => {
  it('drops comments and headings left empty', () => {
    expect(cleanBody('# About\n<!-- prompt -->\n\n# Goals\n\nShip a WebGPU engine.\n')).toBe('# Goals\n\nShip a WebGPU engine.')
    expect(cleanBody('# A\n<!-- todo -->\n## B\n\n# C\n')).toBe('')
    // A parent heading stays when a subheading under it has text
    expect(cleanBody('# Work\n## Stack\nReact\n')).toBe('# Work\n## Stack\nReact')
  })

  it('reads frontmatter, folders and skips empty files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-'))
    fs.mkdirSync(path.join(dir, 'work'))
    fs.mkdirSync(path.join(dir, 'topics'))
    fs.writeFileSync(path.join(dir, 'me.md'), '---\nalways: true\n---\nI build for the 3D web.\n')
    fs.writeFileSync(path.join(dir, 'work/assethub.md'), '# What I built\nThe texturing pipeline.\n')
    fs.writeFileSync(path.join(dir, 'topics/oss.md'), '---\naliases: [Open Source, github]\n---\nI contribute to three.js.\n')
    fs.writeFileSync(path.join(dir, 'topics/empty.md'), '# Nothing yet\n<!-- later -->\n')
    fs.writeFileSync(path.join(dir, 'README.md'), 'Not a note.\n')

    expect(compileKnowledge(dir)).toEqual([
      { id: 'me', always: true, aliases: [], text: 'I build for the 3D web.' },
      { id: 'topics/oss', always: false, aliases: ['open source', 'github'], text: 'I contribute to three.js.' },
      { id: 'work/assethub', always: false, aliases: [], job: 'assethub', text: '# What I built\nThe texturing pipeline.' }
    ])
    fs.rmSync(dir, { recursive: true })
  })
})
