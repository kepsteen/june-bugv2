import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import { ChevronDown, ChevronRight, Trash2, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PromptBlockComponent(props: NodeViewProps) {
  const { node, updateAttributes, deleteNode } = props;
  const { promptText, isCollapsed } = node.attrs;

  const toggleCollapse = () => {
    updateAttributes({ isCollapsed: !isCollapsed });
  };

  return (
    <NodeViewWrapper
      as="div"
      className="group relative my-4 rounded-lg border border-border bg-gradient-to-br from-primary/15 to-secondary/30 overflow-hidden"
      data-type="prompt-block"
    >
      {/* Header with prompt text and controls */}
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-3 cursor-pointer select-none transition-colors',
          'hover:bg-black/5 dark:hover:bg-white/5'
        )}
        onClick={toggleCollapse}
      >
        {/* Collapse/Expand icon */}
        <button
          type="button"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={isCollapsed ? 'Expand prompt' : 'Collapse prompt'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {/* Prompt icon */}
        <HelpCircle className="h-4 w-4 shrink-0 text-primary" />

        {/* Prompt text */}
        <span className="flex-1 text-sm font-medium text-foreground">
          {promptText}
        </span>

        {/* Delete button - appears on hover */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteNode();
          }}
          className={cn(
            'shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all',
            'opacity-0 group-hover:opacity-100 focus:opacity-100'
          )}
          aria-label="Delete prompt block"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Content area - collapsible */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'
        )}
      >
        <div className="px-4 pb-4">
          <div className="pl-6">
            <NodeViewContent className="min-h-[1.5em] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:italic" data-placeholder="Type your response here..." />
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
