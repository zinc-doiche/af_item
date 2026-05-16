import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("item admin UI structure", () => {
  it("uses the shorter sidebar product name and keeps file groups collapsed initially", () => {
    const source = read("components/item-admin/sidebar.tsx");

    expect(source).toContain(">AF Item</h1>");
    expect(source).not.toContain(">AF Item Admin</h1>");
    expect(source).not.toContain("AnimalFarm items YAML");
    expect(source).not.toContain("key={filePath} open");
  });

  it("uses one shared editor label style for primary fields and components", () => {
    const source = read("components/item-admin/editor-form.tsx");

    expect(source).toContain('const editorLabelClass = "text-base font-semibold";');
    expect(source.match(/className=\{editorLabelClass\}/g)).toHaveLength(5);
    expect(source).toContain('<span className={editorLabelClass}>이름</span>');
    expect(source).toContain("<h3 className={editorLabelClass}>Components</h3>");
  });

  it("uses CodeMirror-backed editors for Lore and component JSON", () => {
    const source = read("components/item-admin/editor-form.tsx");
    const editorSource = read("components/item-admin/code-editor.tsx");

    expect(source).toContain('import { CodeEditor } from "./code-editor";');
    expect(source).not.toContain("function LineNumberedTextarea");
    expect(source).toContain('language="text"');
    expect(source).toContain('language="json"');
    expect(source).toContain('completionKind="minecraft-components"');
    expect(source).not.toContain("JSON 데이터");
    expect(editorSource).toContain('".cm-cursor"');
    expect(editorSource).toContain('borderLeft: "3px solid #ffffff"');
    expect(editorSource).toContain('caretColor: "#ffffff"');
  });

  it("uses a shared square icon button style for toolbar actions", () => {
    const sidebarSource = read("components/item-admin/sidebar.tsx");
    const editorSource = read("components/item-admin/editor-form.tsx");

    expect(sidebarSource).toContain("inline-flex h-10 w-10 items-center justify-center");
    expect(sidebarSource.match(/className=\{iconButtonClass\}/g)).toHaveLength(2);
    expect(sidebarSource).toContain("<RefreshCw size={18}");
    expect(sidebarSource).toContain("<FilePlus size={18}");
    expect(editorSource).toContain("inline-flex h-10 w-10 items-center justify-center");
    expect(editorSource).toContain("Trash2 size={18}");
  });

  it("does not show secondary metadata labels in the preview panel", () => {
    const source = read("components/item-admin/preview-panel.tsx");

    expect(source).not.toContain("modelDataLabel");
    expect(source).not.toContain("아이템 ID");
    expect(source).not.toContain("모델 데이터");
    expect(source).not.toContain("YAML 미리보기");
    expect(source).not.toContain("저장 전 미리보기");
  });
});
