import type { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";

import { DEFAULT_COMPONENT_VALUES, ITEM_COMPONENTS } from "@/lib/shared/item-components";

function snippet(label: string, apply: string, detail: string): Completion {
  return { label, apply, detail, type: "property" };
}

const minecraftComponentSnippets: Completion[] = [
  snippet("item_model", '"item_model": "minecraft:paper"', "Minecraft 1.21.4 item model"),
  snippet(
    "custom_model_data",
    '"custom_model_data": {\n  "floats": [],\n  "flags": [],\n  "strings": [],\n  "colors": []\n}',
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
  const word = context.matchBefore(/[\w:.-]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;

  return {
    from: word.from,
    options: [...componentCompletions, ...minecraftComponentSnippets],
    validFor: /^[\w:.-]*$/
  };
}
