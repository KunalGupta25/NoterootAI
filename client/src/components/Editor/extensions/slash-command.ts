import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

interface SlashCommandOptions {
  suggestion: Record<string, any>;
}

export default Extension.create<SlashCommandOptions>({
  name: 'slashcommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
