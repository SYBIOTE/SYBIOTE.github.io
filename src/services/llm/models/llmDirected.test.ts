import { describe, expect, it } from 'vitest'

import config from '../../../../public/assets/directed-responses.json'
import TOPICS from '../../../data/assistantTopics.json'
import { findDirectedResponse, toSentences, type DirectedConfig } from './llmDirected'

const answer = (q: string, previous = '') => findDirectedResponse(q, config as DirectedConfig, previous)
const intentOf = (q: string) => {
  const reply = answer(q)
  return (config as DirectedConfig).intents.find((i) => i.responses.includes(reply))?.id ?? (config.default.includes(reply) ? 'default' : 'project')
}

describe('scripted fallback', () => {
  it('answers the questions that used to get "Hello! I\'m here to help"', () => {
    expect(intentOf('what kind of projects have you worked on?')).toBe('projects')
    expect(intentOf('are you available for freelance work?')).toBe('hire')
    expect(intentOf('how can I reach you?')).toBe('contact')
    expect(intentOf('what tech stack do you use')).toBe('skills')
    expect(intentOf('where do you work right now')).toBe('experience')
    expect(intentOf('hey')).toBe('greeting')
  })

  it('answers about a named project, even misheard', () => {
    expect(answer('tell me about asset hob')).toContain('[[show_project:assetHub]]')
    expect(answer('what is the ray tracer')).toContain('[[show_project:cppRaytracer]]')
    expect(answer('tell me about godot dojo')).toContain('[[show_project:godotDojo]]')
  })

  it('lets pricing and contact questions win over a project name', () => {
    expect(intentOf('how much would something like assethub cost')).toBe('hire')
  })

  it('follows up on the project the last reply was about', () => {
    expect(answer('tell me more', 'Narakashur is a wave survival game I shipped.')).toContain('[[show_project:narakashur]]')
  })

  it('does not say the same line twice in a row', () => {
    const first = answer('hey')
    expect(answer('hey')).not.toBe(first)
  })

  it('has an answer for every project and only real project ids', () => {
    expect(Object.keys(config.projects).sort()).toEqual(Object.keys(TOPICS.projects).sort())
    for (const replies of Object.values(config.projects)) for (const r of replies) {
      for (const [, id] of r.matchAll(/\[\[show_project:(\w+)\]\]/g)) expect(TOPICS.projects).toHaveProperty(id)
    }
  })

  it('speaks in the first person, without generic assistant lines', () => {
    // Saying he's "Rahul's AI avatar" belongs only where it explains what the visitor is talking to
    const disclosure = new Set(['who', 'real'])
    const all = [
      ...Object.values(config.projects).flat(),
      ...config.intents.filter((i) => !disclosure.has(i.id)).flatMap((i) => i.responses),
      ...config.default
    ]
    for (const line of all) {
      expect(line).not.toMatch(/\bRahul's\b|\bhe\b|assist|How can I help|AI assistant/i)
    }
  })

  it('keeps names like Three.js whole when splitting into sentences', () => {
    expect(toSentences('Mostly Three.js and Babylon. Godot for XR!')).toEqual(['Mostly Three.js and Babylon.', 'Godot for XR!'])
  })
})
