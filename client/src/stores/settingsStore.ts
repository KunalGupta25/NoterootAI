import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BuiltinProvider, CustomProviderConfig } from '../lib/providerConfig';
import { BUILTIN_PROVIDERS } from '../lib/providerConfig';
import { SYNC_URL } from '../lib/constants';
import { useAuthStore } from './authStore';

export type { BuiltinProvider };
export type { CustomProviderConfig };

type Theme = 'light' | 'dark';

interface SettingsState {
  // ── Appearance ────────────────────────────────────────────────
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // ── Sidebar state ─────────────────────────────────────────────
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isAISidebarOpen: boolean;
  toggleAISidebar: () => void;

  // ── Multi-provider keys (builtin) ─────────────────────────────
  providerKeys: Partial<Record<BuiltinProvider, string>>;
  setProviderKey: (provider: BuiltinProvider, key: string) => void;
  getProviderKey: (provider: BuiltinProvider) => string;

  // ── Active provider (builtin id or custom provider id) ────────
  activeProvider: string;
  setActiveProvider: (provider: string) => void;

  // ── Selected model per provider ───────────────────────────────
  providerModels: Record<string, string>;
  setProviderModel: (provider: string, model: string) => void;
  getProviderModel: (provider: string) => string;

  // ── Custom providers ──────────────────────────────────────────
  customProviders: CustomProviderConfig[];
  addCustomProvider: (config: Omit<CustomProviderConfig, 'id'>) => string;
  updateCustomProvider: (id: string, updates: Partial<CustomProviderConfig>) => void;
  removeCustomProvider: (id: string) => void;
  getCustomProvider: (id: string) => CustomProviderConfig | undefined;

  // ── Helpers ───────────────────────────────────────────────────
  /** Returns the API key for whatever the active provider is */
  getActiveApiKey: () => string;
  /** Returns true if the active provider has a key configured */
  isActiveProviderConfigured: () => boolean;
  /** Returns list of configured (usable) provider IDs */
  getConfiguredProviders: () => string[];

  // ── Legacy compat (used in some places still) ─────────────────
  aiProvider: string;
  aiApiKey: string;

  // ── Server Sync ───────────────────────────────────────────────
  syncSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // ── Appearance ─────────────────────────────────────────────
      theme: 'dark',
      setTheme: (theme) => set({ theme }),

      // ── Sidebar ────────────────────────────────────────────────
      isSidebarOpen: true,
      toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
      isAISidebarOpen: false,
      toggleAISidebar: () => set((s) => ({ isAISidebarOpen: !s.isAISidebarOpen })),

      // ── Provider keys ──────────────────────────────────────────
      providerKeys: {},
      setProviderKey: (provider, key) => {
        set((s) => ({ providerKeys: { ...s.providerKeys, [provider]: key } }));
        get().saveSettings();
      },
      getProviderKey: (provider) => get().providerKeys[provider] ?? '',

      // ── Active provider ────────────────────────────────────────
      activeProvider: 'gemini',
      setActiveProvider: (provider) => set({ activeProvider: provider }),

      // ── Model selection ────────────────────────────────────────
      providerModels: {
        openai: 'gpt-4o-mini',
        gemini: 'gemini-3.5-flash',
        anthropic: 'claude-sonnet-4-5',
        mistral: 'mistral-large-latest',
        groq: 'llama-3.3-70b-versatile',
      },
      setProviderModel: (provider, model) =>
        set((s) => ({ providerModels: { ...s.providerModels, [provider]: model } })),
      getProviderModel: (provider) => {
        const state = get();
        if (state.providerModels[provider]) return state.providerModels[provider];
        // For custom providers, return defaultModel
        const custom = state.customProviders.find((c) => c.id === provider);
        return custom?.defaultModel ?? '';
      },

