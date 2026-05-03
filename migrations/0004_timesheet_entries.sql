CREATE TABLE IF NOT EXISTS "timesheet_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipe_id" varchar,
	"processo_id" varchar,
	"cliente_id" varchar,
	"data" date NOT NULL,
	"horas" numeric(6, 2) NOT NULL,
	"descricao" text NOT NULL,
	"categoria" text DEFAULT 'Geral' NOT NULL,
	"faturavel" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_equipe_id_equipe_id_fk" FOREIGN KEY ("equipe_id") REFERENCES "public"."equipe"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "timesheet_entries" ADD CONSTRAINT "timesheet_entries_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
