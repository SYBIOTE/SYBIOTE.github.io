import { describe, expect, it } from 'vitest'

import { buildGreeting } from './greeting'

const first = () => 0
const last = () => 0.999

describe('join greeting', () => {
  it('greets a named visitor by name, says it is the AI version, and gives a hook', () => {
    const line = buildGreeting({ name: 'Sam', hour: 19, random: last })
    expect(line).toContain('Sam')
    expect(line).toMatch(/AI/)
    expect(line).toContain('the projects my human counterpart has worked on and is currently working on')
    expect(line.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(3)
  })

  it('uses the time of day', () => {
    const r = (() => {
      let i = 0
      return () => [0.5, 0, 0][i++ % 3]
    })()
    expect(buildGreeting({ name: 'Sam', hour: 9, random: r })).toMatch(/^Morning, Sam!/)
  })

  it('works without a name', () => {
    expect(buildGreeting({ hour: 15, random: first })).toMatch(/^Hey, welcome!/)
  })

  it('welcomes back returning visitors without the full introduction', () => {
    const line = buildGreeting({ name: 'Sam', returning: true, random: first })
    expect(line).toContain('again')
    expect(line).not.toMatch(/AI/)
  })

  it('speaks the site language, and falls back to English', () => {
    expect(buildGreeting({ name: 'Sam', locale: 'de', hour: 20, random: first })).toContain('Sam')
    expect(buildGreeting({ name: 'Sam', locale: 'ja', random: first })).toContain('Samさん')
    expect(buildGreeting({ name: 'Sam', locale: 'pt-BR', random: first })).toMatch(/^Hey Sam!/)
  })

  it('never says the old canned line', () => {
    for (let i = 0; i < 50; i++) expect(buildGreeting({ name: i % 2 ? 'Sam' : '' })).not.toMatch(/Welcome to my website/)
  })
})
