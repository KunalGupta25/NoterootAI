import { useSettingsStore } from '../stores/settingsStore';
import { isBuiltinProvider } from '../lib/providerConfig';
import { AI_URL } from '../lib/constants';
import type { Note } from '../stores/noteStore';

const EMBED_DEBOUNCE_MS = 1200;
const pendingEmbeds = new Map<string, number>();

export async function embedNoteInBackground(note: Note) {
  window.clearTimeout(pendingEmbeds.get(note._id));
  pendingEmbeds.set(
    note._id,
    window.setTimeout(() => {
      pendingEmbeds.delete(note._id);
      void sendEmbedRequest(note);
    }, EMBED_DEBOUNCE_MS)
  );
}

async function sendEmbedRequest(note: Note) {
  const state = useSettingsStore.getState();
  const { activeProvider, providerKeys, customProviders } = state;

  // Get credentials for active provider
  let apiKey = '';
  let customBaseUrl: string | undefined;
  let providerName = activeProvider;

  if (isBuiltinProvider(activeProvider)) {
    apiKey = providerKeys[activeProvider] ?? '';
  } else {
    const custom = customProviders.find((c) => c.id === activeProvider);
    apiKey = custom?.apiKey ?? '';
    customBaseUrl = custom?.baseUrl;
    providerName = 'custom';
  }

  if (!apiKey && !customBaseUrl) {
    console.log('Skipping AI embed: no API key set');
    return;
  }

  try {
    const res = await fetch(`${AI_URL}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        note_id: note._id,
        title: note.title,
        content: note.content,
        tags: note.tags,
        provider: providerName,
        api_key: apiKey,
        custom_base_url: customBaseUrl,
      }),
    });

    if (!res.ok) {
      console.warn('AI embed failed:', await res.text());
    }
  } catch (err) {
    console.warn('AI service unreachable for embed:', err);
  }
}
