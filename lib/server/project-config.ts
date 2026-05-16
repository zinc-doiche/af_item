import fs from "node:fs";
import path from "node:path";

import type { ProjectConfig } from "./types";

type ConfigInput = {
  projectRoot?: string;
  configFilePath?: string;
  pluginsDir?: string;
  itemsDir?: string;
  itemsAdderRoot?: string;
};

type ConfigFile = {
  pluginsDir?: string;
  itemsDir?: string;
  itemsAdderRoot?: string;
};

function readConfigFile(projectRoot: string, configFilePath?: string): ConfigFile {
  const filePath = path.resolve(projectRoot, configFilePath || "config/af-item-admin.config.json");
  try {
    return JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ filePath, "utf8")) as ConfigFile;
  } catch {
    return {};
  }
}

function resolveFromProject(projectRoot: string, value: string) {
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(projectRoot, value);
}

export function createProjectConfig(input: ConfigInput = {}): ProjectConfig {
  const projectRoot = input.projectRoot
    ? path.resolve(input.projectRoot)
    : path.resolve(/* turbopackIgnore: true */ process.cwd());
  const fileConfig = readConfigFile(projectRoot, input.configFilePath);
  const pluginsDir = resolveFromProject(projectRoot, input.pluginsDir || process.env.AF_PLUGINS_DIR || fileConfig.pluginsDir || "plugins");
  const itemsDir = resolveFromProject(
    projectRoot,
    input.itemsDir ||
      process.env.AF_ITEMS_DIR ||
      fileConfig.itemsDir ||
      path.join(/* turbopackIgnore: true */ pluginsDir, "AnimalFarm/items")
  );
  const itemsAdderRoot = resolveFromProject(
    projectRoot,
    input.itemsAdderRoot || fileConfig.itemsAdderRoot || path.join(/* turbopackIgnore: true */ pluginsDir, "ItemsAdder")
  );

  return {
    projectRoot,
    pluginsDir,
    itemsDir,
    defaultItemsFile: path.join(itemsDir, "items.yml"),
    itemsAdderRoot,
    allowedContentRoots: [
      {
        key: "animalfarm",
        rootPath: path.join(itemsAdderRoot, "contents/animalfarm")
      },
      {
        key: "animalfarmsound",
        rootPath: path.join(itemsAdderRoot, "contents/animalfarmsound")
      }
    ],
    generatedItemRoots: [
      path.join(itemsAdderRoot, "output/generated/ia_overlay_1_21_6_plus/assets/minecraft/items"),
      path.join(itemsAdderRoot, "output/generated/assets/minecraft/items")
    ]
  };
}

export const projectConfig = createProjectConfig();
