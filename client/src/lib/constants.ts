// Helper to ensure URLs don't end with a trailing slash, preventing //chat errors.
function cleanUrl(url: string | undefined | null, fallback: string): string {
  const u = (url && url.trim()) || fallback;
  return u.endsWith('/') ? u.slice(0, -1) : u;
}

const UNIFIED_BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

export const BACKEND_URL: string = cleanUrl(
  UNIFIED_BACKEND_URL,
  'https://noterootai-production.up.railway.app'
);

// Keep the current deployment working until VITE_BACKEND_URL points at the
// staged unified service. Once set, every client API call uses BACKEND_URL.
export const AI_URL: string = UNIFIED_BACKEND_URL
  ? BACKEND_URL
  : cleanUrl(
      import.meta.env.VITE_AI_URL as string,
      'https://pleasing-contentment-production-c3fb.up.railway.app'
    );

export const SYNC_URL: string = UNIFIED_BACKEND_URL
  ? BACKEND_URL
  : cleanUrl(
      import.meta.env.VITE_SYNC_URL as string,
      'https://noterootai-production.up.railway.app'
    );
