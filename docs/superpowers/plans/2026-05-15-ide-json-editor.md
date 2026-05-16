# IDE JSON Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace textarea-based Lore and Components editing with a CodeMirror-powered IDE-style editor for Minecraft Java 1.21.4 item data.

**Architecture:** Add a small reusable client-only `CodeEditor` wrapper around CodeMirror 6, plus a lightweight Minecraft component completion source. Keep validation and autocomplete dictionary-based for version 1, using local `ITEM_COMPONENTS` and `DEFAULT_COMPONENT_VALUES` as the source of truth.

**Tech Stack:** Next.js App Router, React, TypeScript, CodeMirror 6, Vitest, ESLint.

---

## File Structure

- Modify `package.json` and `package-lock.json`: add CodeMirror dependencies.
- Create `components/item-admin/code-editor.tsx`: reusable CodeMirror wrapper for JSON and text editing.
- Create `lib/client/minecraft-component-completions.ts`: static Minecraft 1.21.4 completion/snippet source.
- Modify `components/item-admin/editor-form.tsx`: replace `LineNumberedTextarea` with `CodeEditor`.
- Modify `components/item-admin/sidebar.tsx`: remove sidebar subtitle.
- Modify `tests/ui-structure.test.ts`: assert the new editor structure and sidebar copy.

## Dependencies

Install:

```bash
npm install @codemirror/autocomplete @codemirror/commands @codemirror/lang-json @codemirror/language @codemirror/lint @codemirror/state @codemirror/view
```

Expected: package install succeeds with no vulnerabilities.

## Task 1: Lock UI Contracts With Failing Tests

**Files:**
- Modify: `tests/ui-structure.test.ts`

- [ ] **Step 1: Add assertions for sidebar and CodeMirror adoption**

Add/adjust tests so they assert:

```ts
expect(sidebarSource).not.toContain("AnimalFarm items YAML");
expect(editorSource).toContain('import { CodeEditor } from "./code-editor";');
expect(editorSource).not.toContain("function LineNumberedTextarea");
expect(editorSource).toContain('language="text"');
expect(editorSource).toContain('language="json"');
expect(editorSource).toContain('completionKind="minecraft-components"');
```

- [ ] **Step 2: Run the UI contract test**

Run:

```bash
npm test -- tests/ui-structure.test.ts
```

Expected: FAIL because `CodeEditor` does not exist yet and `LineNumberedTextarea` is still used.

## Task 2: Add Minecraft Completion Source

**Files:**
- Create: `lib/client/minecraft-component-completions.ts`
- Test: `tests/ui-structure.test.ts`

- [ ] **Step 1: Implement completion data**

Create:

```ts
import type { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";

import { DEFAULT_COMPONENT_VALUES, ITEM_COMPONENTS } from "@/lib/shared/item-components";

function snippet(label: string, apply: string, detail: string): Completion {
  return { label, apply, detail, type: "property" };
}

const minecraftComponentSnippets: Completion[] = [
  snippet("item_model", '"item_model": "minecraft:paper"', "Minecraft 1.21.4 item model"),
  snippet(
    "custom_model_data",
    '"custom_model_data": {\\n  "floats": [],\\n  "flags": [],\\n  "strings": [],\\n  "colors": []\\n}',
    "Minecraft 1.21.4 custom model data"
  ),
  snippet("custom_name", '"custom_name": { "text": "Custom Name" }', "text component"),
  snippet("lore", '"lore": [{ "text": "Lore" }]', "text component list"),
  { label: "true", type: "constant", detail: "boolean" },
  { label: "false", type: "constant", detail: "boolean" },
  { label: "{}", apply: "{}", type: "constant", detail: "object" },
  { label: "[]", apply: "[]", type: "constant", detail: "array" }
];

const componentCompletions: Completion[] = ITEM_COMPONENTS.map((key) => ({
  label: key,
  apply: `"${key}": ${JSON.stringify(DEFAULT_COMPONENT_VALUES[key] ?? {}, null, 2)}`,
  detail: "Minecraft 1.21.4 component",
  type: "property"
}));

export function minecraftComponentCompletionSource(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[\\w:.-]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;

  return {
    from: word.from,
    options: [...componentCompletions, ...minecraftComponentSnippets],
    validFor: /^[\\w:.-]*$/
  };
}
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS after dependencies are installed.

## Task 3: Create CodeEditor Wrapper

**Files:**
- Create: `components/item-admin/code-editor.tsx`

- [ ] **Step 1: Implement the wrapper**

Create a client component that initializes `EditorView` in a ref, applies JSON or text extensions, and keeps editor content synced:

```tsx
"use client";

