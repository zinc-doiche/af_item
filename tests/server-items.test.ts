import fs from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import {
  createItemsFile,
  ensureItemsFile,
  readItems,
  validateItems,
  writeItems
} from "@/lib/server/items";
import { createProjectConfig } from "@/lib/server/project-config";
import { buildThumbnail, readPngSize } from "@/lib/server/thumbnails";

const tmpRoot = path.join(process.cwd(), ".test-tmp");

async function resetTmp() {
  await fs.rm(tmpRoot, { recursive: true, force: true });
  await fs.mkdir(tmpRoot, { recursive: true });
}

function config() {
  return createProjectConfig({
    projectRoot: tmpRoot,
    itemsDir: path.join(tmpRoot, "plugins/AnimalFarm/items"),
    itemsAdderRoot: path.join(tmpRoot, "plugins/ItemsAdder")
  });
}

describe("item validation", () => {
  it("accepts an object map of items with string ids", () => {
    expect(
      validateItems({
        relic_fragment: {
          id: "minecraft:paper",
          lore: ["first line"],
          components: { custom_data: { role: "fragment" } }
        }
      }).success
    ).toBe(true);
  });

  it("rejects arrays, missing ids, and non-array lore", () => {
    expect(validateItems([]).success).toBe(false);
    expect(validateItems({ bad: { lore: [] } }).success).toBe(false);
    expect(validateItems({ bad: { id: "minecraft:paper", lore: "text" } }).success).toBe(false);
  });
});

describe("items storage", () => {
  beforeEach(resetTmp);

  it("creates and loads the default yaml file when no item files exist", async () => {
    const appConfig = config();

    const snapshot = await readItems(appConfig);

    expect(snapshot.files).toEqual([appConfig.defaultItemsFile]);
    expect(snapshot.items).toEqual({});
    await expect(fs.readFile(appConfig.defaultItemsFile, "utf8")).resolves.toBe("{}\n");
  });

  it("loads item maps from existing yaml files and tracks each item source", async () => {
    const appConfig = config();
    await ensureItemsFile(appConfig);
    const weaponsFile = path.join(appConfig.itemsDir, "weapons.yml");
    await fs.writeFile(
      weaponsFile,
      [
        "bronze_sword:",
        "  id: minecraft:iron_sword",
        "  display_name: Bronze Sword",
        "  lore:",
        "    - Forged for tests",
        "  components:",
        "    custom_data:",
        "      tier: bronze"
      ].join("\n"),
      "utf8"
    );

    const snapshot = await readItems(appConfig);

    expect(snapshot.files).toEqual([appConfig.defaultItemsFile, weaponsFile]);
    expect(snapshot.items.bronze_sword).toMatchObject({
      id: "minecraft:iron_sword",
      display_name: "Bronze Sword",
      lore: ["Forged for tests"],
      components: { custom_data: { tier: "bronze" } }
    });
    expect(snapshot.itemSources.bronze_sword).toBe(weaponsFile);
    expect(snapshot.fileData[weaponsFile].bronze_sword.id).toBe("minecraft:iron_sword");
  });

  it("loads custom data and custom model data from one item component map", async () => {
    const appConfig = config();
    await fs.mkdir(appConfig.itemsDir, { recursive: true });
    await fs.writeFile(
      appConfig.defaultItemsFile,
      [
        "crystal_red_diamond:",
        "  id: minecraft:paper",
        "  components:",
        "    custom_model_data:",
        "      floats:",
        "        - 5000",
        "    custom_data:",
        "      merchant: ORE_SELL_PRICE_INCREASE_PERCENT"
      ].join("\n"),
      "utf8"
    );

    const snapshot = await readItems(appConfig);

    expect(snapshot.items.crystal_red_diamond.components).toEqual({
      custom_model_data: { floats: [5000] },
      custom_data: { merchant: "ORE_SELL_PRICE_INCREASE_PERCENT" }
    });
  });

  it("creates only safe yaml file names inside the configured items directory", async () => {
    const appConfig = config();

    await expect(createItemsFile("weapons", appConfig)).resolves.toBe(
      path.join(appConfig.itemsDir, "weapons.yml")
    );
    await expect(createItemsFile("../escape", appConfig)).rejects.toThrow(/file name/i);
    await expect(createItemsFile("nested/path", appConfig)).rejects.toThrow(/file name/i);
  });

  it("reads and writes items grouped by source yaml files", async () => {
    const appConfig = config();
    const firstFile = await createItemsFile("first", appConfig);
    const secondFile = await createItemsFile("second", appConfig);

    const sources = await writeItems(
      {
        apple: { id: "minecraft:apple", lore: [] },
        paper: { id: "minecraft:paper", components: { custom_data: { key: "value" } } }
      },
      { apple: firstFile, paper: secondFile },
      appConfig
    );

    const snapshot = await readItems(appConfig);

    expect(sources.apple).toBe(firstFile);
    expect(sources.paper).toBe(secondFile);
    expect(snapshot.files).toEqual([firstFile, appConfig.defaultItemsFile, secondFile]);
    expect(snapshot.items.apple.id).toBe("minecraft:apple");
    expect(snapshot.itemSources.paper).toBe(secondFile);
  });

  it("normalizes unsafe incoming item source paths back to the default file", async () => {
    const appConfig = config();

    const sources = await writeItems(
      { paper: { id: "minecraft:paper" } },
      { paper: path.join(tmpRoot, "outside.yml") },
      appConfig
    );

    expect(sources.paper).toBe(appConfig.defaultItemsFile);
    await expect(fs.readFile(appConfig.defaultItemsFile, "utf8")).resolves.toContain("paper:");
  });

  it("clears items from yaml files that no longer own any saved item", async () => {
    const appConfig = config();
    const firstFile = await createItemsFile("first", appConfig);
    const secondFile = await createItemsFile("second", appConfig);

    await writeItems(
      {
        apple: { id: "minecraft:apple" },
        paper: { id: "minecraft:paper" }
      },
      { apple: firstFile, paper: secondFile },
      appConfig
    );
    await writeItems({ paper: { id: "minecraft:paper" } }, { paper: secondFile }, appConfig);

    const firstContent = await fs.readFile(firstFile, "utf8");
    const secondContent = await fs.readFile(secondFile, "utf8");
    const snapshot = await readItems(appConfig);

    expect(firstContent).toBe("{}\n");
    expect(secondContent).toContain("paper:");
    expect(snapshot.items.apple).toBeUndefined();
    expect(snapshot.items.paper.id).toBe("minecraft:paper");
  });

  it("saves items to new safe yaml source paths inside the configured items directory", async () => {
    const appConfig = config();
    const newSource = path.join(appConfig.itemsDir, "generated.yml");

    const sources = await writeItems(
      { generated_item: { id: "minecraft:paper" } },
      { generated_item: newSource },
      appConfig
    );

    expect(sources.generated_item).toBe(newSource);
    await expect(fs.readFile(newSource, "utf8")).resolves.toContain("generated_item:");
  });
});

