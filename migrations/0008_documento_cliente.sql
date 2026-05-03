-- Vincular documentos a clientes diretamente (independente de processo)
ALTER TABLE "documentos" ADD COLUMN IF NOT EXISTS "cliente_id" varchar REFERENCES "clientes"("id");
