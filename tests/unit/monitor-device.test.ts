import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  session: null as null | { user: { id: string; organizationId: string; roles: string[] } },
  token: "a".repeat(43),
  device: null as null | { id: string; monitorId: number; organizationId: string; label: string; expiresAt: Date },
}));
vi.mock("next-auth", () => ({ getServerSession: async () => state.session }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => state.token ? { value: state.token } : undefined }) }));
vi.mock("@/modules/auth/options", () => ({ authOptions: {} }));
vi.mock("@/server/db", () => ({ prisma: { monitorDisplayDevice: { findFirst: async () => state.device } } }));

import { getMonitorReader } from "@/modules/grupamento/monitor-device";

beforeEach(() => {
  state.session = null;
  state.token = "a".repeat(43);
  state.device = { id: "device-6", monitorId: 6, organizationId: "org-ccol", label: "HDMI 6", expiresAt: new Date("2027-01-01") };
});

describe("monitor display access", () => {
  it("restricts a paired notebook to its monitor", async () => {
    expect(await getMonitorReader(6)).toMatchObject({ organizationId: "org-ccol", monitorId: 6, device: true });
    expect(await getMonitorReader(7)).toBeNull();
  });
  it("requires a device credential or an authorized user", async () => {
    state.token = "";
    expect(await getMonitorReader(6)).toBeNull();
    state.session = { user: { id: "viewer", organizationId: "org-ccol", roles: ["COMMAND_VIEWER"] } };
    expect(await getMonitorReader(7)).toMatchObject({ organizationId: "org-ccol", device: false });
  });
});
