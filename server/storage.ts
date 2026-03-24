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
  type Prazo, type InsertPrazo,
  type Feriado, type InsertFeriado,
  type Alerta, type InsertAlerta,
  type CertificadoDigital, type InsertCertificadoDigital,
  type PecaProcessual, type InsertPecaProcessual,
  type PublicacaoDje, type InsertPublicacaoDje,
  users, clientes, equipe, processos, atividades, documentos, 
  contasReceber, contasPagar, honorarios, templates,
  tribunais, consultasProcessuais, monitoramentos, verificacoesMonitoramento,
  prazos, feriados, alertas,
  certificadosDigitais, pecasProcessuais, publicacoesDje
} from "@shared/schema";
import { db, hasDatabase } from "./db";
import { eq, desc, lte, and, gte, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  
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
  
  // Prazos
  getPrazos(): Promise<Prazo[]>;
  getPrazo(id: string): Promise<Prazo | undefined>;
  createPrazo(prazo: InsertPrazo): Promise<Prazo>;
  updatePrazo(id: string, prazo: Partial<InsertPrazo>): Promise<Prazo | undefined>;
  deletePrazo(id: string): Promise<boolean>;
  getPrazosVencendo(diasAfrente: number): Promise<Prazo[]>;
  
  // Feriados
  getFeriados(ano?: number): Promise<Feriado[]>;
  createFeriado(feriado: InsertFeriado): Promise<Feriado>;
  
  // Alertas
  getAlertas(usuarioId?: string): Promise<Alerta[]>;
  getAlertasNaoLidos(usuarioId?: string): Promise<Alerta[]>;
  createAlerta(alerta: InsertAlerta): Promise<Alerta>;
  marcarAlertaLido(id: string): Promise<Alerta | undefined>;
  marcarTodosAlertasLidos(usuarioId?: string): Promise<number>;
  
  // Certificados Digitais
  getCertificados(usuarioId?: string): Promise<CertificadoDigital[]>;
  getCertificado(id: string): Promise<CertificadoDigital | undefined>;
  createCertificado(cert: InsertCertificadoDigital): Promise<CertificadoDigital>;
  updateCertificado(id: string, cert: Partial<InsertCertificadoDigital>): Promise<CertificadoDigital | undefined>;
  deleteCertificado(id: string): Promise<boolean>;
  
  // Pecas Processuais
  getPecas(processoId?: string): Promise<PecaProcessual[]>;
  getPeca(id: string): Promise<PecaProcessual | undefined>;
  createPeca(peca: InsertPecaProcessual): Promise<PecaProcessual>;
  deletePeca(id: string): Promise<boolean>;
  
  // Publicacoes DJe
  getPublicacoes(tribunal?: string, limit?: number): Promise<PublicacaoDje[]>;
  getPublicacao(id: string): Promise<PublicacaoDje | undefined>;
  createPublicacao(pub: InsertPublicacaoDje): Promise<PublicacaoDje>;
  buscarPublicacoes(termo: string): Promise<PublicacaoDje[]>;
  
  // Dashboard
  getDashboardStats(): Promise<any>;
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

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
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

  // Prazos
  async getPrazos(): Promise<Prazo[]> {
    return db.select().from(prazos).orderBy(prazos.dataVencimento);
  }
  async getPrazo(id: string): Promise<Prazo | undefined> {
    const [p] = await db.select().from(prazos).where(eq(prazos.id, id));
    return p;
  }
  async createPrazo(data: InsertPrazo): Promise<Prazo> {
    const [p] = await db.insert(prazos).values(data).returning();
    return p;
  }
  async updatePrazo(id: string, data: Partial<InsertPrazo>): Promise<Prazo | undefined> {
    const [p] = await db.update(prazos).set({ ...data, updatedAt: new Date() }).where(eq(prazos.id, id)).returning();
    return p;
  }
  async deletePrazo(id: string): Promise<boolean> {
    const r = await db.delete(prazos).where(eq(prazos.id, id)).returning();
    return r.length > 0;
  }
  async getPrazosVencendo(diasAfrente: number): Promise<Prazo[]> {
    const hoje = new Date().toISOString().split('T')[0];
    const futuro = new Date(Date.now() + diasAfrente * 86400000).toISOString().split('T')[0];
    return db.select().from(prazos)
      .where(and(gte(prazos.dataVencimento, hoje), lte(prazos.dataVencimento, futuro)))
      .orderBy(prazos.dataVencimento);
  }

  // Feriados
  async getFeriados(ano?: number): Promise<Feriado[]> {
    if (ano) {
      const inicio = `${ano}-01-01`;
      const fim = `${ano}-12-31`;
      return db.select().from(feriados)
        .where(and(gte(feriados.data, inicio), lte(feriados.data, fim)));
    }
    return db.select().from(feriados);
  }
  async createFeriado(data: InsertFeriado): Promise<Feriado> {
    const [f] = await db.insert(feriados).values(data).returning();
    return f;
  }

  // Alertas
  async getAlertas(usuarioId?: string): Promise<Alerta[]> {
    if (usuarioId) {
      return db.select().from(alertas).where(eq(alertas.usuarioId, usuarioId)).orderBy(desc(alertas.createdAt)).limit(50);
    }
    return db.select().from(alertas).orderBy(desc(alertas.createdAt)).limit(50);
  }
  async getAlertasNaoLidos(usuarioId?: string): Promise<Alerta[]> {
    if (usuarioId) {
      return db.select().from(alertas).where(and(eq(alertas.usuarioId, usuarioId), eq(alertas.lido, false))).orderBy(desc(alertas.createdAt));
    }
    return db.select().from(alertas).where(eq(alertas.lido, false)).orderBy(desc(alertas.createdAt));
  }
  async createAlerta(data: InsertAlerta): Promise<Alerta> {
    const [a] = await db.insert(alertas).values(data).returning();
    return a;
  }
  async marcarAlertaLido(id: string): Promise<Alerta | undefined> {
    const [a] = await db.update(alertas).set({ lido: true, lidoEm: new Date() }).where(eq(alertas.id, id)).returning();
    return a;
  }
  async marcarTodosAlertasLidos(usuarioId?: string): Promise<number> {
    const result = await db.update(alertas).set({ lido: true, lidoEm: new Date() }).where(eq(alertas.lido, false)).returning();
    return result.length;
  }

  // Dashboard
  async getDashboardStats(): Promise<any> {
    const allAtividades = await db.select().from(atividades);
    const allProcessos = await db.select().from(processos);
    const allClientes = await db.select().from(clientes);
    const allMonitoramentos = await db.select().from(monitoramentos).where(eq(monitoramentos.ativo, true));
    const allPrazos = await db.select().from(prazos);
    const allContasReceber = await db.select().from(contasReceber);
    const allContasPagar = await db.select().from(contasPagar);
    const allAlertas = await db.select().from(alertas).where(eq(alertas.lido, false));
    return { 
      atividades: allAtividades, 
      processos: allProcessos, 
      clientes: allClientes, 
      monitoramentos: allMonitoramentos, 
      prazos: allPrazos,
      contasReceber: allContasReceber,
      contasPagar: allContasPagar,
      alertasNaoLidos: allAlertas.length,
    };
  }

  // Certificados Digitais
  async getCertificados(usuarioId?: string) {
    if (usuarioId) {
      return await db.select().from(certificadosDigitais).where(eq(certificadosDigitais.usuarioId, usuarioId)).orderBy(desc(certificadosDigitais.createdAt));
    }
    return await db.select().from(certificadosDigitais).orderBy(desc(certificadosDigitais.createdAt));
  }
  async getCertificado(id: string) {
    const [cert] = await db.select().from(certificadosDigitais).where(eq(certificadosDigitais.id, id));
    return cert;
  }
  async createCertificado(cert: InsertCertificadoDigital) {
    const [created] = await db.insert(certificadosDigitais).values(cert).returning();
    return created;
  }
  async updateCertificado(id: string, cert: Partial<InsertCertificadoDigital>) {
    const [updated] = await db.update(certificadosDigitais).set({ ...cert, updatedAt: new Date() }).where(eq(certificadosDigitais.id, id)).returning();
    return updated;
  }
  async deleteCertificado(id: string) {
    const result = await db.delete(certificadosDigitais).where(eq(certificadosDigitais.id, id)).returning();
    return result.length > 0;
  }

  // Pecas Processuais
  async getPecas(processoId?: string) {
    if (processoId) {
      return await db.select().from(pecasProcessuais).where(eq(pecasProcessuais.processoId, processoId)).orderBy(desc(pecasProcessuais.createdAt));
    }
    return await db.select().from(pecasProcessuais).orderBy(desc(pecasProcessuais.createdAt));
  }
  async getPeca(id: string) {
    const [peca] = await db.select().from(pecasProcessuais).where(eq(pecasProcessuais.id, id));
    return peca;
  }
  async createPeca(peca: InsertPecaProcessual) {
    const [created] = await db.insert(pecasProcessuais).values(peca).returning();
    return created;
  }
  async deletePeca(id: string) {
    const result = await db.delete(pecasProcessuais).where(eq(pecasProcessuais.id, id)).returning();
    return result.length > 0;
  }

  // Publicacoes DJe
  async getPublicacoes(tribunal?: string, limit: number = 50) {
    if (tribunal) {
      return await db.select().from(publicacoesDje).where(eq(publicacoesDje.tribunal, tribunal)).orderBy(desc(publicacoesDje.dataPublicacao)).limit(limit);
    }
    return await db.select().from(publicacoesDje).orderBy(desc(publicacoesDje.dataPublicacao)).limit(limit);
  }
  async getPublicacao(id: string) {
    const [pub] = await db.select().from(publicacoesDje).where(eq(publicacoesDje.id, id));
    return pub;
  }
  async createPublicacao(pub: InsertPublicacaoDje) {
    const [created] = await db.insert(publicacoesDje).values(pub).returning();
    return created;
  }
  async buscarPublicacoes(termo: string) {
    return await db.select().from(publicacoesDje)
      .where(sql`${publicacoesDje.conteudo} ILIKE ${'%' + termo + '%'} OR ${publicacoesDje.processoNumero} ILIKE ${'%' + termo + '%'}`)
      .orderBy(desc(publicacoesDje.dataPublicacao)).limit(50);
  }
}

