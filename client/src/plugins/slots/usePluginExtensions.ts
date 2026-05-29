import { useState, useEffect } from 'react';
import PluginRuntime from '../runtime/PluginRuntime';
import type { ExtensionPoint } from '../runtime/ExtensionPoints';

/**
 * A React hook that subscribes to an extension point and returns the current descriptors.
 * It forces a re-render whenever plugins register or unregister extensions.
 */
export function usePluginExtensions<T>(point: ExtensionPoint): T[] {
  const [extensions, setExtensions] = useState<T[]>([]);

  useEffect(() => {
    // Initial fetch
    setExtensions(PluginRuntime.getExtensions<T>(point));

    // Subscribe to changes
    const unsubscribe = PluginRuntime.onExtensionsChanged(() => {
      setExtensions(PluginRuntime.getExtensions<T>(point));
    });

    return () => { unsubscribe(); };
  }, [point]);

  return extensions;
}
