-- Header/Footer combinado das petições importadas (formato:
--   <header><hr data-iuria-footer="1"/><footer>)
-- Persistido tanto em rascunhos quanto em documentos do acervo.
ALTER TABLE "peticao_rascunhos" ADD COLUMN IF NOT EXISTS "header_html" text;
ALTER TABLE "documentos" ADD COLUMN IF NOT EXISTS "header_html" text;
