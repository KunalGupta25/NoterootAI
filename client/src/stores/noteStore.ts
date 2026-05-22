import { create } from 'zustand';
import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';
import { SYNC_URL } from '../lib/constants';
import { useAuthStore } from './authStore';

export type SyncStatus = 'idle' | 'saving_locally' | 'saved_locally' | 'syncing' | 'synced_to_cloud' | 'offline';

export interface Note {
  _id: string;
  title: string;
  content: string;
  tags: string[];
  parentId: string | null;
  icon: string;
  properties: Record<string, string>;
  updatedAt: number;
  createdAt: number;
  synced: boolean;
}

export interface NoteTreeNode extends Note {
  children: NoteTreeNode[];
}

interface NoteStore {
  notes: Note[];
  syncStatus: SyncStatus;
  initDB: () => Promise<void>;
  saveNote: (note: Partial<Note>) => Promise<string>;
  getNote: (id: string) => Promise<Note | undefined>;
  deleteNote: (id: string) => Promise<void>;
  getChildren: (parentId: string) => Note[];
  getTree: () => NoteTreeNode[];
  syncWithCloud: () => Promise<void>;
  retrySync: () => Promise<void>;
  resetLocalState: () => void;
}

function buildTree(notes: Note[], parentId: string | null): NoteTreeNode[] {
  return notes
    .filter(n => n.parentId === parentId)
    .sort((a, b) => a.title.localeCompare(b.title))
    .map(n => ({
      ...n,
      children: buildTree(notes, n._id),
    }));
}

function vaultKey(noteId: string) {
  const userId = useAuthStore.getState().user?.id || 'guest';
  return `note_${userId}_${noteId}`;
}

