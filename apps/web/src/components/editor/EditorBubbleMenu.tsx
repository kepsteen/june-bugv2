import type { Editor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react/menus';
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorBubbleMenuProps {
  editor: Editor;
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center gap-1 rounded-lg border bg-background p-1 shadow-md"
    >
      <BubbleMenuButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold (Cmd+B)"
      >
        <Bold className="h-4 w-4" />
      </BubbleMenuButton>
      <BubbleMenuButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic (Cmd+I)"
      >
        <Italic className="h-4 w-4" />
      </BubbleMenuButton>
      <BubbleMenuButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline (Cmd+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </BubbleMenuButton>
      <BubbleMenuButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </BubbleMenuButton>
      <BubbleMenuButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="Code"
      >
        <Code className="h-4 w-4" />
      </BubbleMenuButton>
    </BubbleMenu>
  );
}

function BubbleMenuButton({ onClick, isActive, title, children }: {
  onClick: () => void;
  isActive: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      title={title}
      className={cn(
        'rounded p-2 hover:bg-muted transition-colors',
        isActive && 'bg-muted text-primary',
      )}
    >
      {children}
    </button>
  );
}