// ==================== IN-MEMORY STORAGE (for dev without DB) ====================

function uuid() {
  return crypto.randomUUID();
}

class MemStorage implements IStorage {
  private _users: Map<string, User> = new Map();
  private _clientes: Map<string, Cliente> = new Map();
  private _equipe: Map<string, Equipe> = new Map();
  private _processos: Map<string, Processo> = new Map();
  private _atividades: Map<string, Atividade> = new Map();
  private _documentos: Map<string, Documento> = new Map();
  private _contasReceber: Map<string, ContaReceber> = new Map();
  private _contasPagar: Map<string, ContaPagar> = new Map();
  private _honorarios: Map<string, Honorario> = new Map();
  private _templates: Map<string, Template> = new Map();
  private _tribunais: Map<string, Tribunal> = new Map();
  private _consultas: Map<string, ConsultaProcessual> = new Map();
  private _monitoramentos: Map<string, Monitoramento> = new Map();
  private _verificacoes: Map<string, VerificacaoMonitoramento> = new Map();
  private _prazos: Map<string, Prazo> = new Map();
  private _feriados: Map<string, Feriado> = new Map();
  private _alertas: Map<string, Alerta> = new Map();
  private _certificados: Map<string, CertificadoDigital> = new Map();
  private _pecas: Map<string, PecaProcessual> = new Map();
  private _publicacoes: Map<string, PublicacaoDje> = new Map();

