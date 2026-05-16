import { FilePlus, Plus, RefreshCw } from "lucide-react";
import Image from "next/image";

import { renderMiniMessage } from "@/lib/client/minimessage";
import { baseName, fileDisplayName, modelDataLabel, normalizeItem } from "./helpers";
import type { ItemsMap, Thumbnail } from "@/lib/shared/types";

type SidebarProps = {
  files: string[];
  items: ItemsMap;
  itemSources: Record<string, string>;
  thumbnails: Record<string, Thumbnail>;
  selectedKey: string;
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (key: string) => void;
  onAddItem: (filePath: string) => void;
  onCreateFile: () => void;
  onRefresh: () => void;
};

const iconButtonClass =
  "inline-flex h-10 w-10 items-center justify-center rounded-md border border-[var(--line)] text-[var(--text)] transition hover:bg-white/[0.06]";

export function Sidebar({
  files,
  items,
  itemSources,
  thumbnails,
  selectedKey,
  query,
  onQueryChange,
  onSelect,
  onAddItem,
  onCreateFile,
  onRefresh
}: SidebarProps) {
  const normalizedQuery = query.trim().toLowerCase();

  return (
    <aside className="border-r border-[var(--line-soft)] bg-black/25 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">AF Item</h1>
        </div>
        <button className={iconButtonClass} title="새로고침" onClick={onRefresh} type="button">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="mt-6 flex gap-2">
        <input
          type="search"
          placeholder="아이템 이름, 키, id 검색"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <button className={iconButtonClass} title="YAML 파일 추가" onClick={onCreateFile} type="button">
          <FilePlus size={18} />
        </button>
      </div>

      <div className="item-list-scroll mt-4 grid gap-3 overflow-auto pr-1">
        {files.map((filePath) => {
          const entries = Object.entries(items)
            .filter(([key]) => itemSources[key] === filePath)
            .filter(([key, item]) => {
              if (!normalizedQuery) return true;
              const normalized = normalizeItem(item);
              return [key, normalized.id, normalized.display_name]
                .join(" ")
                .toLowerCase()
                .includes(normalizedQuery);
            });

          return (
            <details className="rounded-lg border border-[var(--line-soft)] bg-white/[0.03]" key={filePath}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3">
                <span>
                  <span className="block text-sm font-semibold">{baseName(filePath)}</span>
                  <span className="text-xs text-[var(--muted)]">{entries.length} items</span>
                </span>
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--line)]"
                  title={`${fileDisplayName(filePath)}에 아이템 추가`}
                  onClick={(event) => {
                    event.preventDefault();
                    onAddItem(filePath);
                  }}
                  type="button"
                >
                  <Plus size={15} />
                </button>
              </summary>
              <div className="grid gap-1 px-2 pb-2">
                {entries.map(([key, item]) => {
                  const normalized = normalizeItem(item);
                  const selected = selectedKey === key;
                  return (
                    <button
                      className={`grid grid-cols-[38px_1fr] gap-3 rounded-md p-2 text-left transition ${
                        selected ? "bg-[rgba(77,195,109,0.16)]" : "hover:bg-white/[0.05]"
                      }`}
                      key={key}
                      onClick={() => onSelect(key)}
                      type="button"
                    >
                      <Image
                        className="h-9 w-9 rounded object-cover [image-rendering:pixelated]"
                        src={thumbnails[key]?.url || "/anif_icon.png"}
                        alt=""
                        width={36}
                        height={36}
                        unoptimized
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{renderMiniMessage(normalized.display_name || key)}</span>
                        <span className="block truncate text-xs text-[var(--muted)]">
                          {normalized.id} · {modelDataLabel(normalized)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </aside>
  );
}
