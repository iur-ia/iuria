CREATE TABLE IF NOT EXISTS "acervo_processos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text DEFAULT 'judicial' NOT NULL,
	"numero" text NOT NULL UNIQUE,
	"titulo" text,
	"tribunal" text,
	"classe" text,
	"assunto" text,
	"relator" text,
	"partes" text,
	"fase" text,
	"status_interno" text DEFAULT 'ativo' NOT NULL,
	"responsavel_id" varchar,
	"cliente_id" varchar,
	"observacoes" text,
	"url_portal" text,
	"data_ultima_sincronizacao" timestamp,
	"tipo_administrativo" text,
	"interessado" text,
	"prazo" date,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "acervo_andamentos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"acervo_id" varchar NOT NULL,
	"data" text NOT NULL,
	"descricao" text NOT NULL,
	"detalhes" text,
	"tipo" text DEFAULT 'automatico' NOT NULL,
	"origem" text,
	"critico" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "acervo_andamentos_acervo_id_acervo_processos_id_fk" FOREIGN KEY ("acervo_id") REFERENCES "acervo_processos"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "acervo_documentos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"acervo_id" varchar NOT NULL,
	"documento_id" varchar,
	"nome" text NOT NULL,
	"descricao" text,
	"url" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "acervo_documentos_acervo_id_acervo_processos_id_fk" FOREIGN KEY ("acervo_id") REFERENCES "acervo_processos"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "acervo_tramitacoes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"acervo_id" varchar NOT NULL,
	"fase" text NOT NULL,
	"responsavel_id" varchar,
	"data_inicio" date NOT NULL,
	"data_fim" date,
	"observacoes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "acervo_tramitacoes_acervo_id_acervo_processos_id_fk" FOREIGN KEY ("acervo_id") REFERENCES "acervo_processos"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "acervo_processos" ADD CONSTRAINT "acervo_processos_responsavel_id_equipe_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "equipe"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "acervo_processos" ADD CONSTRAINT "acervo_processos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
