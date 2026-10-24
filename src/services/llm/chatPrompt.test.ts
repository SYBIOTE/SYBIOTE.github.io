import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildSystemPrompt, firstResponse, topicsFor } from '../../../api/chat'

const user = (content: string) => ({ role: 'user', content })
// Rough token count: ~4 characters per token for English
const tokens = (text: string) => Math.round(text.length / 4)

describe('chat system prompt', () => {
  it('stays small when no project is being discussed', () => {
    // Without knowledge notes, which have their own budget below
    const prompt = buildSystemPrompt('en', [user('hey, who are you?')], [])
    // Was ~2600 with every project's full description
    expect(tokens(prompt)).toBeLessThan(2000)
    // The tools he uses are listed, so the model doesn't invent a stack
    expect(prompt).toContain('React Three Fiber')
    expect(prompt).not.toContain('Details for what the visitor is asking about')
    // The index still names every project, so the model can point to them
    expect(prompt).toContain('assetHub: AssetHub')
    expect(prompt).toContain('cppRaytracer: C++ Raytracer')
  })

  it('adds the full description of the project the visitor asks about', () => {
    const prompt = buildSystemPrompt('en', [user('tell me about the ray tracer')])
    expect(prompt).toContain('Details for what the visitor is asking about')
    expect(prompt).toContain('importance sampling')
    expect(prompt).not.toContain('fruit ninja')
  })

  it('understands misheard names and follow-ups about the last reply', () => {
    expect(topicsFor([user('tell me about asset hob')]).projects).toEqual(['assetHub'])
    expect(topicsFor([user('what about narakasur')]).projects).toEqual(['narakashur'])
    const followUp = topicsFor([user('any games?'), { role: 'assistant', content: 'Wizard vs Robot is a VR game I made.' }, user('tell me more about it')])
    expect(followUp.projects).toEqual(['wizardVsRobot'])
  })

  it('prefers the specific name over the general one', () => {
    expect(topicsFor([user('what is godot dojo')]).projects[0]).toBe('godotDojo')
  })

  it('adds job achievements when asked about experience', () => {
    const prompt = buildSystemPrompt('en', [user('tell me about your experience')])
    expect(prompt).toContain('backfilled')
    expect(buildSystemPrompt('en', [user('hi')])).not.toContain('backfilled')
  })

  it('knows what the shared screen shows', () => {
    // "what's this?" while the raytracer is on screen brings in its details
    const project = buildSystemPrompt('en', [user("what's this?")], [], { section: 'portfolio', project: 'cppRaytracer' })
    expect(project).toContain('shared screen right now: the details page for C++ Raytracer')
    expect(project).toContain('importance sampling')
    // A project the visitor names still comes first
    expect(topicsFor([user('tell me about assethub')], [], 'cppRaytracer').projects).toEqual(['assetHub', 'cppRaytracer'])

    const services = buildSystemPrompt('en', [user('which of these fits me?')], [], { section: 'services', project: null })
    expect(services).toContain('AI for 3D (AI inside 3D workflows')

    // The other-projects folder lists its cards, and a project opened from it says so
    const folder = buildSystemPrompt('en', [user('which one is your favourite?')], [], { section: 'portfolio', project: null, folder: 'otherProjects' })
    expect(folder).toContain('the Other Projects folder, with a card for each project, newest first: AUGURY: Duel of the Gods (augury)')
    const fromFolder = buildSystemPrompt('en', [user('how long did this take?')], [], { section: 'portfolio', project: 'augury', folder: 'otherProjects' })
    expect(fromFolder).toContain('the details page for AUGURY: Duel of the Gods (augury), opened from the Other Projects folder')

    expect(buildSystemPrompt('en', [user('hi')], [])).not.toContain('shared screen right now')
  })

  it('does not match short words by accident', () => {
    expect(topicsFor([user('can you do VR work for me')]).projects).toEqual([])
  })

  it('never lists job ids where the model could mistake them for project ids', () => {
    expect(buildSystemPrompt('en', [user('tell me about your experience')])).not.toMatch(/- assethub:/)
  })

  it('lists Nira Animates as a project and brings in the advisor role when asked', () => {
    const prompt = buildSystemPrompt('en', [user('what is nira animates')])
    expect(prompt).toContain('- niraAnimates: Nira Animates')
    expect(prompt).toContain('Technical Advisor — Nira Animates: Advising')
  })

  it('keeps the always-loaded knowledge notes within budget', () => {
    expect(tokens(buildSystemPrompt('en', [user('hi')])) - tokens(buildSystemPrompt('en', [user('hi')], []))).toBeLessThan(1500)
  })

  describe('knowledge notes', () => {
    const notes = [
      { id: 'me', always: true, aliases: [], text: "I'm looking for a staff role on a WebGPU team." },
      { id: 'work/assethub', always: false, aliases: [], job: 'assethub', text: 'I rebuilt the texturing pipeline on job queues.' },
      { id: 'projects/cppRaytracer', always: false, aliases: [], project: 'cppRaytracer', text: 'Started it to learn path tracing.' },
      { id: 'topics/oss', always: false, aliases: ['open source'], text: 'I contribute to three.js.' }
    ]

    it('always carries the always-on notes', () => {
      const prompt = buildSystemPrompt('en', [user('hi')], notes)
      expect(prompt).toContain('staff role on a WebGPU team')
      expect(prompt).not.toContain('texturing pipeline')
      expect(prompt).not.toContain('three.js.')
    })

    it('brings in notes with their job, project or aliases', () => {
      expect(buildSystemPrompt('en', [user('what did you do at asset hub')], notes)).toContain('texturing pipeline')
      expect(buildSystemPrompt('en', [user('tell me about the ray tracer')], notes)).toContain('learn path tracing')
      expect(buildSystemPrompt('en', [user('do you do open source?')], notes)).toContain('I contribute to three.js.')
    })
  })

  it('reports its size', () => {
    console.log('prompt tokens ~', tokens(buildSystemPrompt('en', [user('hi')])), 'with a project ~', tokens(buildSystemPrompt('en', [user('tell me about narakashur')])))
  })
})

