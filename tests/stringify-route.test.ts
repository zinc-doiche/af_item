import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/stringify/route";

async function stringify(items: unknown) {
  const response = await POST(
    new Request("http://localhost/api/stringify", {
      method: "POST",
      body: JSON.stringify({ items })
    })
  );
  const payload = (await response.json()) as { data: { raw: string }; error: string | null };
  return payload.data;
}

describe("stringify route", () => {
  it("omits empty components from yaml output", async () => {
    const payload = await stringify({
      new_item: {
        id: "minecraft:paper",
        display_name: "새 아이템",
        lore: [],
        components: {}
      }
    });

    expect(payload.raw).toContain("new_item:");
    expect(payload.raw).not.toContain("components:");
  });

  it("keeps non-empty components in yaml output", async () => {
    const payload = await stringify({
      crystal: {
        id: "minecraft:paper",
        components: {
          custom_data: { merchant: "ORE_SELL_PRICE_INCREASE_PERCENT" }
        }
      }
    });

    expect(payload.raw).toContain("components:");
    expect(payload.raw).toContain("custom_data:");
  });
});
