import type { ItemRecord, ItemsMap, Thumbnail } from "@/lib/server/types";

export type { ItemRecord, ItemsMap, Thumbnail };

export type ItemsPayload = {
  files: string[];
  items: ItemsMap;
  itemSources: Record<string, string>;
  thumbnails: Record<string, Thumbnail>;
};
