import { useAuthStore } from '../stores/authStore';
import { useNoteStore } from '../stores/noteStore';
import { useChatStore } from '../stores/chatStore';

/**
 * Purges all user-specific data from memory, active tabs, and temporary local storage.
 * Guarantees that when logging out or switching accounts, the new user cannot see
 * previous user notes, chat logs, starred items, or active document state.
 */
export function purgeAccountLocalSession() {
  // 1. Immediately reset in-memory note state
  useNoteStore.getState().resetLocalState();

  // 2. Wipe AI chat history and conversation memory
  useChatStore.getState().clearAll();

  // 3. Purge user-specific cached keys in localStorage
  try {
    localStorage.removeItem('noteroot_starred_ids');
    localStorage.removeItem('noteroot_expanded_spaces');
    localStorage.removeItem('noteroot_open_tabs');
    localStorage.removeItem('noteroot_active_tab');
  } catch {
    // Ignore storage errors in restricted environments
  }
}

/**
 * Performs a complete, secure logout and account isolation.
 */
export function performLogout(redirectTo: string = '/') {
  // Purge all sensitive data
  purgeAccountLocalSession();

  // Clear auth credentials
  useAuthStore.getState().logout();

  // Hard reload or navigate to landing page
  if (redirectTo) {
    window.location.href = redirectTo;
  }
}
