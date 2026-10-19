/**
 * Whisper log-mel spectrogram, matching transformers' WhisperFeatureExtractor(chunk_length=8) as
 * Smart Turn uses it: 16kHz audio, 400-point Hann STFT, hop 160, 80 Slaney mel bands -> [80, 800].
 */

export const SAMPLE_RATE = 16000
export const N_FFT = 400
export const HOP = 160
export const N_MELS = 80
export const SECONDS = 8
export const N_SAMPLES = SAMPLE_RATE * SECONDS // 128000
export const N_FRAMES = N_SAMPLES / HOP // 800
const N_BINS = N_FFT / 2 + 1 // 201

const hzToMel = (hz: number) => (hz < 1000 ? (3 * hz) / 200 : 15 + Math.log(hz / 1000) * (27 / Math.log(6.4)))
const melToHz = (mel: number) => (mel < 15 ? (200 * mel) / 3 : 1000 * Math.exp((mel - 15) * (Math.log(6.4) / 27)))

/** Triangular Slaney-normalised mel filters, [N_BINS][N_MELS] like transformers' mel_filter_bank. */
export const melFilters = (() => {
  let cache: Float64Array[] | null = null
  return (): Float64Array[] => {
    if (cache) return cache
    const melMin = hzToMel(0)
    const melMax = hzToMel(SAMPLE_RATE / 2)
    const edges = Array.from({ length: N_MELS + 2 }, (_, i) => melToHz(melMin + ((melMax - melMin) * i) / (N_MELS + 1)))
    const fftFreqs = Array.from({ length: N_BINS }, (_, i) => ((SAMPLE_RATE / 2) * i) / (N_BINS - 1))
    cache = fftFreqs.map((f) => {
      const row = new Float64Array(N_MELS)
      for (let m = 0; m < N_MELS; m++) {
        const down = (f - edges[m]) / (edges[m + 1] - edges[m])
        const up = (edges[m + 2] - f) / (edges[m + 2] - edges[m + 1])
        row[m] = Math.max(0, Math.min(down, up)) * (2 / (edges[m + 2] - edges[m]))
      }
      return row
    })
    return cache
  }
})()

const dftTables = (() => {
  let cache: { cos: Float32Array; sin: Float32Array; window: Float32Array } | null = null
  return () => {
    if (cache) return cache
    const cos = new Float32Array(N_BINS * N_FFT)
    const sin = new Float32Array(N_BINS * N_FFT)
    for (let k = 0; k < N_BINS; k++) {
      for (let n = 0; n < N_FFT; n++) {
        const a = (2 * Math.PI * k * n) / N_FFT
        cos[k * N_FFT + n] = Math.cos(a)
        sin[k * N_FFT + n] = Math.sin(a)
      }
    }
    // Periodic Hann window
    const window = Float32Array.from({ length: N_FFT }, (_, n) => 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / N_FFT))
    cache = { cos, sin, window }
    return cache
  }
})()

/**
 * Smart Turn's input: the last 8s of the turn (zero-padded at the start), normalised, as a
 * [80 * 800] log-mel array in row-major (mel, frame) order.
 */
export const smartTurnFeatures = (turnAudio: Float32Array): Float32Array => {
  // Keep the end of the turn; pad silence at the start
  const audio = new Float32Array(N_SAMPLES)
  const tail = turnAudio.subarray(Math.max(0, turnAudio.length - N_SAMPLES))
  audio.set(tail, N_SAMPLES - tail.length)

  // Zero-mean, unit-variance over the whole 8s buffer (do_normalize=True)
  let mean = 0
  for (let i = 0; i < N_SAMPLES; i++) mean += audio[i]
  mean /= N_SAMPLES
  let variance = 0
  for (let i = 0; i < N_SAMPLES; i++) variance += (audio[i] - mean) ** 2
  const scale = 1 / Math.sqrt(variance / N_SAMPLES + 1e-7)
  for (let i = 0; i < N_SAMPLES; i++) audio[i] = (audio[i] - mean) * scale

  // Centre-padded (reflect) STFT power spectrum -> mel -> log10
  const { cos, sin, window } = dftTables()
  const filters = melFilters()
  const pad = N_FFT / 2
  const reflect = (i: number) => (i < 0 ? -i : i >= N_SAMPLES ? 2 * (N_SAMPLES - 1) - i : i)
  const frames = N_FRAMES + 1 // the last frame is dropped, as in Whisper
  const logMel = new Float32Array(N_MELS * N_FRAMES)
  const frame = new Float32Array(N_FFT)
  const power = new Float64Array(N_BINS)
  let maxLog = -Infinity

  for (let t = 0; t < frames - 1; t++) {
    for (let n = 0; n < N_FFT; n++) frame[n] = audio[reflect(t * HOP + n - pad)] * window[n]
    for (let k = 0; k < N_BINS; k++) {
      let re = 0
      let im = 0
      const base = k * N_FFT
      for (let n = 0; n < N_FFT; n++) {
        re += frame[n] * cos[base + n]
        im -= frame[n] * sin[base + n]
      }
      power[k] = re * re + im * im
    }
    for (let m = 0; m < N_MELS; m++) {
      let e = 0
      for (let k = 0; k < N_BINS; k++) e += filters[k][m] * power[k]
      const v = Math.log10(Math.max(e, 1e-10))
      logMel[m * N_FRAMES + t] = v
      if (v > maxLog) maxLog = v
    }
  }

  // Dynamic range clamp and scale
  const floor = maxLog - 8
  for (let i = 0; i < logMel.length; i++) logMel[i] = (Math.max(logMel[i], floor) + 4) / 4
  return logMel
}
