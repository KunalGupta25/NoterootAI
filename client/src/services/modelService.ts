import { AI_URL } from '../lib/constants';

export interface FetchModelsOptions {
  provider: string;
  apiKey?: string;
  customBaseUrl?: string;
}

/**
 * Fetch available models for any cloud or custom provider.
 * Uses the backend AI service bridge to avoid CORS issues with providers,
 * and falls back to direct browser fetching for local endpoints (Ollama, LM Studio) or OpenRouter.
 */
export async function fetchAvailableModels({
  provider,
  apiKey,
  customBaseUrl,
}: FetchModelsOptions): Promise<string[]> {
  // 1. Try NoteRoot backend bridge
  try {
    const res = await fetch(`${AI_URL}/models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        api_key: apiKey || undefined,
        custom_base_url: customBaseUrl || undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.models) && data.models.length > 0) {
        return data.models;
      }
    } else {
      const errText = await res.text().catch(() => '');
      console.warn(`[modelService] Backend bridge error (${res.status}):`, errText);
    }
  } catch (backendErr) {
    console.warn('[modelService] Backend bridge unreachable, attempting direct fallback:', backendErr);
  }

  // 2. Direct client fallback for OpenRouter
  if (provider === 'openrouter') {
    try {
      const headers: Record<string, string> = {};
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const res = await fetch('https://openrouter.ai/api/v1/models', { headers });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          const models: string[] = json.data.map((m: any) => m.id).filter(Boolean);
          if (models.length > 0) {
            return models.sort();
          }
        }
      }
    } catch (err) {
      console.warn('[modelService] OpenRouter direct fetch failed:', err);
    }
  }

  // 3. Direct client fallback for local custom providers (Ollama / LM Studio)
  if (customBaseUrl) {
    const cleanBase = customBaseUrl.replace(/\/+$/, '');
    
    // Try standard OpenAI /v1/models
    try {
      const modelsUrl = cleanBase.endsWith('/models') ? cleanBase : `${cleanBase}/models`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const res = await fetch(modelsUrl, { headers });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          const models = json.data.map((m: any) => m.id).filter(Boolean);
          if (models.length > 0) return models.sort();
        }
      }
    } catch {}

    // Try Ollama native /api/tags
    try {
      const ollamaRoot = cleanBase.replace(/\/v1\/?$/, '');
      const res = await fetch(`${ollamaRoot}/api/tags`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.models)) {
          const models = json.models.map((m: any) => m.name).filter(Boolean);
          if (models.length > 0) return models.sort();
        }
      }
    } catch {}
  }

  throw new Error(`Could not fetch models for ${provider}. Please verify your API key or endpoint URL.`);
}
