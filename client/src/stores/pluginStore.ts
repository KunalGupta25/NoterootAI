import { create } from 'zustand';
import localforage from 'localforage';
import PluginRuntime from '../plugins/runtime/PluginRuntime';

export interface InstalledPlugin {
  id: string;
  source: 'builtin' | 'community';
  enabled: boolean;
  code?: string; // Community plugin source code
  url?: string; // Original URL
  readme?: string; // Saved README markdown
}

interface PluginStore {
  plugins: InstalledPlugin[];
  isLoaded: boolean;
  initPlugins: () => Promise<void>;
  installPlugin: (plugin: InstalledPlugin) => Promise<void>;
  togglePlugin: (id: string, enabled: boolean) => Promise<void>;
  removePlugin: (id: string) => Promise<void>;
}

export const usePluginStore = create<PluginStore>((set, get) => ({
  plugins: [],
  isLoaded: false,

  initPlugins: async () => {
    localforage.config({ name: 'NoteRoot', storeName: 'vault' });
    const saved = await localforage.getItem<InstalledPlugin[]>('installed_plugins');
    
    // Builtin plugins don't need code stored here, they are loaded via App/PluginRuntime directly
    // but their enabled/disabled state is tracked here.
    let pluginsToLoad: InstalledPlugin[] = saved || [];

    // Ensure built-in plugins exist in state
    const builtins = ['core-markdown-importer', 'core-zip-importer', 'core-tab-manager', 'core-note-downloader'];
    for (const bId of builtins) {
      if (!pluginsToLoad.find(p => p.id === bId)) {
        pluginsToLoad.push({ id: bId, source: 'builtin', enabled: true });
      }
    }

    await localforage.setItem('installed_plugins', pluginsToLoad);
    set({ plugins: pluginsToLoad });
    set({ isLoaded: true });
    
    // Defer PluginRuntime execution to App.tsx since it might depend on builtins being registered
  },

  installPlugin: async (plugin) => {
    const newPlugins = [...get().plugins.filter(p => p.id !== plugin.id), plugin];
    set({ plugins: newPlugins });
    await localforage.setItem('installed_plugins', newPlugins);
    if (plugin.enabled) {
      // Execute newly installed
      await PluginRuntime.executePlugin(plugin);
    }
  },

  togglePlugin: async (id, enabled) => {
    const newPlugins = get().plugins.map(p => p.id === id ? { ...p, enabled } : p);
    set({ plugins: newPlugins });
    await localforage.setItem('installed_plugins', newPlugins);
    
    if (enabled) {
      const plugin = newPlugins.find(p => p.id === id);
      if (plugin) {
         if (plugin.source === 'builtin') {
           // We can't execute builtin here easily as its code isn't in state.
           // It's better handled by App.tsx reloading or dynamic importing.
           // For now, reloading the page is the safest way to re-init builtin plugins
           window.location.reload();
         } else {
           PluginRuntime.executePlugin(plugin);
         }
      }
    } else {
      PluginRuntime.disablePlugin(id);
    }
  },

  removePlugin: async (id) => {
    const plugin = get().plugins.find(p => p.id === id);
    if (plugin?.source === 'builtin') return; // Cannot remove builtin

    const newPlugins = get().plugins.filter(p => p.id !== id);
    set({ plugins: newPlugins });
    await localforage.setItem('installed_plugins', newPlugins);
    PluginRuntime.disablePlugin(id);
  }
}));
