-- Migration 0006: add numero_oficio, enviado_em, pdf_gerado_em, pdf_conteudo to communications
-- and create sequences for deterministic office/notification numbering
ALTER TABLE communications
  ADD COLUMN IF NOT EXISTS numero_oficio TEXT,
  ADD COLUMN IF NOT EXISTS enviado_em TIMESTAMP,
  ADD COLUMN IF NOT EXISTS pdf_gerado_em TIMESTAMP,
  ADD COLUMN IF NOT EXISTS pdf_conteudo TEXT;

CREATE SEQUENCE IF NOT EXISTS oficio_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS notificacao_seq START WITH 1 INCREMENT BY 1;
