import type { ThemeTokens } from './ExtensionPoints';

class ThemeEngineManager {
  private pluginContributions = new Map<string, ThemeTokens>();

  /**
   * Called by a plugin to apply its theme tokens.
   */
  public applyTokens(pluginId: string, tokens: ThemeTokens) {
    this.pluginContributions.set(pluginId, tokens);
    this.reapply();
  }

  /**
   * Revoke tokens when a plugin is disabled.
   */
  public revokeTokens(pluginId: string) {
    if (this.pluginContributions.has(pluginId)) {
      this.pluginContributions.delete(pluginId);
      // Clean out all current custom properties before reapplying
      this.clearAllCustomProperties();
      this.reapply();
    }
  }

  /**
   * Reapply all active tokens.
   */
  public reapply() {
    // First, clear existing plugin-set properties to allow base theme defaults if a plugin was removed
    this.clearAllCustomProperties();

    // Iterate through all active plugin contributions and merge
    const mergedTokens: ThemeTokens = {};
    for (const tokens of Array.from(this.pluginContributions.values())) {
      // This is a simple merge. In a full implementation, you might let plugins specify light/dark specific tokens.
      Object.assign(mergedTokens, tokens);
    }

    // Apply merged tokens to :root or documentElement
    const root = document.documentElement;
    for (const [key, value] of Object.entries(mergedTokens)) {
      root.style.setProperty(key, value);
    }
  }

  private clearAllCustomProperties() {
    const root = document.documentElement;
    // This is naive: it clears inline styles. We shouldn't wipe all inline styles if AppShell uses them,
    // so let's only clear the ones we know we tracked, or just let CSS cascading handle it.
    // A better approach is tracking which variables we modified and only removing those.
    for (const tokens of Array.from(this.pluginContributions.values())) {
      for (const key of Object.keys(tokens)) {
         root.style.removeProperty(key);
      }
    }
  }
}

export const ThemeEngine = new ThemeEngineManager();
