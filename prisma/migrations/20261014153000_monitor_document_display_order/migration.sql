-- Ordem opcional: NULL mantém a ordem histórica por aprovação.
-- Não modifica arquivos, cenas nem posições internas dos slides.
ALTER TABLE "MonitorContentImport" ADD COLUMN "displayOrder" INTEGER;
