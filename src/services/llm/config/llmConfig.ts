import { getSystemPrompt } from "./systemPrompt"

export const SYSTEM_PROMPT = getSystemPrompt()

export const DIRECTED_RESPONSES_URL = '/assets/directed-responses.json'
export const AVAILABLE_LOCAL_MODELS = [
    'gemma-2-2b-it-q4f16_1-MLC',
    'Llama-3.1-8B-Instruct-q4f32_1-MLC',
    'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    'SmolLM2-360M-Instruct-q4f16_1-MLC'
  ]
  
  export const COMMON_REMOTE_MODELS = [
    'gpt-4',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
  ]
  
  export const COMMON_OLLAMA_MODELS = [
    'llama3.2',
    'llama3.2:1b',
    'llama3.1:8b',
    'llama3.1:70b',
    'mistral:7b',
    'codellama:7b',
    'phi3:3.8b',
    'gemma3:1b',
    'gemma2:2b'
  ]
  

export interface LLMConfig {
    llm_provider?: 'script' | 'mlc' | 'ollama' | 'openai' // | 'flowise' | 'anthropic'
    mlc_model?: string
    ollama_url?: string
    ollama_model?: string
    openai_api_url?: string
    openai_api_key?: string
    openai_model?: string
  }



  export const defaultLLMConfig: LLMConfig = {
    llm_provider: import.meta.env.VITE_LLM_PROVIDER || 'mlc',
    mlc_model: import.meta.env.VITE_LLM_LOCAL_MODEL || 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    ollama_url: import.meta.env.VITE_LLM_OLLAMA_API_URL || '',
    ollama_model: import.meta.env.VITE_LLM_OLLAMA_MODEL || 'gemma3:1b',
    openai_api_key: import.meta.env.VITE_LLM_OPENAI_API_KEY || '',
    openai_api_url: import.meta.env.VITE_LLM_OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
    openai_model: import.meta.env.VITE_LLM_OPENAI_MODEL || 'gpt-3.5-turbo'
  }
