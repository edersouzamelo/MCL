-- Run against a database with at least one synchronized PCA item.
-- Every mutation and generated revision is rolled back.
BEGIN;
DO $$
DECLARE target text; base_count bigint; base_pg bigint; n bigint; blocked boolean := false;
BEGIN
  SELECT id INTO target FROM "PcaItem" WHERE "pgcSynchronizedAt" IS NOT NULL LIMIT 1 FOR UPDATE;
  IF target IS NULL THEN RAISE EXCEPTION 'A synchronized item is required'; END IF;
  SELECT count(*) INTO base_count FROM "PcaItemRevision" WHERE "pcaItemId" = target AND source = 'PNCP';
  SELECT count(*) INTO base_pg FROM "PcaItemRevision" WHERE "pcaItemId" = target AND source = 'PGC';
  UPDATE "PcaItem" SET "synchronizedAt" = NOW(), "pgcSynchronizedAt" = NOW(), active = NOT active WHERE id = target;
  SELECT count(*) INTO n FROM "PcaItemRevision" WHERE "pcaItemId" = target;
  IF n <> base_count + base_pg THEN RAISE EXCEPTION 'Timestamp/status-only update created a content version'; END IF;
  UPDATE "PcaItem" SET "estimatedQuantity" = COALESCE("estimatedQuantity", 0) + 0.125 WHERE id = target;
  SELECT count(*) INTO n FROM "PcaItemRevision" WHERE "pcaItemId" = target AND source = 'PNCP';
  IF n <> base_count + 1 THEN RAISE EXCEPTION 'Quantity change was not versioned'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "PcaItemRevision" r JOIN "PcaItem" p ON p.id = r."pcaItemId"
    WHERE p.id = target AND r.source = 'PNCP' AND r.version = base_count + 1
      AND r.payload->>'estimatedQuantity' = p."estimatedQuantity"::text) THEN
    RAISE EXCEPTION 'Fractional quantity lost precision';
  END IF;
  UPDATE "PcaItem" SET "pgcData" = '[{"numeroArtefato":1},{"numeroArtefato":2}]'::jsonb WHERE id = target;
  UPDATE "PcaItem" SET "pgcData" = '[{"numeroArtefato":2},{"numeroArtefato":1}]'::jsonb WHERE id = target;
  SELECT count(*) INTO n FROM "PcaItemRevision" WHERE "pcaItemId" = target AND source = 'PGC';
  IF n <> base_pg + 1 THEN RAISE EXCEPTION 'PGC changes or array reordering handled incorrectly'; END IF;
  BEGIN
    UPDATE "PcaItemRevision" SET kind = kind WHERE "pcaItemId" = target;
  EXCEPTION WHEN raise_exception THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'Append-only guard failed'; END IF;
END $$;
ROLLBACK;
SELECT 'History integration assertions passed; all test mutations rolled back' AS result;
