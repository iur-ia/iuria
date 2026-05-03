-- Migration 0006: add numero_oficio, enviado_em, pdf_gerado_em to communications
ALTER TABLE communications
  ADD COLUMN IF NOT EXISTS numero_oficio TEXT,
  ADD COLUMN IF NOT EXISTS enviado_em TIMESTAMP,
  ADD COLUMN IF NOT EXISTS pdf_gerado_em TIMESTAMP;
