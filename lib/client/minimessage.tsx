import type { CSSProperties, ReactNode } from "react";
import { MiniMessage, TextDecoration, type Component, type Style } from "minimessage-js/dist/minimessage.esm.js";

const miniMessage = MiniMessage.miniMessage();

type DecorationState = "not_set" | "false" | "true";

function decorationEnabled(style: Style, decoration: TextDecoration) {
  return style.decoration(decoration) === ("true" satisfies DecorationState);
}

function componentStyle(component: Component, inherited: CSSProperties, fallbackColor: string): CSSProperties {
  const style = component.style();
  const next: CSSProperties = { ...inherited };
  next.color = component.color()?.asHexString() || next.color || fallbackColor;

  if (decorationEnabled(style, TextDecoration.BOLD)) next.fontWeight = 700;
  if (decorationEnabled(style, TextDecoration.ITALIC)) next.fontStyle = "italic";

  const decorations: string[] = [];
  if (decorationEnabled(style, TextDecoration.UNDERLINED)) decorations.push("underline");
  if (decorationEnabled(style, TextDecoration.STRIKETHROUGH)) decorations.push("line-through");
  if (decorations.length) next.textDecoration = decorations.join(" ");

  return next;
}

function renderComponent(component: Component, inherited: CSSProperties, fallbackColor: string, nodes: ReactNode[]) {
  const style = componentStyle(component, inherited, fallbackColor);
  const content = component.type === "text" ? component.content() : "";

  if (content) {
    nodes.push(
      <span key={`${content}-${nodes.length}`} style={style}>
        {content}
      </span>
    );
  }

  for (const child of component.children()) {
    renderComponent(child, style, fallbackColor, nodes);
  }
}

function fallbackText(input: string, fallbackColor: string) {
  return [
    <span key="fallback" style={{ color: fallbackColor }}>
      {input}
    </span>
  ];
}

export function renderMiniMessage(input: unknown, fallbackColor = "#ffffff"): ReactNode {
  const text = typeof input === "string" ? input : JSON.stringify(input ?? "");

  try {
    const component = miniMessage.deserialize(text);
    const nodes: ReactNode[] = [];
    renderComponent(component, { color: fallbackColor }, fallbackColor, nodes);
    return nodes.length ? nodes : fallbackText(text, fallbackColor);
  } catch {
    return fallbackText(text, fallbackColor);
  }
}
