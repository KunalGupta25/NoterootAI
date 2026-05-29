import type { ExtensionPoint } from './ExtensionPoints';
import { useNoteStore } from '../../stores/noteStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { ThemeEngine } from './ThemeEngine';
import PluginRuntime from './PluginRuntime';
import { AI_URL } from '../../lib/constants';

/**
 * The safe API injected into plugins.
 * Exposes core capabilities without allowing window/DOM access.
 */
export class PluginContext {
  private pluginId: string;

  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }

  // Runtime
  public runtime = {
    registerExtension: (point: ExtensionPoint, descriptor: any) => {
      PluginRuntime.registerExtension(this.pluginId, point, descriptor);
    }
  };

  // Notes API
  public notes = {
    createNote: async (title: string, markdown: string) => {
      const { marked } = await import('marked');
      const html = markdown ? await marked.parse(markdown) : '';
      return await useNoteStore.getState().saveNote({ title, content: html });
    },
    updateNote: async (id: string, updates: any) => {
      const store = useNoteStore.getState();
      const existing = await store.getNote(id);
      if (!existing) throw new Error(`Note ${id} not found`);
      return await store.saveNote({ ...existing, ...updates });
    },
    getNote: async (id: string) => {
      return await useNoteStore.getState().getNote(id);
    },
    appendContent: async (id: string, markdown: string) => {
      const store = useNoteStore.getState();
      const existing = await store.getNote(id);
      if (!existing) throw new Error(`Note ${id} not found`);
      const { marked } = await import('marked');
      const html = await marked.parse(markdown);
      const newContent = existing.content ? `${existing.content}\n${html}` : html;
      return await store.saveNote({ ...existing, content: newContent });
    },
    replaceContent: async (id: string, markdown: string) => {
      const store = useNoteStore.getState();
      const existing = await store.getNote(id);
      if (!existing) throw new Error(`Note ${id} not found`);
      const { marked } = await import('marked');
      const html = markdown ? await marked.parse(markdown) : '';
      return await store.saveNote({ ...existing, content: html });
    },
    listAllNotes: async () => {
      return useNoteStore.getState().notes.map(n => ({
        id: n._id,
        title: n.title,
        tags: n.tags,
        parentId: n.parentId,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt
      }));
    },
    deleteNote: async (id: string) => {
      await useNoteStore.getState().deleteNote(id);
      return true;
    }
  };

  // UI APIs
  public ui = {
    showToast: (message: string, type: 'success' | 'error' = 'success') => {
      window.dispatchEvent(new CustomEvent('PLUGIN_TOAST', { detail: { message, type } }));
    },
    openModal: (modalId: string) => {
      window.dispatchEvent(new CustomEvent('OPEN_PLUGIN_MODAL', { detail: { modalId } }));
    }
  };

  // Settings
  public settings = {
    get: (key: string) => {
      // In a real implementation this might proxy to settingsStore.getPluginSetting(pluginId, key)
      const allPluginSettings = useSettingsStore.getState().pluginSettings || {};
      const mySettings = allPluginSettings[this.pluginId] || {};
      return mySettings[key];
    },
    set: (key: string, value: any) => {
      const store = useSettingsStore.getState();
      // Assume a setPluginSetting exists or we mock it here temporarily
      if ((store as any).setPluginSetting) {
        (store as any).setPluginSetting(this.pluginId, key, value);
      } else {
        // Temporary manual update until store is updated
        const current = store.pluginSettings || {};
        const mySettings = current[this.pluginId] || {};
        useSettingsStore.setState({
          pluginSettings: { ...current, [this.pluginId]: { ...mySettings, [key]: value } }
        });
      }
    }
  };

  // Theme
  public theme = {
    setTokens: (tokens: Record<string, string>) => {
      ThemeEngine.applyTokens(this.pluginId, tokens);
    }
  };

  // AI
  public ai = {
    chat: async (prompt: string, contextNoteId?: string) => {
      const settingsStore = useSettingsStore.getState();
      const activeProvider = settingsStore.activeProvider;
      
      let apiKey = '';
      let customBaseUrl = undefined;
      const isBuiltin = ['openai', 'anthropic', 'gemini', 'mistral', 'groq'].includes(activeProvider);
      
      if (isBuiltin) {
        apiKey = (settingsStore.providerKeys as any)[activeProvider] || '';
      } else {
        const custom = settingsStore.customProviders.find((c: any) => c.id === activeProvider);
        if (custom) {
          apiKey = custom.apiKey;
          customBaseUrl = custom.baseUrl;
        }
      }
      
      if (!apiKey && !customBaseUrl) throw new Error('No AI provider configured in settings.');
      
      const res = await fetch(`${AI_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          provider: isBuiltin ? activeProvider : 'custom',
          model: settingsStore.getProviderModel(activeProvider),
          api_key: apiKey,
          custom_base_url: customBaseUrl,
          context_note_id: contextNoteId,
          use_vault: false
        })
      });
      
      if (!res.ok) throw new Error('AI generation failed');
      
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');
      
      const decoder = new TextDecoder();
      let fullContent = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        fullContent += decoder.decode(value, { stream: true });
      }
      return fullContent;
    }
  };

  // Events
  public events = {
    onNoteOpened: (callback: (noteId: string) => void) => {
      const listener = (e: any) => callback(e.detail.noteId);
      window.addEventListener('NOTEROOT_NOTE_OPENED', listener);
      return () => window.removeEventListener('NOTEROOT_NOTE_OPENED', listener);
    }
  };
}

/**
 * Creates a restricted context object that exposes ONLY what plugins need.
 */
export function createRestrictedContext(pluginId: string) {
  const ctx = new PluginContext(pluginId);
  
  // Use a proxy to completely freeze and isolate the context
  return new Proxy(ctx, {
    get(target, prop) {
      // Prevent access to standard global names if they somehow try to traverse
      if (prop === 'window' || prop === 'document' || prop === 'globalThis') return undefined;
      return (target as any)[prop];
    },
    set() {
      throw new Error('PluginContext is read-only');
    }
  });
}
