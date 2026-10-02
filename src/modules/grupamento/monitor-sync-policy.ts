export const MONITOR_ACTIVE_POLL_MS = 60_000;
export const MONITOR_IDLE_POLL_MS = 10 * 60_000;
export const MONITOR_TIME_ZONE = "America/Campo_Grande";

const RETRY_BACKOFF_MS = [60_000, 2 * 60_000, 5 * 60_000, 10 * 60_000] as const;

export function monitorOperationalHour(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: MONITOR_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now));
  return Number.isFinite(hour) && hour >= 9 && hour < 17;
}

export function monitorPollIntervalMs(input: {
  now?: Date;
  hidden?: boolean;
  consecutiveFailures?: number;
}) {
  const failures = Math.max(0, Math.trunc(input.consecutiveFailures ?? 0));
  if (failures > 0) return RETRY_BACKOFF_MS[Math.min(failures - 1, RETRY_BACKOFF_MS.length - 1)];
  if (input.hidden) return MONITOR_IDLE_POLL_MS;
  return monitorOperationalHour(input.now) ? MONITOR_ACTIVE_POLL_MS : MONITOR_IDLE_POLL_MS;
}
