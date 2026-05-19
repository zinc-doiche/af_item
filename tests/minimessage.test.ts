import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import { renderMiniMessage } from "@/lib/client/minimessage";

type RenderedSpan = {
  text: string;
  style: Record<string, unknown>;
};

function spans(input: string): RenderedSpan[] {
  const rendered = renderMiniMessage(input);
  const nodes = Array.isArray(rendered) ? rendered : [rendered];
  return nodes.map((node) => {
    if (!isValidElement(node)) throw new Error("Expected span element");
    const props = node.props as { children: string; style: Record<string, unknown> };
    return { text: props.children, style: props.style };
  });
}

describe("MiniMessage rendering", () => {
  it("renders Adventure MiniMessage colors and decorations", () => {
    expect(spans("<red>Red <bold>Bold</bold></red> Plain")).toEqual([
      { text: "Red ", style: { color: "#ff5555" } },
      { text: "Bold", style: { color: "#ff5555", fontWeight: 700 } },
      { text: " Plain", style: { color: "#ffffff" } }
    ]);
  });

  it("renders gradients and rainbows from minimessage-js", () => {
    expect(spans("<gradient:#ff0000:#0000ff>AB</gradient>")).toEqual([
      { text: "A", style: { color: "#ff0000" } },
      { text: "B", style: { color: "#0000ff" } }
    ]);

    const rainbow = spans("<rainbow>abc</rainbow>");
    expect(rainbow.map((span) => span.text)).toEqual(["a", "b", "c"]);
    expect(new Set(rainbow.map((span) => span.style.color)).size).toBe(3);
  });

  it("renders script-like content as text, not html", () => {
    expect(spans("<click:run_command:/op @s><script>alert(1)</script></click>")).toEqual([
      {
        text: "<click:run_command:/op @s><script>alert(1)</script></click>",
        style: { color: "#ffffff" }
      }
    ]);
  });
});
