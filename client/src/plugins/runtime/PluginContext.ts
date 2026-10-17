import type { ExtensionPoint } from './ExtensionPoints';
import { useNoteStore } from '../../stores/noteStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { ThemeEngine } from './ThemeEngine';
import PluginRuntime from './PluginRuntime';
import { useAuthStore } from '../../stores/authStore';
import { AI_URL } from '../../lib/constants';
import { isBuiltinProvider } from '../../lib/providerConfig';

// ── Google Identity Services (loaded on demand, memoised) ─────────────────────
// Plugins never get window/document, so sign-in popups are brokered by the host.
const ALLOWED_GOOGLE_SCOPES = new Set([
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]);

let gisLoader: Promise<void> | null = null;
function loadGoogleIdentity(): Promise<void> {
  const w = window as any;
  if (w.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoader) return gisLoader;
  gisLoader = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisLoader = null;
      reject(new Error('Could not load Google sign-in (blocked by the network or an ad blocker?).'));
    };
    document.head.appendChild(script);
  });
  return gisLoader;
}

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
    },
    /** Register cleanup (clear timers, unsubscribe). Runs when the plugin is re-run or disabled. */
    onDispose: (fn: () => void) => {
      if (typeof fn === 'function') PluginRuntime.registerDisposer(this.pluginId, fn);
    }
  };

  // Auth brokering (OAuth popups need window/document, which plugins do not get)
  public auth = {
    /** Pre-load Google Identity Services so a later sign-in popup is not blocked. */
    preloadGoogle: async () => {
      try { await loadGoogleIdentity(); } catch { /* surfaced on real sign-in */ }
    },
    /**
     * Requests a short-lived Google OAuth access token (token model, no refresh token).
     * Only an allow-list of scopes can be requested.
     */
    requestGoogleToken: async (opts: {
      clientId: string;
      scopes: string[];
      prompt?: '' | 'none' | 'consent' | 'select_account';
      hint?: string;
      timeoutMs?: number;
    }): Promise<{ accessToken: string; expiresIn: number; scope: string }> => {
      if (!opts?.clientId) throw new Error('A Google OAuth Client ID is required.');
      const scopes = Array.isArray(opts.scopes) ? opts.scopes : [];
      if (scopes.length === 0 || !scopes.every(s => ALLOWED_GOOGLE_SCOPES.has(s))) {
        throw new Error('Requested Google scope is not allowed for plugins.');
      }
      await loadGoogleIdentity();
      const g = (window as any).google;
      return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Google sign-in timed out.')), opts.timeoutMs ?? 120000);
        try {
          const client = g.accounts.oauth2.initTokenClient({
            client_id: opts.clientId,
            scope: scopes.join(' '),
            prompt: opts.prompt ?? '',
            hint: opts.hint || undefined,
            callback: (resp: any) => {
              clearTimeout(timer);
              if (resp?.error) reject(new Error(resp.error_description || resp.error));
              else resolve({
                accessToken: resp.access_token,
                expiresIn: Number(resp.expires_in) || 3600,
                scope: resp.scope || ''
              });
            },
            error_callback: (err: any) => {
              clearTimeout(timer);
              reject(new Error(err?.message || err?.type || 'Google sign-in was cancelled.'));
            }
          });
          client.requestAccessToken();
        } catch (e) {
          clearTimeout(timer);
          reject(e);
        }
      });
    }
  };

  // Notes API
  public notes = {
    createNote: async (title: string, markdown: string, space: string = 'Other', tags: string[] = []) => {
      const { marked } = await import('marked');
      const html = markdown ? await marked.parse(markdown) : '';
      return await useNoteStore.getState().saveNote({
        title,
        content: html,
        space: space || 'Other',
        tags: tags || []
      });
    },
    updateNote: async (id: string, updates: any) => {
      const store = useNoteStore.getState();
      const existing = await store.getNote(id);
      if (!existing) throw new Error(`Note ${id} not found`);
      return await store.saveNote({ ...existing, ...updates });
    },
    getNote: async (id: string) => {
      const note = await useNoteStore.getState().getNote(id);
      if (note && !note.space) {
        note.space = 'Other';
      }
      return note;
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
        space: n.space || 'Other',
        tags: n.tags || [],
        parentId: n.parentId,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt
      }));
    },
    listSpaces: async () => {
      const set = new Set<string>(['Other']);
      useNoteStore.getState().notes.forEach(n => {
        if (n.space) set.add(n.space);
      });
      return Array.from(set).sort();
    },
    moveNoteToSpace: async (id: string, space: string) => {
      const store = useNoteStore.getState();
      const existing = await store.getNote(id);
      if (!existing) throw new Error(`Note ${id} not found`);
      return await store.saveNote({ ...existing, space: space || 'Other' });
    },
    deleteNote: async (id: string) => {
      await useNoteStore.getState().deleteNote(id);
      return true;
    },
    /**
     * Imports a note verbatim (HTML content, original id/parent/created time).
     * Creates it if the id is unknown, otherwise overwrites that note.
     */
    importNote: async (note: {
      id: string;
      title?: string;
      content?: string;
      space?: string;
      tags?: string[];
      parentId?: string | null;
      icon?: string;
      properties?: Record<string, string>;
      createdAt?: number;
      updatedAt?: number;
    }) => {
      if (!note || typeof note.id !== 'string' || !note.id) throw new Error('importNote requires a note id');
      return await useNoteStore.getState().saveNote({
        _id: note.id,
        title: note.title ?? 'Untitled',
        content: note.content ?? '',
        space: note.space || 'Other',
        tags: note.tags ?? [],
        parentId: note.parentId ?? null,
        icon: note.icon,
        properties: note.properties,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      }, { preserveTimestamps: true });
    }
  };

  // UI APIs
  public ui = {
    showToast: (message: string, type: 'success' | 'error' = 'success') => {
      window.dispatchEvent(new CustomEvent('PLUGIN_TOAST', { detail: { message, type } }));
    },
    openModal: (modalId: string) => {
      window.dispatchEvent(new CustomEvent('OPEN_PLUGIN_MODAL', { detail: { modalId } }));
    },
    openUrl: (url: string) => {
      if (!/^https?:\/\//i.test(String(url))) return; // never open javascript:/data: URLs for plugins
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    /** Ask the settings panel to re-render (plugin-held UI state changed). */
    requestRender: () => {
      window.dispatchEvent(new CustomEvent('PLUGIN_RERENDER'));
    }
  };

  // User
  public user = {
    getCurrentUser: () => {
      const u = useAuthStore.getState().user;
      return u ? { id: u.id, email: u.email, name: u.name } : null;
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
      const isBuiltin = isBuiltinProvider(activeProvider);
      
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
