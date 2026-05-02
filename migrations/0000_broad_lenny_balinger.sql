CREATE TABLE "atividades" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"tipo" text NOT NULL,
	"processo_id" varchar,
	"responsavel_id" varchar,
	"data" date NOT NULL,
	"hora" text,
	"prioridade" text DEFAULT 'Média' NOT NULL,
	"status" text DEFAULT 'Pendente' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"tipo" text DEFAULT 'Pessoa Física' NOT NULL,
	"cpf_cnpj" text,
	"email" text,
	"telefone" text,
	"endereco" text,
	"cidade" text,
	"estado" text,
	"cep" text,
	"observacoes" text,
	"status" text DEFAULT 'Ativo' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "consultas_processuais" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tribunal_id" varchar,
	"tipo_busca" text NOT NULL,
	"termo_busca" text NOT NULL,
	"numero_processo" text,
	"classe" text,
	"assunto" text,
	"relator" text,
	"origem" text,
	"partes" text,
	"movimentacoes" text,
	"url_processo" text,
	"sucesso" boolean DEFAULT true NOT NULL,
	"erro" text,
	"usuario_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contas_pagar" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fornecedor" text NOT NULL,
	"descricao" text NOT NULL,
	"valor" numeric(15, 2) NOT NULL,
	"vencimento" date NOT NULL,
	"status" text DEFAULT 'Pendente' NOT NULL,
	"categoria" text NOT NULL,
	"data_pagamento" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contas_receber" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" varchar,
	"processo_id" varchar,
	"descricao" text NOT NULL,
	"valor" numeric(15, 2) NOT NULL,
	"vencimento" date NOT NULL,
	"status" text DEFAULT 'Pendente' NOT NULL,
	"tipo" text DEFAULT 'Honorários' NOT NULL,
	"data_pagamento" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"tipo" text NOT NULL,
	"processo_id" varchar,
	"tamanho" text,
	"caminho" text,
	"enviado_por" varchar,
	"versao" integer DEFAULT 1 NOT NULL,
	"conteudo_markdown" text,
	"extracao_status" text DEFAULT 'pendente' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equipe" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"telefone" text,
	"cargo" text NOT NULL,
	"oab" text,
	"especialidade" text,
	"status" text DEFAULT 'Ativo' NOT NULL,
	"avatar" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "honorarios" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" varchar,
	"processo_id" varchar,
	"tipo" text NOT NULL,
	"valor_contratado" numeric(15, 2),
	"valor_recebido" numeric(15, 2) DEFAULT '0',
	"percentual_exito" integer,
	"data_contrato" date NOT NULL,
	"status" text DEFAULT 'Ativo' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "monitoramentos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero_processo" text NOT NULL,
	"tribunal" text NOT NULL,
	"classe" text,
	"assunto" text,
	"relator" text,
	"url_processo" text,
	"frequencia_minutos" integer DEFAULT 60 NOT NULL,
	"ultima_checagem" timestamp,
	"proxima_checagem" timestamp,
	"contador_andamentos" integer DEFAULT 0 NOT NULL,
	"hash_andamentos" text,
	"novos_andamentos" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"usuario_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "processos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" text NOT NULL,
	"titulo" text NOT NULL,
	"cliente_id" varchar,
	"responsavel_id" varchar,
	"tipo" text NOT NULL,
	"area" text NOT NULL,
	"tribunal" text,
	"vara" text,
	"valor_causa" numeric(15, 2),
	"status" text DEFAULT 'Ativo' NOT NULL,
	"fase" text,
	"data_distribuicao" date,
	"data_atualizacao" date,
	"observacoes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "processos_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"categoria" text NOT NULL,
	"descricao" text,
	"conteudo" text,
	"usos" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tribunais" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sigla" text NOT NULL,
	"nome" text NOT NULL,
	"tipo" text NOT NULL,
	"url" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "tribunais_sigla_unique" UNIQUE("sigla")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'advogado' NOT NULL,
	"avatar" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verificacoes_monitoramento" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"monitoramento_id" varchar,
	"contador_anterior" integer DEFAULT 0 NOT NULL,
	"contador_atual" integer DEFAULT 0 NOT NULL,
	"novos_detectados" integer DEFAULT 0 NOT NULL,
	"sucesso" boolean DEFAULT true NOT NULL,
	"erro" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "atividades" ADD CONSTRAINT "atividades_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atividades" ADD CONSTRAINT "atividades_responsavel_id_equipe_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultas_processuais" ADD CONSTRAINT "consultas_processuais_tribunal_id_tribunais_id_fk" FOREIGN KEY ("tribunal_id") REFERENCES "public"."tribunais"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultas_processuais" ADD CONSTRAINT "consultas_processuais_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_enviado_por_equipe_id_fk" FOREIGN KEY ("enviado_por") REFERENCES "public"."equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "honorarios" ADD CONSTRAINT "honorarios_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "honorarios" ADD CONSTRAINT "honorarios_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoramentos" ADD CONSTRAINT "monitoramentos_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processos" ADD CONSTRAINT "processos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processos" ADD CONSTRAINT "processos_responsavel_id_equipe_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verificacoes_monitoramento" ADD CONSTRAINT "verificacoes_monitoramento_monitoramento_id_monitoramentos_id_fk" FOREIGN KEY ("monitoramento_id") REFERENCES "public"."monitoramentos"("id") ON DELETE no action ON UPDATE no action;