import type { Editor } from '@tiptap/react';
import { usePluginExtensions } from './usePluginExtensions';
import type { BubbleButton } from '../runtime/ExtensionPoints';

interface Props {
  editor: Editor;
}

export function PluginBubbleButtons({ editor }: Props) {
  const buttons = usePluginExtensions<BubbleButton>('editor.bubbleButtons');

  if (buttons.length === 0) return null;

  return (
    <>
      <div className="selection-toolbar-divider" />
      {buttons.map((btn) => {
        const isActive = btn.isActive ? btn.isActive(editor) : false;
        return (
          <button
            key={btn.id}
            onClick={() => btn.onClick(editor)}
            className={`selection-btn ${isActive ? 'active' : ''}`}
            title={btn.label}
          >
            {btn.icon}
          </button>
        );
      })}
    </>
  );
}
