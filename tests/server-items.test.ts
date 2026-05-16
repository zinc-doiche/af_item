import fs from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import {
  createItemsFile,
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
