CREATE TABLE IF NOT EXISTS "deadline_rules" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nome" text NOT NULL,
  "evento_gatilho" text NOT NULL,
  "dias" integer NOT NULL,
  "tipo_dia" text DEFAULT 'util' NOT NULL,
  "area" text DEFAULT 'geral' NOT NULL,
  "risco_default" text DEFAULT 'MEDIO' NOT NULL,
  "fundamento_legal" text,
  "descricao" text,
  "responsavel_padrao_id" varchar,
  "ativo" boolean DEFAULT true NOT NULL,
  "pre_configurada" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "deadline_alerts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "atividade_id" varchar NOT NULL,
  "tipo_alerta" text NOT NULL,
  "enviado_em" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "atividades" ADD COLUMN IF NOT EXISTS "risco" text;
--> statement-breakpoint
ALTER TABLE "atividades" ADD COLUMN IF NOT EXISTS "deadline_rule_id" varchar;
--> statement-breakpoint
ALTER TABLE "atividades" ADD COLUMN IF NOT EXISTS "source_event_id" varchar;
--> statement-breakpoint
ALTER TABLE "atividades" ADD COLUMN IF NOT EXISTS "fundamento_legal" text;
--> statement-breakpoint
ALTER TABLE "atividades" ADD COLUMN IF NOT EXISTS "evento_gatilho" text;
