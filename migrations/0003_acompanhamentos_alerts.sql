ALTER TABLE "processos_acompanhados" ADD COLUMN IF NOT EXISTS "novos_andamentos" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "processos_acompanhados" ADD COLUMN IF NOT EXISTS "ultima_verificacao" timestamp;
