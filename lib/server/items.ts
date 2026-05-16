import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { z } from "zod";

import { projectConfig } from "./project-config";
import type { ItemsMap, ProjectConfig } from "./types";

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema)
  ])
);

const itemSchema = z
  .object({
    id: z.string().min(1, "id is required"),
    display_name: z.string().optional(),
    lore: z.array(jsonValueSchema).optional(),
    components: z.record(z.string(), jsonValueSchema).optional()
  })
  .passthrough();

const itemsSchema = z.record(z.string().min(1, "item key is required"), itemSchema);

export function validateItems(data: unknown) {
  return itemsSchema.safeParse(data);
}

export async function ensureItemsFile(config: ProjectConfig = projectConfig) {
  await fs.mkdir(config.itemsDir, { recursive: true });
  try {
    await fs.access(config.defaultItemsFile);
  } catch {
    await fs.writeFile(config.defaultItemsFile, YAML.stringify({}, { lineWidth: 0 }), "utf8");
  }
}

export async function listItemFiles(config: ProjectConfig = projectConfig) {
  await ensureItemsFile(config);
  const entries = await fs.readdir(config.itemsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(ya?ml)$/i.test(entry.name))
    .map((entry) => path.join(config.itemsDir, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

export async function readItems(config: ProjectConfig = projectConfig) {
  const files = await listItemFiles(config);
  const items: ItemsMap = {};
  const itemSources: Record<string, string> = {};
  const fileData: Record<string, ItemsMap> = {};

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = YAML.parse(raw) || {};
    const validation = validateItems(parsed);

    if (!validation.success) {
      fileData[filePath] = {};
      continue;
    }

    fileData[filePath] = validation.data as ItemsMap;
    for (const [key, value] of Object.entries(validation.data as ItemsMap)) {
      items[key] = value;
      itemSources[key] = filePath;
    }
  }

  return { files, items, itemSources, fileData };
}

function isInside(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function normalizeSourcePath(sourcePath: string | undefined, knownFiles: Set<string>, config: ProjectConfig) {
  if (!sourcePath) return config.defaultItemsFile;
  const resolved = path.resolve(sourcePath);
  if (!isInside(config.itemsDir, resolved)) return config.defaultItemsFile;
  if (!/\.(ya?ml)$/i.test(resolved)) return config.defaultItemsFile;
  if (knownFiles.has(resolved)) return resolved;
  return resolved;
}

export async function writeItems(
  items: ItemsMap,
  incomingSources: Record<string, string> = {},
  config: ProjectConfig = projectConfig
) {
  const validation = validateItems(items);
  if (!validation.success) {
    throw new Error(validation.error.issues[0]?.message || "Invalid items payload");
  }

  const files = await listItemFiles(config);
  const knownFiles = new Set(files);
  const groupedItems = new Map<string, ItemsMap>();
  const nextSources: Record<string, string> = {};

  for (const [key, item] of Object.entries(items)) {
    const sourcePath = normalizeSourcePath(incomingSources[key], knownFiles, config);
    nextSources[key] = sourcePath;
    groupedItems.set(sourcePath, {
      ...(groupedItems.get(sourcePath) || {}),
      [key]: item
    });
  }

  const writeTargets = new Set([...files, ...groupedItems.keys()]);
  for (const filePath of writeTargets) {
    const content = groupedItems.get(filePath) || {};
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, YAML.stringify(content, { lineWidth: 0 }), "utf8");
  }

  return nextSources;
}

export async function createItemsFile(fileName: string, config: ProjectConfig = projectConfig) {
  const trimmed = String(fileName || "").trim();
  if (!trimmed) throw new Error("File name is required.");

  const normalized = /\.(ya?ml)$/i.test(trimmed) ? trimmed : `${trimmed}.yml`;
  if (!/^[a-zA-Z0-9_-]+\.(yml|yaml)$/i.test(normalized)) {
    throw new Error("File name can contain only letters, numbers, underscores, and hyphens.");
  }

  await fs.mkdir(config.itemsDir, { recursive: true });
  const filePath = path.join(config.itemsDir, normalized);

  try {
    await fs.access(filePath);
    throw new Error("YAML file already exists.");
  } catch (error) {
    if (error instanceof Error && error.message === "YAML file already exists.") throw error;
  }

  await fs.writeFile(filePath, YAML.stringify({}, { lineWidth: 0 }), "utf8");
  return filePath;
}
