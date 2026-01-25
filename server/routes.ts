import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertClienteSchema, insertEquipeSchema, insertProcessoSchema,
  insertAtividadeSchema, insertDocumentoSchema, insertContaReceberSchema,
  insertContaPagarSchema, insertHonorarioSchema, insertTemplateSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // ==================== CLIENTES ====================
  app.get("/api/clientes", async (req, res) => {
    try {
      const clientes = await storage.getClientes();
      res.json(clientes);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar clientes" });
    }
  });

  app.get("/api/clientes/:id", async (req, res) => {
    try {
      const cliente = await storage.getCliente(req.params.id);
      if (!cliente) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      res.json(cliente);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar cliente" });
    }
  });

  app.post("/api/clientes", async (req, res) => {
    try {
      const data = insertClienteSchema.parse(req.body);
      const cliente = await storage.createCliente(data);
      res.status(201).json(cliente);
    } catch (error) {
      res.status(400).json({ error: "Dados inválidos" });
    }
  });

  app.patch("/api/clientes/:id", async (req, res) => {
    try {
      const cliente = await storage.updateCliente(req.params.id, req.body);
      if (!cliente) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      res.json(cliente);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar cliente" });
    }
  });

  app.delete("/api/clientes/:id", async (req, res) => {
    try {
      const success = await storage.deleteCliente(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Cliente não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir cliente" });
    }
  });

  // ==================== EQUIPE ====================
  app.get("/api/equipe", async (req, res) => {
    try {
      const membros = await storage.getEquipe();
      res.json(membros);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar equipe" });
    }
  });

  app.get("/api/equipe/:id", async (req, res) => {
    try {
      const membro = await storage.getMembro(req.params.id);
      if (!membro) {
        return res.status(404).json({ error: "Membro não encontrado" });
      }
      res.json(membro);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar membro" });
    }
  });

  app.post("/api/equipe", async (req, res) => {
    try {
      const data = insertEquipeSchema.parse(req.body);
      const membro = await storage.createMembro(data);
      res.status(201).json(membro);
    } catch (error) {
      res.status(400).json({ error: "Dados inválidos" });
    }
  });

  app.patch("/api/equipe/:id", async (req, res) => {
    try {
      const membro = await storage.updateMembro(req.params.id, req.body);
      if (!membro) {
        return res.status(404).json({ error: "Membro não encontrado" });
      }
      res.json(membro);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar membro" });
    }
  });

  app.delete("/api/equipe/:id", async (req, res) => {
    try {
      const success = await storage.deleteMembro(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Membro não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir membro" });
    }
  });

  // ==================== PROCESSOS ====================
  app.get("/api/processos", async (req, res) => {
    try {
      const processos = await storage.getProcessos();
      res.json(processos);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar processos" });
    }
  });

  app.get("/api/processos/:id", async (req, res) => {
    try {
      const processo = await storage.getProcesso(req.params.id);
      if (!processo) {
        return res.status(404).json({ error: "Processo não encontrado" });
      }
      res.json(processo);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar processo" });
    }
  });

  app.post("/api/processos", async (req, res) => {
    try {
      const data = insertProcessoSchema.parse(req.body);
      const processo = await storage.createProcesso(data);
      res.status(201).json(processo);
    } catch (error) {
      res.status(400).json({ error: "Dados inválidos" });
    }
  });

  app.patch("/api/processos/:id", async (req, res) => {
    try {
      const processo = await storage.updateProcesso(req.params.id, req.body);
      if (!processo) {
        return res.status(404).json({ error: "Processo não encontrado" });
      }
      res.json(processo);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar processo" });
    }
  });

  app.delete("/api/processos/:id", async (req, res) => {
    try {
      const success = await storage.deleteProcesso(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Processo não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir processo" });
    }
  });

  // ==================== ATIVIDADES ====================
  app.get("/api/atividades", async (req, res) => {
    try {
      const atividades = await storage.getAtividades();
      res.json(atividades);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar atividades" });
    }
  });

  app.get("/api/atividades/:id", async (req, res) => {
    try {
      const atividade = await storage.getAtividade(req.params.id);
      if (!atividade) {
        return res.status(404).json({ error: "Atividade não encontrada" });
      }
      res.json(atividade);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar atividade" });
    }
  });

  app.post("/api/atividades", async (req, res) => {
    try {
      const data = insertAtividadeSchema.parse(req.body);
      const atividade = await storage.createAtividade(data);
      res.status(201).json(atividade);
    } catch (error) {
      res.status(400).json({ error: "Dados inválidos" });
    }
  });

  app.patch("/api/atividades/:id", async (req, res) => {
    try {
      const atividade = await storage.updateAtividade(req.params.id, req.body);
      if (!atividade) {
        return res.status(404).json({ error: "Atividade não encontrada" });
      }
      res.json(atividade);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar atividade" });
    }
  });

  app.delete("/api/atividades/:id", async (req, res) => {
    try {
      const success = await storage.deleteAtividade(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Atividade não encontrada" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir atividade" });
    }
  });

  // ==================== DOCUMENTOS ====================
  app.get("/api/documentos", async (req, res) => {
    try {
      const documentos = await storage.getDocumentos();
      res.json(documentos);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar documentos" });
    }
  });

  app.get("/api/documentos/:id", async (req, res) => {
    try {
      const documento = await storage.getDocumento(req.params.id);
      if (!documento) {
        return res.status(404).json({ error: "Documento não encontrado" });
      }
      res.json(documento);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar documento" });
    }
  });

  app.post("/api/documentos", async (req, res) => {
    try {
      const data = insertDocumentoSchema.parse(req.body);
      const documento = await storage.createDocumento(data);
      res.status(201).json(documento);
    } catch (error) {
      res.status(400).json({ error: "Dados inválidos" });
    }
  });

  app.patch("/api/documentos/:id", async (req, res) => {
    try {
      const documento = await storage.updateDocumento(req.params.id, req.body);
      if (!documento) {
        return res.status(404).json({ error: "Documento não encontrado" });
      }
      res.json(documento);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar documento" });
    }
  });

  app.delete("/api/documentos/:id", async (req, res) => {
    try {
      const success = await storage.deleteDocumento(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Documento não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir documento" });
    }
  });

  // ==================== CONTAS A RECEBER ====================
  app.get("/api/contas-receber", async (req, res) => {
    try {
      const contas = await storage.getContasReceber();
      res.json(contas);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar contas a receber" });
    }
  });

  app.get("/api/contas-receber/:id", async (req, res) => {
    try {
      const conta = await storage.getContaReceber(req.params.id);
      if (!conta) {
        return res.status(404).json({ error: "Conta não encontrada" });
      }
      res.json(conta);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar conta" });
    }
  });

  app.post("/api/contas-receber", async (req, res) => {
    try {
      const data = insertContaReceberSchema.parse(req.body);
      const conta = await storage.createContaReceber(data);
      res.status(201).json(conta);
    } catch (error) {
      res.status(400).json({ error: "Dados inválidos" });
    }
  });

  app.patch("/api/contas-receber/:id", async (req, res) => {
    try {
      const conta = await storage.updateContaReceber(req.params.id, req.body);
      if (!conta) {
        return res.status(404).json({ error: "Conta não encontrada" });
      }
      res.json(conta);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar conta" });
    }
  });

  app.delete("/api/contas-receber/:id", async (req, res) => {
    try {
      const success = await storage.deleteContaReceber(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Conta não encontrada" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir conta" });
    }
  });

  // ==================== CONTAS A PAGAR ====================
  app.get("/api/contas-pagar", async (req, res) => {
    try {
      const contas = await storage.getContasPagar();
      res.json(contas);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar contas a pagar" });
    }
  });

  app.get("/api/contas-pagar/:id", async (req, res) => {
    try {
      const conta = await storage.getContaPagar(req.params.id);
      if (!conta) {
        return res.status(404).json({ error: "Conta não encontrada" });
      }
      res.json(conta);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar conta" });
    }
  });

  app.post("/api/contas-pagar", async (req, res) => {
    try {
      const data = insertContaPagarSchema.parse(req.body);
      const conta = await storage.createContaPagar(data);
      res.status(201).json(conta);
    } catch (error) {
      res.status(400).json({ error: "Dados inválidos" });
    }
  });

  app.patch("/api/contas-pagar/:id", async (req, res) => {
    try {
      const conta = await storage.updateContaPagar(req.params.id, req.body);
      if (!conta) {
        return res.status(404).json({ error: "Conta não encontrada" });
      }
      res.json(conta);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar conta" });
    }
  });

  app.delete("/api/contas-pagar/:id", async (req, res) => {
    try {
      const success = await storage.deleteContaPagar(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Conta não encontrada" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir conta" });
    }
  });

  // ==================== HONORÁRIOS ====================
  app.get("/api/honorarios", async (req, res) => {
    try {
      const honorarios = await storage.getHonorarios();
      res.json(honorarios);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar honorários" });
    }
  });

  app.get("/api/honorarios/:id", async (req, res) => {
    try {
      const honorario = await storage.getHonorario(req.params.id);
      if (!honorario) {
        return res.status(404).json({ error: "Honorário não encontrado" });
      }
      res.json(honorario);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar honorário" });
    }
  });

  app.post("/api/honorarios", async (req, res) => {
    try {
      const data = insertHonorarioSchema.parse(req.body);
      const honorario = await storage.createHonorario(data);
      res.status(201).json(honorario);
    } catch (error) {
      res.status(400).json({ error: "Dados inválidos" });
    }
  });

  app.patch("/api/honorarios/:id", async (req, res) => {
    try {
      const honorario = await storage.updateHonorario(req.params.id, req.body);
      if (!honorario) {
        return res.status(404).json({ error: "Honorário não encontrado" });
      }
      res.json(honorario);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar honorário" });
    }
  });

  app.delete("/api/honorarios/:id", async (req, res) => {
    try {
      const success = await storage.deleteHonorario(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Honorário não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir honorário" });
    }
  });

  // ==================== TEMPLATES ====================
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar templates" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template não encontrado" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar template" });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const data = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(data);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ error: "Dados inválidos" });
    }
  });

  app.patch("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.updateTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ error: "Template não encontrado" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar template" });
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    try {
      const success = await storage.deleteTemplate(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Template não encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir template" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
