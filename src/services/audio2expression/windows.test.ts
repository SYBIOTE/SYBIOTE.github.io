import { describe, expect, it } from 'vitest'

import { streamWindows, WINDOW_FRAMES, WINDOW_SAMPLES } from './windows'

describe('audio2expression streaming windows', () => {
  it('matches the original window size', () => {
    expect(WINDOW_SAMPLES).toBe(34133)
  })

  it('covers the audio with one frame per 1/30s and carries context between chunks', () => {
    const audio = Float32Array.from({ length: 16000 * 2 + 8000 }, (_, i) => i)
    const windows = [...streamWindows(audio)]
    expect(windows.map((w) => w.start)).toEqual([34, 34, 49])
    const frames = windows.reduce((n, w) => n + (WINDOW_FRAMES - w.start), 0)
    expect(frames).toBe(75) // 2.5s * 30fps
    // second window ends with the second chunk, preceded by the first chunk as context
    expect(windows[1].audio[WINDOW_SAMPLES - 1]).toBe(31999)
    expect(windows[1].audio[WINDOW_SAMPLES - 16001]).toBe(15999)
    // first window is zero-padded on the left
    expect(windows[0].audio[0]).toBe(0)
    expect(windows[0].audio[WINDOW_SAMPLES - 16000]).toBe(0)
    expect(windows[0].audio[WINDOW_SAMPLES - 1]).toBe(15999)
  })
})
