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
  users, clientes, equipe, processos, atividades, documentos, 
  contasReceber, contasPagar, honorarios, templates
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
