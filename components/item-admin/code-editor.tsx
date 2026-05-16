"use client";

import { autocompletion } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, defaultHighlightStyle, foldGutter, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter, lintGutter } from "@codemirror/lint";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";
import { useEffect, useRef } from "react";

import { minecraftComponentCompletionSource } from "@/lib/client/minecraft-component-completions";

type CodeEditorProps = {
  value?: string;
  defaultValue?: string;
  language: "json" | "text";
  completionKind?: "minecraft-components";
  minRows?: number;
  maxRows?: number;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
};

export function CodeEditor({
  value,
  defaultValue = "",
  language,
  completionKind,
  minRows = 4,
  maxRows = 18,
  onChange,
  onBlur
}: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  const currentValue = value ?? defaultValue;
  const initialDocRef = useRef(currentValue);

  useEffect(() => {
    onChangeRef.current = onChange;
    onBlurRef.current = onBlur;
  }, [onBlur, onChange]);

  useEffect(() => {
    if (!hostRef.current) return;

    const base: Extension[] = [
      lineNumbers(),
      foldGutter(),
      history(),
      indentOnInput(),
      bracketMatching(),
      highlightActiveLine(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChangeRef.current?.(update.state.doc.toString());
      }),
      EditorView.domEventHandlers({
        blur: (_event, view) => {
          onBlurRef.current?.(view.state.doc.toString());
        }
      }),
      EditorView.theme({
        "&": {
          minHeight: `${minRows * 1.25 + 1.5}rem`,
          maxHeight: `${maxRows * 1.25 + 1.5}rem`,
          overflow: "auto",
          border: "1px solid var(--line)",
          borderRadius: "0.375rem",
          backgroundColor: "var(--input)",
          color: "var(--text)"
        },
        ".cm-scroller": {
          fontFamily: "var(--font-code)",
          fontSize: "12px",
          lineHeight: "1.25rem"
        },
        ".cm-content": {
          caretColor: "#ffffff",
          padding: "0.75rem 0"
        },
        ".cm-gutters": {
          backgroundColor: "rgba(0,0,0,0.2)",
          color: "var(--muted)",
          borderRightColor: "var(--line-soft)"
        },
        ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.04)" },
        ".cm-activeLineGutter": { backgroundColor: "rgba(255,255,255,0.06)" },
        ".cm-cursor": {
          borderLeft: "3px solid #ffffff",
          marginLeft: "-1px"
        },
        ".cm-tooltip": {
          backgroundColor: "#111822",
          border: "1px solid var(--line)",
          borderRadius: "0.375rem",
          color: "var(--text)"
        },
        ".cm-tooltip-autocomplete ul li[aria-selected]": {
          backgroundColor: "rgba(77,195,109,0.22)",
          color: "var(--text)"
        },
        ".cm-diagnostic-error": { borderLeftColor: "var(--danger)" }
      })
    ];

    if (language === "json") base.push(json(), lintGutter(), linter(jsonParseLinter()));
    if (completionKind === "minecraft-components") {
      base.push(autocompletion({ override: [minecraftComponentCompletionSource] }));
    }

    const view = new EditorView({
      state: EditorState.create({ doc: initialDocRef.current, extensions: base }),
      parent: hostRef.current
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [completionKind, language, maxRows, minRows]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || value === undefined) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  return <div ref={hostRef} />;
}
