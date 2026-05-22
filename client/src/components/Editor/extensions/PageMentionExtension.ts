import { mergeAttributes, Node } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from 'prosemirror-state';
import tippy from 'tippy.js';
import { MentionList } from './MentionList';
import type { MentionItem } from './MentionList';

// Unique key so it doesn't clash with the SlashCommand suggestion plugin
const PageMentionPluginKey = new PluginKey('pageMentionSuggestion');

export type PageMentionOptions = {
  HTMLAttributes: Record<string, any>;
  suggestion: {
    items: (params: { query: string }) => MentionItem[];
  };
};

export const PageMention = Node.create<PageMentionOptions>({
  name: 'pageMention',
  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      suggestion: {
        items: () => [],
      },
    };
  },

  addAttributes() {
    return {
      id:    { default: null },
      label: { default: null },
      icon:  { default: '📄' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-page-mention]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-page-mention': '',
        'data-id': node.attrs.id,
        class: 'page-mention-chip',
      }),
      `${node.attrs.icon ?? '📄'} ${node.attrs.label ?? ''}`,
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span');
      dom.className = 'page-mention-chip';
      dom.setAttribute('data-page-mention', '');
      dom.setAttribute('data-id', node.attrs.id ?? '');
      dom.setAttribute('contenteditable', 'false');
      dom.textContent = `${node.attrs.icon ?? '📄'} ${node.attrs.label ?? ''}`;

      dom.addEventListener('click', () => {
        if (node.attrs.id) {
          window.history.pushState({}, '', `/notes/${node.attrs.id}`);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      });

      return { dom };
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    const nodeName = this.name;
    const editor = this.editor;

    return [
      Suggestion({
        pluginKey: PageMentionPluginKey,   // ← unique key, no clash with slash command
        editor,
        char: '@',
        allowedPrefixes: null,
        startOfLine: false,

        items: ({ query }) => options.suggestion.items({ query }),

        command: ({ editor: ed, range, props }) => {
          const item = props as unknown as MentionItem;
          ed.chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: nodeName,
              attrs: { id: item.id, label: item.label, icon: item.icon },
            })
            .insertContent(' ')
            .run();
        },

        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const type = state.schema.nodes[nodeName];
          if (!type) return false;
          return !!$from.parent.type.contentMatch.matchType(type);
        },

        render: () => {
          let component: ReactRenderer<any>;
          let popup: any;

          return {
            onStart(props: any) {
              component = new ReactRenderer(MentionList, {
                props,
                editor: props.editor,
              });
              if (!props.clientRect) return;
              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
            },
            onUpdate(props: any) {
              component?.updateProps(props);
              if (!props.clientRect || !popup) return;
              popup[0]?.setProps({ getReferenceClientRect: props.clientRect });
            },
            onKeyDown(props: any) {
              if (props.event.key === 'Escape') {
                popup?.[0]?.hide();
                return true;
              }
              return (component?.ref as any)?.onKeyDown(props) ?? false;
            },
            onExit() {
              popup?.[0]?.destroy();
              component?.destroy();
            },
          };
        },
      }),
    ];
  },
});
