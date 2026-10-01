CREATE TABLE "PiCatalogEntry" (
  "organizationId" TEXT NOT NULL,
  "pi" TEXT NOT NULL,
  "piName" TEXT NOT NULL,
  "sourceFile" TEXT NOT NULL,
  "sourceChecksum" TEXT NOT NULL,
  "importedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PiCatalogEntry_pkey" PRIMARY KEY ("organizationId", "pi"),
  CONSTRAINT "PiCatalogEntry_organizationId_fkey" FOREIGN KEY ("organizationId")
    REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Backfill exact PI names from accepted, persisted loads. Latest unambiguous name wins.
INSERT INTO "PiCatalogEntry" ("organizationId", "pi", "piName", "sourceFile", "sourceChecksum", "importedAt")
SELECT DISTINCT ON ("organizationId", pi)
  "organizationId", pi, name, "fileName", "checksum", "importedAt"
FROM (
  SELECT f."id", f."organizationId", f."fileName", f."checksum", f."importedAt",
    upper(trim(r->>'pi')) AS pi, min(trim(r->>'piName')) AS name
  FROM "FinancialSourceImport" f
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(f."payload"::jsonb->'rows') = 'array'
      THEN f."payload"::jsonb->'rows' ELSE '[]'::jsonb END
  ) r
  WHERE f."sourceKind" IN ('CURRENT', 'RPNP')
    AND trim(coalesce(r->>'pi', '')) <> ''
    AND trim(coalesce(r->>'piName', '')) <> ''
  GROUP BY f."id", f."organizationId", f."fileName", f."checksum", f."importedAt", upper(trim(r->>'pi'))
  HAVING count(DISTINCT trim(r->>'piName')) = 1
) descriptions
ORDER BY "organizationId", pi, "importedAt" DESC, "id" DESC;
