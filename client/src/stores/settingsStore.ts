import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BuiltinProvider, CustomProviderConfig } from '../lib/providerConfig';
import { BUILTIN_PROVIDERS } from '../lib/providerConfig';
import { SYNC_URL } from '../lib/constants';
import { useAuthStore } from './authStore';
import { ThemeEngine } from '../plugins/runtime/ThemeEngine';

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

  // ── Plugin settings ───────────────────────────────────────────
  pluginSettings: Record<string, Record<string, any>>;
  setPluginSetting: (pluginId: string, key: string, value: any) => void;
  getPluginSetting: (pluginId: string, key: string) => any;
  installedCommunityPlugins: string[];
  setInstalledCommunityPlugins: (urls: string[]) => void;

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
      setTheme: (theme) => {
        set({ theme });
        ThemeEngine.reapply();
        get().saveSettings();
      },

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
      setActiveProvider: (provider) => {
        set({ activeProvider: provider });
        get().saveSettings();
      },

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

      // ── Plugin Settings ────────────────────────────────────────
      pluginSettings: {},
      setPluginSetting: (pluginId, key, value) => {
        set((s) => ({
          pluginSettings: {
            ...s.pluginSettings,
            [pluginId]: {
              ...(s.pluginSettings[pluginId] || {}),
              [key]: value
            }
          }
        }));
        get().saveSettings();
      },
      getPluginSetting: (pluginId, key) => {
        return (get().pluginSettings[pluginId] || {})[key];
      },
      installedCommunityPlugins: [],
      setInstalledCommunityPlugins: (urls) => {
        set({ installedCommunityPlugins: urls });
        get().saveSettings();
      },

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
              // Smart merge: server value wins only when it is non-empty.
              // This prevents a cold/fresh server DB from clearing locally-cached keys.
              const serverKeys: Record<string, string> = data.providerKeys || {};
              const mergedKeys = { ...s.providerKeys };
              for (const [provider, key] of Object.entries(serverKeys)) {
                if (key && String(key).trim()) {
                  mergedKeys[provider as BuiltinProvider] = key as string;
                }
              }

              // For custom providers: merge by id, prefer server when it has a key
              const localCustomsMap = new Map(s.customProviders.map(c => [c.id, c]));
              const serverCustoms: any[] = data.customProviders || [];
              serverCustoms.forEach(sc => {
                const local = localCustomsMap.get(sc.id);
                if (!local || (sc.apiKey && sc.apiKey.trim())) {
                  localCustomsMap.set(sc.id, sc);
                }
              });
              const mergedCustoms = Array.from(localCustomsMap.values());

              // Use server's active provider if available, otherwise local
              let newActive = data.activeProvider || s.activeProvider;

              return {
                theme: data.theme || s.theme,
                providerKeys: mergedKeys,
                customProviders: mergedCustoms,
                activeProvider: newActive,
                pluginSettings: { ...s.pluginSettings, ...(data.pluginSettings || {}) },
                installedCommunityPlugins: data.installedCommunityPlugins?.length
                  ? data.installedCommunityPlugins
                  : s.installedCommunityPlugins,
              };
            });
          }
        } catch (e) {
          // Server offline is expected — local keys are still available from localStorage
          console.warn('Could not sync settings from server (offline?):', (e as Error).message);
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
              theme: state.theme,
              activeProvider: state.activeProvider,
              providerKeys: state.providerKeys,
              customProviders: state.customProviders,
              pluginSettings: state.pluginSettings,
              installedCommunityPlugins: state.installedCommunityPlugins
            })
          });
        } catch (e) {
          console.error('Failed to save settings to server', e);
        }
      },
    }),
    {
      name: 'noteroot-settings-v3',
      // Persist everything including providerKeys and customProviders locally.
      // Keys are also encrypted on the server; local copy is the offline fallback.
      partialize: (state) => {
        // Exclude non-serialisable functions and derived getters
        const excluded = new Set([
          'setTheme', 'toggleSidebar', 'toggleAISidebar',
          'setProviderKey', 'getProviderKey',
          'setActiveProvider',
          'setProviderModel', 'getProviderModel',
          'addCustomProvider', 'updateCustomProvider', 'removeCustomProvider', 'getCustomProvider',
          'setPluginSetting', 'getPluginSetting', 'setInstalledCommunityPlugins',
          'getActiveApiKey', 'isActiveProviderConfigured', 'getConfiguredProviders',
          'syncSettings', 'saveSettings',
          'aiProvider', 'aiApiKey',
        ]);
        return Object.fromEntries(
          Object.entries(state).filter(([key]) => !excluded.has(key))
        );
      },
      migrate: (persisted: any, version: number) => {
        // v0 → v1: flat aiProvider / aiApiKey
        if (version === 0 && persisted?.aiProvider && persisted?.aiApiKey) {
          const provider = persisted.aiProvider as BuiltinProvider;
          return {
            ...persisted,
            activeProvider: provider,
            providerKeys: { [provider]: persisted.aiApiKey },
          };
        }
        // v1 → v2 (noteroot-settings-v2): providerKeys were missing, nothing to do
        // v2 → v3 (noteroot-settings-v3): providerKeys now included, keep as-is
        return persisted;
      },
      version: 3,
    }
  )
);
