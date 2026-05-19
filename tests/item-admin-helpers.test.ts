import { describe, expect, it } from "vitest";

import {
  createDefaultItem,
  formatComponentYaml,
  itemRecordsEqual,
  parseComponentYaml,
  parseLoreText,
  resolvePayloadSelection
} from "@/components/item-admin/helpers";

describe("item admin helpers", () => {
  it("treats cloned item records as equal", () => {
    const item = {
      id: "minecraft:paper",
      display_name: "Test",
      lore: ["line one"],
      components: {
        custom_data: { role: "fragment" },
        custom_model_data: { floats: [777] }
      }
    };

    expect(itemRecordsEqual(item, JSON.parse(JSON.stringify(item)))).toBe(true);
  });

  it("does not select the first loaded item when there is no current selection", () => {
    expect(
      resolvePayloadSelection("", {
        apple: { id: "minecraft:apple" },
        paper: { id: "minecraft:paper" }
      })
    ).toBe("");
  });

  it("preserves the current selection when the item still exists", () => {
    expect(
      resolvePayloadSelection("paper", {
        apple: { id: "minecraft:apple" },
        paper: { id: "minecraft:paper" }
      })
    ).toBe("paper");
  });

  it("creates new items without placeholder lore or components", () => {
    expect(createDefaultItem()).toEqual({
      id: "minecraft:paper",
      display_name: "새 아이템",
      lore: [],
      components: {}
    });
  });

  it("keeps an empty lore editor value as an empty lore array", () => {
    expect(parseLoreText("")).toEqual([]);
    expect(parseLoreText("first\nsecond")).toEqual(["first", "second"]);
  });

  it("formats empty component objects as blank yaml", () => {
    expect(formatComponentYaml({})).toBe("");
  });

  it("round-trips component values through yaml", () => {
    const value = {
      merchant: "ORE_SELL_PRICE_INCREASE_PERCENT",
      nested: { enabled: true }
    };

    expect(parseComponentYaml(formatComponentYaml(value))).toEqual(value);
    expect(parseComponentYaml("merchant: ORE_SELL_PRICE_INCREASE_PERCENT")).toEqual({
      merchant: "ORE_SELL_PRICE_INCREASE_PERCENT"
    });
  });
});
