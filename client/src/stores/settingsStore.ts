import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BuiltinProvider, CustomProviderConfig } from '../lib/providerConfig';
import { BUILTIN_PROVIDERS } from '../lib/providerConfig';

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
      setProviderKey: (provider, key) =>
        set((s) => ({ providerKeys: { ...s.providerKeys, [provider]: key } })),
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
        grok: 'grok-3-mini',
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
        return id;
      },
      updateCustomProvider: (id, updates) =>
        set((s) => ({
          customProviders: s.customProviders.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),
      removeCustomProvider: (id) =>
        set((s) => ({
          customProviders: s.customProviders.filter((c) => c.id !== id),
          // If removed provider was active, reset to first configured builtin
          activeProvider:
            s.activeProvider === id ? 'gemini' : s.activeProvider,
        })),
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
    }),
    {
      name: 'noteroot-settings-v2',
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
