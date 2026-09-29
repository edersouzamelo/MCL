import { describe, expect, it } from "vitest";
import {
  CURRENT_MONITOR_EXTRACTION_VERSION,
  monitorSceneNeedsRefresh,
  stampMonitorExtraction,
} from "@/modules/grupamento/monitor-content/version";

describe("monitor extraction versioning", () => {
  it("marks newly extracted scenes with the current presentation engine version", () => {
    const extraction = stampMonitorExtraction({
      scenes: [{
        sceneType: "TEXT",
        title: "Slide 1",
        payload: { layoutVersion: 2, searchableText: ["exemplo"] },
        sourcePage: 1,
      }],
      assets: [],
      warnings: [],
    });
    expect(extraction.scenes[0].payload.extractionVersion).toBe(CURRENT_MONITOR_EXTRACTION_VERSION);
    expect(monitorSceneNeedsRefresh({ payload: extraction.scenes[0].payload })).toBe(false);
  });

  it("treats persisted scenes from older engines as stale", () => {
    expect(monitorSceneNeedsRefresh({ payload: { layoutVersion: 2 } })).toBe(true);
    expect(monitorSceneNeedsRefresh({ payload: { layoutVersion: 2, extractionVersion: CURRENT_MONITOR_EXTRACTION_VERSION - 1 } })).toBe(true);
  });
});
