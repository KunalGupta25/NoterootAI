import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SYNC_URL } from '../lib/constants';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  authHeaders: () => Record<string, string>;
}

async function authRequest(path: string, body: Record<string, string>) {
  const res = await fetch(`${SYNC_URL}/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Authentication failed');
  }

  return data as { token: string; user: AuthUser };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      login: async (email, password) => {
        const data = await authRequest('login', { email, password });
        set({ token: data.token, user: data.user });
      },

      signup: async (name, email, password) => {
        const data = await authRequest('signup', { name, email, password });
        set({ token: data.token, user: data.user });
      },

      logout: () => set({ token: null, user: null }),

      authHeaders: () => {
        const token = get().token;
        return token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>);
      },
    }),
    { name: 'noteroot-auth' }
  )
);