  constructor() {
    // Seed tribunais
    const seedTribunais = [
      { sigla: "STF", nome: "Supremo Tribunal Federal", tipo: "Superior", url: "https://portal.stf.jus.br/processos/", ativo: true },
      { sigla: "STJ", nome: "Superior Tribunal de Justiça", tipo: "Superior", url: "https://processo.stj.jus.br/processo/pesquisa/", ativo: true },
      { sigla: "TST", nome: "Tribunal Superior do Trabalho", tipo: "Superior", url: "https://pje.tst.jus.br/consultaprocessual/", ativo: true },
      { sigla: "TSE", nome: "Tribunal Superior Eleitoral", tipo: "Superior", url: "https://pje.tse.jus.br/pje-web/", ativo: true },
      { sigla: "STM", nome: "Superior Tribunal Militar", tipo: "Superior", url: "https://www.stm.jus.br/servicos-stm/processos", ativo: true },
      { sigla: "TRF1", nome: "TRF 1ª Região", tipo: "Federal", url: "https://processual.trf1.jus.br", ativo: true },
      { sigla: "TRF2", nome: "TRF 2ª Região", tipo: "Federal", url: "https://eproc.jfrj.jus.br", ativo: true },
      { sigla: "TRF3", nome: "TRF 3ª Região", tipo: "Federal", url: "https://pje1g.trf3.jus.br", ativo: true },
      { sigla: "TRF4", nome: "TRF 4ª Região", tipo: "Federal", url: "https://www.trf4.jus.br", ativo: true },
      { sigla: "TRF5", nome: "TRF 5ª Região", tipo: "Federal", url: "https://pje.trf5.jus.br", ativo: true },
      { sigla: "TRF6", nome: "TRF 6ª Região", tipo: "Federal", url: "https://portal.trf6.jus.br", ativo: true },
      { sigla: "TJSP", nome: "TJ São Paulo", tipo: "Estadual", url: "https://esaj.tjsp.jus.br", ativo: true },
      { sigla: "TJRJ", nome: "TJ Rio de Janeiro", tipo: "Estadual", url: "https://www3.tjrj.jus.br", ativo: true },
      { sigla: "TJMG", nome: "TJ Minas Gerais", tipo: "Estadual", url: "https://pje.tjmg.jus.br", ativo: true },
      { sigla: "TJRS", nome: "TJ Rio Grande do Sul", tipo: "Estadual", url: "https://www.tjrs.jus.br", ativo: true },
      { sigla: "TJPR", nome: "TJ Paraná", tipo: "Estadual", url: "https://portal.tjpr.jus.br", ativo: true },
      { sigla: "TJBA", nome: "TJ Bahia", tipo: "Estadual", url: "https://esaj.tjba.jus.br", ativo: true },
      { sigla: "TJPE", nome: "TJ Pernambuco", tipo: "Estadual", url: "https://pje.tjpe.jus.br", ativo: true },
      { sigla: "TJCE", nome: "TJ Ceará", tipo: "Estadual", url: "https://pje.tjce.jus.br", ativo: true },
      { sigla: "TJDFT", nome: "TJ Distrito Federal", tipo: "Estadual", url: "https://pje.tjdft.jus.br", ativo: true },
      { sigla: "TJGO", nome: "TJ Goiás", tipo: "Estadual", url: "https://pje.tjgo.jus.br", ativo: true },
      { sigla: "TJSC", nome: "TJ Santa Catarina", tipo: "Estadual", url: "https://eproc1g.tjsc.jus.br", ativo: true },
      { sigla: "TJES", nome: "TJ Espírito Santo", tipo: "Estadual", url: "https://pje.tjes.jus.br", ativo: true },
      { sigla: "TJPA", nome: "TJ Pará", tipo: "Estadual", url: "https://pje.tjpa.jus.br", ativo: true },
      { sigla: "TJMA", nome: "TJ Maranhão", tipo: "Estadual", url: "https://pje.tjma.jus.br", ativo: true },
      { sigla: "TJAM", nome: "TJ Amazonas", tipo: "Estadual", url: "https://pje.tjam.jus.br", ativo: true },
      { sigla: "TJMS", nome: "TJ Mato Grosso do Sul", tipo: "Estadual", url: "https://esaj.tjms.jus.br", ativo: true },
      { sigla: "TJMT", nome: "TJ Mato Grosso", tipo: "Estadual", url: "https://pje.tjmt.jus.br", ativo: true },
    ];
    for (const t of seedTribunais) {
      const id = uuid();
      this._tribunais.set(id, { id, ...t, createdAt: new Date() } as Tribunal);
    }

    // Seed equipe
    const eq1Id = uuid(), eq2Id = uuid();
    this._equipe.set(eq1Id, { id: eq1Id, nome: "Thiago Gomes", email: "thiago@iuria.com.br", telefone: "(21) 99999-0001", cargo: "Advogado Sênior", oab: "RJ 123.456", especialidade: "Direito Civil", status: "Ativo", avatar: null, createdAt: new Date() } as Equipe);
    this._equipe.set(eq2Id, { id: eq2Id, nome: "Maria Costa", email: "maria@iuria.com.br", telefone: "(21) 99999-0002", cargo: "Advogada", oab: "RJ 234.567", especialidade: "Direito Trabalhista", status: "Ativo", avatar: null, createdAt: new Date() } as Equipe);

    // Seed clientes
    const cl1Id = uuid(), cl2Id = uuid();
    this._clientes.set(cl1Id, { id: cl1Id, nome: "Empresa Silva LTDA", tipo: "Pessoa Jurídica", cpfCnpj: "12.345.678/0001-99", email: "contato@silva.com.br", telefone: "(21) 3333-1111", endereco: "Av. Rio Branco, 100", cidade: "Rio de Janeiro", estado: "RJ", cep: "20040-001", observacoes: null, status: "Ativo", createdAt: new Date() } as Cliente);
    this._clientes.set(cl2Id, { id: cl2Id, nome: "Pedro Oliveira", tipo: "Pessoa Física", cpfCnpj: "123.456.789-00", email: "pedro@email.com", telefone: "(21) 99888-1234", endereco: "Rua do Ouvidor, 50", cidade: "Rio de Janeiro", estado: "RJ", cep: "20040-030", observacoes: null, status: "Ativo", createdAt: new Date() } as Cliente);

    // Seed processos
    const p1Id = uuid(), p2Id = uuid();
    this._processos.set(p1Id, { id: p1Id, numero: "0001234-56.2025.8.19.0001", titulo: "Ação de Cobrança - Contrato de Serviços", clienteId: cl1Id, responsavelId: eq1Id, tipo: "Ação de Cobrança", area: "Cível", tribunal: "TJRJ", vara: "5ª Vara Cível", valorCausa: "150000.00", status: "Ativo", fase: "Instrução", dataDistribuicao: "2025-08-15", dataAtualizacao: null, observacoes: null, createdAt: new Date() } as Processo);
    this._processos.set(p2Id, { id: p2Id, numero: "0005678-90.2025.4.02.5101", titulo: "Execução Fiscal", clienteId: cl2Id, responsavelId: eq2Id, tipo: "Execução", area: "Tributário", tribunal: "TRF2", vara: "2ª Vara Federal", valorCausa: "85000.00", status: "Movimentado", fase: "Execução", dataDistribuicao: "2025-09-01", dataAtualizacao: null, observacoes: null, createdAt: new Date() } as Processo);

    // Seed atividades (status must match Kanban columns: pendente, em-andamento, revisao, concluida)
    const at1Id = uuid(), at2Id = uuid(), at3Id = uuid(), at4Id = uuid(), at5Id = uuid();
    this._atividades.set(at1Id, { id: at1Id, titulo: "Revisar petição inicial", descricao: "Revisar e ajustar petição inicial do processo de cobrança", tipo: "tarefa", processoId: p1Id, responsavelId: eq1Id, data: "2026-03-15", hora: "14:00", prioridade: "alta", status: "pendente", createdAt: new Date() } as Atividade);
    this._atividades.set(at2Id, { id: at2Id, titulo: "Prazo recurso - Processo Silva", descricao: "Verificar prazo para recurso de apelação", tipo: "prazo", processoId: p1Id, responsavelId: eq1Id, data: "2026-03-20", hora: null, prioridade: "alta", status: "pendente", createdAt: new Date() } as Atividade);
    this._atividades.set(at3Id, { id: at3Id, titulo: "Audiência de instrução", descricao: "Preparar documentação para audiência", tipo: "audiencia", processoId: p2Id, responsavelId: eq2Id, data: "2026-04-05", hora: "10:30", prioridade: "alta", status: "em-andamento", createdAt: new Date() } as Atividade);
    this._atividades.set(at4Id, { id: at4Id, titulo: "Elaborar contrato de honorários", descricao: "Redigir contrato para novo cliente", tipo: "tarefa", processoId: null, responsavelId: eq1Id, data: "2026-03-25", hora: null, prioridade: "media", status: "revisao", createdAt: new Date() } as Atividade);
    this._atividades.set(at5Id, { id: at5Id, titulo: "Protocolar recurso TRF2", descricao: "Recurso já protocolado via PJe", tipo: "tarefa", processoId: p2Id, responsavelId: eq2Id, data: "2026-03-10", hora: null, prioridade: "baixa", status: "concluida", createdAt: new Date() } as Atividade);

    // Seed prazos
    const pr1Id = uuid(), pr2Id = uuid(), pr3Id = uuid();
    this._prazos.set(pr1Id, { id: pr1Id, processoId: p1Id, monitoramentoId: null, tipo: "contestacao", descricao: "Prazo para contestacao", fundamentoLegal: "Art. 335 CPC", dataIntimacao: "2026-03-10", dataInicio: "2026-03-11", dataVencimento: "2026-03-31", diasTotais: 15, diasUteis: true, status: "pendente", prioridade: "critica", andamentoOrigem: "Citacao realizada", dataAndamento: "2026-03-10", responsavelId: eq1Id, usuarioId: null, observacoes: null, createdAt: new Date(), updatedAt: new Date() } as Prazo);
    this._prazos.set(pr2Id, { id: pr2Id, processoId: p1Id, monitoramentoId: null, tipo: "recurso", descricao: "Prazo para recurso de apelacao", fundamentoLegal: "Art. 1.003 CPC", dataIntimacao: "2026-03-13", dataInicio: "2026-03-16", dataVencimento: "2026-04-06", diasTotais: 15, diasUteis: true, status: "pendente", prioridade: "critica", andamentoOrigem: "Sentenca proferida", dataAndamento: "2026-03-13", responsavelId: eq1Id, usuarioId: null, observacoes: null, createdAt: new Date(), updatedAt: new Date() } as Prazo);
    this._prazos.set(pr3Id, { id: pr3Id, processoId: p2Id, monitoramentoId: null, tipo: "manifestacao", descricao: "Prazo para manifestacao", fundamentoLegal: "Art. 218 CPC", dataIntimacao: "2026-03-05", dataInicio: "2026-03-06", dataVencimento: "2026-03-26", diasTotais: 15, diasUteis: true, status: "proximo", prioridade: "alta", andamentoOrigem: "Intimacao para manifestacao", dataAndamento: "2026-03-05", responsavelId: eq2Id, usuarioId: null, observacoes: null, createdAt: new Date(), updatedAt: new Date() } as Prazo);

    // Seed alertas
    const al1Id = uuid(), al2Id = uuid(), al3Id = uuid();
    this._alertas.set(al1Id, { id: al1Id, usuarioId: null, tipo: "prazo_vencendo", titulo: "Prazo vencendo em 2 dias", mensagem: "Contestacao - Proc. 0001234-56.2025.8.19.0001 vence em 31/03/2026", processoId: p1Id, monitoramentoId: null, prazoId: pr1Id, lido: false, lidoEm: null, prioridade: "critica", canal: "sistema", createdAt: new Date() } as Alerta);
    this._alertas.set(al2Id, { id: al2Id, usuarioId: null, tipo: "novo_andamento", titulo: "Novo andamento detectado", mensagem: "2 novos andamentos no processo 0005678-90.2025.4.02.5101", processoId: p2Id, monitoramentoId: null, prazoId: null, lido: false, lidoEm: null, prioridade: "alta", canal: "sistema", createdAt: new Date() } as Alerta);
    this._alertas.set(al3Id, { id: al3Id, usuarioId: null, tipo: "prazo_vencendo", titulo: "Prazo de recurso proximo", mensagem: "Recurso de apelacao - Proc. 0001234-56.2025.8.19.0001 vence em 06/04/2026", processoId: p1Id, monitoramentoId: null, prazoId: pr2Id, lido: true, lidoEm: new Date(), prioridade: "alta", canal: "sistema", createdAt: new Date(Date.now() - 86400000) } as Alerta);

    // Seed contas a receber
    const cr1Id = uuid(), cr2Id = uuid();
    this._contasReceber.set(cr1Id, { id: cr1Id, clienteId: cl1Id, processoId: p1Id, descricao: "Honorarios advocaticios - parcela 1", valor: "15000.00", vencimento: "2026-03-25", status: "Pendente", tipo: "Honorarios", dataPagamento: null, createdAt: new Date() } as ContaReceber);
    this._contasReceber.set(cr2Id, { id: cr2Id, clienteId: cl2Id, processoId: p2Id, descricao: "Custas processuais", valor: "3500.00", vencimento: "2026-02-28", status: "Pago", tipo: "Custas", dataPagamento: "2026-02-27", createdAt: new Date() } as ContaReceber);

    // Seed contas a pagar
    const cp1Id = uuid();
    this._contasPagar.set(cp1Id, { id: cp1Id, fornecedor: "Cartorio 5a Vara", descricao: "Custas de distribuicao", valor: "500.00", vencimento: "2026-03-20", status: "Pendente", categoria: "Custas Judiciais", dataPagamento: null, createdAt: new Date() } as ContaPagar);

    // Seed honorarios
    const h1Id = uuid();
    this._honorarios.set(h1Id, { id: h1Id, clienteId: cl1Id, processoId: p1Id, tipo: "Contratado", valorContratado: "45000.00", valorRecebido: "15000.00", percentualExito: 20, dataContrato: "2025-08-15", status: "Ativo", createdAt: new Date() } as Honorario);

    // Seed default user (for auth)
    const userId = uuid();
    this._users.set(userId, { id: userId, username: "admin", password: "admin123", nome: "Thiago Gomes", email: "thiago@iuria.com.br", role: "admin", avatar: null, createdAt: new Date() } as User);

    console.log("MemStorage initialized with seed data");
  }

