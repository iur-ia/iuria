import { 
  type User, type InsertUser,
  type Cliente, type InsertCliente,
  type Equipe, type InsertEquipe,
  type Processo, type InsertProcesso,
  type Atividade, type InsertAtividade,
  type Documento, type InsertDocumento,
  type ContaReceber, type InsertContaReceber,
  type ContaPagar, type InsertContaPagar,
  type Honorario, type InsertHonorario,
  type Template, type InsertTemplate,
  type Tribunal, type InsertTribunal,
  type ConsultaProcessual, type InsertConsultaProcessual,
  type Monitoramento, type InsertMonitoramento,
  type VerificacaoMonitoramento, type InsertVerificacaoMonitoramento,
  type AcervoProcesso, type InsertAcervoProcesso,
  type AcervoAndamento, type InsertAcervoAndamento,
  type AcervoDocumento, type InsertAcervoDocumento,
  type AcervoTramitacao, type InsertAcervoTramitacao,
  type ProcessoAcompanhado, type InsertProcessoAcompanhado,
  type DeadlineRule, type InsertDeadlineRule,
  type DeadlineAlert, type InsertDeadlineAlert,
  users, clientes, equipe, processos, atividades, documentos, 
  contasReceber, contasPagar, honorarios, templates,
  tribunais, consultasProcessuais, monitoramentos, verificacoesMonitoramento,
  acervoProcessos, acervoAndamentos, acervoDocumentos, acervoTramitacoes,
  processosAcompanhados, deadlineRules, deadlineAlerts
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, lte, and, inArray, gte, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Clientes
  getClientes(): Promise<Cliente[]>;
  getCliente(id: string): Promise<Cliente | undefined>;
  createCliente(cliente: InsertCliente): Promise<Cliente>;
  updateCliente(id: string, cliente: Partial<InsertCliente>): Promise<Cliente | undefined>;
  deleteCliente(id: string): Promise<boolean>;
  
  // Equipe
  getEquipe(): Promise<Equipe[]>;
  getMembro(id: string): Promise<Equipe | undefined>;
  createMembro(membro: InsertEquipe): Promise<Equipe>;
  updateMembro(id: string, membro: Partial<InsertEquipe>): Promise<Equipe | undefined>;
  deleteMembro(id: string): Promise<boolean>;
  
  // Processos
  getProcessos(): Promise<Processo[]>;
  getProcesso(id: string): Promise<Processo | undefined>;
  getProcessoByNumero(numero: string): Promise<Processo | undefined>;
  createProcesso(processo: InsertProcesso): Promise<Processo>;
  updateProcesso(id: string, processo: Partial<InsertProcesso>): Promise<Processo | undefined>;
  deleteProcesso(id: string): Promise<boolean>;
  
  // Atividades
  getAtividades(): Promise<Atividade[]>;
  getAtividade(id: string): Promise<Atividade | undefined>;
  createAtividade(atividade: InsertAtividade): Promise<Atividade>;
  updateAtividade(id: string, atividade: Partial<InsertAtividade>): Promise<Atividade | undefined>;
  deleteAtividade(id: string): Promise<boolean>;
  
  // Documentos
  getDocumentos(): Promise<Documento[]>;
  getDocumento(id: string): Promise<Documento | undefined>;
  createDocumento(documento: InsertDocumento): Promise<Documento>;
  updateDocumento(id: string, documento: Partial<InsertDocumento>): Promise<Documento | undefined>;
  deleteDocumento(id: string): Promise<boolean>;
  
  // Contas a Receber
  getContasReceber(): Promise<ContaReceber[]>;
  getContaReceber(id: string): Promise<ContaReceber | undefined>;
  createContaReceber(conta: InsertContaReceber): Promise<ContaReceber>;
  updateContaReceber(id: string, conta: Partial<InsertContaReceber>): Promise<ContaReceber | undefined>;
  deleteContaReceber(id: string): Promise<boolean>;
  
  // Contas a Pagar
  getContasPagar(): Promise<ContaPagar[]>;
  getContaPagar(id: string): Promise<ContaPagar | undefined>;
  createContaPagar(conta: InsertContaPagar): Promise<ContaPagar>;
  updateContaPagar(id: string, conta: Partial<InsertContaPagar>): Promise<ContaPagar | undefined>;
  deleteContaPagar(id: string): Promise<boolean>;
  
  // Honorários
  getHonorarios(): Promise<Honorario[]>;
  getHonorario(id: string): Promise<Honorario | undefined>;
  createHonorario(honorario: InsertHonorario): Promise<Honorario>;
  updateHonorario(id: string, honorario: Partial<InsertHonorario>): Promise<Honorario | undefined>;
  deleteHonorario(id: string): Promise<boolean>;
  
  // Templates
  getTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, template: Partial<InsertTemplate>): Promise<Template | undefined>;
  deleteTemplate(id: string): Promise<boolean>;
  
  // Tribunais
  getTribunais(): Promise<Tribunal[]>;
  getTribunal(id: string): Promise<Tribunal | undefined>;
  getTribunalBySigla(sigla: string): Promise<Tribunal | undefined>;
  createTribunal(tribunal: InsertTribunal): Promise<Tribunal>;
  
  // Consultas Processuais
  getConsultasProcessuais(limit?: number): Promise<ConsultaProcessual[]>;
  createConsultaProcessual(consulta: InsertConsultaProcessual): Promise<ConsultaProcessual>;
  
  // Monitoramento
  getMonitoramentos(): Promise<Monitoramento[]>;
  getMonitoramentosAtivos(): Promise<Monitoramento[]>;
  getMonitoramentosPendentes(): Promise<Monitoramento[]>;
  getMonitoramento(id: string): Promise<Monitoramento | undefined>;
  getMonitoramentoByNumero(numero: string): Promise<Monitoramento | undefined>;
  createMonitoramento(monitoramento: InsertMonitoramento): Promise<Monitoramento>;
  updateMonitoramento(id: string, monitoramento: Partial<InsertMonitoramento>): Promise<Monitoramento | undefined>;
  deleteMonitoramento(id: string): Promise<boolean>;
  
  // Verificações de Monitoramento
  createVerificacao(verificacao: InsertVerificacaoMonitoramento): Promise<VerificacaoMonitoramento>;
  getVerificacoesByMonitoramento(monitoramentoId: string): Promise<VerificacaoMonitoramento[]>;

  // Acervo de Processos
  getAcervoProcessos(filters?: { tipo?: string; tribunal?: string; fase?: string; responsavelId?: string; statusInterno?: string; prazoAte?: string }): Promise<AcervoProcesso[]>;
  getUltimoAndamentoPorAcervo(acervoIds: string[]): Promise<Record<string, AcervoAndamento>>;
  getAcervoProcesso(id: string): Promise<AcervoProcesso | undefined>;
  getAcervoProcessoByNumero(numero: string): Promise<AcervoProcesso | undefined>;
  createAcervoProcesso(processo: InsertAcervoProcesso): Promise<AcervoProcesso>;
  updateAcervoProcesso(id: string, processo: Partial<InsertAcervoProcesso>): Promise<AcervoProcesso | undefined>;
  deleteAcervoProcesso(id: string): Promise<boolean>;

  // Acervo Andamentos
  getAcervoAndamentos(acervoId: string): Promise<AcervoAndamento[]>;
  createAcervoAndamento(andamento: InsertAcervoAndamento): Promise<AcervoAndamento>;
  deleteAcervoAndamento(id: string): Promise<boolean>;

  // Acervo Documentos
  getAcervoDocumentos(acervoId: string): Promise<AcervoDocumento[]>;
  createAcervoDocumento(documento: InsertAcervoDocumento): Promise<AcervoDocumento>;
  deleteAcervoDocumento(id: string): Promise<boolean>;

  // Acervo Tramitações
  getAcervoTramitacoes(acervoId: string): Promise<AcervoTramitacao[]>;
  createAcervoTramitacao(tramitacao: InsertAcervoTramitacao): Promise<AcervoTramitacao>;
  updateAcervoTramitacao(id: string, tramitacao: Partial<InsertAcervoTramitacao>): Promise<AcervoTramitacao | undefined>;
  deleteAcervoTramitacao(id: string): Promise<boolean>;

  // Processos Acompanhados
  getProcessosAcompanhados(userId?: string): Promise<ProcessoAcompanhado[]>;
  getProcessoAcompanhado(id: string): Promise<ProcessoAcompanhado | undefined>;
  createProcessoAcompanhado(data: InsertProcessoAcompanhado): Promise<ProcessoAcompanhado>;
  updateProcessoAcompanhado(id: string, data: Partial<InsertProcessoAcompanhado>): Promise<ProcessoAcompanhado | undefined>;
  deleteProcessoAcompanhado(id: string): Promise<boolean>;

  // Deadline Rules (Engine de Prazos)
  getDeadlineRules(filters?: { ativo?: boolean; preConfigurada?: boolean; area?: string }): Promise<DeadlineRule[]>;
  getDeadlineRule(id: string): Promise<DeadlineRule | undefined>;
  createDeadlineRule(rule: InsertDeadlineRule): Promise<DeadlineRule>;
  updateDeadlineRule(id: string, rule: Partial<InsertDeadlineRule>): Promise<DeadlineRule | undefined>;
  deleteDeadlineRule(id: string): Promise<boolean>;

  // Deadline Alerts
  getDeadlineAlert(atividadeId: string, tipoAlerta: string): Promise<DeadlineAlert | undefined>;
  createDeadlineAlert(alert: InsertDeadlineAlert): Promise<DeadlineAlert>;

  // Atividades com prazos críticos
  getAtividadesPrazosCriticos(horasJanela: number): Promise<Atividade[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Clientes
  async getClientes(): Promise<Cliente[]> {
    return db.select().from(clientes);
  }

  async getCliente(id: string): Promise<Cliente | undefined> {
    const [cliente] = await db.select().from(clientes).where(eq(clientes.id, id));
    return cliente;
  }

  async createCliente(insertCliente: InsertCliente): Promise<Cliente> {
    const [cliente] = await db.insert(clientes).values(insertCliente).returning();
    return cliente;
  }

  async updateCliente(id: string, updateData: Partial<InsertCliente>): Promise<Cliente | undefined> {
    const [cliente] = await db.update(clientes).set(updateData).where(eq(clientes.id, id)).returning();
    return cliente;
  }

  async deleteCliente(id: string): Promise<boolean> {
    const result = await db.delete(clientes).where(eq(clientes.id, id)).returning();
    return result.length > 0;
  }

  // Equipe
  async getEquipe(): Promise<Equipe[]> {
    return db.select().from(equipe);
  }

  async getMembro(id: string): Promise<Equipe | undefined> {
    const [membro] = await db.select().from(equipe).where(eq(equipe.id, id));
    return membro;
  }

  async createMembro(insertMembro: InsertEquipe): Promise<Equipe> {
    const [membro] = await db.insert(equipe).values(insertMembro).returning();
    return membro;
  }

  async updateMembro(id: string, updateData: Partial<InsertEquipe>): Promise<Equipe | undefined> {
    const [membro] = await db.update(equipe).set(updateData).where(eq(equipe.id, id)).returning();
    return membro;
  }

  async deleteMembro(id: string): Promise<boolean> {
    const result = await db.delete(equipe).where(eq(equipe.id, id)).returning();
    return result.length > 0;
  }

  // Processos
  async getProcessos(): Promise<Processo[]> {
    return db.select().from(processos);
  }

  async getProcesso(id: string): Promise<Processo | undefined> {
    const [processo] = await db.select().from(processos).where(eq(processos.id, id));
    return processo;
  }

  async getProcessoByNumero(numero: string): Promise<Processo | undefined> {
    const [processo] = await db.select().from(processos).where(eq(processos.numero, numero));
    return processo;
  }

  async createProcesso(insertProcesso: InsertProcesso): Promise<Processo> {
    const [processo] = await db.insert(processos).values(insertProcesso).returning();
    return processo;
  }

  async updateProcesso(id: string, updateData: Partial<InsertProcesso>): Promise<Processo | undefined> {
    const [processo] = await db.update(processos).set(updateData).where(eq(processos.id, id)).returning();
    return processo;
  }

  async deleteProcesso(id: string): Promise<boolean> {
    const result = await db.delete(processos).where(eq(processos.id, id)).returning();
    return result.length > 0;
  }

  // Atividades
  async getAtividades(): Promise<Atividade[]> {
    return db.select().from(atividades);
  }

  async getAtividade(id: string): Promise<Atividade | undefined> {
    const [atividade] = await db.select().from(atividades).where(eq(atividades.id, id));
    return atividade;
  }

  async createAtividade(insertAtividade: InsertAtividade): Promise<Atividade> {
    const [atividade] = await db.insert(atividades).values(insertAtividade).returning();
    return atividade;
  }

  async updateAtividade(id: string, updateData: Partial<InsertAtividade>): Promise<Atividade | undefined> {
    const [atividade] = await db.update(atividades).set(updateData).where(eq(atividades.id, id)).returning();
    return atividade;
  }

  async deleteAtividade(id: string): Promise<boolean> {
    const result = await db.delete(atividades).where(eq(atividades.id, id)).returning();
    return result.length > 0;
  }

  // Documentos
  async getDocumentos(): Promise<Documento[]> {
    return db.select().from(documentos);
  }

  async getDocumento(id: string): Promise<Documento | undefined> {
    const [documento] = await db.select().from(documentos).where(eq(documentos.id, id));
    return documento;
  }

  async createDocumento(insertDocumento: InsertDocumento): Promise<Documento> {
    const [documento] = await db.insert(documentos).values(insertDocumento).returning();
    return documento;
  }

  async updateDocumento(id: string, updateData: Partial<InsertDocumento>): Promise<Documento | undefined> {
    const [documento] = await db.update(documentos).set(updateData).where(eq(documentos.id, id)).returning();
    return documento;
  }

  async deleteDocumento(id: string): Promise<boolean> {
    const result = await db.delete(documentos).where(eq(documentos.id, id)).returning();
    return result.length > 0;
  }

  // Contas a Receber
  async getContasReceber(): Promise<ContaReceber[]> {
    return db.select().from(contasReceber);
  }

  async getContaReceber(id: string): Promise<ContaReceber | undefined> {
    const [conta] = await db.select().from(contasReceber).where(eq(contasReceber.id, id));
    return conta;
  }

  async createContaReceber(insertConta: InsertContaReceber): Promise<ContaReceber> {
    const [conta] = await db.insert(contasReceber).values(insertConta).returning();
    return conta;
  }

  async updateContaReceber(id: string, updateData: Partial<InsertContaReceber>): Promise<ContaReceber | undefined> {
    const [conta] = await db.update(contasReceber).set(updateData).where(eq(contasReceber.id, id)).returning();
    return conta;
  }

  async deleteContaReceber(id: string): Promise<boolean> {
    const result = await db.delete(contasReceber).where(eq(contasReceber.id, id)).returning();
    return result.length > 0;
  }

  // Contas a Pagar
  async getContasPagar(): Promise<ContaPagar[]> {
    return db.select().from(contasPagar);
  }

  async getContaPagar(id: string): Promise<ContaPagar | undefined> {
    const [conta] = await db.select().from(contasPagar).where(eq(contasPagar.id, id));
    return conta;
  }

  async createContaPagar(insertConta: InsertContaPagar): Promise<ContaPagar> {
    const [conta] = await db.insert(contasPagar).values(insertConta).returning();
    return conta;
  }

  async updateContaPagar(id: string, updateData: Partial<InsertContaPagar>): Promise<ContaPagar | undefined> {
    const [conta] = await db.update(contasPagar).set(updateData).where(eq(contasPagar.id, id)).returning();
    return conta;
  }

  async deleteContaPagar(id: string): Promise<boolean> {
    const result = await db.delete(contasPagar).where(eq(contasPagar.id, id)).returning();
    return result.length > 0;
  }

  // Honorários
  async getHonorarios(): Promise<Honorario[]> {
    return db.select().from(honorarios);
  }

  async getHonorario(id: string): Promise<Honorario | undefined> {
    const [honorario] = await db.select().from(honorarios).where(eq(honorarios.id, id));
    return honorario;
  }

  async createHonorario(insertHonorario: InsertHonorario): Promise<Honorario> {
    const [honorario] = await db.insert(honorarios).values(insertHonorario).returning();
    return honorario;
  }

  async updateHonorario(id: string, updateData: Partial<InsertHonorario>): Promise<Honorario | undefined> {
    const [honorario] = await db.update(honorarios).set(updateData).where(eq(honorarios.id, id)).returning();
    return honorario;
  }

  async deleteHonorario(id: string): Promise<boolean> {
    const result = await db.delete(honorarios).where(eq(honorarios.id, id)).returning();
    return result.length > 0;
  }

  // Templates
  async getTemplates(): Promise<Template[]> {
    return db.select().from(templates);
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const [template] = await db.insert(templates).values(insertTemplate).returning();
    return template;
  }

  async updateTemplate(id: string, updateData: Partial<InsertTemplate>): Promise<Template | undefined> {
    const [template] = await db.update(templates).set(updateData).where(eq(templates.id, id)).returning();
    return template;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const result = await db.delete(templates).where(eq(templates.id, id)).returning();
    return result.length > 0;
  }

  // Tribunais
  async getTribunais(): Promise<Tribunal[]> {
    return db.select().from(tribunais);
  }

  async getTribunal(id: string): Promise<Tribunal | undefined> {
    const [tribunal] = await db.select().from(tribunais).where(eq(tribunais.id, id));
    return tribunal;
  }

  async getTribunalBySigla(sigla: string): Promise<Tribunal | undefined> {
    const [tribunal] = await db.select().from(tribunais).where(eq(tribunais.sigla, sigla));
    return tribunal;
  }

  async createTribunal(insertTribunal: InsertTribunal): Promise<Tribunal> {
    const [tribunal] = await db.insert(tribunais).values(insertTribunal).returning();
    return tribunal;
  }

  // Consultas Processuais
  async getConsultasProcessuais(limit: number = 50): Promise<ConsultaProcessual[]> {
    return db.select().from(consultasProcessuais).orderBy(desc(consultasProcessuais.createdAt)).limit(limit);
  }

  async createConsultaProcessual(insertConsulta: InsertConsultaProcessual): Promise<ConsultaProcessual> {
    const [consulta] = await db.insert(consultasProcessuais).values(insertConsulta).returning();
    return consulta;
  }

  // Monitoramento
  async getMonitoramentos(): Promise<Monitoramento[]> {
    return db.select().from(monitoramentos).orderBy(desc(monitoramentos.createdAt));
  }

  async getMonitoramentosAtivos(): Promise<Monitoramento[]> {
    return db.select().from(monitoramentos)
      .where(eq(monitoramentos.ativo, true))
      .orderBy(desc(monitoramentos.createdAt));
  }

  async getMonitoramentosPendentes(): Promise<Monitoramento[]> {
    const agora = new Date();
    return db.select().from(monitoramentos)
      .where(and(
        eq(monitoramentos.ativo, true),
        lte(monitoramentos.proximaChecagem, agora)
      ))
      .orderBy(monitoramentos.proximaChecagem);
  }

  async getMonitoramento(id: string): Promise<Monitoramento | undefined> {
    const [monitoramento] = await db.select().from(monitoramentos).where(eq(monitoramentos.id, id));
    return monitoramento;
  }

  async getMonitoramentoByNumero(numero: string): Promise<Monitoramento | undefined> {
    const [monitoramento] = await db.select().from(monitoramentos)
      .where(eq(monitoramentos.numeroProcesso, numero));
    return monitoramento;
  }

  async createMonitoramento(insertMonitoramento: InsertMonitoramento): Promise<Monitoramento> {
    const [monitoramento] = await db.insert(monitoramentos).values(insertMonitoramento).returning();
    return monitoramento;
  }

  async updateMonitoramento(id: string, updateData: Partial<InsertMonitoramento>): Promise<Monitoramento | undefined> {
    const [monitoramento] = await db.update(monitoramentos)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(monitoramentos.id, id))
      .returning();
    return monitoramento;
  }

  async deleteMonitoramento(id: string): Promise<boolean> {
    const result = await db.delete(monitoramentos).where(eq(monitoramentos.id, id)).returning();
    return result.length > 0;
  }

  // Verificações de Monitoramento
  async createVerificacao(insertVerificacao: InsertVerificacaoMonitoramento): Promise<VerificacaoMonitoramento> {
    const [verificacao] = await db.insert(verificacoesMonitoramento).values(insertVerificacao).returning();
    return verificacao;
  }

  async getVerificacoesByMonitoramento(monitoramentoId: string): Promise<VerificacaoMonitoramento[]> {
    return db.select().from(verificacoesMonitoramento)
      .where(eq(verificacoesMonitoramento.monitoramentoId, monitoramentoId))
      .orderBy(desc(verificacoesMonitoramento.createdAt))
      .limit(10);
  }

  // ==================== ACERVO ====================

  async getAcervoProcessos(filters?: { tipo?: string; tribunal?: string; fase?: string; responsavelId?: string; statusInterno?: string; prazoAte?: string }): Promise<AcervoProcesso[]> {
    const conditions = [];
    if (filters?.tipo) conditions.push(eq(acervoProcessos.tipo, filters.tipo));
    if (filters?.tribunal) conditions.push(eq(acervoProcessos.tribunal, filters.tribunal));
    if (filters?.fase) conditions.push(eq(acervoProcessos.fase, filters.fase));
    if (filters?.responsavelId) conditions.push(eq(acervoProcessos.responsavelId, filters.responsavelId));
    if (filters?.statusInterno) conditions.push(eq(acervoProcessos.statusInterno, filters.statusInterno));
    if (filters?.prazoAte) conditions.push(lte(acervoProcessos.prazo, filters.prazoAte));
    if (conditions.length > 0) {
      return db.select().from(acervoProcessos)
        .where(and(...conditions))
        .orderBy(desc(acervoProcessos.createdAt));
    }
    return db.select().from(acervoProcessos).orderBy(desc(acervoProcessos.createdAt));
  }

  async getUltimoAndamentoPorAcervo(acervoIds: string[]): Promise<Record<string, AcervoAndamento>> {
    if (acervoIds.length === 0) return {};
    const todos = await db.select().from(acervoAndamentos)
      .where(inArray(acervoAndamentos.acervoId, acervoIds))
      .orderBy(desc(acervoAndamentos.data), desc(acervoAndamentos.createdAt));
    const mapa: Record<string, AcervoAndamento> = {};
    for (const a of todos) {
      if (!mapa[a.acervoId]) mapa[a.acervoId] = a;
    }
    return mapa;
  }

  async getAcervoProcesso(id: string): Promise<AcervoProcesso | undefined> {
    const [processo] = await db.select().from(acervoProcessos).where(eq(acervoProcessos.id, id));
    return processo;
  }

  async getAcervoProcessoByNumero(numero: string): Promise<AcervoProcesso | undefined> {
    const [processo] = await db.select().from(acervoProcessos).where(eq(acervoProcessos.numero, numero));
    return processo;
  }

  async createAcervoProcesso(insertProcesso: InsertAcervoProcesso): Promise<AcervoProcesso> {
    const [processo] = await db.insert(acervoProcessos).values(insertProcesso).returning();
    return processo;
  }

  async updateAcervoProcesso(id: string, updateData: Partial<InsertAcervoProcesso>): Promise<AcervoProcesso | undefined> {
    const [processo] = await db.update(acervoProcessos)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(acervoProcessos.id, id))
      .returning();
    return processo;
  }

  async deleteAcervoProcesso(id: string): Promise<boolean> {
    const result = await db.delete(acervoProcessos).where(eq(acervoProcessos.id, id)).returning();
    return result.length > 0;
  }

  // Acervo Andamentos
  async getAcervoAndamentos(acervoId: string): Promise<AcervoAndamento[]> {
    return db.select().from(acervoAndamentos)
      .where(eq(acervoAndamentos.acervoId, acervoId))
      .orderBy(desc(acervoAndamentos.data), desc(acervoAndamentos.createdAt));
  }

  async createAcervoAndamento(insertAndamento: InsertAcervoAndamento): Promise<AcervoAndamento> {
    const [andamento] = await db.insert(acervoAndamentos).values(insertAndamento).returning();
    return andamento;
  }

  async deleteAcervoAndamento(id: string): Promise<boolean> {
    const result = await db.delete(acervoAndamentos).where(eq(acervoAndamentos.id, id)).returning();
    return result.length > 0;
  }

  // Acervo Documentos
  async getAcervoDocumentos(acervoId: string): Promise<AcervoDocumento[]> {
    return db.select().from(acervoDocumentos)
      .where(eq(acervoDocumentos.acervoId, acervoId))
      .orderBy(desc(acervoDocumentos.createdAt));
  }

  async createAcervoDocumento(insertDocumento: InsertAcervoDocumento): Promise<AcervoDocumento> {
    const [documento] = await db.insert(acervoDocumentos).values(insertDocumento).returning();
    return documento;
  }

  async deleteAcervoDocumento(id: string): Promise<boolean> {
    const result = await db.delete(acervoDocumentos).where(eq(acervoDocumentos.id, id)).returning();
    return result.length > 0;
  }

  // Acervo Tramitações
  async getAcervoTramitacoes(acervoId: string): Promise<AcervoTramitacao[]> {
    return db.select().from(acervoTramitacoes)
      .where(eq(acervoTramitacoes.acervoId, acervoId))
      .orderBy(acervoTramitacoes.createdAt);
  }

  async createAcervoTramitacao(insertTramitacao: InsertAcervoTramitacao): Promise<AcervoTramitacao> {
    const [tramitacao] = await db.insert(acervoTramitacoes).values(insertTramitacao).returning();
    return tramitacao;
  }

  async updateAcervoTramitacao(id: string, updateData: Partial<InsertAcervoTramitacao>): Promise<AcervoTramitacao | undefined> {
    const [tramitacao] = await db.update(acervoTramitacoes)
      .set(updateData)
      .where(eq(acervoTramitacoes.id, id))
      .returning();
    return tramitacao;
  }

  async deleteAcervoTramitacao(id: string): Promise<boolean> {
    const result = await db.delete(acervoTramitacoes).where(eq(acervoTramitacoes.id, id)).returning();
    return result.length > 0;
  }

  // Processos Acompanhados
  async getProcessosAcompanhados(userId?: string): Promise<ProcessoAcompanhado[]> {
    if (userId) {
      return db.select().from(processosAcompanhados)
        .where(eq(processosAcompanhados.userId, userId))
        .orderBy(desc(processosAcompanhados.updatedAt));
    }
    return db.select().from(processosAcompanhados)
      .orderBy(desc(processosAcompanhados.updatedAt));
  }

  async getProcessoAcompanhado(id: string): Promise<ProcessoAcompanhado | undefined> {
    const [item] = await db.select().from(processosAcompanhados).where(eq(processosAcompanhados.id, id));
    return item;
  }

  async createProcessoAcompanhado(data: InsertProcessoAcompanhado): Promise<ProcessoAcompanhado> {
    const [item] = await db.insert(processosAcompanhados).values(data).returning();
    return item;
  }

  async updateProcessoAcompanhado(id: string, data: Partial<InsertProcessoAcompanhado>): Promise<ProcessoAcompanhado | undefined> {
    const [item] = await db.update(processosAcompanhados)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(processosAcompanhados.id, id))
      .returning();
    return item;
  }

  async deleteProcessoAcompanhado(id: string): Promise<boolean> {
    const result = await db.delete(processosAcompanhados).where(eq(processosAcompanhados.id, id)).returning();
    return result.length > 0;
  }

  // ==================== DEADLINE RULES ====================

  async getDeadlineRules(filters?: { ativo?: boolean; preConfigurada?: boolean; area?: string }): Promise<DeadlineRule[]> {
    const conditions = [];
    if (filters?.ativo !== undefined) conditions.push(eq(deadlineRules.ativo, filters.ativo));
    if (filters?.preConfigurada !== undefined) conditions.push(eq(deadlineRules.preConfigurada, filters.preConfigurada));
    if (filters?.area) conditions.push(eq(deadlineRules.area, filters.area));
    if (conditions.length > 0) {
      return db.select().from(deadlineRules).where(and(...conditions)).orderBy(deadlineRules.createdAt);
    }
    return db.select().from(deadlineRules).orderBy(deadlineRules.createdAt);
  }

  async getDeadlineRule(id: string): Promise<DeadlineRule | undefined> {
    const [rule] = await db.select().from(deadlineRules).where(eq(deadlineRules.id, id));
    return rule;
  }

  async createDeadlineRule(rule: InsertDeadlineRule): Promise<DeadlineRule> {
    const [created] = await db.insert(deadlineRules).values(rule).returning();
    return created;
  }

  async updateDeadlineRule(id: string, updateData: Partial<InsertDeadlineRule>): Promise<DeadlineRule | undefined> {
    const [updated] = await db.update(deadlineRules)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(deadlineRules.id, id))
      .returning();
    return updated;
  }

  async deleteDeadlineRule(id: string): Promise<boolean> {
    const result = await db.delete(deadlineRules).where(eq(deadlineRules.id, id)).returning();
    return result.length > 0;
  }

  // ==================== DEADLINE ALERTS ====================

  async getDeadlineAlert(atividadeId: string, tipoAlerta: string): Promise<DeadlineAlert | undefined> {
    const [alert] = await db.select().from(deadlineAlerts)
      .where(and(eq(deadlineAlerts.atividadeId, atividadeId), eq(deadlineAlerts.tipoAlerta, tipoAlerta)));
    return alert;
  }

  async createDeadlineAlert(alert: InsertDeadlineAlert): Promise<DeadlineAlert> {
    const [created] = await db.insert(deadlineAlerts).values(alert).returning();
    return created;
  }

  // ==================== ATIVIDADES PRAZOS CRÍTICOS ====================

  async getAtividadesPrazosCriticos(horasJanela: number): Promise<Atividade[]> {
    const agora = new Date();
    const limite = new Date(agora.getTime() + horasJanela * 60 * 60 * 1000);
    const agoraDate = agora.toISOString().split("T")[0];
    const limiteDate = limite.toISOString().split("T")[0];

    return db.select().from(atividades)
      .where(
        and(
          gte(atividades.data, agoraDate),
          lte(atividades.data, limiteDate),
          sql`${atividades.risco} IS NOT NULL`,
          sql`${atividades.status} != 'Concluído'`
        )
      )
      .orderBy(atividades.data);
  }
}

export const storage = new DatabaseStorage();
