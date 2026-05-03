-- Add columns to templates for editor de petições estilo Word
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "conteudo_html" text;
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "header_html" text;
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "origem" text DEFAULT 'manual' NOT NULL;
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "is_padrao" boolean DEFAULT false NOT NULL;
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

-- Rascunhos do editor de petições
CREATE TABLE IF NOT EXISTS "peticao_rascunhos" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "titulo" text NOT NULL,
  "conteudo_html" text NOT NULL,
  "processo_id" varchar REFERENCES "processos"("id") ON DELETE SET NULL,
  "cliente_id" varchar,
  "template_id" varchar REFERENCES "templates"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
