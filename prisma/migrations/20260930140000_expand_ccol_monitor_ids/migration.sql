-- Preserve the existing eight monitor configurations and enrollments while
-- allowing the independent test monitor (9) and central display (10).
BEGIN;
ALTER TABLE "CcoMonitorConfiguration"
  DROP CONSTRAINT "CcoMonitorConfiguration_monitorId_check",
  ADD CONSTRAINT "CcoMonitorConfiguration_monitorId_check" CHECK ("monitorId" BETWEEN 1 AND 10);
ALTER TABLE "MonitorDisplayDevice"
  DROP CONSTRAINT "MonitorDisplayDevice_monitorId_check",
  ADD CONSTRAINT "MonitorDisplayDevice_monitorId_check" CHECK ("monitorId" BETWEEN 1 AND 10);
COMMIT;