  // Generic helpers
  private _getAll<T>(map: Map<string, T>): T[] { return Array.from(map.values()); }
  private _getById<T>(map: Map<string, T>, id: string): T | undefined { return map.get(id); }
  private _delete(map: Map<string, any>, id: string): boolean { return map.delete(id); }

  // Users
  async getUser(id: string) { return this._users.get(id); }
  async getUserByUsername(username: string) { return this._getAll(this._users).find(u => u.username === username); }
  async createUser(u: InsertUser): Promise<User> {
    const id = uuid();
    const user = { id, ...u, createdAt: new Date() } as User;
    this._users.set(id, user);
    return user;
  }
  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const existing = this._users.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data } as User;
    this._users.set(id, updated);
    return updated;
  }

  // Clientes
  async getClientes() { return this._getAll(this._clientes); }
  async getCliente(id: string) { return this._clientes.get(id); }
  async createCliente(c: InsertCliente): Promise<Cliente> {
    const id = uuid();
    const cli = { id, ...c, createdAt: new Date() } as Cliente;
    this._clientes.set(id, cli);
    return cli;
  }
  async updateCliente(id: string, data: Partial<InsertCliente>) {
    const existing = this._clientes.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data } as Cliente;
    this._clientes.set(id, updated);
    return updated;
  }
  async deleteCliente(id: string) { return this._delete(this._clientes, id); }

  // Equipe
  async getEquipe() { return this._getAll(this._equipe); }
  async getMembro(id: string) { return this._equipe.get(id); }
  async createMembro(m: InsertEquipe): Promise<Equipe> {
    const id = uuid();
    const membro = { id, ...m, createdAt: new Date() } as Equipe;
    this._equipe.set(id, membro);
    return membro;
  }
  async updateMembro(id: string, data: Partial<InsertEquipe>) {
    const existing = this._equipe.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data } as Equipe;
    this._equipe.set(id, updated);
    return updated;
  }
  async deleteMembro(id: string) { return this._delete(this._equipe, id); }

  // Processos
  async getProcessos() { return this._getAll(this._processos); }
  async getProcesso(id: string) { return this._processos.get(id); }
  async createProcesso(p: InsertProcesso): Promise<Processo> {
    const id = uuid();
    const proc = { id, ...p, createdAt: new Date() } as Processo;
    this._processos.set(id, proc);
    return proc;
  }
  async updateProcesso(id: string, data: Partial<InsertProcesso>) {
    const existing = this._processos.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data } as Processo;
    this._processos.set(id, updated);
    return updated;
  }
  async deleteProcesso(id: string) { return this._delete(this._processos, id); }

  // Atividades
  async getAtividades() { return this._getAll(this._atividades); }
  async getAtividade(id: string) { return this._atividades.get(id); }
  async createAtividade(a: InsertAtividade): Promise<Atividade> {
    const id = uuid();
    const ativ = { id, ...a, createdAt: new Date() } as Atividade;
    this._atividades.set(id, ativ);
    return ativ;
  }
  async updateAtividade(id: string, data: Partial<InsertAtividade>) {
    const existing = this._atividades.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data } as Atividade;
    this._atividades.set(id, updated);
    return updated;
  }
  async deleteAtividade(id: string) { return this._delete(this._atividades, id); }

  // Documentos
  async getDocumentos() { return this._getAll(this._documentos); }
  async getDocumento(id: string) { return this._documentos.get(id); }
  async createDocumento(d: InsertDocumento): Promise<Documento> {
    const id = uuid();
    const doc = { id, ...d, createdAt: new Date() } as Documento;
    this._documentos.set(id, doc);
    return doc;
  }
  async updateDocumento(id: string, data: Partial<InsertDocumento>) {
    const existing = this._documentos.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data } as Documento;
    this._documentos.set(id, updated);
    return updated;
  }
  async deleteDocumento(id: string) { return this._delete(this._documentos, id); }

  // Contas a Receber
  async getContasReceber() { return this._getAll(this._contasReceber); }
  async getContaReceber(id: string) { return this._contasReceber.get(id); }
  async createContaReceber(c: InsertContaReceber): Promise<ContaReceber> {
    const id = uuid();
    const conta = { id, ...c, createdAt: new Date() } as ContaReceber;
    this._contasReceber.set(id, conta);
    return conta;
  }
  async updateContaReceber(id: string, data: Partial<InsertContaReceber>) {
    const existing = this._contasReceber.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data } as ContaReceber;
    this._contasReceber.set(id, updated);
    return updated;
  }
  async deleteContaReceber(id: string) { return this._delete(this._contasReceber, id); }

  // Contas a Pagar
  async getContasPagar() { return this._getAll(this._contasPagar); }
  async getContaPagar(id: string) { return this._contasPagar.get(id); }
  async createContaPagar(c: InsertContaPagar): Promise<ContaPagar> {
    const id = uuid();
    const conta = { id, ...c, createdAt: new Date() } as ContaPagar;
    this._contasPagar.set(id, conta);
    return conta;
  }
  async updateContaPagar(id: string, data: Partial<InsertContaPagar>) {
    const existing = this._contasPagar.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data } as ContaPagar;
    this._contasPagar.set(id, updated);
    return updated;
  }
  async deleteContaPagar(id: string) { return this._delete(this._contasPagar, id); }

  // Honorários
  async getHonorarios() { return this._getAll(this._honorarios); }
  async getHonorario(id: string) { return this._honorarios.get(id); }
  async createHonorario(h: InsertHonorario): Promise<Honorario> {
    const id = uuid();
    const hon = { id, ...h, createdAt: new Date() } as Honorario;
    this._honorarios.set(id, hon);
    return hon;
  }
  async updateHonorario(id: string, data: Partial<InsertHonorario>) {
    const existing = this._honorarios.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data } as Honorario;
    this._honorarios.set(id, updated);
    return updated;
  }
  async deleteHonorario(id: string) { return this._delete(this._honorarios, id); }

  // Templates
  async getTemplates() { return this._getAll(this._templates); }
  async getTemplate(id: string) { return this._templates.get(id); }
  async createTemplate(t: InsertTemplate): Promise<Template> {
    const id = uuid();
    const tpl = { id, ...t, createdAt: new Date() } as Template;
    this._templates.set(id, tpl);
    return tpl;
  }
  async updateTemplate(id: string, data: Partial<InsertTemplate>) {
    const existing = this._templates.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data } as Template;
    this._templates.set(id, updated);
    return updated;
  }
  async deleteTemplate(id: string) { return this._delete(this._templates, id); }

  // Tribunais
  async getTribunais() { return this._getAll(this._tribunais); }
  async getTribunal(id: string) { return this._tribunais.get(id); }
  async getTribunalBySigla(sigla: string) { return this._getAll(this._tribunais).find(t => t.sigla === sigla); }
  async createTribunal(t: InsertTribunal): Promise<Tribunal> {
    const id = uuid();
    const tribunal = { id, ...t, createdAt: new Date() } as Tribunal;
    this._tribunais.set(id, tribunal);
    return tribunal;
  }

  // Consultas Processuais
  async getConsultasProcessuais(limit = 50) {
    return this._getAll(this._consultas)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
  }
  async createConsultaProcessual(c: InsertConsultaProcessual): Promise<ConsultaProcessual> {
    const id = uuid();
    const consulta = { id, ...c, createdAt: new Date() } as ConsultaProcessual;
    this._consultas.set(id, consulta);
    return consulta;
  }

  // Monitoramento
  async getMonitoramentos() {
    return this._getAll(this._monitoramentos).sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }
  async getMonitoramentosAtivos() {
    return (await this.getMonitoramentos()).filter(m => m.ativo);
  }
  async getMonitoramentosPendentes() {
    const now = new Date();
    return (await this.getMonitoramentosAtivos()).filter(m => m.proximaChecagem && new Date(m.proximaChecagem) <= now);
  }
  async getMonitoramento(id: string) { return this._monitoramentos.get(id); }
  async getMonitoramentoByNumero(numero: string) {
    return this._getAll(this._monitoramentos).find(m => m.numeroProcesso === numero);
  }
  async createMonitoramento(m: InsertMonitoramento): Promise<Monitoramento> {
    const id = uuid();
    const mon = { id, ...m, createdAt: new Date(), updatedAt: new Date() } as Monitoramento;
    this._monitoramentos.set(id, mon);
    return mon;
  }
  async updateMonitoramento(id: string, data: Partial<InsertMonitoramento>) {
    const existing = this._monitoramentos.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date() } as Monitoramento;
    this._monitoramentos.set(id, updated);
    return updated;
  }
  async deleteMonitoramento(id: string) { return this._delete(this._monitoramentos, id); }

  // Verificações
  async createVerificacao(v: InsertVerificacaoMonitoramento): Promise<VerificacaoMonitoramento> {
    const id = uuid();
    const ver = { id, ...v, createdAt: new Date() } as VerificacaoMonitoramento;
    this._verificacoes.set(id, ver);
    return ver;
  }
  async getVerificacoesByMonitoramento(monitoramentoId: string) {
    return this._getAll(this._verificacoes)
      .filter(v => v.monitoramentoId === monitoramentoId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 10);
  }

  // Prazos
  async getPrazos() { return this._getAll(this._prazos).sort((a, b) => String(a.dataVencimento).localeCompare(String(b.dataVencimento))); }
  async getPrazo(id: string) { return this._prazos.get(id); }
  async createPrazo(p: InsertPrazo): Promise<Prazo> {
    const id = uuid();
    const prazo = { id, ...p, createdAt: new Date(), updatedAt: new Date() } as Prazo;
    this._prazos.set(id, prazo);
    return prazo;
  }
  async updatePrazo(id: string, data: Partial<InsertPrazo>) {
    const existing = this._prazos.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date() } as Prazo;
    this._prazos.set(id, updated);
    return updated;
  }
  async deletePrazo(id: string) { return this._delete(this._prazos, id); }
  async getPrazosVencendo(diasAfrente: number) {
    const hoje = new Date().toISOString().split('T')[0];
    const futuro = new Date(Date.now() + diasAfrente * 86400000).toISOString().split('T')[0];
    return this._getAll(this._prazos).filter(p => p.dataVencimento >= hoje && p.dataVencimento <= futuro);
  }

  // Feriados
  async getFeriados(ano?: number) {
    const all = this._getAll(this._feriados);
    if (ano) return all.filter(f => String(f.data).startsWith(`${ano}-`));
    return all;
  }
  async createFeriado(f: InsertFeriado): Promise<Feriado> {
    const id = uuid();
    const fer = { id, ...f, createdAt: new Date() } as Feriado;
    this._feriados.set(id, fer);
    return fer;
  }

  // Alertas
  async getAlertas(usuarioId?: string) {
    const all = this._getAll(this._alertas).sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    if (usuarioId) return all.filter(a => a.usuarioId === usuarioId).slice(0, 50);
    return all.slice(0, 50);
  }
  async getAlertasNaoLidos(usuarioId?: string) {
    const all = await this.getAlertas(usuarioId);
    return all.filter(a => !a.lido);
  }
  async createAlerta(a: InsertAlerta): Promise<Alerta> {
    const id = uuid();
    const alerta = { id, ...a, createdAt: new Date() } as Alerta;
    this._alertas.set(id, alerta);
    return alerta;
  }
  async marcarAlertaLido(id: string) {
    const existing = this._alertas.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, lido: true, lidoEm: new Date() } as Alerta;
    this._alertas.set(id, updated);
    return updated;
  }
  async marcarTodosAlertasLidos(usuarioId?: string) {
    let count = 0;
    const entries = Array.from(this._alertas.entries());
    for (const [id, alerta] of entries) {
      if (!alerta.lido) {
        this._alertas.set(id, { ...alerta, lido: true, lidoEm: new Date() } as Alerta);
        count++;
      }
    }
    return count;
  }

  // Dashboard
  async getDashboardStats() {
    return {
      atividades: this._getAll(this._atividades),
      processos: this._getAll(this._processos),
      clientes: this._getAll(this._clientes),
      monitoramentos: this._getAll(this._monitoramentos).filter(m => m.ativo),
      prazos: this._getAll(this._prazos),
      contasReceber: this._getAll(this._contasReceber),
      contasPagar: this._getAll(this._contasPagar),
      alertasNaoLidos: this._getAll(this._alertas).filter(a => !a.lido).length,
    };
  }

  // Certificados Digitais
  async getCertificados(usuarioId?: string) {
    const all = this._getAll(this._certificados);
    if (usuarioId) return all.filter(c => c.usuarioId === usuarioId);
    return all;
  }
  async getCertificado(id: string) { return this._certificados.get(id); }
  async createCertificado(cert: InsertCertificadoDigital): Promise<CertificadoDigital> {
    const id = uuid();
    const created = { id, ...cert, createdAt: new Date(), updatedAt: new Date() } as CertificadoDigital;
    this._certificados.set(id, created);
    return created;
  }
  async updateCertificado(id: string, cert: Partial<InsertCertificadoDigital>) {
    const existing = this._certificados.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...cert, updatedAt: new Date() } as CertificadoDigital;
    this._certificados.set(id, updated);
    return updated;
  }
  async deleteCertificado(id: string) {
    return this._certificados.delete(id);
  }

  // Pecas Processuais
  async getPecas(processoId?: string) {
    const all = this._getAll(this._pecas);
    if (processoId) return all.filter(p => p.processoId === processoId);
    return all;
  }
  async getPeca(id: string) { return this._pecas.get(id); }
  async createPeca(peca: InsertPecaProcessual): Promise<PecaProcessual> {
    const id = uuid();
    const created = { id, ...peca, createdAt: new Date() } as PecaProcessual;
    this._pecas.set(id, created);
    return created;
  }
  async deletePeca(id: string) { return this._pecas.delete(id); }

  // Publicacoes DJe
  async getPublicacoes(tribunal?: string, limit: number = 50) {
    let all = this._getAll(this._publicacoes).sort((a, b) => 
      new Date(b.dataPublicacao).getTime() - new Date(a.dataPublicacao).getTime()
    );
    if (tribunal) all = all.filter(p => p.tribunal === tribunal);
    return all.slice(0, limit);
  }
  async getPublicacao(id: string) { return this._publicacoes.get(id); }
  async createPublicacao(pub: InsertPublicacaoDje): Promise<PublicacaoDje> {
    const id = uuid();
    const created = { id, ...pub, createdAt: new Date() } as PublicacaoDje;
    this._publicacoes.set(id, created);
    return created;
  }
  async buscarPublicacoes(termo: string) {
    const t = termo.toLowerCase();
    return this._getAll(this._publicacoes).filter(p => 
      p.conteudo.toLowerCase().includes(t) || 
      (p.processoNumero || "").toLowerCase().includes(t) ||
      (p.oabRelacionada || "").toLowerCase().includes(t)
    ).slice(0, 50);
  }
}

// ==================== EXPORT ====================
export const storage: IStorage = hasDatabase ? new DatabaseStorage() : new MemStorage();
