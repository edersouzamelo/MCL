BEGIN;
LOCK TABLE "PcaItem" IN SHARE ROW EXCLUSIVE MODE;
-- Versions observed by MCL, not a reconstruction of the source's earlier history.
CREATE TABLE "PcaItemRevision" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pcaItemId" TEXT NOT NULL REFERENCES "PcaItem"("id") ON DELETE RESTRICT,
  "source" TEXT NOT NULL CHECK ("source" IN ('PNCP', 'PGC')),
  "version" INTEGER NOT NULL CHECK ("version" > 0),
  "kind" TEXT NOT NULL CHECK ("kind" IN ('BASELINE', 'OBSERVED')),
  "observedAt" TIMESTAMP(3) NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload" JSONB NOT NULL,
  UNIQUE ("pcaItemId", "source", "version")
);
CREATE INDEX "PcaItemRevision_recordedAt_id_idx" ON "PcaItemRevision"("recordedAt" DESC, "id");
ALTER TABLE "PcaItemRevision" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "PcaItemRevision" FROM anon, authenticated;

CREATE FUNCTION pca_revision_payload(item "PcaItem", source text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT CASE WHEN source = 'PNCP' THEN
    (to_jsonb(item) - ARRAY['pgcData','pgcSynchronizedAt','synchronizedAt','active']) ||
    jsonb_build_object('estimatedQuantity', (item)."estimatedQuantity"::text,
      'estimatedUnitValue', (item)."estimatedUnitValue"::text,
      'estimatedTotalValue', (item)."estimatedTotalValue"::text)
  ELSE jsonb_build_object('organizationId', (item)."organizationId", 'year', (item).year,
    'pncpControlNumber', (item)."pncpControlNumber", 'pncpItemId', (item)."pncpItemId",
    'records', COALESCE((SELECT jsonb_agg(value ORDER BY value::text)
      FROM jsonb_array_elements(COALESCE((item)."pgcData", '[]'::jsonb))), '[]'::jsonb)) END
$$;

INSERT INTO "PcaItemRevision" ("pcaItemId", source, version, kind, "observedAt", payload)
SELECT p.id, 'PNCP', 1, 'BASELINE', p."synchronizedAt", pca_revision_payload(p, 'PNCP') FROM "PcaItem" p;
INSERT INTO "PcaItemRevision" ("pcaItemId", source, version, kind, "observedAt", payload)
SELECT p.id, 'PGC', 1, 'BASELINE', p."pgcSynchronizedAt", pca_revision_payload(p, 'PGC')
FROM "PcaItem" p WHERE p."pgcSynchronizedAt" IS NOT NULL;

CREATE FUNCTION capture_pca_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE origin text; content jsonb; previous jsonb; n integer;
BEGIN
  FOREACH origin IN ARRAY ARRAY['PNCP','PGC'] LOOP
    IF origin = 'PGC' AND NEW."pgcSynchronizedAt" IS NULL THEN CONTINUE; END IF;
    content := pca_revision_payload(NEW, origin);
    SELECT payload, version INTO previous, n FROM "PcaItemRevision"
      WHERE "pcaItemId" = NEW.id AND source = origin ORDER BY version DESC LIMIT 1;
    IF n IS NULL OR content IS DISTINCT FROM previous THEN
      INSERT INTO "PcaItemRevision" ("pcaItemId", source, version, kind, "observedAt", payload)
      VALUES (NEW.id, origin, COALESCE(n, 0) + 1, 'OBSERVED',
        CASE WHEN origin = 'PNCP' THEN NEW."synchronizedAt" ELSE NEW."pgcSynchronizedAt" END, content);
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER capture_pca_revision AFTER INSERT OR UPDATE ON "PcaItem"
FOR EACH ROW EXECUTE FUNCTION capture_pca_revision();

CREATE FUNCTION protect_pca_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'O histórico do PCA é somente de acréscimo.'; END $$;
CREATE TRIGGER protect_pca_revision BEFORE UPDATE OR DELETE ON "PcaItemRevision"
FOR EACH ROW EXECUTE FUNCTION protect_pca_revision();
CREATE TRIGGER protect_pca_revision_truncate BEFORE TRUNCATE ON "PcaItemRevision"
FOR EACH STATEMENT EXECUTE FUNCTION protect_pca_revision();
REVOKE ALL ON FUNCTION pca_revision_payload("PcaItem", text), capture_pca_revision(), protect_pca_revision() FROM PUBLIC, anon, authenticated;

COMMIT;
