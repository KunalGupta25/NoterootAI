export interface PluginMeta {
  id?: string;
  name?: string;
  version?: string;
  description?: string;
}

/**
 * Parses the `@noteroot-plugin` header block from plugin source code.
 * The block must live in a leading block comment and contain lines like:
 *
 *   /**
 *    * @noteroot-plugin
 *    * id: drive-connector
 *    * name: Drive Connector
 *    * ...
 *    */
export function parsePluginMeta(code: string): PluginMeta {
  if (!code) return {};
  const block = code.match(/\/\*\*?([\s\S]*?)\*\//);
  if (!block || !/@noteroot-plugin\b/.test(block[1])) return {};
  const body = block[1];
  const field = (key: string): string | undefined =>
    body.match(new RegExp(`^\\s*\\*\\s*${key}\\s*:\\s*(.+)$`, 'im'))?.[1]?.trim();
  return {
    id: field('id')?.replace(/[^a-z0-9_-]/gi, '-').toLowerCase(),
    name: field('name'),
    version: field('version'),
    description: field('description'),
  };
}