      // ── Custom providers ───────────────────────────────────────
      customProviders: [],
      addCustomProvider: (config) => {
        const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const newProvider: CustomProviderConfig = { ...config, id };
        set((s) => ({ customProviders: [...s.customProviders, newProvider] }));
        get().saveSettings();
        return id;
      },
      updateCustomProvider: (id, updates) => {
        set((s) => ({
          customProviders: s.customProviders.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
        get().saveSettings();
      },
      removeCustomProvider: (id) => {
        set((s) => ({
          customProviders: s.customProviders.filter((c) => c.id !== id),
          // If removed provider was active, reset to first configured builtin
          activeProvider:
            s.activeProvider === id ? 'gemini' : s.activeProvider,
        }));
        get().saveSettings();
      },
      getCustomProvider: (id) =>
        get().customProviders.find((c) => c.id === id),

      // ── Helpers ────────────────────────────────────────────────
      getActiveApiKey: () => {
        const state = get();
        const { activeProvider } = state;
        if (activeProvider in BUILTIN_PROVIDERS) {
          return state.providerKeys[activeProvider as BuiltinProvider] ?? '';
        }
        const custom = state.customProviders.find((c) => c.id === activeProvider);
        return custom?.apiKey ?? '';
      },

      isActiveProviderConfigured: () => {
        const key = get().getActiveApiKey();
        return key.trim().length > 0;
      },

      getConfiguredProviders: () => {
        const state = get();
        const builtins = (Object.keys(BUILTIN_PROVIDERS) as BuiltinProvider[]).filter(
          (p) => (state.providerKeys[p] ?? '').trim().length > 0
        );
        const customs = state.customProviders.map((c) => c.id);
        return [...builtins, ...customs];
      },

      // ── Legacy compat getters ──────────────────────────────────
      get aiProvider() { return get().activeProvider; },
      get aiApiKey() { return get().getActiveApiKey(); },

      // ── Server Sync ──────────────────────────────────────────────
      syncSettings: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;
        try {
          const res = await fetch(`${SYNC_URL}/api/auth/settings`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            set((s) => {
              const newKeys = { ...s.providerKeys, ...(data.providerKeys || {}) };
              const newCustoms = data.customProviders || s.customProviders;
              
              // Auto-select a configured provider if the active one isn't configured
              let newActive = s.activeProvider;
              const isActiveConfigured = (newActive in BUILTIN_PROVIDERS) 
                ? !!newKeys[newActive as BuiltinProvider]
                : !!newCustoms.find((c: any) => c.id === newActive)?.apiKey;
                
              if (!isActiveConfigured) {
                const firstConfiguredBuiltin = (Object.keys(BUILTIN_PROVIDERS) as BuiltinProvider[]).find(p => !!newKeys[p]);
                if (firstConfiguredBuiltin) {
                  newActive = firstConfiguredBuiltin;
                } else if (newCustoms.length > 0) {
                  newActive = newCustoms[0].id;
                }
              }

              return {
                providerKeys: newKeys,
                customProviders: newCustoms,
                activeProvider: newActive
              };
            });
          }
        } catch (e) {
          console.error('Failed to sync settings from server', e);
        }
      },
      saveSettings: async () => {
        const token = useAuthStore.getState().token;
        if (!token) return;
        const state = get();
        try {
          await fetch(`${SYNC_URL}/api/auth/settings`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              providerKeys: state.providerKeys,
              customProviders: state.customProviders
            })
          });
        } catch (e) {
          console.error('Failed to save settings to server', e);
        }
      },
    }),
    {
      name: 'noteroot-settings-v2',
      partialize: (state) => Object.fromEntries(
        Object.entries(state).filter(([key]) => !['providerKeys', 'customProviders'].includes(key))
      ),
      // Migrate from old v1 format if present
      migrate: (persisted: any, version: number) => {
        if (version === 0 && persisted?.aiProvider && persisted?.aiApiKey) {
          const provider = persisted.aiProvider as BuiltinProvider;
          return {
            ...persisted,
            activeProvider: provider,
            providerKeys: { [provider]: persisted.aiApiKey },
          };
        }
        return persisted;
      },
      version: 1,
    }
  )
);
