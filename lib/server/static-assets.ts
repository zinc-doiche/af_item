import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { projectConfig } from "./project-config";
import type { ProjectConfig } from "./types";

const MIME_TYPES: Record<string, string> = {
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".json": "application/json"
};

type StaticFileOptions = {
  allowedExtensions: string[];
};

function isInside(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export async function serveStaticFile(rootPath: string, segments: string[], options: StaticFileOptions) {
  const filePath = path.resolve(rootPath, ...segments);
  if (!isInside(rootPath, filePath)) {
    return NextResponse.json({ data: null, error: "Invalid asset path" }, { status: 400 });
  }

  const ext = path.extname(filePath).toLowerCase();
  if (!options.allowedExtensions.includes(ext)) {
    return NextResponse.json({ data: null, error: "Unsupported asset type" }, { status: 403 });
  }

  try {
    const bytes = await fs.readFile(filePath);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch {
    return NextResponse.json({ data: null, error: "Asset not found" }, { status: 404 });
  }
}

export function contentAssetRootForKey(key: string, config: ProjectConfig = projectConfig) {
  const rootPath = config.allowedContentRoots.find((root) => root.key === key)?.rootPath;
  return rootPath ? path.join(rootPath, "resourcepack/assets") : null;
}
