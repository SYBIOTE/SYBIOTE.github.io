/**
 * Text-to-speech endpoint (Vercel Function): Rahul's cloned voice via Inworld TTS.
 *
 * POST { text } -> audio/mpeg. GET -> { configured } (no secrets). The API key never reaches the browser.
 * The audio comes with its phoneme timings in an X-Phones header ("viseme start duration" per phone,
 * semicolon separated, in seconds), which the avatar uses to time the lips (phonemeMouth.ts).
 * 503 { error: 'not-configured' } when no key/voice is set, so the client switches to its
 * built-in browser voice for the rest of the session instead of retrying every sentence.
 *
 * Env:
 *   INWORLD_API_KEY   Base64 credential from the Inworld portal (sent as Basic auth as-is)
 *   INWORLD_VOICE_ID  Your cloned voice's ID
 *   INWORLD_MODEL     default inworld-tts-2 (inworld-tts-2-flash is faster, slightly lower quality)
 *   ALLOWED_ORIGINS   optional, comma separated extra origins
 *
 * Kept self-contained (no relative TS imports) so it runs as-is on Vercel's ESM runtime; the
 * origin check and rate limiter mirror api/chat.ts.
 */

const MAX_TEXT_CHARS = 600 // one or two sentences per request; the client sends sentence by sentence
const RATE_LIMIT_PER_MINUTE = 40 // a reply is several sentences
// Headers have size limits; a 600-character request makes well under this
const MAX_PHONES_HEADER = 7000

interface InworldPhone {
  phoneSymbol: string
  startTimeSeconds: number
  durationSeconds: number
  visemeSymbol: string
}

/** Inworld's phoneme timings as a compact header value ("bmp 0.00 0.13;ee 0.13 0.04;..."), silences as "sil" */
const encodePhones = (timestampInfo: unknown): string => {
  const details = (timestampInfo as { wordAlignment?: { phoneticDetails?: { phones?: InworldPhone[] }[] } })?.wordAlignment?.phoneticDetails
  if (!Array.isArray(details)) return ''
  const value = details
    .flatMap((word) => word.phones ?? [])
    .map((p) => `${p.phoneSymbol.startsWith('[') ? 'sil' : p.visemeSymbol} ${p.startTimeSeconds.toFixed(2)} ${p.durationSeconds.toFixed(2)}`)
    .join(';')
  return /^[\x20-\x7e]*$/.test(value) && value.length <= MAX_PHONES_HEADER ? value : ''
}

const DEFAULT_ALLOWED_HOSTS = [
  'rahulghosh.com',
  'www.rahulghosh.com',
  'sybiote.github.io',
  'rahulgh0sh.vercel.app',
  'rahulghosh.is-a.dev',
  'sybiote.is-a.dev',
  'localhost',
  '127.0.0.1'
]

const getAllowedHosts = (): string[] => {
  const extra = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
    .map((o) => {
      try {
        return new URL(o).hostname
      } catch {
        return o
      }
    })
  const vercelHosts = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
  return [...DEFAULT_ALLOWED_HOSTS, ...extra, ...vercelHosts].filter((h): h is string => Boolean(h))
}

const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false
  try {
    return getAllowedHosts().includes(new URL(origin).hostname)
  } catch {
    return false
  }
}

const corsHeaders = (origin: string | null): Record<string, string> =>
  origin && isAllowedOrigin(origin)
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Expose-Headers': 'X-Phones',
        Vary: 'Origin'
      }
    : {}

const hits = new Map<string, number[]>()
const isRateLimited = (ip: string): boolean => {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > RATE_LIMIT_PER_MINUTE
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get('origin')
    const cors = corsHeaders(origin)

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    const key = process.env.INWORLD_API_KEY
    const voiceId = process.env.INWORLD_VOICE_ID
    // GET: lets the page know early whether the cloned voice is set up (it then preloads lipsync)
    if (request.method === 'GET') return json(200, { configured: Boolean(key && voiceId) }, { 'Cache-Control': 'no-store', ...cors })
    if (request.method !== 'POST') return json(405, { error: 'Method not allowed' }, cors)
    if (!isAllowedOrigin(origin)) return json(403, { error: 'Origin not allowed' })
    if (!key || !voiceId) return json(503, { error: 'not-configured' }, cors)

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (isRateLimited(ip)) return json(429, { error: 'Too many requests' }, cors)

    let text = ''
    try {
      const body = (await request.json()) as { text?: unknown }
      text = typeof body.text === 'string' ? body.text.trim().slice(0, MAX_TEXT_CHARS) : ''
    } catch {
      return json(400, { error: 'Invalid JSON' }, cors)
    }
    if (!text) return json(400, { error: 'Missing text' }, cors)

    try {
      const upstream = await fetch('https://api.inworld.ai/tts/v1/voice', {
        method: 'POST',
        headers: { Authorization: `Basic ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId,
          modelId: process.env.INWORLD_MODEL || 'inworld-tts-2',
          audioConfig: { audioEncoding: 'MP3', sampleRateHertz: 24000 },
          // Phoneme timings for the lips; costs no noticeable time
          timestampType: 'WORD'
        }),
        signal: request.signal
      })
      if (!upstream.ok) {
        const detail = await upstream.text().catch(() => '')
        console.error(`[tts] inworld ${upstream.status}: ${detail.slice(0, 300)}`)
        // Quota/auth problems: let the client fall back to its own voice
        return json(upstream.status === 401 || upstream.status === 403 ? 503 : 502, { error: 'upstream-failed' }, cors)
      }
      const { audioContent, timestampInfo } = (await upstream.json()) as { audioContent?: string; timestampInfo?: unknown }
      if (!audioContent) return json(502, { error: 'empty-audio' }, cors)
      const phones = encodePhones(timestampInfo)
      return new Response(Buffer.from(audioContent, 'base64'), {
        status: 200,
        headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store', ...(phones && { 'X-Phones': phones }), ...cors }
      })
    } catch (error) {
      console.error('[tts] failed:', error instanceof Error ? error.message : error)
      return json(502, { error: 'upstream-failed' }, cors)
    }
  }
}
