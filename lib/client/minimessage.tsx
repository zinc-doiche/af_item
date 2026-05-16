import type { CSSProperties, ReactNode } from "react";

const COLORS: Record<string, string> = {
  black: "#000000",
  dark_blue: "#0000aa",
  dark_green: "#00aa00",
  dark_aqua: "#00aaaa",
  dark_red: "#aa0000",
  dark_purple: "#aa00aa",
  gold: "#ffaa00",
  gray: "#aaaaaa",
  grey: "#aaaaaa",
  dark_gray: "#555555",
  dark_grey: "#555555",
  blue: "#5555ff",
  green: "#55ff55",
  aqua: "#55ffff",
  red: "#ff5555",
  light_purple: "#ff55ff",
  yellow: "#ffff55",
  white: "#ffffff",
  brown: "#aa5500"
};

function normalizeColor(token: string) {
  const value = token.toLowerCase().replace(/^minecraft:/, "");
  if (COLORS[value]) return COLORS[value];
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  return null;
}

export function renderMiniMessage(input: unknown, fallbackColor = "#ffffff"): ReactNode {
  const text = typeof input === "string" ? input : JSON.stringify(input ?? "");
  const parts = text.split(/(<[^>]+>)/g).filter(Boolean);
  const nodes: ReactNode[] = [];
  const style: CSSProperties = { color: fallbackColor };

  for (const part of parts) {
    const tag = part.match(/^<([^>]+)>$/)?.[1];
    if (tag) {
      const clean = tag.replace("/", "").toLowerCase();
      const color = normalizeColor(clean);
      if (color) style.color = color;
      if (clean === "bold" || clean === "b") style.fontWeight = 700;
      if (clean === "italic" || clean === "i") style.fontStyle = "italic";
      if (clean === "underlined" || clean === "u") style.textDecoration = "underline";
      if (clean === "reset") {
        style.color = fallbackColor;
        delete style.fontWeight;
        delete style.fontStyle;
        delete style.textDecoration;
      }
      continue;
    }

    nodes.push(
      <span key={`${part}-${nodes.length}`} style={{ ...style }}>
        {part}
      </span>
    );
  }

  return nodes.length ? nodes : text;
}
