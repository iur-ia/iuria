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
  conteudoMarkdown: text("conteudo_markdown"), // Extracted text in markdown format (OCR/text extraction)
  metodoExtracao: text("metodo_extracao"), // pdfplumber, PyPDF2, pdftotext, tesseract_ocr, mammoth, plain_text
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

// ==================== NOVAS TABELAS (PRD iuria LexFutura) ====================

// Prazos processuais - Calculados automaticamente pelo motor de prazos
export const prazos = pgTable("prazos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  processoId: varchar("processo_id").references(() => processos.id),
  monitoramentoId: varchar("monitoramento_id").references(() => monitoramentos.id),
  
  // Informações do prazo
  tipo: text("tipo").notNull(), // "recurso", "contestacao", "manifestacao", "cumprimento", "diligencia", "audiencia", "outro"
  descricao: text("descricao").notNull(),
  fundamentoLegal: text("fundamento_legal"), // ex: "Art. 335 CPC", "Art. 1.003 CPC"
  
  // Datas
  dataIntimacao: date("data_intimacao").notNull(), // Data da intimação/publicação
  dataInicio: date("data_inicio").notNull(), // Início da contagem (dia seguinte útil)
  dataVencimento: date("data_vencimento").notNull(), // Data final do prazo
  diasTotais: integer("dias_totais").notNull(), // Prazo em dias (úteis ou corridos)
  diasUteis: boolean("dias_uteis").notNull().default(true), // true=úteis, false=corridos
  
  // Controle
  status: text("status").notNull().default("pendente"), // "pendente", "proximo", "vencido", "cumprido", "prorrogado"
  prioridade: text("prioridade").notNull().default("media"), // "critica", "alta", "media", "baixa"
  
  // Origem do andamento que gerou o prazo
  andamentoOrigem: text("andamento_origem"), // Texto do andamento que gerou o prazo
  dataAndamento: date("data_andamento"), // Data do andamento original
  
  // Responsável
  responsavelId: varchar("responsavel_id").references(() => equipe.id),
  usuarioId: varchar("usuario_id").references(() => users.id),
  
  // Observações
  observacoes: text("observacoes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPrazoSchema = createInsertSchema(prazos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPrazo = z.infer<typeof insertPrazoSchema>;
export type Prazo = typeof prazos.$inferSelect;

// Feriados - Calendário para cálculo de prazos
export const feriados = pgTable("feriados", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  data: date("data").notNull(),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull(), // "nacional", "estadual", "municipal", "forense"
  estado: text("estado"), // UF para feriados estaduais (ex: "RJ", "SP")
  municipio: text("municipio"), // Para feriados municipais
  recorrente: boolean("recorrente").notNull().default(true), // Se repete anualmente
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFeriadoSchema = createInsertSchema(feriados).omit({
  id: true,
  createdAt: true,
});

export type InsertFeriado = z.infer<typeof insertFeriadoSchema>;
export type Feriado = typeof feriados.$inferSelect;

// Alertas/Notificações
export const alertas = pgTable("alertas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  usuarioId: varchar("usuario_id").references(() => users.id),
  
  // Tipo e referência
  tipo: text("tipo").notNull(), // "prazo_vencendo", "prazo_vencido", "novo_andamento", "publicacao_dje", "sistema"
  titulo: text("titulo").notNull(),
  mensagem: text("mensagem").notNull(),
  
  // Referências opcionais
  processoId: varchar("processo_id").references(() => processos.id),
  monitoramentoId: varchar("monitoramento_id").references(() => monitoramentos.id),
  prazoId: varchar("prazo_id").references(() => prazos.id),
  
  // Controle de leitura
  lido: boolean("lido").notNull().default(false),
  lidoEm: timestamp("lido_em"),
  
  // Prioridade e canal
  prioridade: text("prioridade").notNull().default("media"), // "critica", "alta", "media", "baixa"
  canal: text("canal").notNull().default("sistema"), // "sistema", "email", "whatsapp"
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAlertaSchema = createInsertSchema(alertas).omit({
  id: true,
  createdAt: true,
});

export type InsertAlerta = z.infer<typeof insertAlertaSchema>;
export type Alerta = typeof alertas.$inferSelect;

// Certificados Digitais - Para automação MNI
export const certificadosDigitais = pgTable("certificados_digitais", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  usuarioId: varchar("usuario_id").references(() => users.id),
  
  // Informações do certificado
  nome: text("nome").notNull(), // Nome amigável (ex: "Certificado OAB/RJ")
  tipo: text("tipo").notNull().default("A1"), // "A1", "A3_nuvem"
  titular: text("titular").notNull(), // Nome do titular no certificado
  cpfCnpj: text("cpf_cnpj"), // CPF ou CNPJ do titular
  
  // Arquivo (A1 - armazenado criptografado)
  arquivoCriptografado: text("arquivo_criptografado"), // Base64 do .pfx criptografado
  
  // Validade
  validoAte: timestamp("valido_ate").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  
  // Tribunais autorizados
  tribunaisAutorizados: text("tribunais_autorizados"), // JSON array de siglas: ["TJRJ","TRF2"]
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCertificadoDigitalSchema = createInsertSchema(certificadosDigitais).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCertificadoDigital = z.infer<typeof insertCertificadoDigitalSchema>;
export type CertificadoDigital = typeof certificadosDigitais.$inferSelect;

// Peças Processuais - PDFs e documentos extraídos via MNI/Scraping
export const pecasProcessuais = pgTable("pecas_processuais", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  processoId: varchar("processo_id").references(() => processos.id),
  monitoramentoId: varchar("monitoramento_id").references(() => monitoramentos.id),
  
  // Metadados da peça
  titulo: text("titulo").notNull(),
  tipo: text("tipo").notNull(), // "peticao", "decisao", "sentenca", "acordao", "despacho", "intimacao", "outros"
  numeroSequencial: integer("numero_sequencial"), // Ordem no processo
  dataPeca: date("data_peca"),
  
  // Arquivo
  urlOrigem: text("url_origem"), // URL no portal do tribunal
  caminhoArquivo: text("caminho_arquivo"), // Caminho no storage local
  tamanhoBytes: integer("tamanho_bytes"),
  formatoArquivo: text("formato_arquivo").default("pdf"), // "pdf", "html", "rtf"
  
  // Fonte
  fonte: text("fonte").notNull().default("mni"), // "mni", "scraping", "upload_manual"
  tribunal: text("tribunal"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPecaProcessualSchema = createInsertSchema(pecasProcessuais).omit({
  id: true,
  createdAt: true,
});

export type InsertPecaProcessual = z.infer<typeof insertPecaProcessualSchema>;
export type PecaProcessual = typeof pecasProcessuais.$inferSelect;

// Publicações DJE/DJEM - Diários de Justiça Eletrônicos
export const publicacoesDje = pgTable("publicacoes_dje", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Diário
  diario: text("diario").notNull(), // "DJE-STF", "DJE-STJ", "DJE-TJRJ", "DJEM-TRF2"
  tribunal: text("tribunal").notNull(),
  dataPublicacao: date("data_publicacao").notNull(),
  caderno: text("caderno"), // "Judicial", "Administrativo"
  pagina: text("pagina"),
  
  // Conteúdo
  conteudo: text("conteudo").notNull(),
  conteudoResumo: text("conteudo_resumo"), // Resumo para exibição
  
  // Referências
  processoNumero: text("processo_numero"),
  oabRelacionada: text("oab_relacionada"),
  cnpjRelacionado: text("cnpj_relacionado"),
  
  // URL
  urlPublicacao: text("url_publicacao"),
  
  // Associações
  processoId: varchar("processo_id").references(() => processos.id),
  monitoramentoId: varchar("monitoramento_id").references(() => monitoramentos.id),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPublicacaoDjeSchema = createInsertSchema(publicacoesDje).omit({
  id: true,
  createdAt: true,
});

export type InsertPublicacaoDje = z.infer<typeof insertPublicacaoDjeSchema>;
export type PublicacaoDje = typeof publicacoesDje.$inferSelect;

// ==================== LEXOS IA - Peticoes IA ====================

// Peticoes geradas por IA
export const peticoesIa = pgTable("peticoes_ia", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tipo: text("tipo").notNull(), // "Peticao Inicial", "Contestacao", "Recurso de Apelacao", etc.
  instancia: text("instancia").notNull(), // "1a Instancia", "2a Instancia (TJ/TRF)", etc.
  area: text("area").notNull(), // "Civel", "Trabalhista", "Penal", etc.
  clienteId: varchar("cliente_id").references(() => clientes.id),
  processoId: varchar("processo_id").references(() => processos.id),
  fatos: text("fatos").notNull(),
  pedido: text("pedido").notNull(),
  tom: text("tom").notNull().default("combativo"), // "combativo" | "reflexivo"
  tutela: boolean("tutela").notNull().default(false),
  statusGeracao: text("status_geracao").notNull().default("pendente"), // "pendente", "gerando", "concluido", "erro"
  documentoGerado: text("documento_gerado"), // Conteudo da peticao gerada
  conselhoMemorandum: text("conselho_memorandum"), // JSON com deliberacoes do conselho
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPeticaoIaSchema = createInsertSchema(peticoesIa).omit({
  id: true,
  createdAt: true,
});

export type InsertPeticaoIa = z.infer<typeof insertPeticaoIaSchema>;
export type PeticaoIa = typeof peticoesIa.$inferSelect;

// ==================== TIMESHEET ====================

// Registro de horas trabalhadas
export const timesheets = pgTable("timesheets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  advogadoId: varchar("advogado_id").references(() => equipe.id),
  clienteId: varchar("cliente_id").references(() => clientes.id),
  processoId: varchar("processo_id").references(() => processos.id),
  data: date("data").notNull(),
  horasMinutos: text("horas_minutos").notNull(), // "HH:MM"
  categoria: text("categoria").notNull(), // "Consultoria", "Reuniao", "Audiencia", "Pesquisa", "Redacao", "Administrativo"
  descricao: text("descricao").notNull(),
  valorHora: decimal("valor_hora", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTimesheetSchema = createInsertSchema(timesheets).omit({
  id: true,
  createdAt: true,
});

export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;
export type Timesheet = typeof timesheets.$inferSelect;
