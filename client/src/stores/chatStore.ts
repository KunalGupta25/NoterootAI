import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatConversation {
  id: string;
  title: string;
  provider: string;
  model: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface ChatStore {
  conversations: ChatConversation[];
  activeId: string | null;

  createConversation: (provider: string, model: string) => string;
  setActiveId: (id: string | null) => void;
  getActive: () => ChatConversation | undefined;
  addMessage: (id: string, message: ChatMessage) => void;
  updateLastMessage: (id: string, content: string) => void;
  clearConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  clearAll: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeId: null,

      createConversation: (provider, model) => {
        const id = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const convo: ChatConversation = {
          id,
          title: 'New Conversation',
          provider,
          model,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({ conversations: [convo, ...s.conversations], activeId: id }));
        return id;
      },

      setActiveId: (id) => set({ activeId: id }),

      getActive: () => {
        const { conversations, activeId } = get();
        return conversations.find((c) => c.id === activeId);
      },

      addMessage: (id, message) =>
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== id) return c;
            const messages = [...c.messages, message];
            // Auto-set title from first user message
            const title =
              c.messages.length === 0 && message.role === 'user'
                ? message.content.slice(0, 60) + (message.content.length > 60 ? '…' : '')
                : c.title;
            return { ...c, messages, title, updatedAt: Date.now() };
          }),
        })),

      updateLastMessage: (id, content) =>
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== id) return c;
            const messages = [...c.messages];
            if (messages.length === 0) return c;
            const last = { ...messages[messages.length - 1], content };
            messages[messages.length - 1] = last;
            return { ...c, messages, updatedAt: Date.now() };
          }),
        })),

      clearConversation: (id) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, messages: [], title: 'New Conversation', updatedAt: Date.now() } : c
          ),
        })),

      deleteConversation: (id) =>
        set((s) => {
          const conversations = s.conversations.filter((c) => c.id !== id);
          const activeId = s.activeId === id ? (conversations[0]?.id ?? null) : s.activeId;
          return { conversations, activeId };
        }),

      clearAll: () => set({ conversations: [], activeId: null }),
    }),
    { name: 'noteroot-chat-history', version: 1 }
  )
);
