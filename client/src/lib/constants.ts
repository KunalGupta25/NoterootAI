// Use || instead of ?? so that empty-string env vars also fall back to the default.
export const AI_URL: string =
  (import.meta.env.VITE_AI_URL as string) ||
  'https://pleasing-contentment-production-c3fb.up.railway.app';

export const SYNC_URL: string =
  (import.meta.env.VITE_SYNC_URL as string) ||
  'https://noterootai-production.up.railway.app';
