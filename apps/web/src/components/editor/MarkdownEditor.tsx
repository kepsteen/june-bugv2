import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { countWords, markdownToPlainText } from "@/lib/entry-utils";
import { isTiptapJson, tiptapToMarkdown } from "@/lib/tiptap-to-markdown";
import { useCreateEntryTitleMutation } from "@/hooks/api";
import { livePreview } from "./live-preview";

interface MarkdownEditorProps {
	initialContent: string;
	entryId: string;
	onUpdate: (content: string, plainText: string) => void;
	disableAiTitle?: boolean;
}

export interface MarkdownEditorHandle {
	insertPrompt: (prompt: string) => void;
}

export function formatPromptBlock(
	prompt: string,
	atLineStart: boolean,
	docEmpty: boolean,
): string {
	const quoted = `> ${prompt}\n> `;
	if (docEmpty) return quoted;
	return atLineStart ? quoted : `\n\n${quoted}`;
}

function normalizeContent(content: string): string {
	if (!content?.trim()) return "";
	if (isTiptapJson(content)) return tiptapToMarkdown(content);
	return content;
}

const editorTheme = EditorView.theme({
	"&": {
		backgroundColor: "transparent",
		fontSize: "0.875rem",
		fontFamily: "var(--font-sans)",
	},
	"&.cm-focused": {
		outline: "none",
	},
	".cm-content": {
		padding: "0.25rem 1rem 1rem",
		lineHeight: "1.75",
		minHeight: "500px",
		caretColor: "var(--foreground)",
	},
	".cm-scroller": {
		overflow: "auto",
		fontFamily: "inherit",
	},
	".cm-gutters": {
		display: "none",
	},
	".cm-activeLine": {
		backgroundColor: "transparent",
	},
	".cm-cursor": {
		borderLeftColor: "var(--foreground)",
	},
	".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
		backgroundColor: "color-mix(in oklch, var(--primary) 20%, transparent)",
	},
});

export const MarkdownEditor = forwardRef<
	MarkdownEditorHandle,
	MarkdownEditorProps
>(function MarkdownEditor({ initialContent, entryId, onUpdate, disableAiTitle }, ref) {
	const editorVersionRef = useRef(0);
	const propVersionRef = useRef(0);
	const contentRef = useRef("");
	const viewRef = useRef<EditorView | null>(null);
	const isTitleGeneratedRef = useRef(false);
	const [content, setContent] = useState(() =>
		normalizeContent(initialContent),
	);
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

	useImperativeHandle(
		ref,
		() => ({
			insertPrompt(prompt: string) {
				const view = viewRef.current;
				if (!view) return;

				const doc = view.state.doc.toString();
				const { from, to } = view.state.selection.main;
				const docEmpty = !doc.trim();
				const atLineStart = from === 0 || doc[from - 1] === "\n";
				const block = formatPromptBlock(prompt, atLineStart, docEmpty);
				const cursorPos = from + block.length;

				view.dispatch({
					changes: { from, to, insert: block },
					selection: EditorSelection.cursor(cursorPos),
					scrollIntoView: true,
				});
				view.focus();
			},
		}),
		[handleChange],
	);

	const plainText = markdownToPlainText(content);
	const numWords = countWords(plainText);

	useEffect(() => {
		if (disableAiTitle) return;
		if (numWords > 50 && !isTitleGeneratedRef.current) {
			isTitleGeneratedRef.current = true;
			createEntryTitle.mutate({ id: entryId, payload: { content: plainText } });
		}
	}, [disableAiTitle, numWords, entryId, createEntryTitle, plainText]);

	return (
		<div className="markdown-editor overflow-hidden">
			<CodeMirror
				value={content}
				height="auto"
				minHeight="500px"
				onCreateEditor={(view) => {
					viewRef.current = view;
				}}
				extensions={[
					markdown({ base: markdownLanguage, codeLanguages: languages }),
					livePreview(),
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
					syntaxHighlighting: false,
				}}
				placeholder="Start writing..."
			/>
		</div>
	);
});
