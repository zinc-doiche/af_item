"use client";

import { Trash2 } from "lucide-react";

import { DEFAULT_COMPONENT_VALUES, ITEM_COMPONENTS } from "@/lib/shared/item-components";
import type { ItemRecord, JsonValue } from "@/lib/server/types";
import { CodeEditor } from "./code-editor";
import { clone } from "./helpers";

type EditorFormProps = {
  itemKey: string;
  item: ItemRecord;
  onKeyChange: (key: string) => void;
  onItemChange: (item: ItemRecord) => void;
};

function stringify(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

const editorLabelClass = "text-base font-semibold";
const iconButtonClass =
  "inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--line)] text-[var(--danger)] transition hover:bg-white/[0.06]";

export function EditorForm({ itemKey, item, onKeyChange, onItemChange }: EditorFormProps) {
  const components = item.components || {};
  const availableComponents = ITEM_COMPONENTS.filter((key) => !components[key]);

  function update(next: Partial<ItemRecord>) {
    onItemChange({ ...item, ...next });
  }

  function updateComponent(key: string, raw: string) {
    try {
      const parsed = JSON.parse(raw) as JsonValue;
      onItemChange({ ...item, components: { ...components, [key]: parsed } });
    } catch {
      return;
    }
  }

  function addComponent(key: string) {
    if (!key) return;
    onItemChange({
      ...item,
      components: { ...components, [key]: clone(DEFAULT_COMPONENT_VALUES[key] ?? {}) }
    });
  }

  function removeComponent(key: string) {
    const next = { ...components };
    delete next[key];
    onItemChange({ ...item, components: next });
  }

  return (
    <section className="panel space-y-6 p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className={editorLabelClass}>아이템 키</span>
          <input value={itemKey} onChange={(event) => onKeyChange(event.target.value)} spellCheck={false} />
        </label>
        <label className="space-y-2">
          <span className={editorLabelClass}>Minecraft ID</span>
          <input value={item.id} onChange={(event) => update({ id: event.target.value })} spellCheck={false} />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className={editorLabelClass}>이름</span>
          <input value={item.display_name || ""} onChange={(event) => update({ display_name: event.target.value })} />
        </label>
      </div>

      <label className="block space-y-2">
        <span className={editorLabelClass}>Lore</span>
        <CodeEditor
          language="text"
          value={(item.lore || []).map((line) => (typeof line === "string" ? line : JSON.stringify(line))).join("\n")}
          onChange={(value) => update({ lore: value.split("\n") })}
          minRows={4}
          maxRows={14}
        />
      </label>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className={editorLabelClass}>Components</h3>
          <select className="max-w-[260px]" value="" onChange={(event) => addComponent(event.target.value)}>
            <option value="">컴포넌트 추가</option>
            {availableComponents.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3">
          {Object.entries(components).map(([key, value]) => (
            <div className="component-grid rounded-md border border-[var(--line-soft)] bg-black/15 p-3" key={key}>
              <div>
                <div className="font-code text-sm">{key}</div>
              </div>
              <button
                className={iconButtonClass}
                title="컴포넌트 삭제"
                onClick={() => removeComponent(key)}
                type="button"
              >
                <Trash2 size={18} />
              </button>
              <CodeEditor
                key={key}
                language="json"
                completionKind="minecraft-components"
                defaultValue={stringify(value)}
                onBlur={(raw) => updateComponent(key, raw)}
                minRows={4}
                maxRows={18}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
