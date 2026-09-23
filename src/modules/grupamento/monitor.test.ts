import { describe, expect, it } from "vitest";
import {
  CCO_DEFAULT_LOOP_DELAY_SECONDS,
  CCO_PI_SCROLL_PX_PER_SECOND,
  defaultCcoMonitorConfig,
  readableMonitorCycleMs,
} from "@/modules/grupamento/monitor";

describe("CCOL monitor defaults", () => {
  it("uses a 10 second transition for every default monitor loop", () => {
    expect(CCO_DEFAULT_LOOP_DELAY_SECONDS).toBe(10);
    expect(defaultCcoMonitorConfig().every((monitor) => monitor.delaySeconds === 10)).toBe(true);
  });

  it("extends the PI screen long enough to scroll at a readable speed", () => {
    const offset = 2600;
    const cycleMs = readableMonitorCycleMs(offset, 10, "pis");
    const expectedTravelMs = (offset / CCO_PI_SCROLL_PX_PER_SECOND) * 1000;

    expect(cycleMs).toBeGreaterThanOrEqual(expectedTravelMs);
    expect(cycleMs).toBeGreaterThan(10_000);
  });

  it("keeps short screens on the configured base cycle", () => {
    expect(readableMonitorCycleMs(0, 10, "overview")).toBe(10_000);
  });
});
