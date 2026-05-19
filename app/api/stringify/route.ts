import YAML from "yaml";

import { fail, ok } from "@/lib/server/api-response";
import { omitEmptyItemFields, validateItems } from "@/lib/server/items";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateItems(body?.items);
    if (!validation.success) {
      return fail(validation.error.issues[0]?.message || "Invalid items payload", 400);
    }
    return ok({ raw: YAML.stringify(omitEmptyItemFields(validation.data as never), { lineWidth: 0 }) });
  } catch (error) {
    if (error instanceof SyntaxError) return fail("Invalid JSON body", 400);
    return fail(error instanceof Error ? error.message : "Failed to stringify YAML", 400);
  }
}