function vaultPrefix() {
  const userId = useAuthStore.getState().user?.id || 'guest';
  return `note_${userId}_`;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  syncStatus: 'idle',

  initDB: async () => {
    const auth = useAuthStore.getState();
    localforage.config({ name: 'NoteRoot', storeName: 'vault' });

    const keys = await localforage.keys();
    const loadedNotes: Note[] = [];
    const prefix = vaultPrefix();
    const legacyKeys: string[] = [];
    for (const key of keys) {
      const isLegacyKey = auth.token && /^note_[0-9a-f-]{36}$/i.test(key);
      if (key.startsWith(prefix) || isLegacyKey) {
        const note = await localforage.getItem<Note>(key);
        if (note) {
          // Migrate old notes
          if (note.parentId === undefined) note.parentId = null;
          if (!note.icon) note.icon = '📄';
          if (!note.properties) note.properties = {};
          if (!note.tags) note.tags = [];
          if (!note.createdAt) note.createdAt = note.updatedAt;
          loadedNotes.push(note);
          if (isLegacyKey) {
            legacyKeys.push(key);
            await localforage.setItem(vaultKey(note._id), { ...note, synced: false });
          }
        }
      }
    }

    for (const key of legacyKeys) {
      await localforage.removeItem(key);
    }

    loadedNotes.sort((a, b) => b.updatedAt - a.updatedAt);
    set({ notes: loadedNotes });

    if (auth.token) {
      try {
        const res = await fetch(`${SYNC_URL}/api/notes`, {
          headers: auth.authHeaders(),
        });
        if (res.ok) {
          const remoteNotes = await res.json() as Note[];
          const merged = new Map<string, Note>();
          
          const remoteIds = new Set(remoteNotes.map(n => n._id));

          loadedNotes.forEach(note => {
            // If note is new/offline (not synced) or still exists on server, keep it
            if (!note.synced || remoteIds.has(note._id)) {
              merged.set(note._id, note);
            } else {
              // Note was synced but is missing from server -> it was deleted remotely
              localforage.removeItem(vaultKey(note._id)).catch(console.warn);
            }
          });

          remoteNotes.forEach(note => {
            const local = merged.get(note._id);
            if (!local || Number(new Date(note.updatedAt).getTime()) > Number(local.updatedAt)) {
              merged.set(note._id, {
                ...note,
                updatedAt: Number(new Date(note.updatedAt).getTime()) || Date.now(),
                createdAt: Number(new Date(note.createdAt).getTime()) || Date.now(),
                synced: true,
              });
            }
          });
          const mergedNotes = Array.from(merged.values()).sort((a, b) => b.updatedAt - a.updatedAt);
          for (const note of mergedNotes) {
            await localforage.setItem(vaultKey(note._id), note);
          }
          set({ notes: mergedNotes });
        }
      } catch (error) {
        console.warn('Could not load cloud notes:', error);
      }
    }

    // Sync in background, don't block UI
    setTimeout(() => get().syncWithCloud(), 2000);
  },

  saveNote: async (noteData: Partial<Note>) => {
    set({ syncStatus: 'saving_locally' });

    const isNew = !noteData._id;
    const _id = noteData._id || uuidv4();

    // Read current from localforage for merge (existing note data)
    const currentNote = isNew ? null : await localforage.getItem<Note>(vaultKey(_id));

    const note: Note = {
      _id,
      title: noteData.title ?? currentNote?.title ?? 'Untitled',
      content: noteData.content ?? currentNote?.content ?? '',
      tags: noteData.tags ?? currentNote?.tags ?? [],
      parentId: noteData.parentId !== undefined ? noteData.parentId : (currentNote?.parentId ?? null),
      icon: noteData.icon ?? currentNote?.icon ?? '📄',
      properties: noteData.properties ?? currentNote?.properties ?? {},
      updatedAt: Date.now(),
      createdAt: currentNote?.createdAt ?? Date.now(),
      synced: false,
    };

    // Persist to IndexedDB
    await localforage.setItem(vaultKey(_id), note);

    // Update in-memory store atomically — no reload from disk
    set(state => {
      const idx = state.notes.findIndex(n => n._id === _id);
      let newNotes: Note[];
      if (idx >= 0) {
        newNotes = [...state.notes];
        newNotes[idx] = note;
      } else {
        newNotes = [note, ...state.notes];
      }
      newNotes.sort((a, b) => b.updatedAt - a.updatedAt);
      return { notes: newNotes, syncStatus: 'saved_locally' };
    });

    // Background sync to cloud
    get().syncWithCloud();
    
    // Background async embedding to AI service
    import('../services/aiService').then(({ embedNoteInBackground }) => {
      embedNoteInBackground(note).catch(console.error);
    });

    return _id;
  },

  getNote: async (id: string) => {
    if (!id) return undefined;
    const idLower = id.toLowerCase();
    
    // Try in-memory first for speed (case-insensitive ID)
    let inMemory = get().notes.find(n => n._id.toLowerCase() === idLower);
    if (inMemory) return inMemory;
    
    // Fallback: try case-insensitive Title match
    inMemory = get().notes.find(n => n.title.toLowerCase() === idLower);
    if (inMemory) return inMemory;

    return (await localforage.getItem<Note>(vaultKey(id))) || undefined;
  },

  deleteNote: async (id: string) => {
    const targetNote = await get().getNote(id);
    if (!targetNote) return;
    const actualId = targetNote._id;

    const allNotes = get().notes;
    const toDelete = [actualId];

    function collectChildren(parentId: string) {
      allNotes.filter(n => n.parentId === parentId).forEach(child => {
        toDelete.push(child._id);
        collectChildren(child._id);
      });
    }
    collectChildren(actualId);

    // Sync delete to server
    try {
      for (const noteId of toDelete) {
        await fetch(`${SYNC_URL}/api/notes/${noteId}`, {
          method: 'DELETE',
          headers: useAuthStore.getState().authHeaders(),
        }).then((res) => {
          if (!res.ok && res.status !== 404) throw new Error(`Delete failed with ${res.status}`);
        });
      }
    } catch (e) {
      console.warn('Failed to sync delete to server:', e);
    }

    // Delete from IndexedDB
    for (const noteId of toDelete) {
      await localforage.removeItem(vaultKey(noteId));
    }

    // Update in-memory
    set({ notes: allNotes.filter(n => !toDelete.includes(n._id)) });
  },

  getChildren: (parentId: string) => {
    return get().notes.filter(n => n.parentId === parentId);
  },

  getTree: () => {
    return buildTree(get().notes, null);
  },

  syncWithCloud: async () => {
    const auth = useAuthStore.getState();
    if (!auth.token) {
      set({ syncStatus: 'offline' });
      return;
    }

    const { notes } = get();
    const unsyncedNotes = notes.filter(n => !n.synced);

    if (unsyncedNotes.length === 0) {
      set({ syncStatus: 'synced_to_cloud' });
      return;
    }

    set({ syncStatus: 'syncing' });

    try {
      const syncedIds: string[] = [];

      for (const note of unsyncedNotes) {
        await fetch(`${SYNC_URL}/api/notes/${note._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...auth.authHeaders() },
          body: JSON.stringify(note),
        }).then((res) => {
          if (!res.ok) throw new Error(`Sync failed with ${res.status}`);
        });
        // Update localforage only
        await localforage.setItem(vaultKey(note._id), { ...note, synced: true });
        syncedIds.push(note._id);
      }

      // Mark synced in-memory without reloading from disk
      set(state => ({
        notes: state.notes.map(n =>
          syncedIds.includes(n._id) ? { ...n, synced: true } : n
        ),
        syncStatus: 'synced_to_cloud',
      }));

    } catch (error) {
      console.warn('Sync failed (offline?)', error);
      set({ syncStatus: 'offline' });
    }
  },

  retrySync: async () => {
    get().syncWithCloud();
  },

  resetLocalState: () => {
    set({ notes: [], syncStatus: 'idle' });
  },
}));
