import { create } from 'zustand';
import localforage from 'localforage';
import type { NoteRootPlugin } from '../lib/PluginAPI';
import { useNoteStore } from './noteStore';

export interface InstalledPlugin extends NoteRootPlugin {
  code: string; // The JS source code of the plugin
  enabled: boolean;
}

interface PluginStore {
  plugins: InstalledPlugin[];
  isLoaded: boolean;
  initPlugins: () => Promise<void>;
  installPlugin: (plugin: InstalledPlugin) => Promise<void>;
  togglePlugin: (id: string, enabled: boolean) => Promise<void>;
  removePlugin: (id: string) => Promise<void>;
  
  // Bridge execution handler called by the IframeSandbox
  handlePluginApiRequest: (namespace: string, method: string, args: any[]) => Promise<any>;
}

export const usePluginStore = create<PluginStore>((set, get) => ({
  plugins: [],
  isLoaded: false,

  initPlugins: async () => {
    localforage.config({ name: 'NoteRoot', storeName: 'vault' });
    const saved = await localforage.getItem<InstalledPlugin[]>('installed_plugins');
    if (saved) {
      set({ plugins: saved });
    }
    set({ isLoaded: true });
  },

  installPlugin: async (plugin) => {
    const newPlugins = [...get().plugins.filter(p => p.id !== plugin.id), plugin];
    set({ plugins: newPlugins });
    await localforage.setItem('installed_plugins', newPlugins);
  },

  togglePlugin: async (id, enabled) => {
    const newPlugins = get().plugins.map(p => p.id === id ? { ...p, enabled } : p);
    set({ plugins: newPlugins });
    await localforage.setItem('installed_plugins', newPlugins);
  },

  removePlugin: async (id) => {
    const newPlugins = get().plugins.filter(p => p.id !== id);
    set({ plugins: newPlugins });
    await localforage.setItem('installed_plugins', newPlugins);
  },

  handlePluginApiRequest: async (namespace, method, args) => {
    const noteStore = useNoteStore.getState();

    if (namespace === 'notes') {
      if (method === 'createNote') {
        const [title, markdown] = args;
        const { marked } = await import('marked');
        const html = markdown ? await marked.parse(markdown) : '';
        return await noteStore.saveNote({ title, content: html });
      }
      if (method === 'updateNote') {
        const [id, updates] = args;
        const existing = await noteStore.getNote(id);
        if (!existing) throw new Error(`Note ${id} not found`);
        return await noteStore.saveNote({ ...existing, ...updates });
      }
      if (method === 'getNote') {
        const [id] = args;
        return await noteStore.getNote(id);
      }
      if (method === 'appendContent') {
        const [id, markdown] = args;
        const existing = await noteStore.getNote(id);
        if (!existing) throw new Error(`Note ${id} not found`);
        const { marked } = await import('marked');
        const html = await marked.parse(markdown);
        const newContent = existing.content ? `${existing.content}\n${html}` : html;
        return await noteStore.saveNote({ ...existing, content: newContent });
      }
      if (method === 'createSubNote') {
        const [parentId, title, markdown] = args;
        const parentNote = await noteStore.getNote(parentId);
        const actualParentId = parentNote ? parentNote._id : parentId;
        const { marked } = await import('marked');
        const html = markdown ? await marked.parse(markdown) : '';
        return await noteStore.saveNote({ parentId: actualParentId, title, content: html });
      }
      if (method === 'replaceContent') {
        const [id, markdown] = args;
        const existing = await noteStore.getNote(id);
        if (!existing) throw new Error(`Note ${id} not found`);
        const { marked } = await import('marked');
        const html = markdown ? await marked.parse(markdown) : '';
        return await noteStore.saveNote({ ...existing, content: html });
      }
      if (method === 'listAllNotes') {
        const notes = noteStore.notes;
        return notes.map(n => ({
          id: n._id,
          title: n.title,
          tags: n.tags,
          parentId: n.parentId,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt
        }));
      }
      if (method === 'deleteNote') {
        const [id] = args;
        await noteStore.deleteNote(id);
        return true;
      }
    }

    if (namespace === 'ui') {
      if (method === 'showToast') {
        const [message] = args;
        // Simple console log for now, could be replaced with a real toast
        console.log(`[Plugin Toast]: ${message}`);
        return true;
      }
    }

    throw new Error(`Unknown plugin API: ${namespace}.${method}`);
  }
}));
