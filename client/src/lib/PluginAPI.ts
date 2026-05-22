export interface NoteRootPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
}

export interface PluginAPI {
  // Methods exposed to plugins via postMessage bridge
  notes: {
    createNote: (title: string, content?: string) => Promise<string>;
    updateNote: (id: string, updates: Record<string, any>) => Promise<void>;
    getNote: (id: string) => Promise<any>;
    appendContent: (id: string, markdown: string) => Promise<void>;
  };
  ui: {
    // Allows plugins to request UI additions (handled securely by the host)
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  };
}

export type PluginMessage =
  | { type: 'API_REQUEST'; callId: string; namespace: keyof PluginAPI; method: string; args: any[] }
  | { type: 'API_RESPONSE'; callId: string; result?: any; error?: string }
  | { type: 'INIT_PLUGIN'; config: Record<string, any> };
