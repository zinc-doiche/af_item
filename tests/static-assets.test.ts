import fs from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import { createProjectConfig } from "@/lib/server/project-config";
import { contentAssetRootForKey, serveStaticFile } from "@/lib/server/static-assets";

const tmpRoot = path.join(process.cwd(), ".test-tmp-static");

async function resetTmp() {
  await fs.rm(tmpRoot, { recursive: true, force: true });
  await fs.mkdir(tmpRoot, { recursive: true });
}

describe("static asset serving", () => {
  beforeEach(resetTmp);

  it("keeps bundled data assets under public instead of the ignored data folder route", async () => {
    const projectRoot = process.cwd();

    await expect(fs.access(path.join(projectRoot, "public/data-assets/barrier.png"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(projectRoot, "public/data-assets/mojangles.ttf"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(projectRoot, "public/data-assets/neodgm.ttf"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(projectRoot, "public/data-assets/d2coding.ttf"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(projectRoot, "app/data-assets/[...assetPath]/route.ts"))).rejects.toThrow();
  });

  it("serves only allowlisted extensions", async () => {
    const rootPath = path.join(tmpRoot, "data");
    await fs.mkdir(rootPath, { recursive: true });
    await fs.writeFile(path.join(rootPath, "secret.yml"), "token: secret", "utf8");

    const response = await serveStaticFile(rootPath, ["secret.yml"], { allowedExtensions: [".png", ".ttf"] });

    expect(response.status).toBe(403);
  });

  it("keeps traversal attempts outside the static root", async () => {
    const rootPath = path.join(tmpRoot, "data");
    await fs.mkdir(rootPath, { recursive: true });
    await fs.writeFile(path.join(tmpRoot, "secret.png"), "not really a png", "utf8");

    const response = await serveStaticFile(rootPath, ["..", "secret.png"], { allowedExtensions: [".png"] });

    expect(response.status).toBe(400);
  });

  it("maps ItemsAdder content keys to resourcepack assets, not the whole content root", async () => {
    const config = createProjectConfig({
      projectRoot: tmpRoot,
      itemsAdderRoot: path.join(tmpRoot, "plugins/ItemsAdder")
    });

    expect(contentAssetRootForKey("animalfarm", config)).toBe(
      path.join(config.allowedContentRoots[0].rootPath, "resourcepack/assets")
    );
  });
});
