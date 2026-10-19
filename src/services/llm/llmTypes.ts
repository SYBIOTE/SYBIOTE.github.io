export interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}


export interface LLMState {
  messages: LLMMessage[]
  thinking: boolean
  ready: boolean
  loading: boolean
  _latest_interrupt: number
}

export interface LLMResponse {
  text: string
  breath: string
  ready: boolean
  final: boolean
  interrupt: number
  rcounter?: number
  bcounter?: number
}

export interface LLMStatusUpdate {
  color: 'ready' | 'loading' | 'error' | 'warning'
  text: string
}

export interface LLMPerformRequest {
  text: string
  human: boolean
  final: boolean
  bargein: boolean
  interrupt: number
}

export interface LLMParams {
  userMessage: string
  interrupt: number
  messages: LLMMessage[]
  latestInterrupt: number
  responseCallback?: (response: LLMResponse) => void
  updateMessages?: (userMessage: string, assistantMessage: string) => void
  setThinking?: (thinking: boolean) => void
  statusCallback?: (update: LLMStatusUpdate) => void
  processThinkBlocks?: (input: string) => { cleanedResponse: string; thinkBlocks: string[] }
  llmUrl?: string
}

export interface LLMResult {
  success: boolean
  fullResponse?: string
  thinkBlocks?: string[]
  error?: Error
}



