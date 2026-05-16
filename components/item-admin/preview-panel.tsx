import Image from "next/image";

import { renderMiniMessage } from "@/lib/client/minimessage";
import type { ItemRecord, Thumbnail } from "@/lib/shared/types";

type PreviewPanelProps = {
  item: ItemRecord;
  thumbnail?: Thumbnail;
  yaml: string;
};

export function PreviewPanel({ item, thumbnail, yaml }: PreviewPanelProps) {
  return (
    <section className="panel space-y-5 p-5">
      <div className="grid gap-4 xl:grid-cols-[110px_1fr]">
        <div className="flex h-[110px] w-[110px] items-center justify-center rounded-md border border-[var(--line-soft)] bg-black/20">
          <Image
            className="max-h-[92px] max-w-[92px] object-contain [image-rendering:pixelated]"
            src={thumbnail?.url || "/anif_icon.png"}
            alt=""
            width={92}
            height={92}
            unoptimized
          />
        </div>
        <div className="minecraft-tooltip min-h-[110px]">
          <div className="text-lg">{renderMiniMessage(item.display_name || item.id, "#ffffff")}</div>
          <div className="mt-2 grid gap-1 text-sm">
            {(item.lore || []).map((line, index) => (
              <div key={index}>{renderMiniMessage(line, "#aaaaaa")}</div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <pre className="max-h-[420px] overflow-auto rounded-md border border-[var(--line)] bg-[var(--input)] p-4 text-xs leading-5">
          {yaml}
        </pre>
      </div>
    </section>
  );
}
