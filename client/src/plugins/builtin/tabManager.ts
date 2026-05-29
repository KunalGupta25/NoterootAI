import { createRestrictedContext } from '../runtime/PluginContext';

const openTabs: { id: string, title: string }[] = [];
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
          label: tab.title,
          onClick: () => {
            window.history.pushState({}, '', `/notes/${tab.id}`);
            window.dispatchEvent(new Event('popstate'));
          },
          onClose: () => {
            const idx = openTabs.findIndex(t => t.id === tab.id);
            if (idx > -1) {
              openTabs.splice(idx, 1);
              if (activeTabId === tab.id) {
                if (openTabs.length > 0) {
                  const nextTab = openTabs[Math.max(0, idx - 1)];
                  window.history.pushState({}, '', `/notes/${nextTab.id}`);
                  window.dispatchEvent(new Event('popstate'));
                } else {
                  window.history.pushState({}, '', `/`);
                  window.dispatchEvent(new Event('popstate'));
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

  updateTabs();

  // Cleanup old listener if this is a hot-reload or re-initialization
  if (unsubscribeEvent) {
    unsubscribeEvent();
  }

  // Automatically add tabs when a note is opened
  unsubscribeEvent = ctx.events.onNoteOpened(async (noteId: string) => {
    activeTabId = noteId;
    // Fast check
    const existing = openTabs.find(t => t.id === noteId);
    if (!existing) {
      const note = await notes.getNote(noteId);
      // Double check after async yield to prevent race conditions
      if (note && !openTabs.find(t => t.id === noteId)) {
        openTabs.push({ id: noteId, title: note.title || 'Untitled' });
      }
    }
    updateTabs();
  });
}
