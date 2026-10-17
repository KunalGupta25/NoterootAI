import { create } from 'zustand';
import localforage from 'localforage';
import PluginRuntime from '../plugins/runtime/PluginRuntime';
import { useSettingsStore } from './settingsStore';
import { DRIVE_CONNECTOR_CODE } from '../plugins/custom/driveConnectorCode';
import { parsePluginMeta } from '../plugins/runtime/pluginMeta';

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
  installFromUrl: (url: string) => Promise<void>;
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

    // Deduplicate any multiple drive-connector plugins in storage (e.g. 'plugin' from plugin.js and 'drive-connector')
    const seenPluginIds = new Set<string>();
    let hasDriveConnector = false;
    const idRenames: Array<[string, string]> = [];
    pluginsToLoad = pluginsToLoad.filter(p => {
      const isDrive = p.id === 'drive-connector' || p.id === 'plugin-drive-connector' || (p.id === 'plugin' && (p.readme?.includes('Drive') || p.code?.includes('Drive Connector')));
      if (isDrive) {
        if (hasDriveConnector) return false;
        hasDriveConnector = true;
        if (p.id !== 'drive-connector') {
          idRenames.push([p.id, 'drive-connector']);
          p.id = 'drive-connector';
        }
      }
      if (seenPluginIds.has(p.id)) return false;
      seenPluginIds.add(p.id);
      return true;
    });

    // Migrate plugin settings saved under a legacy id (e.g. 'plugin' from .js uploads)
    if (idRenames.length > 0) {
      const pluginSettings = { ...(useSettingsStore.getState().pluginSettings || {}) };
      let changed = false;
      for (const [from, to] of idRenames) {
        if (pluginSettings[from]) {
          if (!pluginSettings[to]) pluginSettings[to] = pluginSettings[from];
          delete pluginSettings[from];
          changed = true;
        }
      }
      if (changed) useSettingsStore.setState({ pluginSettings });
    }

    // Auto-repair any drive-connector entry that was saved with empty or missing code
    pluginsToLoad = pluginsToLoad.map(p => {
      if ((p.id === 'drive-connector' || p.id.includes('drive-connector')) && (!p.code || p.code.trim() === '')) {
        return {
          ...p,
          code: DRIVE_CONNECTOR_CODE,
          enabled: true,
          readme: p.readme || 'Connect your Google Drive to automatically create backups for all your notes.'
        };
      }
      return p;
    });

    await localforage.setItem('installed_plugins', pluginsToLoad);
    set({ plugins: pluginsToLoad });
    set({ isLoaded: true });
    
    // Defer PluginRuntime execution to App.tsx since it might depend on builtins being registered
  },

  installPlugin: async (plugin) => {
    if ((plugin.id === 'drive-connector' || plugin.id.includes('drive-connector')) && (!plugin.code || plugin.code.trim() === '')) {
      plugin.code = DRIVE_CONNECTOR_CODE;
    }
    const newPlugins = [...get().plugins.filter(p => p.id !== plugin.id), plugin];
    set({ plugins: newPlugins });
    await localforage.setItem('installed_plugins', newPlugins);
    
    // Sync URLs
    if (plugin.url) {
      const urls = newPlugins.filter(p => p.source === 'community' && p.url).map(p => p.url!);
      useSettingsStore.getState().setInstalledCommunityPlugins(urls);
    }

    if (plugin.enabled) {
      // Execute newly installed
      await PluginRuntime.executePlugin(plugin);
    }
  },

  installFromUrl: async (url: string) => {
    let owner: string; let repo: string;
    const branch = 'main';
    if (url.includes('github.com')) {
      const parts = url.replace('https://github.com/', '').split('/');
      owner = parts[0]; repo = parts[1];
    } else {
      throw new Error('Only GitHub plugin URLs are supported.');
    }

    const readmeRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`);
    const codeRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/plugin.js`);
    if (!readmeRes.ok || !codeRes.ok) {
      throw new Error(`Could not fetch plugin files from ${owner}/${repo} (README ${readmeRes.status}, plugin.js ${codeRes.status}).`);
    }

    const readmeText = await readmeRes.text();
    const codeText = await codeRes.text();

    let name = repo;
    const match = readmeText.match(/^---\n([\s\S]+?)\n---/);
    if (match) {
      match[1].split('\n').forEach(line => {
        const [key, ...rest] = line.split(':');
        if (key.trim() === 'name') name = rest.join(':').trim().replace(/^['"]|['"]$/g, '');
      });
    }
    // The source's @noteroot-plugin header is authoritative over the README name
    const meta = parsePluginMeta(codeText);
    const id = meta.id || `plugin-${name.replace(/\s+/g, '-').toLowerCase()}`;
    await get().installPlugin({ id, source: 'community', enabled: true, code: codeText, url, readme: readmeText });
  },

  togglePlugin: async (id, enabled) => {
    const newPlugins = get().plugins.map(p => p.id === id ? { ...p, enabled } : p);
    set({ plugins: newPlugins });
    await localforage.setItem('installed_plugins', newPlugins);
    
    // Always trigger page reload on enable/disable so all extension points, 
    // tab headers, modals, and settings panels synchronize cleanly
    window.location.reload();
  },

  removePlugin: async (id) => {
    const plugin = get().plugins.find(p => p.id === id);
    if (plugin?.source === 'builtin') return; // Cannot remove builtin

    const newPlugins = get().plugins.filter(p => p.id !== id);
    set({ plugins: newPlugins });
    await localforage.setItem('installed_plugins', newPlugins);
    PluginRuntime.disablePlugin(id);

    // Sync URLs
    const urls = newPlugins.filter(p => p.source === 'community' && p.url).map(p => p.url!);
    useSettingsStore.getState().setInstalledCommunityPlugins(urls);

    window.location.reload();
  }
}));
