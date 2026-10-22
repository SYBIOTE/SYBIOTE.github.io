import { afterEach, describe, expect, it, vi } from 'vitest'

import type { LLMResponse } from '../llmTypes'
import { llmApi } from './llmApi'

vi.mock('../../../i18n/i18n', () => ({ default: { language: 'en' } }))

const streamOf = (chunks: string[]) =>
  new Response(
    new ReadableStream({
      start(controller) {
        chunks.forEach((c) => controller.enqueue(new TextEncoder().encode(c)))
        controller.close()
      }
    })
  )

const run = async (chunks: string[]) => {
  vi.stubGlobal('fetch', vi.fn(async () => streamOf(chunks)))
  const responses: LLMResponse[] = []
  const updateMessages = vi.fn()
  const result = await llmApi({
    userMessage: 'hi',
    interrupt: 1,
    isStale: () => false,
    messages: [{ role: 'system', content: 'old prompt' }],
    llmUrl: '/api/chat',
    responseCallback: (r) => responses.push(r),
    updateMessages
  })
  return { result, responses, updateMessages }
}

describe('llmApi', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('splits multi-sentence chunks into breaths and speaks the trailing text', async () => {
    const { result, responses } = await run(['Hello there, nice to meet you. I build web 3D tools. Ask me', ' anything!'])

    expect(result.success).toBe(true)
    const breaths = responses.map((r) => r.breath)
    expect(breaths.join('')).toBe('Hello there, nice to meet you. I build web 3D tools. Ask me anything!')
    expect(breaths).toEqual(['Hello there, nice to meet you.', ' I build web 3D tools.', ' Ask me anything!'])
    expect(responses.at(-1)?.final).toBe(true)
    expect(responses.filter((r) => r.final)).toHaveLength(1)
  })

  it('does not split decimals mid-stream', async () => {
    const { responses } = await run(['I have used Three.js and Godot 3.', '5 for years.'])
    expect(responses.map((r) => r.breath).join('')).toBe('I have used Three.js and Godot 3.5 for years.')
    expect(responses).toHaveLength(1)
  })

  it('stops speaking once a newer turn supersedes the request mid-stream', async () => {
    let stale = false
    vi.stubGlobal('fetch', vi.fn(async () => streamOf(['First sentence here. ', 'Second sentence here. ', 'Third one.'])))
    const responses: LLMResponse[] = []
    await llmApi({
      userMessage: 'hi',
      interrupt: 1,
      isStale: () => stale,
      messages: [],
      llmUrl: '/api/chat',
      responseCallback: (r) => {
        responses.push(r)
        stale = true
      }
    })
    expect(responses.map((r) => r.breath)).toEqual(['First sentence here.'])
  })

  it('does not send the client system message', async () => {
    await run(['Ok.'])
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }])
    expect(body.locale).toBe('en')
  })

  it('reports failure on non-200 so the caller can fall back', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 503 })))
    const result = await llmApi({ userMessage: 'hi', interrupt: 1, isStale: () => false, messages: [], llmUrl: '/api/chat' })
    expect(result.success).toBe(false)
  })
})
