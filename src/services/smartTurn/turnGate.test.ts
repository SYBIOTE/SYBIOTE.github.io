import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TurnGate } from './turnGate'

const segment = () => new Float32Array(1600)

describe('TurnGate', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }))
  afterEach(() => vi.useRealTimers())

  const setup = (probabilities: (number | null)[]) => {
    const commits: string[] = []
    const classify = vi.fn(async () => probabilities.shift() ?? null)
    const gate = new TurnGate({ classify, onCommit: (t) => commits.push(t) })
    return { gate, commits, classify }
  }

  it('commits right away when the turn is complete', async () => {
    const { gate, commits } = setup([0.9])
    gate.speechStart()
    gate.transcript('what do you work on')
    expect(commits).toEqual([])
    await gate.speechEnd(segment())
    expect(commits).toEqual(['what do you work on'])
  })

  it('commits a transcript that arrives after a complete verdict', async () => {
    const { gate, commits } = setup([0.8])
    gate.speechStart()
    await gate.speechEnd(segment())
    gate.transcript('hello')
    expect(commits).toEqual(['hello'])
  })

  it('holds on a mid-sentence pause and joins the next part', async () => {
    const { gate, commits } = setup([0.1, 0.9])
    gate.speechStart()
    gate.transcript('so I was wondering')
    await gate.speechEnd(segment())
    expect(commits).toEqual([])
    gate.speechStart()
    gate.transcript('about your projects')
    await gate.speechEnd(segment())
    expect(commits).toEqual(['so I was wondering about your projects'])
  })

  it('commits after a wait if they stay quiet on an incomplete verdict', async () => {
    const { gate, commits } = setup([0.1])
    gate.speechStart()
    gate.transcript('um')
    await gate.speechEnd(segment())
    vi.advanceTimersByTime(2499)
    expect(commits).toEqual([])
    vi.advanceTimersByTime(1)
    expect(commits).toEqual(['um'])
  })

  it('falls back to committing when the model is unavailable', async () => {
    const { gate, commits } = setup([null])
    gate.speechStart()
    gate.transcript('hi')
    await gate.speechEnd(segment())
    expect(commits).toEqual(['hi'])
  })

  it('commits immediately without VAD activity, and never holds forever', async () => {
    const { gate, commits } = setup([])
    gate.transcript('typed-like')
    expect(commits).toEqual(['typed-like'])
    gate.speechStart()
    gate.transcript('stuck')
    vi.advanceTimersByTime(5000)
    expect(commits).toEqual(['typed-like', 'stuck'])
  })

  it('ignores a verdict that arrives after they started speaking again', async () => {
    let release: (p: number) => void = () => undefined
    const commits: string[] = []
    const gate = new TurnGate({ classify: () => new Promise((r) => (release = r)), onCommit: (t) => commits.push(t) })
    gate.speechStart()
    gate.transcript('and then')
    const done = gate.speechEnd(segment())
    gate.speechStart()
    release(0.95)
    await done
    expect(commits).toEqual([])
  })
})
