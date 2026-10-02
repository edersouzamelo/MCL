import { describe, expect, it } from "vitest";
import {
  MONITOR_ACTIVE_POLL_MS,
  MONITOR_IDLE_POLL_MS,
  monitorOperationalHour,
  monitorPollIntervalMs,
} from "@/modules/grupamento/monitor-sync-policy";

describe("monitor sync policy", () => {
  it("uses one-minute heartbeat during the CCOL operating window", () => {
    expect(monitorOperationalHour(new Date("2026-10-02T13:00:00Z"))).toBe(true);
    expect(monitorPollIntervalMs({ now: new Date("2026-10-02T13:00:00Z"), hidden: false })).toBe(MONITOR_ACTIVE_POLL_MS);
  });

  it("uses ten-minute heartbeat outside the operating window or while hidden", () => {
    expect(monitorOperationalHour(new Date("2026-10-02T22:00:00Z"))).toBe(false);
    expect(monitorPollIntervalMs({ now: new Date("2026-10-02T22:00:00Z"), hidden: false })).toBe(MONITOR_IDLE_POLL_MS);
    expect(monitorPollIntervalMs({ now: new Date("2026-10-02T13:00:00Z"), hidden: true })).toBe(MONITOR_IDLE_POLL_MS);
  });

  it("backs off after failures and caps retries at ten minutes", () => {
    expect(monitorPollIntervalMs({ consecutiveFailures: 1 })).toBe(60_000);
    expect(monitorPollIntervalMs({ consecutiveFailures: 2 })).toBe(120_000);
    expect(monitorPollIntervalMs({ consecutiveFailures: 3 })).toBe(300_000);
    expect(monitorPollIntervalMs({ consecutiveFailures: 4 })).toBe(600_000);
    expect(monitorPollIntervalMs({ consecutiveFailures: 12 })).toBe(600_000);
  });
});
