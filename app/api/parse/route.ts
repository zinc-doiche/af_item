import YAML from "yaml";

import { fail, ok } from "@/lib/server/api-response";
import { validateItems } from "@/lib/server/items";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = YAML.parse(body?.raw || "") || {};
    const validation = validateItems(data);
    if (!validation.success) {
      return fail(validation.error.issues[0]?.message || "Invalid items YAML", 400);
    }
    return ok({ items: validation.data });
  } catch (error) {
    if (error instanceof SyntaxError) return fail("Invalid JSON body", 400);
    return fail(error instanceof Error ? error.message : "Failed to parse YAML", 400);
  }
}
