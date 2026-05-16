export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type ItemRecord = {
  id: string;
  display_name?: string;
  lore?: JsonValue[];
  components?: Record<string, JsonValue>;
  [key: string]: JsonValue | undefined;
};

export type ItemsMap = Record<string, ItemRecord>;

export type Thumbnail = {
  url: string;
  modelReference: string | null;
  modelFile?: string | null;
  textureFile?: string | null;
  width: number | null;
  height: number | null;
  usedBarrier: boolean;
};

export type ProjectConfig = {
  projectRoot: string;
  pluginsDir: string;
  itemsDir: string;
  defaultItemsFile: string;
  itemsAdderRoot: string;
  allowedContentRoots: Array<{
    key: string;
    rootPath: string;
  }>;
  generatedItemRoots: string[];
};
