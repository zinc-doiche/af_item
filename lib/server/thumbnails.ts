import fs from "node:fs/promises";
import path from "node:path";

import { projectConfig } from "./project-config";
import type { ItemRecord, ItemsMap, ProjectConfig, Thumbnail } from "./types";

const BARRIER_THUMBNAIL: Thumbnail = {
  url: "/data-assets/barrier.png",
  modelReference: null,
  modelFile: null,
  textureFile: null,
  width: null,
  height: null,
  usedBarrier: true
};

const MAX_THUMBNAIL_SIZE = 128;

function getCustomModelData(item: ItemRecord) {
  const floats =
    item.components?.custom_model_data &&
    typeof item.components.custom_model_data === "object" &&
    !Array.isArray(item.components.custom_model_data)
      ? (item.components.custom_model_data as { floats?: unknown }).floats
      : undefined;

  if (!Array.isArray(floats) || floats.length === 0) return null;
  const value = Number(floats[0]);
  return Number.isFinite(value) ? value : null;
}

async function readJsonIfExists(filePath: string) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

export async function readPngSize(filePath: string) {
  try {
    const handle = await fs.open(filePath, "r");
    const buffer = Buffer.alloc(24);
    await handle.read(buffer, 0, 24, 0);
    await handle.close();

    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;

    if (!isPng) return null;
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  } catch {
    return null;
  }
}

type GeneratedDefinition = {
  model?: {
    entries?: Array<{
      threshold?: number | string;
      model?: { model?: string };
    }>;
  };
  overrides?: Array<{
    predicate?: { custom_model_data?: number | string };
    model?: string;
  }>;
};

type ModelJson = {
  textures?: Record<string, unknown>;
};

async function findGeneratedItemDefinition(baseItemId: string, config: ProjectConfig): Promise<GeneratedDefinition | null> {
  for (const rootPath of config.generatedItemRoots) {
    const definition = await readJsonIfExists(path.join(/* turbopackIgnore: true */ rootPath, `${baseItemId}.json`));
    if (definition) return definition;
  }
  return null;
}

function extractModelReference(definition: GeneratedDefinition | null, threshold: number) {
  const entries = definition?.model?.entries;
  if (Array.isArray(entries)) {
    const entry = entries.find((candidate) => Number(candidate.threshold) === Number(threshold));
    return entry?.model?.model || null;
  }

  const overrides = definition?.overrides;
  if (Array.isArray(overrides)) {
    const entry = overrides.find((candidate) => Number(candidate?.predicate?.custom_model_data) === Number(threshold));
    return entry?.model || null;
  }

  return null;
}

function splitNamespacedPath(value: string | null, fallbackNamespace: string) {
  if (!value) return null;
  const index = value.indexOf(":");
  if (index === -1) {
    return { namespace: fallbackNamespace, resourcePath: value };
  }
  return {
    namespace: value.slice(0, index),
    resourcePath: value.slice(index + 1)
  };
}

function isInside(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function resolveFileInAllowedRoots(
  namespace: string,
  kind: "models" | "textures",
  resourcePath: string,
  extension: string,
  config: ProjectConfig
) {
  const normalizedPath = resourcePath.replace(/\\/g, "/");

  for (const contentRoot of config.allowedContentRoots) {
    const absolutePath = path.join(
      /* turbopackIgnore: true */
      contentRoot.rootPath,
      "resourcepack/assets",
      namespace,
      kind,
      `${normalizedPath}.${extension}`
    );
    if (!isInside(contentRoot.rootPath, absolutePath)) continue;
    try {
      await fs.access(absolutePath);
      return {
        contentKey: contentRoot.key,
        absolutePath,
        relativePath: path.relative(contentRoot.rootPath, absolutePath).replace(/\\/g, "/")
      };
    } catch {
      continue;
    }
  }

  return null;
}

async function resolveModelFile(modelReference: string, config: ProjectConfig) {
  const modelInfo = splitNamespacedPath(modelReference, "minecraft");
  if (!modelInfo) return null;
  return resolveFileInAllowedRoots(modelInfo.namespace, "models", modelInfo.resourcePath, "json", config);
}

function getTextureCandidates(modelJson: ModelJson) {
  if (!modelJson?.textures || typeof modelJson.textures !== "object") return [];
  return Object.values(modelJson.textures).filter((value): value is string => typeof value === "string" && !value.startsWith("#"));
}

async function resolveTextureFile(modelReference: string, config: ProjectConfig) {
  const modelFile = await resolveModelFile(modelReference, config);
  if (!modelFile) return null;

  const modelJson = await readJsonIfExists(modelFile.absolutePath);
  if (!modelJson) return null;

  const modelInfo = splitNamespacedPath(modelReference, "minecraft");
  if (!modelInfo) return null;

  for (const textureReference of getTextureCandidates(modelJson)) {
    const textureInfo = splitNamespacedPath(textureReference, modelInfo.namespace);
    if (!textureInfo) continue;

    const textureFile = await resolveFileInAllowedRoots(
      textureInfo.namespace,
      "textures",
      textureInfo.resourcePath,
      "png",
      config
    );
    if (textureFile) {
      const size = await readPngSize(textureFile.absolutePath);
      if (
        !size ||
        size.width > MAX_THUMBNAIL_SIZE ||
        size.height > MAX_THUMBNAIL_SIZE
      ) {
        return null;
      }
      const publicPath = textureFile.relativePath.replace(/^resourcepack\/assets\//, "");
      return {
        url: `/content-assets/${textureFile.contentKey}/${publicPath}`,
        modelReference,
        modelFile: modelFile.absolutePath,
        textureFile: textureFile.absolutePath,
        width: size?.width ?? null,
        height: size?.height ?? null,
        usedBarrier: false
      };
    }
  }

  return null;
}

export async function buildThumbnail(item: ItemRecord, config: ProjectConfig = projectConfig): Promise<Thumbnail> {
  const modelData = getCustomModelData(item);
  const baseItemId = String(item.id || "").split(":").pop();
  if (!baseItemId || modelData === null) return { ...BARRIER_THUMBNAIL };

  const definition = await findGeneratedItemDefinition(baseItemId, config);
  const modelReference = extractModelReference(definition, modelData);
  const resolved = modelReference ? await resolveTextureFile(modelReference, config) : null;

  return resolved || { ...BARRIER_THUMBNAIL };
}

export async function buildThumbnailMap(items: ItemsMap, config: ProjectConfig = projectConfig) {
  const entries = await Promise.all(
    Object.entries(items).map(async ([key, item]) => [key, await buildThumbnail(item, config)] as const)
  );
  return Object.fromEntries(entries);
}
