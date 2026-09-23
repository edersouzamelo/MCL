import { describe, expect, it } from "vitest";
import { CCO_DEFAULT_LOOP_DELAY_SECONDS, defaultCcoMonitorConfig } from "@/modules/grupamento/monitor";

describe("CCOL monitor defaults", () => {
  it("uses a 10 second transition for every default monitor loop", () => {
    expect(CCO_DEFAULT_LOOP_DELAY_SECONDS).toBe(10);
    expect(defaultCcoMonitorConfig().every((monitor) => monitor.delaySeconds === 10)).toBe(true);
  });
});
