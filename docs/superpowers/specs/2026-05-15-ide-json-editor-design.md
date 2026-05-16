# IDE JSON Editor Design

## Goal
Replace the textarea-like Lore and Components editors with a lightweight IDE-style editing experience for Minecraft Java 1.21.4 item data.

## Context
The current `LineNumberedTextarea` gives line numbers and auto height, but it is still a textarea. It cannot naturally provide parse diagnostics, bracket matching, indentation behavior, or contextual completion without rebuilding editor behavior by hand.

Minecraft target version is Java 1.21.4. The editor should reflect the 1.21.4 data component model, especially `minecraft:item_model` and the newer object-shaped `minecraft:custom_model_data` patterns. The local source of truth remains `lib/shared/item-components.ts`, with version-specific snippets layered on top.

Reference material:
- CodeMirror autocomplete and lint APIs: https://codemirror.net/docs/ref/
- CodeMirror lint behavior: https://codemirror.net/examples/lint/
- Minecraft data component format: https://minecraft.wiki/w/Data_component_format
- Minecraft 1.21.4 item model component notes: https://minecraft.wiki/w/Data_component_format/item_model

## Recommended Approach
Use CodeMirror 6 through a small local React wrapper instead of extending textarea behavior.

CodeMirror is lighter than Monaco and fits the app's current scope. Monaco is closest to VS Code, but it adds more bundle and SSR complexity than this project needs right now. CodeMirror gives us the important IDE primitives: line numbers, syntax highlighting, bracket matching, close brackets, indentation, lint diagnostics, keymaps, and custom completion sources.

## User Experience
Components JSON editor:
- Shows line numbers and JSON syntax highlighting.
- Validates JSON on edit and marks parse errors inline.
- Supports automatic bracket closing for `{}`, `[]`, and quotes.
- Supports indentation and Tab behavior.
- Provides completion for Minecraft item component names from `ITEM_COMPONENTS`.
- Provides 1.21.4-oriented snippets for common values such as `item_model`, `custom_model_data`, `custom_name`, `lore`, booleans, arrays, and objects.
- Keeps edits local while typing and commits parsed JSON on blur or valid change.
- If JSON is invalid, preserves the text and does not overwrite the parsed component value until fixed.

Lore editor:
- Uses the same editor shell for visual consistency.
- Uses a plain text mode rather than JSON validation.
- Keeps one lore line per editor line and writes back to `item.lore`.
- Supports line numbers, indentation, active line, selection, and editor keymaps.

Layout:
- Editors keep a minimum height.
- Editors grow with content until a sensible maximum height, then scroll internally.
- Manual resize handles are not shown.
- Component cards no longer show the `JSON 데이터` helper label.
- The left sidebar subtitle `AnimalFarm items YAML` is removed.

## Autocomplete Scope
Version 1 should be dictionary and snippet based, not a full type checker.

Sources:
- Component keys from `ITEM_COMPONENTS`.
- Default snippets from `DEFAULT_COMPONENT_VALUES`.
- Minecraft 1.21.4 helpers:
  - `item_model`: `"minecraft:paper"`
  - `custom_model_data`: `{ "floats": [], "flags": [], "strings": [], "colors": [] }`
  - common booleans: `true`, `false`
  - JSON shells: `{}`, `[]`

Out of scope for version 1:
- Full Minecraft schema validation.
- Type-aware nested property checking for every component.
- Resource-pack path discovery for item model IDs.
- Monaco-level language server behavior.

## Component Design
Create a reusable client component:

`components/item-admin/code-editor.tsx`
- Owns CodeMirror setup.
- Accepts `language: "json" | "text"`.
- Accepts `value` or `defaultValue`.
- Emits `onChange(value)` and `onBlur(value)`.
- Accepts `minRows` and `maxRows`.
- Accepts optional `completionKind: "minecraft-components"`.

Create editor support helpers:

`lib/client/minecraft-component-completions.ts`
- Builds CodeMirror completion entries from `ITEM_COMPONENTS` and `DEFAULT_COMPONENT_VALUES`.
- Adds 1.21.4 snippets.
- Does not perform heavyweight type checking.

`lib/client/json-validation.ts`
- Converts JSON parse failures into CodeMirror diagnostics when custom diagnostics are needed.
- Prefer `jsonParseLinter()` from `@codemirror/lang-json` first.

## Data Flow
For Lore:
1. Build editor text from `item.lore.join("\n")`.
2. On change, split by `\n` and call `update({ lore })`.

For component JSON:
1. Render each component value as pretty JSON.
2. On valid JSON blur, call `updateComponent(key, raw)`.
3. On invalid JSON, keep editor content and show diagnostics; do not write invalid parsed data back into the item.

## Testing
Automated tests should cover source-level UI contracts because the current test stack does not mount React components in a browser:
- Sidebar subtitle removed.
- `EditorForm` imports and uses `CodeEditor`.
- The old textarea-based `LineNumberedTextarea` is removed.
- Components editor uses JSON mode and Minecraft completion mode.
- Lore editor uses text mode.
- Preview panel remains free of removed metadata labels.

Manual/browser checks:
- Open `http://localhost:3000`.
- Edit Lore and confirm line numbers, no resize handle, and line-per-lore behavior.
- Add a component and confirm JSON highlighting, bracket closing, indentation, and parse diagnostics.
- Trigger autocomplete in component JSON and confirm Minecraft 1.21.4 component suggestions/snippets appear.

## Risks
CodeMirror packages add bundle weight. Keep the wrapper small and avoid Monaco unless the experience is not good enough.

JSON component editors can temporarily contain invalid JSON. The UI must preserve invalid text without silently corrupting item data.

Autocomplete can become misleading if it implies full schema validation. Labels and implementation should keep version 1 as suggestions/snippets, not authoritative type checking.
