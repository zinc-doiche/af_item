import { audit } from "@/lib/server/audit";
import { fail, ok } from "@/lib/server/api-response";
import { createItemsFile, readItems } from "@/lib/server/items";
import { buildThumbnailMap } from "@/lib/server/thumbnails";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const createdFile = await createItemsFile(body?.name);
    const { files, items, itemSources } = await readItems();
    const thumbnails = await buildThumbnailMap(items);
    audit({ action: "files.create", user: "vpn", detail: { file: createdFile } });
    return ok({ createdFile, files, items, itemSources, thumbnails });
  } catch (error) {
    if (error instanceof SyntaxError) return fail("Invalid JSON body", 400);
    return fail(error instanceof Error ? error.message : "Failed to create YAML file", 400);
  }
}