describe("thumbnail resolution", () => {
  beforeEach(resetTmp);

  async function writePngHeader(filePath: string, width: number, height: number) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const header = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);
    header.writeUInt32BE(width, 16);
    header.writeUInt32BE(height, 20);
    await fs.writeFile(filePath, header);
  }

  it("reads png dimensions from the png header", async () => {
    const pngPath = path.join(tmpRoot, "data/two-by-three.png");
    await writePngHeader(pngPath, 2, 3);

    await expect(readPngSize(pngPath)).resolves.toEqual({ width: 2, height: 3 });
  });

  it("falls back to barrier when no generated model can be resolved", async () => {
    const thumbnail = await buildThumbnail({ id: "minecraft:paper" }, config());

    expect(thumbnail).toMatchObject({
      url: "/data-assets/barrier.png",
      usedBarrier: true,
      width: null,
      height: null
    });
  });

  it("falls back to barrier when the resolved texture is larger than 128px on either side", async () => {
    const appConfig = config();
    const generatedRoot = appConfig.generatedItemRoots[0];
    const modelPath = path.join(
      appConfig.allowedContentRoots[0].rootPath,
      "resourcepack/assets/animalfarm/models/item/oversized.json"
    );
    const texturePath = path.join(
      appConfig.allowedContentRoots[0].rootPath,
      "resourcepack/assets/animalfarm/textures/item/oversized.png"
    );

    await fs.mkdir(generatedRoot, { recursive: true });
    await fs.writeFile(
      path.join(generatedRoot, "paper.json"),
      JSON.stringify({ overrides: [{ predicate: { custom_model_data: 777 }, model: "animalfarm:item/oversized" }] }),
      "utf8"
    );
    await fs.mkdir(path.dirname(modelPath), { recursive: true });
    await fs.writeFile(modelPath, JSON.stringify({ textures: { layer0: "animalfarm:item/oversized" } }), "utf8");
    await writePngHeader(texturePath, 129, 64);

    const thumbnail = await buildThumbnail(
      {
        id: "minecraft:paper",
        components: { custom_model_data: { floats: [777] } }
      },
      appConfig
    );

    expect(thumbnail).toMatchObject({
      url: "/data-assets/barrier.png",
      usedBarrier: true,
      width: null,
      height: null
    });
  });
});
