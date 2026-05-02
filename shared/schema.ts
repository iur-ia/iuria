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
  conteudoMarkdown: text("conteudo_markdown"),
  extracaoStatus: text("extracao_status").notNull().default("pendente"),
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

// Tribunais table - Registry of available courts for search
export const tribunais = pgTable("tribunais", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sigla: text("sigla").notNull().unique(),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull(), // Federal, Estadual, Superior, Trabalhista
  url: text("url"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTribunalSchema = createInsertSchema(tribunais).omit({
  id: true,
  createdAt: true,
});

export type InsertTribunal = z.infer<typeof insertTribunalSchema>;
export type Tribunal = typeof tribunais.$inferSelect;

// Consultas processuais table - Search history and results cache
export const consultasProcessuais = pgTable("consultas_processuais", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tribunalId: varchar("tribunal_id").references(() => tribunais.id),
  tipoBusca: text("tipo_busca").notNull(), // numero, nome
  termoBusca: text("termo_busca").notNull(),
  numeroProcesso: text("numero_processo"),
  classe: text("classe"),
  assunto: text("assunto"),
  relator: text("relator"),
  origem: text("origem"),
  partes: text("partes"),
  movimentacoes: text("movimentacoes"),
  urlProcesso: text("url_processo"),
  sucesso: boolean("sucesso").notNull().default(true),
  erro: text("erro"),
  usuarioId: varchar("usuario_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConsultaProcessualSchema = createInsertSchema(consultasProcessuais).omit({
  id: true,
  createdAt: true,
});

export type InsertConsultaProcessual = z.infer<typeof insertConsultaProcessualSchema>;
export type ConsultaProcessual = typeof consultasProcessuais.$inferSelect;

// Monitoramento de processos - Watchlist com alertas
export const monitoramentos = pgTable("monitoramentos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  numeroProcesso: text("numero_processo").notNull(),
  tribunal: text("tribunal").notNull(),
  classe: text("classe"),
  assunto: text("assunto"),
  relator: text("relator"),
  urlProcesso: text("url_processo"),
  
  // Configuração de frequência (em minutos)
  frequenciaMinutos: integer("frequencia_minutos").notNull().default(60),
  
  // Controle de checagem
  ultimaChecagem: timestamp("ultima_checagem"),
  proximaChecagem: timestamp("proxima_checagem"),
  
  // Detecção de mudanças
  contadorAndamentos: integer("contador_andamentos").notNull().default(0),
  hashAndamentos: text("hash_andamentos"),
  novosAndamentos: integer("novos_andamentos").notNull().default(0),
  
  // Status
  ativo: boolean("ativo").notNull().default(true),
  
  // Auditoria
  usuarioId: varchar("usuario_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMonitoramentoSchema = createInsertSchema(monitoramentos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMonitoramento = z.infer<typeof insertMonitoramentoSchema>;
export type Monitoramento = typeof monitoramentos.$inferSelect;

// Histórico de verificações do monitoramento
export const verificacoesMonitoramento = pgTable("verificacoes_monitoramento", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  monitoramentoId: varchar("monitoramento_id").references(() => monitoramentos.id),
  contadorAnterior: integer("contador_anterior").notNull().default(0),
  contadorAtual: integer("contador_atual").notNull().default(0),
  novosDetectados: integer("novos_detectados").notNull().default(0),
  sucesso: boolean("sucesso").notNull().default(true),
  erro: text("erro"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVerificacaoMonitoramentoSchema = createInsertSchema(verificacoesMonitoramento).omit({
  id: true,
  createdAt: true,
});

export type InsertVerificacaoMonitoramento = z.infer<typeof insertVerificacaoMonitoramentoSchema>;
export type VerificacaoMonitoramento = typeof verificacoesMonitoramento.$inferSelect;

// ==================== ACERVO DE PROCESSOS ====================

// Ficha principal do processo no acervo interno
export const acervoProcessos = pgTable("acervo_processos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tipo: text("tipo").notNull().default("judicial"), // judicial | administrativo
  numero: text("numero").notNull().unique(),
  titulo: text("titulo"),
  tribunal: text("tribunal"),
  classe: text("classe"),
  assunto: text("assunto"),
  relator: text("relator"),
  partes: text("partes"), // JSON array as text
  fase: text("fase"),
  statusInterno: text("status_interno").notNull().default("ativo"), // ativo | arquivado | suspenso
  responsavelId: varchar("responsavel_id").references(() => equipe.id),
  clienteId: varchar("cliente_id").references(() => clientes.id),
  observacoes: text("observacoes"),
  urlPortal: text("url_portal"),
  dataUltimaSincronizacao: timestamp("data_ultima_sincronizacao"),
  // Campos exclusivos para processos administrativos
  tipoAdministrativo: text("tipo_administrativo"), // habilitacao | recurso | contrato | sindicancia | outro
  interessado: text("interessado"),
  prazo: date("prazo"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAcervoProcessoSchema = createInsertSchema(acervoProcessos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAcervoProcesso = z.infer<typeof insertAcervoProcessoSchema>;
export type AcervoProcesso = typeof acervoProcessos.$inferSelect;

// Andamentos (movimentos cronológicos) vinculados ao acervo
export const acervoAndamentos = pgTable("acervo_andamentos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  acervoId: varchar("acervo_id").notNull().references(() => acervoProcessos.id, { onDelete: "cascade" }),
  data: text("data").notNull(),
  descricao: text("descricao").notNull(),
  detalhes: text("detalhes"),
  tipo: text("tipo").notNull().default("automatico"), // automatico | manual
  origem: text("origem"), // datajud | pje | manual
  critico: boolean("critico").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAcervoAndamentoSchema = createInsertSchema(acervoAndamentos).omit({
  id: true,
  createdAt: true,
});

export type InsertAcervoAndamento = z.infer<typeof insertAcervoAndamentoSchema>;
export type AcervoAndamento = typeof acervoAndamentos.$inferSelect;

// Documentos vinculados ao processo no acervo
export const acervoDocumentos = pgTable("acervo_documentos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  acervoId: varchar("acervo_id").notNull().references(() => acervoProcessos.id, { onDelete: "cascade" }),
  documentoId: varchar("documento_id").references(() => documentos.id),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  url: text("url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAcervoDocumentoSchema = createInsertSchema(acervoDocumentos).omit({
  id: true,
  createdAt: true,
});

export type InsertAcervoDocumento = z.infer<typeof insertAcervoDocumentoSchema>;
export type AcervoDocumento = typeof acervoDocumentos.$inferSelect;

// Tramitações do fluxo interno (principalmente processos administrativos)
export const acervoTramitacoes = pgTable("acervo_tramitacoes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  acervoId: varchar("acervo_id").notNull().references(() => acervoProcessos.id, { onDelete: "cascade" }),
  fase: text("fase").notNull(), // criacao | instrucao | decisao | arquivamento
  responsavelId: varchar("responsavel_id").references(() => equipe.id),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAcervoTramitacaoSchema = createInsertSchema(acervoTramitacoes).omit({
  id: true,
  createdAt: true,
});

export type InsertAcervoTramitacao = z.infer<typeof insertAcervoTramitacaoSchema>;
export type AcervoTramitacao = typeof acervoTramitacoes.$inferSelect;
