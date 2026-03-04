import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { PromptBlockComponent } from './PromptBlockComponent';

export interface PromptBlockOptions {
  HTMLAttributes: Record<string, string>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    promptBlock: {
      /**
       * Insert a prompt block
       */
      insertPromptBlock: (promptText: string, promptId?: string) => ReturnType;
    };
  }
}

export const PromptBlock = Node.create<PromptBlockOptions>({
  name: 'promptBlock',

  group: 'block',

  content: 'paragraph',

  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      promptText: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-prompt-text'),
        renderHTML: (attributes) => {
          if (!attributes.promptText) return {};
          return { 'data-prompt-text': attributes.promptText };
        },
      },
      promptId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-prompt-id'),
        renderHTML: (attributes) => {
          if (!attributes.promptId) return {};
          return { 'data-prompt-id': attributes.promptId };
        },
      },
      isCollapsed: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-collapsed') === 'true',
        renderHTML: (attributes) => {
          return { 'data-collapsed': String(attributes.isCollapsed) };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="prompt-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        { 'data-type': 'prompt-block' },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      ['p', 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PromptBlockComponent);
  },

  addCommands() {
    return {
      insertPromptBlock:
        (promptText: string, promptId?: string) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                promptText,
                promptId: promptId || null,
                isCollapsed: false,
              },
              content: [
                {
                  type: 'paragraph',
                },
              ],
            })
            .focus()
            .run();
        },
    };
  },
});