import { autocompletion } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, defaultHighlightStyle, foldGutter, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter, lintGutter } from "@codemirror/lint";
import { EditorState } from "@codemirror/state";
import { EditorView, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";
import { useEffect, useMemo, useRef } from "react";

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
  const currentValue = value ?? defaultValue;

  const extensions = useMemo(() => {
    const base = [
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
        if (update.docChanged) onChange?.(update.state.doc.toString());
      }),
      EditorView.domEventHandlers({
        blur: (_event, view) => {
          onBlur?.(view.state.doc.toString());
        }
      }),
      EditorView.theme({
        "&": {
          minHeight: `${minRows * 1.25 + 1.5}rem`,
          maxHeight: `${maxRows * 1.25 + 1.5}rem`,
          overflow: "auto",
          border: "1px solid var(--line)",
          borderRadius: "0.375rem",
          backgroundColor: "var(--input)"
        },
        ".cm-scroller": { fontFamily: "var(--font-code)", fontSize: "12px", lineHeight: "1.25rem" },
        ".cm-content": { padding: "0.75rem 0" },
        ".cm-gutters": { backgroundColor: "rgba(0,0,0,0.2)", color: "var(--muted)", borderRightColor: "var(--line-soft)" },
        ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.04)" },
        ".cm-activeLineGutter": { backgroundColor: "rgba(255,255,255,0.06)" }
      })
    ];

    if (language === "json") base.push(json(), lintGutter(), linter(jsonParseLinter()));
    if (completionKind === "minecraft-components") {
      base.push(autocompletion({ override: [minecraftComponentCompletionSource] }));
    }
    return base;
  }, [completionKind, language, maxRows, minRows, onBlur, onChange]);

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      state: EditorState.create({ doc: currentValue, extensions }),
      parent: hostRef.current
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [extensions]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || value === undefined) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  return <div ref={hostRef} />;
}
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

## Task 4: Replace Editors In EditorForm

**Files:**
- Modify: `components/item-admin/editor-form.tsx`

- [ ] **Step 1: Remove the textarea helper and import CodeEditor**

Replace the local `LineNumberedTextarea` implementation with:

```ts
import { CodeEditor } from "./code-editor";
```

Keep `stringify`, `editorLabelClass`, and `updateComponent`.

- [ ] **Step 2: Use CodeEditor for Lore**

Replace Lore editor with:

```tsx
<CodeEditor
  language="text"
  value={(item.lore || []).map((line) => (typeof line === "string" ? line : JSON.stringify(line))).join("\n")}
  onChange={(value) => update({ lore: value.split("\n") })}
  minRows={4}
  maxRows={14}
/>
```

- [ ] **Step 3: Use CodeEditor for component JSON**

Replace component JSON textarea with:

```tsx
<CodeEditor
  key={key}
  language="json"
  completionKind="minecraft-components"
  defaultValue={stringify(value)}
  onBlur={(raw) => updateComponent(key, raw)}
  minRows={4}
  maxRows={18}
/>
```

- [ ] **Step 4: Run the UI contract test**

Run:

```bash
npm test -- tests/ui-structure.test.ts
```

Expected: PASS.

## Task 5: Full Verification

**Files:**
- No production edits unless failures require fixes.

- [ ] **Step 1: Run all tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: exit 0.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: Next.js build succeeds.

- [ ] **Step 5: Browser smoke test**

Open:

```text
http://localhost:3000
```

Expected:
- Sidebar subtitle is gone.
- Lore editor has IDE-like line numbers and key handling.
- Component JSON editor validates malformed JSON.
- Autocomplete offers Minecraft 1.21.4 component keys and snippets.

## Execution Options

1. Subagent-Driven: split implementation into dependency/editor/completion/form integration tasks.
2. Inline Execution: implement in this session with checkpoints after each task.
