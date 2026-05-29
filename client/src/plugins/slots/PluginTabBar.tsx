import { usePluginExtensions } from './usePluginExtensions';
import { DescriptorRenderer } from '../runtime/DescriptorRenderer';

export function PluginTabBar() {
  const tabs = usePluginExtensions<any>('header.tabs'); // We can treat it as returning descriptor nodes for tabs
  
  if (tabs.length === 0) return null;

  return (
    <>
      {tabs.map((tab, i) => (
        <DescriptorRenderer key={i} node={tab.render()} />
      ))}
    </>
  );
}
