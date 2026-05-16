import fs from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import { createProjectConfig } from "@/lib/server/project-config";

const tmpRoot = path.join(process.cwd(), ".test-tmp-config");

async function resetTmp() {
  await fs.rm(tmpRoot, { recursive: true, force: true });
  await fs.mkdir(tmpRoot, { recursive: true });
}

describe("project config file", () => {
  beforeEach(resetTmp);

  it("uses pluginsDir from af-item-admin config to derive plugin paths", async () => {
    const configPath = path.join(tmpRoot, "config/af-item-admin.config.json");
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify({ pluginsDir: "server-plugins" }), "utf8");

    const config = createProjectConfig({ projectRoot: tmpRoot, configFilePath: configPath });

    expect(config.pluginsDir).toBe(path.join(tmpRoot, "server-plugins"));
    expect(config.itemsDir).toBe(path.join(tmpRoot, "server-plugins/AnimalFarm/items"));
    expect(config.itemsAdderRoot).toBe(path.join(tmpRoot, "server-plugins/ItemsAdder"));
  });

  it("lets explicit test inputs override the config file", async () => {
    const configPath = path.join(tmpRoot, "config/af-item-admin.config.json");
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify({ pluginsDir: "server-plugins" }), "utf8");

    const config = createProjectConfig({
      projectRoot: tmpRoot,
      configFilePath: configPath,
      pluginsDir: "override-plugins"
    });

    expect(config.pluginsDir).toBe(path.join(tmpRoot, "override-plugins"));
    expect(config.itemsDir).toBe(path.join(tmpRoot, "override-plugins/AnimalFarm/items"));
  });
});
