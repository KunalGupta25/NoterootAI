import { Editor } from '@tiptap/react';

export type ExtensionPoint =
  | 'note.pageActions'
  | 'editor.bubbleButtons'
  | 'editor.slashItems'
  | 'editor.inlineSuggestions'
  | 'settings.panels'
  | 'header.tabs'
  | 'sidebar.left.items'
  | 'theme.tokens'
  | 'layout.overlays'
  | 'layout.modals';

// --- Extension Point Descriptors ---

export interface NotePageAction {
  id: string;
  icon: string | React.ReactNode;
  label: string;
  onClick: (noteId: string) => void;
}

export interface BubbleButton {
  id: string;
  icon: string | React.ReactNode;
  label: string;
  isActive?: (editor: Editor) => boolean;
  onClick: (editor: Editor) => void;
}

export interface SlashItem {
  title: string;
  description: string;
  icon: string;
  category: string;
  command: (params: { editor: Editor; range: Range }) => void;
}

export interface SettingsPanel {
  id: string;
  pluginName: string;
  render: () => DescriptorNode;
}

export interface ThemeTokens {
  [cssVarName: string]: string;
}

export interface LayoutOverlay {
  id: string;
  render: () => DescriptorNode;
}

export interface LayoutModal {
  id: string;
  title: string;
  render: () => DescriptorNode;
}

// --- Declarative UI Descriptors ---

export type DescriptorNode =
  | { type: 'Column'; children: DescriptorNode[] }
  | { type: 'Row'; children: DescriptorNode[] }
  | { type: 'Label'; text: string }
  | { type: 'Text'; text: string }
  | { type: 'Markdown'; text: string }
  | { type: 'Button'; label: string; onClick: () => void; disabled?: boolean }
  | { type: 'Input'; value: string; onChange: (v: string) => void; placeholder?: string }
  | { type: 'Select'; value: string; options: string[]; onChange: (v: string) => void }
  | { type: 'RadioGroup'; value: string; options: string[]; onChange: (v: string) => void }
  | { type: 'Toggle'; checked: boolean; onChange: (v: boolean) => void }
  | { type: 'Divider' }
  | { type: 'Badge'; text: string }
  | { type: 'Link'; text: string; url: string }
  | { type: 'TabBar'; children: DescriptorNode[] }
  | { type: 'Tab'; active: boolean; label: string; onClick: () => void; onClose?: () => void }
  | { type: 'Empty' };
