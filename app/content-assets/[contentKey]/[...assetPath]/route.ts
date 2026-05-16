import { NextResponse } from "next/server";

import { contentAssetRootForKey, serveStaticFile } from "@/lib/server/static-assets";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ contentKey: string; assetPath: string[] }> }
) {
  const { contentKey, assetPath } = await params;
  const rootPath = contentAssetRootForKey(contentKey);
  if (!rootPath) {
    return NextResponse.json({ data: null, error: "Unknown content root" }, { status: 404 });
  }
  return serveStaticFile(rootPath, assetPath, { allowedExtensions: [".json", ".ogg", ".png"] });
}
