export const DIRECTED_RESPONSES_URL = '/assets/directed-responses.json'

export interface LLMConfig {
  /** 'api' streams from the hosted /api/chat function, 'script' uses directed responses only */
  llm_provider?: 'api' | 'script'
  api_url?: string
}

export const defaultLLMConfig: LLMConfig = {
  // Any other value (e.g. a stale 'ollama' env var) falls back to the hosted API
  llm_provider: import.meta.env.VITE_LLM_PROVIDER === 'script' ? 'script' : 'api',
  api_url: import.meta.env.VITE_CHAT_API_URL || '/api/chat'
}
