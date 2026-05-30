// Helper to ensure URLs don't end with a trailing slash, preventing //chat errors.
function cleanUrl(url: string | undefined | null, fallback: string): string {
  const u = (url && url.trim()) || fallback;
  return u.endsWith('/') ? u.slice(0, -1) : u;
}

export const AI_URL: string = cleanUrl(
  import.meta.env.VITE_AI_URL as string,
  'https://pleasing-contentment-production-c3fb.up.railway.app'
);

export const SYNC_URL: string = cleanUrl(
  import.meta.env.VITE_SYNC_URL as string,
  'https://noterootai-production.up.railway.app'
);
