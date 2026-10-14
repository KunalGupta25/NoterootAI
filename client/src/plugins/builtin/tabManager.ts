import { createRestrictedContext } from '../runtime/PluginContext';

interface TabItem {
  id: string;
  title: string;
  space?: string;
}

const STORAGE_KEY = 'noteroot_open_tabs';

function loadStoredTabs(): TabItem[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistTabs(tabs: TabItem[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  } catch {}
}

let openTabs: TabItem[] = loadStoredTabs();
let activeTabId = '';
let unsubscribeEvent: (() => void) | null = null;

export function tabManagerPlugin() {
  const ctx = createRestrictedContext('core-tab-manager');
  const { runtime, notes } = ctx;

  const updateTabs = () => {
    runtime.registerExtension('header.tabs', {
      id: 'tab-bar-container',
      render: () => {
        if (openTabs.length === 0) return { type: 'Empty' };
        return {
          type: 'TabBar',
          children: openTabs.map(tab => ({
            type: 'Tab',
            active: tab.id === activeTabId,
            label: tab.space && tab.space !== 'Other' ? `${tab.title} (${tab.space})` : tab.title,
            onClick: () => {
              if (activeTabId === tab.id) return;
              activeTabId = tab.id;
              updateTabs();
              window.history.pushState({}, '', `/notes/${tab.id}`);
              window.dispatchEvent(new PopStateEvent('popstate'));
            },
            onClose: () => {
              const idx = openTabs.findIndex(t => t.id === tab.id);
              if (idx > -1) {
                openTabs.splice(idx, 1);
                persistTabs(openTabs);
                if (activeTabId === tab.id) {
                  if (openTabs.length > 0) {
                    const nextTab = openTabs[Math.max(0, idx - 1)];
                    activeTabId = nextTab.id;
                    updateTabs();
                    window.history.pushState({}, '', `/notes/${nextTab.id}`);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  } else {
                    activeTabId = '';
                    updateTabs();
                    window.history.pushState({}, '', `/notes`);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                } else {
                  updateTabs();
                }
              }
            }
          }))
        };
      }
    });
  };

  // Check initial route to hydrate tab
  const pathname = window.location.pathname;
  const match = pathname.match(/^\/notes\/([^/]+)$/);
  if (match && match[1] && match[1] !== 'new') {
    const currentId = match[1];
    activeTabId = currentId;
    notes.getNote(currentId).then(note => {
      if (note && !openTabs.find(t => t.id === currentId)) {
        openTabs.push({ id: currentId, title: note.title || 'Untitled', space: note.space || 'Other' });
        persistTabs(openTabs);
        updateTabs();
      }
    });
  }

  updateTabs();

  // Cleanup old listener if this is a hot-reload or re-initialization
  if (unsubscribeEvent) {
    unsubscribeEvent();
  }

  // Automatically add/activate tabs when a note is opened
  unsubscribeEvent = ctx.events.onNoteOpened(async (noteId: string) => {
    activeTabId = noteId;
    const existing = openTabs.find(t => t.id === noteId);
    if (!existing) {
      const note = await notes.getNote(noteId);
      if (note && !openTabs.find(t => t.id === noteId)) {
        openTabs.push({
          id: noteId,
          title: note.title || 'Untitled',
          space: note.space || 'Other'
        });
        persistTabs(openTabs);
      }
    }
    updateTabs();
  });
}

