import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { CharacterCount } from '@tiptap/extensions';
import Code from '@tiptap/extension-code';
import { EditorBubbleMenu } from './EditorBubbleMenu';
import { SlashCommand, getSuggestionItems, renderItems } from './SlashCommand';
import { useEffect, useRef, useState } from 'react';
import { useCreateEntryTitleMutation } from '@/hooks/api';

interface TiptapEditorProps {
  initialContent: string;
  entryId: string;
  onUpdate: (content: string, plainText: string) => void;
}

export function TiptapEditor({ initialContent, entryId, onUpdate }: TiptapEditorProps) {
  const editorVersionRef = useRef(0);
  const propVersionRef = useRef(0);
  const is100WordsRef = useRef(false);
  const [isFocused, setIsFocused] = useState(false);
  const createEntryTitle = useCreateEntryTitleMutation();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: false,
      }),
      Code.configure({
        HTMLAttributes: { class: 'inline-code' },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline underline-offset-4' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'max-w-full h-auto rounded-lg' },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: 'Type "/" for commands...',
        emptyEditorClass: 'is-editor-empty',
      }),
      SlashCommand.configure({
        suggestion: {
          items: getSuggestionItems,
          render: renderItems,
        },
      }),
      CharacterCount,
    ],
    content: initialContent ? JSON.parse(initialContent) : { type: 'doc', content: [] },
    editorProps: {
      attributes: {
        class: 'focus:outline-none w-full',
      },
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    onUpdate: ({ editor }) => {
      editorVersionRef.current = propVersionRef.current + 1;
      const json = editor.getJSON();
      const text = editor.getText();
      onUpdate(JSON.stringify(json), text);
    },
  });

  const numWords = editor.storage.characterCount.words();


  useEffect(() => {
    propVersionRef.current++;
    if (editor && initialContent) {
      try {
        const currentContent = JSON.stringify(editor.getJSON());
        if (
          currentContent !== initialContent &&
          !isFocused &&
          propVersionRef.current > editorVersionRef.current
        ) {
          editor.commands.setContent(JSON.parse(initialContent));
          editorVersionRef.current = propVersionRef.current;
        }
      } catch (error) {
        console.error('Failed to parse initial content:', error);
      }
    }
  }, [editor, initialContent, isFocused]);

  useEffect(() => {
    if (numWords > 50 && !is100WordsRef.current) {
      is100WordsRef.current = true;
      const text = editor.getText();
      createEntryTitle.mutate({ id: entryId, payload: { content: text } });
    }
  }, [numWords, entryId, createEntryTitle, editor])

  if (!editor) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground text-sm">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="tiptap-wrapper overflow-hidden">
      <EditorBubbleMenu editor={editor} />
      <EditorContent editor={editor} className="tiptap-editor" />
    </div>
  );
}
