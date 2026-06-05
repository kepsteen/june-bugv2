interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TiptapNode {
  type: string;
  text?: string;
  content?: TiptapNode[];
  attrs?: Record<string, unknown>;
  marks?: TiptapMark[];
}

export function isTiptapJson(content: string): boolean {
  if (!content?.trim()) return false;
  try {
    const parsed = JSON.parse(content) as TiptapNode;
    return parsed?.type === 'doc';
  } catch {
    return false;
  }
}

export function tiptapToMarkdown(content: string): string {
  try {
    const doc = JSON.parse(content) as TiptapNode;
    if (doc.type !== 'doc') return content;
    return convertNodes(doc.content ?? []).trim();
  } catch {
    return content;
  }
}

export function markdownToPlainText(markdown: string): string {
  if (!markdown.trim()) return '';

  let text = markdown;

  text = text.replace(/```[\s\S]*?```/g, (block) =>
    block.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, ''),
  );

  text = text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+\[[ xX]\]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/^---+$/gm, '')
    .replace(/\s{2}\n/g, '\n');

  return text.replace(/\n{3,}/g, '\n\n').trim();
}

function convertNodes(nodes: TiptapNode[]): string {
  return nodes.map(convertNode).join('\n\n');
}

function convertNode(node: TiptapNode): string {
  switch (node.type) {
    case 'paragraph':
      return convertInline(node.content ?? []);
    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1;
      const prefix = '#'.repeat(Math.min(level, 6));
      return `${prefix} ${convertInline(node.content ?? [])}`;
    }
    case 'bulletList':
      return (node.content ?? [])
        .map((item) => convertListItem(item, '- '))
        .join('\n');
    case 'orderedList':
      return (node.content ?? [])
        .map((item, index) => convertListItem(item, `${index + 1}. `))
        .join('\n');
    case 'taskList':
      return (node.content ?? []).map(convertTaskItem).join('\n');
    case 'blockquote':
      return (node.content ?? [])
        .map((child) => `> ${convertNode(child)}`)
        .join('\n');
    case 'codeBlock': {
      const language = (node.attrs?.language as string) ?? '';
      const code = (node.content ?? []).map((child) => child.text ?? '').join('');
      return `\`\`\`${language}\n${code}\n\`\`\``;
    }
    case 'horizontalRule':
      return '---';
    case 'image': {
      const src = (node.attrs?.src as string) ?? '';
      const alt = (node.attrs?.alt as string) ?? '';
      return `![${alt}](${src})`;
    }
    case 'hardBreak':
      return '  \n';
    default:
      if (node.content) return convertNodes(node.content);
      return '';
  }
}

function convertListItem(item: TiptapNode, prefix: string): string {
  const inner = (item.content ?? [])
    .map((child) => {
      if (child.type === 'paragraph') return convertInline(child.content ?? []);
      if (child.type === 'bulletList' || child.type === 'orderedList' || child.type === 'taskList') {
        return convertNode(child)
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n');
      }
      return convertNode(child);
    })
    .join('\n');
  return `${prefix}${inner}`;
}

function convertTaskItem(item: TiptapNode): string {
  const checked = Boolean(item.attrs?.checked);
  const marker = checked ? '- [x] ' : '- [ ] ';
  const inner = (item.content ?? [])
    .map((child) => {
      if (child.type === 'paragraph') return convertInline(child.content ?? []);
      return convertNode(child);
    })
    .join('\n');
  return `${marker}${inner}`;
}

function convertInline(nodes: TiptapNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'hardBreak') return '  \n';
      if (node.type !== 'text') return convertNode(node);
      return applyMarks(node.text ?? '', node.marks ?? []);
    })
    .join('');
}

function applyMarks(text: string, marks: TiptapMark[]): string {
  return marks.reduce((value, mark) => {
    switch (mark.type) {
      case 'bold':
        return `**${value}**`;
      case 'italic':
        return `*${value}*`;
      case 'strike':
        return `~~${value}~~`;
      case 'underline':
        return `**${value}**`;
      case 'code':
        return `\`${value}\``;
      case 'link': {
        const href = (mark.attrs?.href as string) ?? '';
        return `[${value}](${href})`;
      }
      default:
        return value;
    }
  }, text);
}
