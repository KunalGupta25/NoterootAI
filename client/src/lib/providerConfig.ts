export type BuiltinProvider = 'openai' | 'anthropic' | 'gemini' | 'mistral' | 'groq';
export type AIProvider = BuiltinProvider | string; // string covers custom provider IDs

export interface ProviderInfo {
  label: string;
  icon: string;
  color: string;
  models: string[];
  keyPlaceholder: string;
  keyUrl: string;
}

export const BUILTIN_PROVIDERS: Record<BuiltinProvider, ProviderInfo> = {
  openai: {
    label: 'OpenAI',
    icon: '🤖',
    color: '#10a37f',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    keyPlaceholder: 'sk-...',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  gemini: {
    label: 'Google Gemini',
    icon: '✨',
    color: '#4285f4',
    models: ['gemini-3.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    keyPlaceholder: 'AIza...',
    keyUrl: 'https://aistudio.google.com/app/apikey',
  },
  anthropic: {
    label: 'Anthropic Claude',
    icon: '🔮',
    color: '#d4a574',
    models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
    keyPlaceholder: 'sk-ant-...',
    keyUrl: 'https://console.anthropic.com/keys',
  },
  mistral: {
    label: 'Mistral AI',
    icon: '🌊',
    color: '#f7931e',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest', 'mistral-7b-instruct'],
    keyPlaceholder: 'your key...',
    keyUrl: 'https://console.mistral.ai/api-keys',
  },
  groq: {
    label: 'Groq',
    icon: '⚡',
    color: '#f55036',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it', 'deepseek-r1-distill-llama-70b'],
    keyPlaceholder: 'gsk_...',
    keyUrl: 'https://console.groq.com/keys',
  },
};

export interface CustomProviderConfig {
  id: string;           // unique UUID
  name: string;         // display name (e.g. "My Ollama")
  baseUrl: string;      // e.g. http://localhost:11434/v1
  apiKey: string;       // can be empty for local models
  models: string[];     // user-defined model list
  defaultModel: string;
}

export const BUILTIN_PROVIDER_IDS = Object.keys(BUILTIN_PROVIDERS) as BuiltinProvider[];

export function isBuiltinProvider(id: string): id is BuiltinProvider {
  return BUILTIN_PROVIDER_IDS.includes(id as BuiltinProvider);
}
