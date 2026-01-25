import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, date, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  nome: text("nome").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("advogado"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Clients table
export const clientes = pgTable("clientes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull().default("Pessoa Física"),
  cpfCnpj: text("cpf_cnpj"),
  email: text("email"),
  telefone: text("telefone"),
  endereco: text("endereco"),
  cidade: text("cidade"),
  estado: text("estado"),
  cep: text("cep"),
  observacoes: text("observacoes"),
  status: text("status").notNull().default("Ativo"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClienteSchema = createInsertSchema(clientes).omit({
  id: true,
  createdAt: true,
});

export type InsertCliente = z.infer<typeof insertClienteSchema>;
export type Cliente = typeof clientes.$inferSelect;

// Team members table
export const equipe = pgTable("equipe", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  email: text("email").notNull(),
  telefone: text("telefone"),
  cargo: text("cargo").notNull(),
  oab: text("oab"),
  especialidade: text("especialidade"),
  status: text("status").notNull().default("Ativo"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEquipeSchema = createInsertSchema(equipe).omit({
  id: true,
  createdAt: true,
});

export type InsertEquipe = z.infer<typeof insertEquipeSchema>;
export type Equipe = typeof equipe.$inferSelect;

// Legal processes table
export const processos = pgTable("processos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  numero: text("numero").notNull().unique(),
  titulo: text("titulo").notNull(),
  clienteId: varchar("cliente_id").references(() => clientes.id),
  responsavelId: varchar("responsavel_id").references(() => equipe.id),
  tipo: text("tipo").notNull(),
  area: text("area").notNull(),
  tribunal: text("tribunal"),
  vara: text("vara"),
  valorCausa: decimal("valor_causa", { precision: 15, scale: 2 }),
  status: text("status").notNull().default("Ativo"),
  fase: text("fase"),
  dataDistribuicao: date("data_distribuicao"),
  dataAtualizacao: date("data_atualizacao"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProcessoSchema = createInsertSchema(processos).omit({
  id: true,
  createdAt: true,
});

export type InsertProcesso = z.infer<typeof insertProcessoSchema>;
export type Processo = typeof processos.$inferSelect;

// Activities table (tasks, hearings, deadlines, appointments)
export const atividades = pgTable("atividades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  tipo: text("tipo").notNull(),
  processoId: varchar("processo_id").references(() => processos.id),
  responsavelId: varchar("responsavel_id").references(() => equipe.id),
  data: date("data").notNull(),
  hora: text("hora"),
  prioridade: text("prioridade").notNull().default("Média"),
  status: text("status").notNull().default("Pendente"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAtividadeSchema = createInsertSchema(atividades).omit({
  id: true,
  createdAt: true,
});

export type InsertAtividade = z.infer<typeof insertAtividadeSchema>;
export type Atividade = typeof atividades.$inferSelect;

// Documents table
export const documentos = pgTable("documentos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull(),
  processoId: varchar("processo_id").references(() => processos.id),
  tamanho: text("tamanho"),
  caminho: text("caminho"),
  enviadoPor: varchar("enviado_por").references(() => equipe.id),
  versao: integer("versao").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDocumentoSchema = createInsertSchema(documentos).omit({
  id: true,
  createdAt: true,
});

export type InsertDocumento = z.infer<typeof insertDocumentoSchema>;
export type Documento = typeof documentos.$inferSelect;

// Accounts receivable table
export const contasReceber = pgTable("contas_receber", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clienteId: varchar("cliente_id").references(() => clientes.id),
  processoId: varchar("processo_id").references(() => processos.id),
  descricao: text("descricao").notNull(),
  valor: decimal("valor", { precision: 15, scale: 2 }).notNull(),
  vencimento: date("vencimento").notNull(),
  status: text("status").notNull().default("Pendente"),
  tipo: text("tipo").notNull().default("Honorários"),
  dataPagamento: date("data_pagamento"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContaReceberSchema = createInsertSchema(contasReceber).omit({
  id: true,
  createdAt: true,
});

export type InsertContaReceber = z.infer<typeof insertContaReceberSchema>;
export type ContaReceber = typeof contasReceber.$inferSelect;

// Accounts payable table
export const contasPagar = pgTable("contas_pagar", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fornecedor: text("fornecedor").notNull(),
  descricao: text("descricao").notNull(),
  valor: decimal("valor", { precision: 15, scale: 2 }).notNull(),
  vencimento: date("vencimento").notNull(),
  status: text("status").notNull().default("Pendente"),
  categoria: text("categoria").notNull(),
  dataPagamento: date("data_pagamento"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContaPagarSchema = createInsertSchema(contasPagar).omit({
  id: true,
  createdAt: true,
});

export type InsertContaPagar = z.infer<typeof insertContaPagarSchema>;
export type ContaPagar = typeof contasPagar.$inferSelect;

// Fee contracts table
export const honorarios = pgTable("honorarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clienteId: varchar("cliente_id").references(() => clientes.id),
  processoId: varchar("processo_id").references(() => processos.id),
  tipo: text("tipo").notNull(),
  valorContratado: decimal("valor_contratado", { precision: 15, scale: 2 }),
  valorRecebido: decimal("valor_recebido", { precision: 15, scale: 2 }).default("0"),
  percentualExito: integer("percentual_exito"),
  dataContrato: date("data_contrato").notNull(),
  status: text("status").notNull().default("Ativo"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHonorarioSchema = createInsertSchema(honorarios).omit({
  id: true,
  createdAt: true,
});

export type InsertHonorario = z.infer<typeof insertHonorarioSchema>;
export type Honorario = typeof honorarios.$inferSelect;

// Petition templates table
export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  categoria: text("categoria").notNull(),
  descricao: text("descricao"),
  conteudo: text("conteudo"),
  usos: integer("usos").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;
