"use client";

import { Copy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client/api";
import type { ItemsMap, ItemsPayload, Thumbnail } from "@/lib/shared/types";
import { DirtyBar } from "./dirty-bar";
import { EditorForm } from "./editor-form";
import {
  clone,
  createDefaultItem,
  fileDisplayName,
  itemRecordsEqual,
  modelDataLabel,
  nextAvailableKey,
  normalizeItem,
  resolvePayloadSelection
} from "./helpers";
import { PreviewPanel } from "./preview-panel";
import { Sidebar } from "./sidebar";

type Toast = {
  message: string;
  kind: "ok" | "error";
};

export function ItemAdminClient() {
  const [files, setFiles] = useState<string[]>([]);
  const [items, setItems] = useState<ItemsMap>({});
  const [itemSources, setItemSources] = useState<Record<string, string>>({});
  const [thumbnails, setThumbnails] = useState<Record<string, Thumbnail>>({});
  const [selectedKey, setSelectedKey] = useState("");
  const [draftKey, setDraftKey] = useState("");
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [yaml, setYaml] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  const selectedItem = useMemo(() => (selectedKey ? normalizeItem(items[selectedKey]) : null), [items, selectedKey]);
  const selectedFile = selectedKey ? itemSources[selectedKey] : files[0] || "";

  function showToast(message: string, kind: Toast["kind"] = "ok") {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 2600);
  }

  function applyPayload(payload: Partial<ItemsPayload>) {
    const nextItems = payload.items || {};
    const nextSources = payload.itemSources || {};
    setFiles(payload.files || files);
    setItems(nextItems);
    setItemSources(nextSources);
    setThumbnails(payload.thumbnails || {});
    const nextKey = resolvePayloadSelection(selectedKey, nextItems);
    setSelectedKey(nextKey);
    setDraftKey(nextKey);
  }

  const loadItems = useCallback(async () => {
    const payload = await apiRequest<ItemsPayload>("/api/items");
    applyPayload(payload);
    setDirty(false);
    showToast("아이템 YAML을 불러왔습니다.");
  }, [files, selectedKey]);

  useEffect(() => {
    loadItems().catch((error) => showToast(error.message, "error"));
  }, []);

  useEffect(() => {
    if (!selectedItem || !selectedKey) {
      setYaml("");
      return;
    }

    const controller = new AbortController();
    apiRequest<{ raw: string }>("/api/stringify", {
      method: "POST",
      body: JSON.stringify({ items: { [draftKey || selectedKey]: selectedItem } }),
      signal: controller.signal
    })
      .then((payload) => setYaml(payload.raw))
      .catch(() => setYaml(""));

    return () => controller.abort();
  }, [selectedItem, selectedKey, draftKey]);

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
    }

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const editorTitle = useMemo(() => {
    if (!selectedItem || !selectedKey) return "아이템 없음";
    return `${draftKey || selectedKey} · ${modelDataLabel(selectedItem)}`;
  }, [selectedItem, selectedKey, draftKey]);

  function updateSelectedKey(nextKey: string) {
    setDraftKey(nextKey.trim());
    setDirty(true);
  }

  function updateSelectedItem(nextItem: NonNullable<typeof selectedItem>) {
    if (!selectedKey) return;
    if (selectedItem && itemRecordsEqual(selectedItem, nextItem)) return;
    setItems((current) => ({ ...current, [selectedKey]: nextItem }));
    setDirty(true);
  }

  function commitDraftKey(nextItems: ItemsMap, nextSources: Record<string, string>, nextThumbnails: Record<string, Thumbnail>) {
    const normalizedKey = draftKey.trim();
    if (!selectedKey || !normalizedKey || normalizedKey === selectedKey) {
      return { items: nextItems, sources: nextSources, thumbs: nextThumbnails, key: selectedKey };
    }

    if (nextItems[normalizedKey]) {
      throw new Error("이미 존재하는 아이템 키입니다.");
    }

    const renamedItems = Object.fromEntries(
      Object.entries(nextItems).map(([key, value]) => (key === selectedKey ? [normalizedKey, value] : [key, value]))
    );
    const renamedSources = { ...nextSources, [normalizedKey]: nextSources[selectedKey] };
    const renamedThumbs = { ...nextThumbnails, [normalizedKey]: nextThumbnails[selectedKey] };
    delete renamedSources[selectedKey];
    delete renamedThumbs[selectedKey];
    return { items: renamedItems, sources: renamedSources, thumbs: renamedThumbs, key: normalizedKey };
  }

  async function saveItems() {
    setPending(true);
    try {
      const committed = commitDraftKey(items, itemSources, thumbnails);
      const payload = await apiRequest<Omit<ItemsPayload, "files">>("/api/items", {
        method: "PUT",
        body: JSON.stringify({ items: committed.items, itemSources: committed.sources })
      });
      setItems(payload.items);
      setItemSources(payload.itemSources);
      setThumbnails(payload.thumbnails);
      setSelectedKey(committed.key);
      setDraftKey(committed.key);
      setDirty(false);
      showToast("YAML 파일에 저장했습니다.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "저장에 실패했습니다.", "error");
    } finally {
      setPending(false);
    }
  }

  function addItem(filePath = selectedFile) {
    if (!filePath) {
      showToast("먼저 YAML 파일을 만들어 주세요.", "error");
      return;
    }
    const key = nextAvailableKey(items, `${fileDisplayName(filePath)}_item`);
    setItems((current) => ({
      ...current,
      [key]: createDefaultItem()
    }));
    setItemSources((current) => ({ ...current, [key]: filePath }));
    setThumbnails((current) => ({
      ...current,
      [key]: { url: "/data-assets/barrier.png", modelReference: null, width: null, height: null, usedBarrier: true }
    }));
    setSelectedKey(key);
    setDraftKey(key);
    setDirty(true);
  }

  function duplicateItem() {
    if (!selectedItem || !selectedKey) return;
    const key = nextAvailableKey(items, `${selectedKey}_copy`);
    setItems((current) => ({ ...current, [key]: clone(selectedItem) }));
    setItemSources((current) => ({ ...current, [key]: itemSources[selectedKey] }));
    setThumbnails((current) => ({ ...current, [key]: thumbnails[selectedKey] }));
    setSelectedKey(key);
    setDraftKey(key);
    setDirty(true);
  }

  function deleteItem() {
    if (!selectedKey || !window.confirm(`${selectedKey} 아이템을 삭제할까요?`)) return;
    const nextItems = { ...items };
    const nextSources = { ...itemSources };
    const nextThumbs = { ...thumbnails };
    delete nextItems[selectedKey];
    delete nextSources[selectedKey];
    delete nextThumbs[selectedKey];
    const nextKey = Object.keys(nextItems)[0] || "";
    setItems(nextItems);
    setItemSources(nextSources);
    setThumbnails(nextThumbs);
    setSelectedKey(nextKey);
    setDraftKey(nextKey);
    setDirty(true);
  }

  async function createYamlFile() {
    const name = window.prompt("새 YAML 파일 이름을 입력하세요.", "new_category");
    if (!name) return;
    try {
      const payload = await apiRequest<ItemsPayload & { createdFile: string }>("/api/files", {
        method: "POST",
        body: JSON.stringify({ name })
      });
      applyPayload(payload);
      showToast(`${fileDisplayName(payload.createdFile)} 파일을 만들었습니다.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "파일 생성에 실패했습니다.", "error");
    }
  }

  return (
    <main className="shell pb-24">
      <Sidebar
        files={files}
        items={items}
        itemSources={itemSources}
        thumbnails={thumbnails}
        selectedKey={selectedKey}
        query={query}
        onQueryChange={setQuery}
        onSelect={(key) => {
          setSelectedKey(key);
          setDraftKey(key);
        }}
        onAddItem={addItem}
        onCreateFile={createYamlFile}
        onRefresh={() => loadItems().catch((error) => showToast(error.message, "error"))}
      />

      <section className="min-w-0 p-5">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">선택한 아이템</p>
            <h2 className="mt-1 text-2xl font-semibold">{editorTitle}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-md border border-[var(--line)] px-3 py-2" onClick={duplicateItem} type="button">
              <Copy className="mr-2 inline" size={16} />
              복제
            </button>
          </div>
        </header>

        {selectedItem ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
            <EditorForm itemKey={draftKey} item={selectedItem} onKeyChange={updateSelectedKey} onItemChange={updateSelectedItem} />
            <PreviewPanel item={selectedItem} thumbnail={thumbnails[selectedKey]} yaml={yaml} />
          </div>
        ) : (
          <div className="panel flex min-h-[320px] items-center justify-center p-8 text-center text-[var(--muted)]">
            왼쪽 목록에서 아이템을 선택하거나 새 아이템을 추가하세요.
          </div>
        )}
      </section>

      <DirtyBar dirty={dirty} pending={pending} onReset={loadItems} onDelete={deleteItem} onSave={saveItems} />
      {toast ? (
        <div
          className={`fixed bottom-5 left-5 right-5 z-20 rounded-md border px-4 py-3 shadow-lg md:left-auto md:max-w-md ${
            toast.kind === "error" ? "border-[var(--danger)] bg-[#1d1114]" : "border-[var(--line)] bg-[#111822]"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </main>
  );
}
