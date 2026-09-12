-- Projeção compacta do relatório TG para leitura do painel sem varrer o arquivo bruto.
ALTER TABLE "FinancialSourceImport" ADD COLUMN IF NOT EXISTS "projection" JSONB;
