import { syntaxTree } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
  type DecorationSet,
} from '@codemirror/view';
import type { SyntaxNode, SyntaxNodeRef } from '@lezer/common';

type DecorationSpec = { from: number; to: number; deco: Decoration };
type SelectionLineRange = { start: number; end: number };

function selectionTouchesLines(
  state: EditorView['state'],
  ranges: SelectionLineRange[],
  from: number,
  to: number,
): boolean {
  const nodeStart = state.doc.lineAt(from).number;
  const nodeEnd = state.doc.lineAt(to).number;
  return ranges.some((range) => range.start <= nodeEnd && range.end >= nodeStart);
}

function getHeadingClass(name: string): string | null {
  const match = name.match(/^(?:ATX|Setext)Heading(\d)$/);
  return match ? `cm-h${match[1]}` : null;
}

function hideMarks(node: SyntaxNode, specs: DecorationSpec[], markName: string) {
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.type.name === markName) {
      specs.push({
        from: child.from,
        to: child.to,
        deco: Decoration.replace({}),
      });
    }
  }
}

function hideHeaderMarks(node: SyntaxNode, specs: DecorationSpec[], state: EditorView['state']) {
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.type.name !== 'HeaderMark') continue;

    specs.push({
      from: child.from,
      to: child.to,
      deco: Decoration.replace({}),
    });

    const afterMark = child.to;
    if (afterMark < state.doc.length && state.doc.sliceString(afterMark, afterMark + 1) === ' ') {
      specs.push({
        from: afterMark,
        to: afterMark + 1,
        deco: Decoration.replace({}),
      });
    }
  }
}

function hideQuoteMarks(node: SyntaxNode, specs: DecorationSpec[]) {
  if (node.type.name === 'QuoteMark') {
    specs.push({
      from: node.from,
      to: node.to,
      deco: Decoration.replace({}),
    });
  }
  for (let child = node.firstChild; child; child = child.nextSibling) {
    hideQuoteMarks(child, specs);
  }
}

function addLineClassForRange(
  state: EditorView['state'],
  specs: DecorationSpec[],
  from: number,
  to: number,
  className: string,
) {
  const startLine = state.doc.lineAt(from);
  const endLine = state.doc.lineAt(to);
  for (let lineNumber = startLine.number; lineNumber <= endLine.number; lineNumber++) {
    const line = state.doc.line(lineNumber);
    specs.push({
      from: line.from,
      to: line.from,
      deco: Decoration.line({ class: className }),
    });
  }
}

class HorizontalRuleWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement('hr');
    hr.className = 'cm-hr-widget';
    return hr;
  }

  ignoreEvent() {
    return false;
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const { state } = view;
  const selectionLineRanges: SelectionLineRange[] = state.selection.ranges.map((sel) => ({
    start: state.doc.lineAt(sel.from).number,
    end: state.doc.lineAt(sel.to).number,
  }));
  const specs: DecorationSpec[] = [];

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (ref: SyntaxNodeRef) => {
        const node = ref.node;
        const name = node.type.name;
        const nodeFrom = ref.from;
        const nodeTo = ref.to;

        if (selectionTouchesLines(state, selectionLineRanges, nodeFrom, nodeTo)) return;

        const headingClass = getHeadingClass(name);
        if (headingClass) {
          const line = state.doc.lineAt(nodeFrom);
          specs.push({
            from: line.from,
            to: line.from,
            deco: Decoration.line({ class: headingClass }),
          });
          hideHeaderMarks(node, specs, state);
          return false;
        }

        switch (name) {
          case 'StrongEmphasis':
            specs.push({
              from: nodeFrom,
              to: nodeTo,
              deco: Decoration.mark({ class: 'cm-strong' }),
            });
            hideMarks(node, specs, 'EmphasisMark');
            return false;

          case 'Emphasis':
            specs.push({
              from: nodeFrom,
              to: nodeTo,
              deco: Decoration.mark({ class: 'cm-em' }),
            });
            hideMarks(node, specs, 'EmphasisMark');
            return false;

          case 'InlineCode':
            specs.push({
              from: nodeFrom,
              to: nodeTo,
              deco: Decoration.mark({ class: 'cm-inline-code' }),
            });
            hideMarks(node, specs, 'CodeMark');
            return false;

          case 'Link':
            for (let child = node.firstChild; child; child = child.nextSibling) {
              const childName = child.type.name;
              if (childName === 'LinkMark' || childName === 'URL') {
                specs.push({
                  from: child.from,
                  to: child.to,
                  deco: Decoration.replace({}),
                });
              } else if (childName === 'LinkLabel') {
                specs.push({
                  from: child.from,
                  to: child.to,
                  deco: Decoration.mark({ class: 'cm-link' }),
                });
              }
            }
            return false;

          case 'Autolink':
            specs.push({
              from: nodeFrom,
              to: nodeTo,
              deco: Decoration.mark({ class: 'cm-link' }),
            });
            return false;

          case 'Blockquote':
            addLineClassForRange(state, specs, nodeFrom, nodeTo, 'cm-blockquote');
            hideQuoteMarks(node, specs);
            return false;

          case 'ListItem': {
            const line = state.doc.lineAt(nodeFrom);
            specs.push({
              from: line.from,
              to: line.from,
              deco: Decoration.line({ class: 'cm-list-item' }),
            });
            return;
          }

          case 'FencedCode':
          case 'CodeBlock':
            addLineClassForRange(state, specs, nodeFrom, nodeTo, 'cm-code-block');
            return false;

          case 'HorizontalRule':
            specs.push({
              from: nodeFrom,
              to: nodeTo,
              deco: Decoration.replace({
                widget: new HorizontalRuleWidget(),
                inclusive: true,
              }),
            });
            return false;
        }
      },
    });
  }

  return Decoration.set(
    specs.map(({ from, to, deco }) => deco.range(from, to)),
    true,
  );
}

export function livePreview(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
    },
  );
}