describe('provider racing', () => {
  const provider = (name: string) => ({ name, url: `https://${name}.test`, key: 'k', model: 'm' })
  const messages = [{ role: 'user' as const, content: 'hi' }]
  const stubFetch = (behaviour: Record<string, { ms: number; ok: boolean }>) => {
    const calls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init: RequestInit) => {
        const name = new URL(url).hostname.split('.')[0]
        calls.push(name)
        const { ms, ok } = behaviour[name]
        return new Promise((resolve, reject) => {
          const t = setTimeout(() => resolve(new Response(ok ? 'data: {}\n\n' : 'nope', { status: ok ? 200 : 429 })), ms)
          init.signal?.addEventListener('abort', () => {
            clearTimeout(t)
            reject(new Error('aborted'))
          })
        })
      })
    )
    return calls
  }
  afterEach(() => vi.unstubAllGlobals())

  it('uses the first provider when it answers quickly', async () => {
    const calls = stubFetch({ a: { ms: 10, ok: true }, b: { ms: 10, ok: true } })
    const { provider: p } = await firstResponse([provider('a'), provider('b')], messages, new AbortController().signal, 100)
    expect(p.name).toBe('a')
    expect(calls).toEqual(['a'])
  })

  it('starts the next provider when the first is slow, and takes whichever answers first', async () => {
    stubFetch({ a: { ms: 500, ok: true }, b: { ms: 20, ok: true } })
    const { provider: p } = await firstResponse([provider('a'), provider('b')], messages, new AbortController().signal, 50)
    expect(p.name).toBe('b')
  })

  it('moves on straight away when a provider fails, and fails when all do', async () => {
    stubFetch({ a: { ms: 5, ok: false }, b: { ms: 5, ok: true } })
    expect((await firstResponse([provider('a'), provider('b')], messages, new AbortController().signal, 1000)).provider.name).toBe('b')
    stubFetch({ a: { ms: 5, ok: false }, b: { ms: 5, ok: false } })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await expect(firstResponse([provider('a'), provider('b')], messages, new AbortController().signal, 1000)).rejects.toThrow()
  })
})
