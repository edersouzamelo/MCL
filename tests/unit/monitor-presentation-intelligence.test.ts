import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  localBackgroundForText,
  presentationTextColor,
  readableTextColor,
} from "@/modules/grupamento/monitor-content/presentation-intelligence";
import type { MonitorSlideElement, MonitorSlideTextElement } from "@/modules/grupamento/monitor-content/types";

describe("monitor presentation intelligence", () => {
  it("forces readable contrast when black text sits on a dark local shape", () => {
    const text: MonitorSlideTextElement = {
      kind: "text", text: "Situação logística", x: .15, y: .1, w: .5, h: .1, z: 20,
      color: "#111827", role: "title",
    };
    const elements: MonitorSlideElement[] = [
      { kind: "shape", x: .1, y: .05, w: .7, h: .2, z: 10, fill: "#0F172A" },
      text,
    ];
    expect(localBackgroundForText(text, elements, true)).toBe("#0F172A");
    expect(presentationTextColor(text, elements, true)).toBe("#F8FAFC");
  });

  it("keeps an original color when it already has sufficient contrast", () => {
    expect(readableTextColor("#0F172A", "#FFFFFF", "body")).toBe("#0F172A");
    expect(contrastRatio("#0F172A", "#FFFFFF")).toBeGreaterThan(4.5);
  });

  it("uses the slide canvas only when no local background covers the text", () => {
    const text: MonitorSlideTextElement = { kind: "text", text: "Legenda", x: .1, y: .7, w: .2, h: .08, z: 3, color: "#111827" };
    expect(localBackgroundForText(text, [text], false)).toBe("#020617");
    expect(presentationTextColor(text, [text], false)).toBe("#F8FAFC");
  });
});
