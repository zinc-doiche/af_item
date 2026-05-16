import { audit } from "@/lib/server/audit";
import { fail, ok } from "@/lib/server/api-response";
import { readItems, validateItems, writeItems } from "@/lib/server/items";
import { buildThumbnailMap } from "@/lib/server/thumbnails";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { files, items, itemSources } = await readItems();
    const thumbnails = await buildThumbnailMap(items);
    return ok({ files, items, itemSources, thumbnails });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load items", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const validation = validateItems(body?.items);
    if (!validation.success) {
      return fail(validation.error.issues[0]?.message || "Invalid items payload", 400);
    }

    const itemSources = await writeItems(validation.data as never, body?.itemSources || {});
    const thumbnails = await buildThumbnailMap(validation.data as never);
    audit({ action: "items.save", user: "vpn", detail: { count: Object.keys(validation.data).length } });
    return ok({ items: validation.data, itemSources, thumbnails });
  } catch (error) {
    if (error instanceof SyntaxError) return fail("Invalid JSON body", 400);
    return fail(error instanceof Error ? error.message : "Failed to save items", 500);
  }
}
