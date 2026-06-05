import { useCallback, useEffect, useRef, useState } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorView } from '@codemirror/view';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bold,
  Code,
  Eye,
  Heading1,
  Heading2,
  Italic,
  Link,
  List,
  ListOrdered,
  Pencil,
  Quote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { countWords, markdownToPlainText } from '@/lib/entry-utils';
import { isTiptapJson, tiptapToMarkdown } from '@/lib/tiptap-to-markdown';
import { useCreateEntryTitleMutation } from '@/hooks/api';

interface MarkdownEditorProps {
  initialContent: string;
  entryId: string;
  onUpdate: (content: string, plainText: string) => void;
}

type ViewMode = 'edit' | 'preview';

function normalizeContent(content: string): string {
  if (!content?.trim()) return '';
  if (isTiptapJson(content)) return tiptapToMarkdown(content);
  return content;
}

function insertMarkdown(
  view: EditorView,
  before: string,
  after = '',
  placeholder = 'text',
) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  const text = selected || placeholder;
  const insert = `${before}${text}${after}`;
  view.dispatch({
    changes: { from, to, insert },
    selection: {
      anchor: from + before.length,
      head: from + before.length + text.length,
    },
  });
  view.focus();
}

const editorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    fontSize: '0.875rem',
    fontFamily: 'var(--font-sans)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-content': {
    padding: '0.25rem 1rem 1rem',
    lineHeight: '1.75',
    minHeight: '500px',
    caretColor: 'var(--foreground)',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'inherit',
  },
  '.cm-gutters': {
    display: 'none',
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--foreground)',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'color-mix(in oklch, var(--primary) 20%, transparent)',
  },
});

export function MarkdownEditor({ initialContent, entryId, onUpdate }: MarkdownEditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const editorVersionRef = useRef(0);
  const propVersionRef = useRef(0);
  const contentRef = useRef('');
  const isTitleGeneratedRef = useRef(false);
  const [content, setContent] = useState(() => normalizeContent(initialContent));
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [isFocused, setIsFocused] = useState(false);
  const createEntryTitle = useCreateEntryTitleMutation();

  useEffect(() => {
    isTitleGeneratedRef.current = false;
  }, [entryId]);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    propVersionRef.current++;
    const normalized = normalizeContent(initialContent);
    if (
      normalized !== contentRef.current &&
      !isFocused &&
      propVersionRef.current > editorVersionRef.current
    ) {
      setContent(normalized);
      editorVersionRef.current = propVersionRef.current;
    }
  }, [initialContent, isFocused]);

  const handleChange = useCallback(
    (value: string) => {
      editorVersionRef.current = propVersionRef.current + 1;
      setContent(value);
      onUpdate(value, markdownToPlainText(value));
    },
    [onUpdate],
  );

  const plainText = markdownToPlainText(content);
  const numWords = countWords(plainText);

  useEffect(() => {
    if (numWords > 50 && !isTitleGeneratedRef.current) {
      isTitleGeneratedRef.current = true;
      createEntryTitle.mutate({ id: entryId, payload: { content: plainText } });
    }
  }, [numWords, entryId, createEntryTitle, plainText]);

  const applyFormat = useCallback(
    (before: string, after = '', placeholder = 'text') => {
      const view = editorRef.current?.view;
      if (!view) return;
      insertMarkdown(view, before, after, placeholder);
    },
    [],
  );

  const toolbarButtons = [
    { icon: Bold, label: 'Bold', action: () => applyFormat('**', '**', 'bold text') },
    { icon: Italic, label: 'Italic', action: () => applyFormat('*', '*', 'italic text') },
    { icon: Heading1, label: 'Heading 1', action: () => applyFormat('# ', '', 'Heading') },
    { icon: Heading2, label: 'Heading 2', action: () => applyFormat('## ', '', 'Heading') },
    { icon: List, label: 'Bullet list', action: () => applyFormat('- ', '', 'list item') },
    { icon: ListOrdered, label: 'Numbered list', action: () => applyFormat('1. ', '', 'list item') },
    { icon: Quote, label: 'Quote', action: () => applyFormat('> ', '', 'quote') },
    { icon: Code, label: 'Inline code', action: () => applyFormat('`', '`', 'code') },
    { icon: Link, label: 'Link', action: () => applyFormat('[', '](url)', 'link text') },
  ];

  return (
    <div className="markdown-editor overflow-hidden">
      <div className="mb-2 flex flex-wrap items-center gap-1 border-b border-border/50 pb-2">
        <div className="flex flex-wrap items-center gap-0.5">
          {toolbarButtons.map(({ icon: Icon, label, action }) => (
            <Button
              key={label}
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={action}
              title={label}
              aria-label={label}
              disabled={viewMode === 'preview'}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setViewMode('edit')}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            type="button"
            variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setViewMode('preview')}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
        </div>
      </div>

      {viewMode === 'edit' ? (
        <CodeMirror
          ref={editorRef}
          value={content}
          height="auto"
          minHeight="500px"
          extensions={[
            markdown({ base: markdownLanguage, codeLanguages: languages }),
            editorTheme,
            EditorView.lineWrapping,
          ]}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLine: false,
          }}
          placeholder="Start writing in Markdown..."
        />
      ) : (
        <div className="markdown-preview min-h-[500px] px-4 pb-4">
          {content.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
