-- Sprint: user-preferences
-- Adiciona campos de preferência de interface ao modelo User.
-- Seguro: apenas ADD COLUMN com DEFAULT. Sem DROP TABLE ou alterações destrutivas.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "prefLanguage"   TEXT DEFAULT 'pt-BR';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "prefTheme"      TEXT DEFAULT 'dark';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "prefFontSize"   TEXT DEFAULT 'media';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "prefAnimations" BOOLEAN DEFAULT true;
