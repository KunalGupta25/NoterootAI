import type { ExtensionPoint, SlashItem } from './ExtensionPoints';
import { createRestrictedContext } from './PluginContext';
import { ThemeEngine } from './ThemeEngine';

type ExtensionDescriptor = any;

class PluginRuntimeManager {
  private extensions = new Map<ExtensionPoint, Map<string, ExtensionDescriptor>>();
  
  // Track runtime errors
  public pluginErrors = new Map<string, string>();
  
  // Listeners for when extensions change (reactivity)
  private listeners = new Set<() => void>();

  /**
   * Called by App.tsx to initialize the system and run active plugins.
   */
  public async init(plugins: any[]) {
    // Clear everything
    this.extensions.clear();
    this.pluginErrors.clear();
    
    // Execute all enabled plugins
    for (const plugin of plugins) {
      if (plugin.enabled) {
        await this.executePlugin(plugin);
      }
    }
  }

  /**
   * Executes a plugin safely by wrapping it in a module scope function and injecting context.
   */
  public async executePlugin(plugin: { id: string, code?: string }) {
    if (!plugin.code) return;
    try {
      this.pluginErrors.delete(plugin.id);
      const ctx = createRestrictedContext(plugin.id);
      
      const wrapper = new Function('ctx', 'window', 'document', `
        "use strict";
        try {
          ${plugin.code}
          if (typeof main === 'function') {
            main(ctx);
          }
        } catch(e) {
          throw e; // throw out to the outer try-catch
        }
      `);
      
      wrapper(ctx, undefined, undefined);
      
    } catch (err: any) {
      console.error(`Failed to execute plugin ${plugin.id}:`, err);
      this.pluginErrors.set(plugin.id, err.message || String(err));
      this.notifyListeners();
    }
  }

  /**
   * Disables a plugin and unregisters all its extensions.
   */
  public disablePlugin(pluginId: string) {
    let changed = false;
    for (const [_, registry] of this.extensions.entries()) {
      if (registry.has(pluginId)) {
        registry.delete(pluginId);
        changed = true;
      }
    }
    ThemeEngine.revokeTokens(pluginId);
    if (changed) this.notifyListeners();
  }

  /**
   * Plugins call this via ctx.runtime.registerExtension
   */
  public registerExtension(pluginId: string, point: ExtensionPoint, descriptor: any) {
    if (!this.extensions.has(point)) {
      this.extensions.set(point, new Map());
    }
    // We store it as an array to support plugins registering multiple items per point
    const current = this.extensions.get(point)!.get(pluginId) || [];
    const arr = Array.isArray(current) ? current : [current];
    
    // Replace existing descriptor if it has the same id
    if (descriptor.id) {
      const idx = arr.findIndex((d: any) => d.id === descriptor.id);
      if (idx > -1) {
        arr[idx] = descriptor;
      } else {
        arr.push(descriptor);
      }
    } else {
      arr.push(descriptor);
    }
    
    this.extensions.get(point)!.set(pluginId, arr as any);
    this.notifyListeners();
  }

  /**
   * React slots call this to get all descriptors for a point.
   */
  public getExtensions<T = any>(point: ExtensionPoint): T[] {
    const all: T[] = [];
    if (this.extensions.has(point)) {
      for (const [_pluginId, descriptors] of this.extensions.get(point)!.entries()) {
        if (Array.isArray(descriptors)) {
          all.push(...descriptors);
        } else {
          all.push(descriptors);
        }
      }
    }
    return all;
  }

  public hasExtension(pluginId: string, point: ExtensionPoint): boolean {
    if (!this.extensions.has(point)) return false;
    const pluginExtensions = this.extensions.get(point)!.get(pluginId);
    if (!pluginExtensions) return false;
    return Array.isArray(pluginExtensions) ? pluginExtensions.length > 0 : !!pluginExtensions;
  }

  public getSlashItems(query: string): SlashItem[] {
    const items = this.getExtensions('editor.slashItems') as SlashItem[];
    if (!query) return items;
    return items.filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
    );
  }

  // --- Reactivity ---
  
  public onExtensionsChanged(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }
}

export default new PluginRuntimeManager();
