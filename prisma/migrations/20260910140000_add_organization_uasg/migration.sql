ALTER TABLE "Organization" ADD COLUMN "uasg" TEXT;
CREATE UNIQUE INDEX "Organization_uasg_key" ON "Organization"("uasg");
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_uasg_format" CHECK ("uasg" IS NULL OR "uasg" ~ '^[0-9]{6}$');
