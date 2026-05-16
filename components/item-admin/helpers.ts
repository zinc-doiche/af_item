import type { ItemRecord, ItemsMap } from "@/lib/shared/types";

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function baseName(filePath: string) {
  return filePath.split(/[\\/]/).pop() || filePath;
}

export function fileDisplayName(filePath: string) {
  return baseName(filePath).replace(/\.(ya?ml)$/i, "");
}

export function normalizeItem(item: Partial<ItemRecord> = {}): ItemRecord {
  return {
    id: typeof item.id === "string" && item.id ? item.id : "minecraft:paper",
    display_name: typeof item.display_name === "string" ? item.display_name : "",
    lore: Array.isArray(item.lore) ? item.lore : [],
    components:
      item.components && typeof item.components === "object" && !Array.isArray(item.components)
        ? item.components
        : {}
  };
}

export function modelDataLabel(item: ItemRecord) {
  const customModelData = item.components?.custom_model_data;
  if (!customModelData || typeof customModelData !== "object" || Array.isArray(customModelData)) return "model 없음";
  const floats = (customModelData as { floats?: unknown }).floats;
  return Array.isArray(floats) && floats.length ? `model ${floats[0]}` : "model 없음";
}

export function nextAvailableKey(items: ItemsMap, seed: string) {
  let index = 1;
  let key = seed;
  while (items[key]) {
    index += 1;
    key = `${seed}_${index}`;
  }
  return key;
}
