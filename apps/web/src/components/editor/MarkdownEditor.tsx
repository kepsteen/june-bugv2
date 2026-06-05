import { useCallback, useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView } from "@codemirror/view";
import { countWords, markdownToPlainText } from "@/lib/entry-utils";
import { isTiptapJson, tiptapToMarkdown } from "@/lib/tiptap-to-markdown";
import { useCreateEntryTitleMutation } from "@/hooks/api";
import { livePreview } from "./live-preview";

interface MarkdownEditorProps {
	initialContent: string;
	entryId: string;
	onUpdate: (content: string, plainText: string) => void;
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

export function MarkdownEditor({
	initialContent,
	entryId,
	onUpdate,
}: MarkdownEditorProps) {
	const editorVersionRef = useRef(0);
	const propVersionRef = useRef(0);
	const contentRef = useRef("");
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

	const plainText = markdownToPlainText(content);
	const numWords = countWords(plainText);

	useEffect(() => {
		if (numWords > 50 && !isTitleGeneratedRef.current) {
			isTitleGeneratedRef.current = true;
			createEntryTitle.mutate({ id: entryId, payload: { content: plainText } });
		}
	}, [numWords, entryId, createEntryTitle, plainText]);

	return (
		<div className="markdown-editor overflow-hidden">
			<CodeMirror
				value={content}
				height="auto"
				minHeight="500px"
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
}
