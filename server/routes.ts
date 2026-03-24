import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertClienteSchema, insertEquipeSchema, insertProcessoSchema,
  insertAtividadeSchema, insertDocumentoSchema, insertContaReceberSchema,
  insertContaPagarSchema, insertHonorarioSchema, insertTemplateSchema,
  insertMonitoramentoSchema, insertPrazoSchema, insertAlertaSchema,
  insertCertificadoDigitalSchema, insertPecaProcessualSchema, insertPublicacaoDjeSchema
} from "@shared/schema";
import { z } from "zod";
import { 
  requireAuth, optionalAuth, 
  hashPassword, comparePassword, 
  generateToken, setAuthCookie, clearAuthCookie 
} from "./auth";

const consultaProcessualSchema = z.object({
  tribunal: z.string().min(1, "Tribunal e obrigatorio"),
  tipoBusca: z.enum(["numero", "nome", "oab", "cnpj"], { 
    errorMap: () => ({ message: "Tipo de busca deve ser 'numero', 'nome', 'oab' ou 'cnpj'" })
  }),
  termoBusca: z.string().min(1, "Termo de busca e obrigatorio")
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Pagination helper
  function getPagination(req: any) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || "";
    return { page, limit, offset, search };
  }
  
  function paginatedResponse(data: any[], total: number, page: number, limit: number) {
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  // ==================== AUTH MIDDLEWARE ====================
  // GET routes use optionalAuth (read data works with or without login).
  // POST/PATCH/DELETE routes use requireAuth (write operations require authentication).
  const dataRoutes = [
    "/api/clientes", "/api/equipe", "/api/processos", "/api/atividades",
    "/api/documentos", "/api/contas-receber", "/api/contas-pagar", "/api/honorarios",
    "/api/templates", "/api/monitoramentos", "/api/prazos", "/api/alertas",
    "/api/certificados", "/api/pecas", "/api/publicacoes-dje",
  ];
  for (const route of dataRoutes) {
    app.get(route, optionalAuth, (_req, _res, next) => next());
    app.get(`${route}/:id`, optionalAuth, (_req, _res, next) => next());
    app.get(`${route}/:id/*`, optionalAuth, (_req, _res, next) => next());
    app.post(route, requireAuth, (_req, _res, next) => next());
    app.post(`${route}/:id/*`, requireAuth, (_req, _res, next) => next());
    app.patch(`${route}/:id`, requireAuth, (_req, _res, next) => next());
    app.delete(`${route}/:id`, requireAuth, (_req, _res, next) => next());
  }
  // Read-only endpoints
  app.use("/api/dashboard", optionalAuth);
  app.use("/api/relatorios", optionalAuth);
  app.use("/api/feriados", optionalAuth);

  // ==================== CLIENTES ====================
  app.get("/api/clientes", async (req, res) => {
    try {
      const { search } = getPagination(req);
      let clientes = await storage.getClientes();
      if (search) {
        const s = search.toLowerCase();
        clientes = clientes.filter(c => c.nome.toLowerCase().includes(s) || (c.cpfCnpj || "").includes(s) || (c.email || "").toLowerCase().includes(s));
      }
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
      const { search } = getPagination(req);
      let processos = await storage.getProcessos();
      if (search) {
        const s = search.toLowerCase();
        processos = processos.filter(p => 
          p.numero.toLowerCase().includes(s) || 
          p.titulo.toLowerCase().includes(s) || 
          (p.tribunal || "").toLowerCase().includes(s)
        );
      }
      // Filter by status if provided
      const statusFilter = req.query.status as string;
      if (statusFilter) {
        processos = processos.filter(p => p.status === statusFilter);
      }
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
  // Helper: normalize atividade body from Kanban frontend to DB schema
  function normalizeAtividadeBody(body: any): any {
    const normalized = { ...body };
    // Kanban sends 'prazo' but DB schema uses 'data'
    if (normalized.prazo !== undefined && normalized.data === undefined) {
      normalized.data = normalized.prazo || new Date().toISOString().split('T')[0];
      delete normalized.prazo;
    }
    // Ensure 'data' always has a value (required NOT NULL in schema)
    if (!normalized.data) {
      normalized.data = new Date().toISOString().split('T')[0];
    }
    return normalized;
  }

  // Helper: normalize atividade for Kanban response (add prazo from data)
  function normalizeAtividadeResponse(atividade: any): any {
    if (!atividade) return atividade;
    return {
      ...atividade,
      prazo: atividade.data || atividade.prazo || null,
    };
  }

  app.get("/api/atividades", async (req, res) => {
    try {
      const { search } = getPagination(req);
      let atividades = await storage.getAtividades();
      if (search) {
        const s = search.toLowerCase();
        atividades = atividades.filter(a => 
          a.titulo.toLowerCase().includes(s) || 
          (a.descricao || "").toLowerCase().includes(s)
        );
      }
      const tipoFilter = req.query.tipo as string;
      if (tipoFilter) atividades = atividades.filter(a => a.tipo === tipoFilter);
      const statusFilter = req.query.status as string;
      if (statusFilter) atividades = atividades.filter(a => a.status === statusFilter);
      res.json(atividades.map(normalizeAtividadeResponse));
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
      res.json(normalizeAtividadeResponse(atividade));
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar atividade" });
    }
  });

  app.post("/api/atividades", async (req, res) => {
    try {
      const normalized = normalizeAtividadeBody(req.body);
      const data = insertAtividadeSchema.parse(normalized);
      const atividade = await storage.createAtividade(data);
      res.status(201).json(normalizeAtividadeResponse(atividade));
    } catch (error: any) {
      console.error("Erro ao criar atividade:", error?.message || error);
      res.status(400).json({ error: "Dados inválidos", details: error?.message });
    }
  });

  app.patch("/api/atividades/:id", async (req, res) => {
    try {
      const normalized = normalizeAtividadeBody(req.body);
      const atividade = await storage.updateAtividade(req.params.id, normalized);
      if (!atividade) {
        return res.status(404).json({ error: "Atividade não encontrada" });
      }
      res.json(normalizeAtividadeResponse(atividade));
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

  // ==================== TRIBUNAIS ====================
  app.get("/api/tribunais", async (req, res) => {
    try {
      const tribunais = await storage.getTribunais();
      res.json(tribunais);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar tribunais" });
    }
  });

  // Lista completa de tribunais mapeados com status de scraping
  app.get("/api/tribunais/mapeamento", async (req, res) => {
    try {
      const { spawn } = await import("child_process");
      const path = await import("path");
      const scriptPath = path.join(process.cwd(), "scraper", "tribunal_mapeamento.py");
      const py = spawn("python3", [scriptPath, "resumo"]);
      let stdout = "", stderr = "";
      py.stdout.on("data", (d: Buffer) => stdout += d.toString());
      py.stderr.on("data", (d: Buffer) => stderr += d.toString());
      py.on("close", (code: number) => {
        if (code !== 0) return res.status(500).json({ error: "Erro ao obter mapeamento", details: stderr });
        try { res.json(JSON.parse(stdout)); } catch { res.status(500).json({ error: "Erro ao processar" }); }
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar mapeamento de tribunais" });
    }
  });

  // Lista detalhada de um tribunal especifico
  app.get("/api/tribunais/detalhe/:sigla", async (req, res) => {
    try {
      const { sigla } = req.params;
      const { spawn } = await import("child_process");
      const path = await import("path");
      const scriptPath = path.join(process.cwd(), "scraper", "tribunal_mapeamento.py");
      const py = spawn("python3", [scriptPath, "tribunal", sigla.toUpperCase()]);
      let stdout = "", stderr = "";
      py.stdout.on("data", (d: Buffer) => stdout += d.toString());
      py.stderr.on("data", (d: Buffer) => stderr += d.toString());
      py.on("close", (code: number) => {
        if (code !== 0) return res.status(500).json({ error: "Erro ao buscar tribunal" });
        try { res.json(JSON.parse(stdout)); } catch { res.status(500).json({ error: "Erro ao processar" }); }
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar detalhes do tribunal" });
    }
  });

  // Detectar tribunal automaticamente pelo número do processo
  app.get("/api/detectar-tribunal/:numero", async (req, res) => {
    try {
      const { numero } = req.params;
      
      if (!numero || numero.trim().length < 2) {
        return res.status(400).json({ error: "Número do processo inválido" });
      }
      
      const { spawn } = await import("child_process");
      const path = await import("path");
      
      const scriptPath = path.join(process.cwd(), "scraper", "detect_tribunal.py");
      
      const pythonProcess = spawn("python", [scriptPath, "detectar", numero]);
      
      let stdout = "";
      let stderr = "";
      
      pythonProcess.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });
      
      pythonProcess.on("close", (code: number) => {
        if (code !== 0) {
          console.error("Detect tribunal error:", stderr);
          return res.status(500).json({ error: "Erro ao detectar tribunal" });
        }
        
        try {
          const result = JSON.parse(stdout);
          res.json(result);
        } catch (e) {
          res.status(500).json({ error: "Erro ao processar resposta" });
        }
      });
      
    } catch (error) {
      res.status(500).json({ error: "Erro ao detectar tribunal" });
    }
  });

  // ==================== CONSULTA PROCESSUAL ====================
  app.get("/api/consultas-processuais", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const consultas = await storage.getConsultasProcessuais(limit);
      res.json(consultas);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar histórico de consultas" });
    }
  });

  app.post("/api/consulta-processual", async (req, res) => {
    try {
      const validationResult = consultaProcessualSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => e.message).join(", ");
        return res.status(400).json({ error: errors });
      }
      
      const { tribunal, tipoBusca, termoBusca } = validationResult.data;

      // Strategy 1: MCP Techjustica (primary - accesses MNI for all courts including partes, capa, movimentacoes)
      try {
        const { getMCPClient } = await import("./mcp-techjustica");
        const mcp = getMCPClient();
        const mcpResult = await mcp.consultarProcesso(tribunal, termoBusca, tipoBusca, true, false);
        
        if (mcpResult && !mcpResult.erro && (mcpResult.classe || mcpResult.movimentacoes?.length > 0 || mcpResult.partes?.length > 0)) {
          // MCP succeeded - store and return
          const tribunalRecord = await storage.getTribunalBySigla(tribunal);
          await storage.createConsultaProcessual({
            tribunalId: tribunalRecord?.id || null,
            tipoBusca,
            termoBusca,
            numeroProcesso: mcpResult.numero,
            classe: mcpResult.classe || null,
            assunto: mcpResult.assunto || null,
            relator: mcpResult.relator || null,
            origem: null,
            partes: JSON.stringify(mcpResult.partes || []),
            movimentacoes: JSON.stringify(mcpResult.movimentacoes || []),
            urlProcesso: mcpResult.url || null,
            sucesso: true,
            erro: null,
            usuarioId: null,
          });

          return res.json({
            tribunal: mcpResult.tribunal,
            tipo_busca: tipoBusca,
            termo_busca: termoBusca,
            processos: [{
              numero: mcpResult.numero,
              tribunal: mcpResult.tribunal,
              classe: mcpResult.classe,
              assunto: mcpResult.assunto,
              relator: mcpResult.relator,
              partes: mcpResult.partes,
              movimentacoes: mcpResult.movimentacoes,
              documentos: mcpResult.documentos,
              url: mcpResult.url,
            }],
            total_encontrados: 1,
            fonte: "mcp_techjustica",
            metodo: "mcp",
          });
        }
      } catch (mcpError: any) {
        console.log(`MCP fallback: ${mcpError.message}, trying scraper...`);
      }

      // Strategy 2: Fall back to real_scraper.py (scraping DIRETO nos tribunais)
      // IMPORTANTE: real_scraper.py faz scraping direto nos sites dos tribunais.
      // JusBrasil NAO e usado para acompanhamento processual.
      // Cascata: MNI SOAP (55+ tribunais) -> HTTP direto -> PJe generico
      const { spawn } = await import("child_process");
      const path = await import("path");
      
      const realScraperPath = path.join(process.cwd(), "scraper", "real_scraper.py");
      const scraperPath = path.join(process.cwd(), "scraper", "run_scraper.py");
      
      // real_scraper.py: MNI SOAP -> HTTP direto no tribunal (sem JusBrasil)
      const pythonProcess = spawn("python", [
        realScraperPath,
        tribunal,
        termoBusca,
      ]);
      
      let stdout = "";
      let stderr = "";
      
      pythonProcess.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });
      
      pythonProcess.on("close", async (code: number) => {
        try {
          if (code !== 0) {
            console.error("Scraper error:", stderr);
            return res.status(500).json({ 
              error: "Erro ao executar consulta processual",
              details: stderr
            });
          }
          
          // Extract JSON from stdout (filter out any non-JSON lines like logs)
          let jsonStr = stdout.trim();
          const jsonStart = jsonStr.indexOf('{');
          const jsonEnd = jsonStr.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);
          }
          
          const resultado = JSON.parse(jsonStr);
          
          const tribunalRecord = await storage.getTribunalBySigla(tribunal);
          
          for (const processo of resultado.processos || []) {
            await storage.createConsultaProcessual({
              tribunalId: tribunalRecord?.id || null,
              tipoBusca,
              termoBusca,
              numeroProcesso: processo.numero,
              classe: processo.classe || null,
              assunto: processo.assunto || null,
              relator: processo.relator || null,
              origem: processo.origem || null,
              partes: JSON.stringify(processo.partes || []),
              movimentacoes: JSON.stringify(processo.movimentacoes || []),
              urlProcesso: processo.url || null,
              sucesso: true,
              erro: null,
              usuarioId: null
            });
          }
          
          if (resultado.erro && (!resultado.processos || resultado.processos.length === 0)) {
            await storage.createConsultaProcessual({
              tribunalId: tribunalRecord?.id || null,
              tipoBusca,
              termoBusca,
              numeroProcesso: null,
              classe: null,
              assunto: null,
              relator: null,
              origem: null,
              partes: null,
              movimentacoes: null,
              urlProcesso: null,
              sucesso: false,
              erro: resultado.erro,
              usuarioId: null
            });
          }
          
          res.json(resultado);
        } catch (parseError) {
          console.error("Parse error:", parseError, "stdout:", stdout);
          res.status(500).json({ 
            error: "Erro ao processar resposta da consulta",
            details: stdout
          });
        }
      });
      
      pythonProcess.on("error", (error: Error) => {
        console.error("Spawn error:", error);
        res.status(500).json({ 
          error: "Erro ao iniciar consulta processual",
          details: error.message
        });
      });
      
    } catch (error) {
      console.error("Consulta processual error:", error);
      res.status(500).json({ error: "Erro ao executar consulta processual" });
    }
  });

  // ==================== MONITORAMENTO ====================
  
  // Listar monitoramentos
  app.get("/api/monitoramentos", async (req, res) => {
    try {
      const monitoramentos = await storage.getMonitoramentosAtivos();
      res.json(monitoramentos);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar monitoramentos" });
    }
  });

  // Obter monitoramento específico
  app.get("/api/monitoramentos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const monitoramento = await storage.getMonitoramento(id);
      if (!monitoramento) {
        return res.status(404).json({ error: "Monitoramento não encontrado" });
      }
      res.json(monitoramento);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar monitoramento" });
    }
  });

  // Adicionar processo ao monitoramento
  app.post("/api/monitoramentos", async (req, res) => {
    try {
      const createMonitoramentoSchema = z.object({
        numeroProcesso: z.string().min(1, "Número do processo é obrigatório"),
        tribunal: z.string().min(1, "Tribunal é obrigatório"),
        classe: z.string().optional(),
        assunto: z.string().optional(),
        relator: z.string().optional(),
        urlProcesso: z.string().optional(),
        frequenciaMinutos: z.number().int().positive().default(60),
        contadorAndamentos: z.number().int().min(0).default(0),
      });
      
      const validationResult = createMonitoramentoSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: validationResult.error.errors 
        });
      }
      
      const { numeroProcesso, tribunal, classe, assunto, relator, urlProcesso, frequenciaMinutos, contadorAndamentos } = validationResult.data;
      
      // Verificar se já existe
      const existente = await storage.getMonitoramentoByNumero(numeroProcesso);
      if (existente) {
        return res.status(400).json({ error: "Processo já está sendo monitorado" });
      }
      
      const agora = new Date();
      const proximaChecagem = new Date(agora.getTime() + frequenciaMinutos * 60 * 1000);
      
      const monitoramento = await storage.createMonitoramento({
        numeroProcesso,
        tribunal,
        classe,
        assunto,
        relator,
        urlProcesso,
        frequenciaMinutos,
        ultimaChecagem: agora,
        proximaChecagem,
        contadorAndamentos,
        novosAndamentos: 0,
        ativo: true,
      });
      
      res.json({ success: true, monitoramento, mensagem: "Processo adicionado ao monitoramento!" });
    } catch (error) {
      console.error("Erro ao criar monitoramento:", error);
      res.status(500).json({ error: "Erro ao criar monitoramento" });
    }
  });

  // Atualizar configuração de monitoramento
  app.patch("/api/monitoramentos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const updateMonitoramentoSchema = z.object({
        frequenciaMinutos: z.number().int().positive().optional(),
        ativo: z.boolean().optional(),
      });
      
      const validationResult = updateMonitoramentoSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: validationResult.error.errors 
        });
      }
      
      const { frequenciaMinutos, ativo } = validationResult.data;
      const updateData: any = {};
      
      if (frequenciaMinutos !== undefined) {
        updateData.frequenciaMinutos = frequenciaMinutos;
        const agora = new Date();
        updateData.proximaChecagem = new Date(agora.getTime() + frequenciaMinutos * 60 * 1000);
      }
      
      if (ativo !== undefined) {
        updateData.ativo = ativo;
      }
      
      const monitoramento = await storage.updateMonitoramento(id, updateData);
      
      if (!monitoramento) {
        return res.status(404).json({ error: "Monitoramento não encontrado" });
      }
      
      res.json({ success: true, monitoramento });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar monitoramento" });
    }
  });

  // Remover monitoramento
  app.delete("/api/monitoramentos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteMonitoramento(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Monitoramento não encontrado" });
      }
      
      res.json({ success: true, mensagem: "Monitoramento removido!" });
    } catch (error) {
      res.status(500).json({ error: "Erro ao remover monitoramento" });
    }
  });

  // Marcar novos andamentos como vistos
  app.post("/api/monitoramentos/:id/marcar-visto", async (req, res) => {
    try {
      const { id } = req.params;
      
      const monitoramento = await storage.updateMonitoramento(id, {
        novosAndamentos: 0
      });
      
      if (!monitoramento) {
        return res.status(404).json({ error: "Monitoramento não encontrado" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao marcar como visto" });
    }
  });

  // Obter contagem total de novos andamentos (para badge)
  app.get("/api/monitoramentos/contador/novos", async (req, res) => {
    try {
      const monitoramentos = await storage.getMonitoramentosAtivos();
      const totalNovos = monitoramentos.reduce((acc, m) => acc + (m.novosAndamentos || 0), 0);
      res.json({ totalNovos, monitoramentosComNovos: monitoramentos.filter(m => m.novosAndamentos > 0).length });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar contador" });
    }
  });

  // ==================== AUTENTICACAO ====================
  app.post("/api/auth/login", async (req, res) => {
    try {
      const loginSchema = z.object({
        username: z.string().min(1, "Usuario obrigatorio"),
        password: z.string().min(1, "Senha obrigatoria"),
      });
      const validResult = loginSchema.safeParse(req.body);
      if (!validResult.success) {
        return res.status(400).json({ error: "Usuario e senha sao obrigatorios" });
      }
      const { username, password } = validResult.data;
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Credenciais invalidas" });
      }
      
      // Compare password using bcrypt (supports legacy plain-text during migration)
      const passwordMatch = await comparePassword(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Credenciais invalidas" });
      }
      
      // If password was plain-text, upgrade to bcrypt hash
      if (!user.password.startsWith("$2a$") && !user.password.startsWith("$2b$")) {
        const hashed = await hashPassword(password);
        await storage.updateUser(user.id, { password: hashed });
      }
      
      // Generate JWT and set cookie
      const token = generateToken({ userId: user.id, username: user.username, role: user.role });
      setAuthCookie(res, token);
      
      const { password: _, ...userSafe } = user;
      res.json({ success: true, user: userSafe, token });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  });

  app.post("/api/auth/logout", async (_req, res) => {
    clearAuthCookie(res);
    res.json({ success: true });
  });

  app.get("/api/auth/me", optionalAuth, async (req, res) => {
    try {
      // Check JWT token via middleware
      if (req.userId) {
        const user = await storage.getUser(req.userId);
        if (user) {
          const { password: _, ...userSafe } = user;
          return res.json(userSafe);
        }
      }
      // Fallback: for development convenience, return admin user
      // In production, remove this fallback
      const user = await storage.getUserByUsername("admin");
      if (user) {
        const { password: _, ...userSafe } = user;
        return res.json(userSafe);
      }
      res.status(401).json({ error: "Nao autenticado" });
    } catch {
      res.status(401).json({ error: "Nao autenticado" });
    }
  });
  
  // Change password endpoint
  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
      });
      const validResult = schema.safeParse(req.body);
      if (!validResult.success) {
        return res.status(400).json({ error: validResult.error.errors[0]?.message || "Dados invalidos" });
      }
      const { currentPassword, newPassword } = validResult.data;
      const user = await storage.getUser(req.userId!);
      if (!user) return res.status(404).json({ error: "Usuario nao encontrado" });
      
      const passwordMatch = await comparePassword(currentPassword, user.password);
      if (!passwordMatch) return res.status(401).json({ error: "Senha atual incorreta" });
      
      const hashed = await hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashed });
      res.json({ success: true, message: "Senha alterada com sucesso" });
    } catch (error) {
      res.status(500).json({ error: "Erro ao alterar senha" });
    }
  });

  // ==================== PRAZOS ====================
  app.get("/api/prazos", async (req, res) => {
    try {
      const prazos = await storage.getPrazos();
      res.json(prazos);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar prazos" });
    }
  });

  app.get("/api/prazos/vencendo", async (req, res) => {
    try {
      const dias = parseInt(req.query.dias as string) || 7;
      const prazos = await storage.getPrazosVencendo(dias);
      res.json(prazos);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar prazos vencendo" });
    }
  });

  app.get("/api/prazos/:id", async (req, res) => {
    try {
      const prazo = await storage.getPrazo(req.params.id);
      if (!prazo) return res.status(404).json({ error: "Prazo nao encontrado" });
      res.json(prazo);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar prazo" });
    }
  });

  app.post("/api/prazos", async (req, res) => {
    try {
      const data = insertPrazoSchema.parse(req.body);
      const prazo = await storage.createPrazo(data);
      res.status(201).json(prazo);
    } catch (error) {
      res.status(400).json({ error: "Dados invalidos" });
    }
  });

  app.patch("/api/prazos/:id", async (req, res) => {
    try {
      const prazo = await storage.updatePrazo(req.params.id, req.body);
      if (!prazo) return res.status(404).json({ error: "Prazo nao encontrado" });
      res.json(prazo);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar prazo" });
    }
  });

  app.delete("/api/prazos/:id", async (req, res) => {
    try {
      const ok = await storage.deletePrazo(req.params.id);
      if (!ok) return res.status(404).json({ error: "Prazo nao encontrado" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir prazo" });
    }
  });

  // Calcular prazo via motor Python
  app.post("/api/prazos/calcular", async (req, res) => {
    try {
      const { data_intimacao, dias, dias_uteis, estado } = req.body;
      const { spawn } = await import("child_process");
      const path = await import("path");
      const scriptPath = path.join(process.cwd(), "scraper", "prazos", "motor_prazos.py");
      const args = ["calcular", data_intimacao, String(dias || 15), String(dias_uteis !== false), estado || ""];
      const py = spawn("python3", [scriptPath, ...args]);
      let stdout = "", stderr = "";
      py.stdout.on("data", (d: Buffer) => stdout += d.toString());
      py.stderr.on("data", (d: Buffer) => stderr += d.toString());
      py.on("close", (code: number) => {
        if (code !== 0) return res.status(500).json({ error: "Erro no calculo", details: stderr });
        try { res.json(JSON.parse(stdout)); } catch { res.status(500).json({ error: "Erro ao processar" }); }
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao calcular prazo" });
    }
  });

  // Analisar andamentos e detectar prazos
  app.post("/api/prazos/analisar", async (req, res) => {
    try {
      const { spawn } = await import("child_process");
      const path = await import("path");
      const scriptPath = path.join(process.cwd(), "scraper", "prazos", "motor_prazos.py");
      const py = spawn("python3", [scriptPath, "analisar"]);
      let stdout = "", stderr = "";
      py.stdin.write(JSON.stringify(req.body));
      py.stdin.end();
      py.stdout.on("data", (d: Buffer) => stdout += d.toString());
      py.stderr.on("data", (d: Buffer) => stderr += d.toString());
      py.on("close", (code: number) => {
        if (code !== 0) return res.status(500).json({ error: "Erro na analise", details: stderr });
        try { res.json(JSON.parse(stdout)); } catch { res.status(500).json({ error: "Erro ao processar" }); }
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao analisar andamentos" });
    }
  });

  // ==================== FERIADOS ====================
  app.get("/api/feriados", async (req, res) => {
    try {
      const ano = parseInt(req.query.ano as string) || new Date().getFullYear();
      // Use Python module to generate holidays dynamically
      const { spawn } = await import("child_process");
      const path = await import("path");
      const scriptPath = path.join(process.cwd(), "scraper", "prazos", "motor_prazos.py");
      const estado = (req.query.estado as string) || "RJ";
      const py = spawn("python3", [scriptPath, "calendario", String(new Date().getMonth() + 1), String(ano), estado]);
      let stdout = "", stderr = "";
      py.stdout.on("data", (d: Buffer) => stdout += d.toString());
      py.stderr.on("data", (d: Buffer) => stderr += d.toString());
      py.on("close", (code: number) => {
        if (code !== 0) {
          // Fallback: return from storage
          storage.getFeriados(ano).then(f => res.json(f)).catch(() => res.json([]));
          return;
        }
        try { res.json(JSON.parse(stdout)); } catch { res.json([]); }
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar feriados" });
    }
  });

  app.get("/api/feriados/lista", async (req, res) => {
    try {
      const ano = parseInt(req.query.ano as string) || new Date().getFullYear();
      const estado = (req.query.estado as string) || "RJ";
      const { spawn } = await import("child_process");
      const path = await import("path");
      const fpy = path.join(process.cwd(), "scraper", "prazos", "feriados.py");
      // Run feriados module directly
      const pyCode = `
import sys; sys.path.insert(0,'${process.cwd()}/scraper')
from prazos.feriados import obter_feriados_detalhados
import json
print(json.dumps(obter_feriados_detalhados(${ano}, '${estado}'), ensure_ascii=False))
`;
      const py = spawn("python3", ["-c", pyCode]);
      let stdout = "", stderr = "";
      py.stdout.on("data", (d: Buffer) => stdout += d.toString());
      py.stderr.on("data", (d: Buffer) => stderr += d.toString());
      py.on("close", (code: number) => {
        if (code !== 0) return res.json([]);
        try { res.json(JSON.parse(stdout)); } catch { res.json([]); }
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar feriados" });
    }
  });

  // ==================== ALERTAS ====================
  app.get("/api/alertas", async (req, res) => {
    try {
      const alertas = await storage.getAlertas();
      res.json(alertas);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar alertas" });
    }
  });

  app.get("/api/alertas/nao-lidos", async (req, res) => {
    try {
      const alertas = await storage.getAlertasNaoLidos();
      res.json({ total: alertas.length, alertas });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar alertas nao lidos" });
    }
  });

  app.post("/api/alertas", async (req, res) => {
    try {
      const data = insertAlertaSchema.parse(req.body);
      const alerta = await storage.createAlerta(data);
      res.status(201).json(alerta);
    } catch (error) {
      res.status(400).json({ error: "Dados invalidos" });
    }
  });

  app.patch("/api/alertas/:id/lido", async (req, res) => {
    try {
      const alerta = await storage.marcarAlertaLido(req.params.id);
      if (!alerta) return res.status(404).json({ error: "Alerta nao encontrado" });
      res.json(alerta);
    } catch (error) {
      res.status(500).json({ error: "Erro ao marcar alerta" });
    }
  });

  app.post("/api/alertas/marcar-todos-lidos", async (req, res) => {
    try {
      const count = await storage.marcarTodosAlertasLidos();
      res.json({ success: true, marcados: count });
    } catch (error) {
      res.status(500).json({ error: "Erro ao marcar alertas" });
    }
  });

  // ==================== DASHBOARD ====================
  app.get("/api/dashboard", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      const hoje = new Date().toISOString().split('T')[0];
      
      const atividadesData = stats.atividades || [];
      const tarefas = atividadesData.filter((a: any) => a.tipo === "Tarefa");
      const intimacoes = atividadesData.filter((a: any) => a.tipo === "Intimacao" || a.tipo === "Intimação");
      const audiencias = atividadesData.filter((a: any) => a.tipo === "Audiencia" || a.tipo === "Audiência");
      const compromissos = atividadesData.filter((a: any) => a.tipo === "Compromisso");
      
      const atrasadas = atividadesData.filter((a: any) => a.data < hoje && a.status === "Pendente");
      const hojeTasks = atividadesData.filter((a: any) => a.data === hoje);
      const futuras = atividadesData.filter((a: any) => a.data > hoje);
      
      const prazosData = stats.prazos || [];
      const prazosVencendo = prazosData.filter((p: any) => {
        const venc = String(p.dataVencimento);
        const diff = Math.ceil((new Date(venc).getTime() - Date.now()) / 86400000);
        return diff >= 0 && diff <= 7 && p.status !== "cumprido";
      });

      // Financial summary
      const contasReceberData = stats.contasReceber || [];
      const contasPagarData = stats.contasPagar || [];
      const totalReceber = contasReceberData.filter((c: any) => c.status === "Pendente").reduce((acc: number, c: any) => acc + parseFloat(c.valor || "0"), 0);
      const totalPagar = contasPagarData.filter((c: any) => c.status === "Pendente").reduce((acc: number, c: any) => acc + parseFloat(c.valor || "0"), 0);
      const recebido = contasReceberData.filter((c: any) => c.status === "Pago").reduce((acc: number, c: any) => acc + parseFloat(c.valor || "0"), 0);
      const pago = contasPagarData.filter((c: any) => c.status === "Pago").reduce((acc: number, c: any) => acc + parseFloat(c.valor || "0"), 0);

      res.json({
        metricas: {
          tarefas: { total: tarefas.length, atrasadas: atrasadas.filter((a: any) => a.tipo === "Tarefa").length, hoje: hojeTasks.filter((a: any) => a.tipo === "Tarefa").length, futuras: futuras.filter((a: any) => a.tipo === "Tarefa").length },
          intimacoes: { total: intimacoes.length, pendentes: intimacoes.filter((a: any) => a.status === "Pendente").length },
          andamentos: { total: (stats.monitoramentos || []).reduce((acc: number, m: any) => acc + (m.novosAndamentos || 0), 0), naoLidos: (stats.monitoramentos || []).reduce((acc: number, m: any) => acc + (m.novosAndamentos || 0), 0) },
          audiencias: { total: audiencias.length, atrasadas: atrasadas.filter((a: any) => a.tipo === "Audiencia" || a.tipo === "Audiência").length, hoje: hojeTasks.filter((a: any) => a.tipo === "Audiencia" || a.tipo === "Audiência").length, futuras: futuras.filter((a: any) => a.tipo === "Audiencia" || a.tipo === "Audiência").length },
          compromissos: { total: compromissos.length, atrasados: atrasadas.filter((a: any) => a.tipo === "Compromisso").length, hoje: hojeTasks.filter((a: any) => a.tipo === "Compromisso").length, futuros: futuras.filter((a: any) => a.tipo === "Compromisso").length },
        },
        resumo: {
          totalProcessos: (stats.processos || []).length,
          processosAtivos: (stats.processos || []).filter((p: any) => p.status === "Ativo").length,
          totalClientes: (stats.clientes || []).length,
          monitoramentosAtivos: (stats.monitoramentos || []).length,
          prazosVencendo: prazosVencendo.length,
          alertasNaoLidos: stats.alertasNaoLidos || 0,
        },
        financeiro: {
          totalReceber,
          totalPagar,
          recebido,
          pago,
          saldo: recebido - pago,
          contasReceberPendentes: contasReceberData.filter((c: any) => c.status === "Pendente").length,
          contasPagarPendentes: contasPagarData.filter((c: any) => c.status === "Pendente").length,
        },
        prazosProximos: prazosVencendo.slice(0, 5),
        atividadesHoje: hojeTasks.slice(0, 5),
        atividadesRecentes: atividadesData.slice(0, 10),
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: "Erro ao buscar dados do dashboard" });
    }
  });

  // ==================== CERTIFICADOS DIGITAIS ====================
  app.get("/api/certificados", async (req, res) => {
    try {
      const usuarioId = req.query.usuarioId as string;
      const certificados = await storage.getCertificados(usuarioId);
      // Nunca retorna o arquivo criptografado no list
      const safe = certificados.map(c => ({ ...c, arquivoCriptografado: c.arquivoCriptografado ? "[ENCRYPTED]" : null }));
      res.json(safe);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar certificados" });
    }
  });

  app.get("/api/certificados/:id", async (req, res) => {
    try {
      const cert = await storage.getCertificado(req.params.id);
      if (!cert) return res.status(404).json({ error: "Certificado nao encontrado" });
      // Mask encrypted content
      res.json({ ...cert, arquivoCriptografado: cert.arquivoCriptografado ? "[ENCRYPTED]" : null });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar certificado" });
    }
  });

  app.post("/api/certificados", async (req, res) => {
    try {
      const schema = z.object({
        nome: z.string().min(1),
        tipo: z.enum(["A1", "A3_nuvem"]).default("A1"),
        titular: z.string().min(1),
        cpfCnpj: z.string().optional(),
        arquivoCriptografado: z.string().optional(), // Base64 encoded PFX
        validoAte: z.string().or(z.date()),
        ativo: z.boolean().default(true),
        tribunaisAutorizados: z.union([z.string(), z.array(z.string()).transform(a => JSON.stringify(a))]).optional(), // JSON array or string
        usuarioId: z.string().optional(),
      });
      const data = schema.parse(req.body);
      
      // Encrypt the PFX file if provided
      let encrypted = data.arquivoCriptografado;
      if (encrypted) {
        // In production: use AES-256-GCM with env encryption key
        // For now store base64 with a marker
        encrypted = `ENC:${encrypted}`;
      }
      
      const cert = await storage.createCertificado({
        ...data,
        arquivoCriptografado: encrypted || null,
        validoAte: new Date(data.validoAte),
      } as any);
      res.status(201).json({ ...cert, arquivoCriptografado: cert.arquivoCriptografado ? "[ENCRYPTED]" : null });
    } catch (error) {
      res.status(400).json({ error: "Dados invalidos para certificado" });
    }
  });

  app.patch("/api/certificados/:id", async (req, res) => {
    try {
      const cert = await storage.updateCertificado(req.params.id, req.body);
      if (!cert) return res.status(404).json({ error: "Certificado nao encontrado" });
      res.json({ ...cert, arquivoCriptografado: cert.arquivoCriptografado ? "[ENCRYPTED]" : null });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar certificado" });
    }
  });

  app.delete("/api/certificados/:id", async (req, res) => {
    try {
      const ok = await storage.deleteCertificado(req.params.id);
      if (!ok) return res.status(404).json({ error: "Certificado nao encontrado" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir certificado" });
    }
  });

  // Upload certificado digital (multipart PFX/P12)
  app.post("/api/certificados/upload", async (req, res) => {
    try {
      // Accept base64-encoded PFX from JSON body
      const schema = z.object({
        nome: z.string().min(1, "Nome obrigatorio"),
        tipo: z.enum(["A1", "A3_nuvem"]).default("A1"),
        titular: z.string().min(1, "Titular obrigatorio"),
        cpfCnpj: z.string().optional(),
        arquivo: z.string().min(1, "Arquivo PFX/P12 obrigatorio (base64)"),
        senha: z.string().min(1, "Senha do certificado obrigatoria"),
        usuarioId: z.string().optional(),
      });
      const data = schema.parse(req.body);
      
      // Validate PFX/P12 file by checking base64 header
      const fileBuffer = Buffer.from(data.arquivo, "base64");
      if (fileBuffer.length < 100) {
        return res.status(400).json({ error: "Arquivo PFX/P12 invalido (muito pequeno)" });
      }
      
      // Try to extract certificate info using openssl via Python
      const { spawn } = await import("child_process");
      const path = await import("path");
      
      // Save temp file for validation
      const fs = await import("fs");
      const tmpDir = path.join(process.cwd(), "uploads", "certs");
      fs.mkdirSync(tmpDir, { recursive: true });
      const tmpFile = path.join(tmpDir, `tmp_${Date.now()}.pfx`);
      fs.writeFileSync(tmpFile, fileBuffer);
      
      // Validate certificate with openssl
      const py = spawn("python3", ["-c", `
import sys, json, subprocess, os
from datetime import datetime

pfx_path = "${tmpFile.replace(/\\/g, "\\\\")}"
senha = "${data.senha.replace(/"/g, '\\"')}"

try:
    # Extract cert info
    result = subprocess.run(
        ["openssl", "pkcs12", "-in", pfx_path, "-nokeys", "-passin", f"pass:{senha}", "-clcerts"],
        capture_output=True, text=True, timeout=10
    )
    
    if result.returncode != 0:
        print(json.dumps({"erro": "Senha incorreta ou arquivo PFX invalido"}))
        sys.exit(0)
    
    cert_pem = result.stdout
    
    # Get expiry date
    result2 = subprocess.run(
        ["openssl", "x509", "-noout", "-enddate"],
        input=cert_pem, capture_output=True, text=True, timeout=10
    )
    
    validade = None
    if "notAfter=" in result2.stdout:
        date_str = result2.stdout.strip().replace("notAfter=", "")
        validade = date_str
    
    # Get subject
    result3 = subprocess.run(
        ["openssl", "x509", "-noout", "-subject"],
        input=cert_pem, capture_output=True, text=True, timeout=10
    )
    subject = result3.stdout.strip().replace("subject=", "").strip() if result3.returncode == 0 else ""
    
    print(json.dumps({
        "validade": validade,
        "subject": subject,
        "valid": True,
    }))
except Exception as e:
    print(json.dumps({"erro": str(e)}))
finally:
    os.unlink("${tmpFile.replace(/\\/g, "\\\\")}")
`]);
      
      let pyStdout = "";
      py.stdout.on("data", (d: Buffer) => pyStdout += d.toString());
      py.stderr.on("data", () => {});
      
      py.on("close", async () => {
        try {
          let certInfo: any = {};
          try {
            certInfo = JSON.parse(pyStdout.trim());
          } catch { /* ignore parse errors */ }
          
          if (certInfo.erro) {
            // Clean up temp file if still exists
            try { fs.unlinkSync(tmpFile); } catch {}
            return res.status(400).json({ error: certInfo.erro });
          }
          
          // Determine expiry date
          let validoAte = new Date();
          validoAte.setFullYear(validoAte.getFullYear() + 1); // default 1 year
          if (certInfo.validade) {
            try {
              validoAte = new Date(certInfo.validade);
            } catch {}
          }
          
          // Encrypt and store
          const encrypted = `ENC:${data.arquivo}`;
          
          const cert = await storage.createCertificado({
            nome: data.nome,
            tipo: data.tipo,
            titular: certInfo.subject || data.titular,
            cpfCnpj: data.cpfCnpj || null,
            arquivoCriptografado: encrypted,
            validoAte,
            ativo: true,
            tribunaisAutorizados: JSON.stringify(["*"]), // All tribunals
            usuarioId: data.usuarioId || null,
          } as any);
          
          res.status(201).json({
            ...cert,
            arquivoCriptografado: "[ENCRYPTED]",
            validacao: {
              valido: true,
              subject: certInfo.subject,
              validoAte: validoAte.toISOString(),
            },
          });
        } catch (err) {
          res.status(500).json({ error: "Erro ao processar certificado" });
        }
      });
      
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({ error: error.errors.map((e: any) => e.message).join(", ") });
      }
      res.status(500).json({ error: "Erro ao fazer upload do certificado" });
    }
  });

  // ==================== MNI ESPELHO (MIRROR COM CERTIFICADO DIGITAL) ====================
  // Interface que espelha dados do MNI autenticado via certificado digital.
  // Funciona como se o advogado estivesse logado no sistema do tribunal
  // com seu certificado digital, buscando processos diretamente.

  // MNI Espelho: Consultar processo autenticado
  app.post("/api/mni/consultar", async (req, res) => {
    try {
      const schema = z.object({
        tribunal: z.string().min(1),
        numero: z.string().min(1),
        certId: z.string().optional(),
        certPath: z.string().optional(),
        certSenha: z.string().optional(),
        incluirDocumentos: z.boolean().optional().default(false),
      });
      const data = schema.parse(req.body);

      const { spawn } = await import("child_process");
      const path = await import("path");
      const espelhoPath = path.join(process.cwd(), "scraper", "mni", "mni_espelho.py");

      const args = ["consultar", data.tribunal, data.numero];
      if (data.certPath && data.certSenha) {
        args.push("--cert", data.certPath, "--senha", data.certSenha);
      }
      if (data.incluirDocumentos) {
        args.push("--incluir-docs");
      }

      const py = spawn("python3", [espelhoPath, ...args]);
      let stdout = "";
      let stderr = "";
      py.stdout.on("data", (d: Buffer) => stdout += d.toString());
      py.stderr.on("data", (d: Buffer) => stderr += d.toString());
      py.on("close", (code: number) => {
        try {
          if (code !== 0) {
            return res.status(500).json({ error: "Erro MNI", details: stderr });
          }
          const result = JSON.parse(stdout.trim());
          res.json(result);
        } catch (e) {
          res.status(500).json({ error: "Erro ao processar resposta MNI", raw: stdout });
        }
      });
    } catch (error: any) {
      if (error.errors) {
        return res.status(400).json({ error: error.errors.map((e: any) => e.message).join(", ") });
      }
      res.status(500).json({ error: "Erro na consulta MNI" });
    }
  });

  // MNI Espelho: Movimentacoes autenticadas
  app.post("/api/mni/movimentacoes", async (req, res) => {
    try {
      const schema = z.object({
        tribunal: z.string().min(1),
        numero: z.string().min(1),
        certPath: z.string().optional(),
        certSenha: z.string().optional(),
      });
      const data = schema.parse(req.body);

      const { spawn } = await import("child_process");
      const path = await import("path");
      const espelhoPath = path.join(process.cwd(), "scraper", "mni", "mni_espelho.py");

      const args = ["movimentacoes", data.tribunal, data.numero];
      if (data.certPath && data.certSenha) {
        args.push("--cert", data.certPath, "--senha", data.certSenha);
      }

      const py = spawn("python3", [espelhoPath, ...args]);
      let stdout = "";
      py.stdout.on("data", (d: Buffer) => stdout += d.toString());
      py.on("close", (code: number) => {
        try {
          res.json(JSON.parse(stdout.trim()));
        } catch {
          res.status(500).json({ error: "Erro ao processar resposta" });
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: "Erro MNI movimentacoes" });
    }
  });

  // MNI Espelho: Download de documento
  app.post("/api/mni/documento", async (req, res) => {
    try {
      const schema = z.object({
        tribunal: z.string().min(1),
        numero: z.string().min(1),
        idDocumento: z.string().min(1),
        certPath: z.string().optional(),
        certSenha: z.string().optional(),
      });
      const data = schema.parse(req.body);

      const { spawn } = await import("child_process");
      const path = await import("path");
      const espelhoPath = path.join(process.cwd(), "scraper", "mni", "mni_espelho.py");

      const args = ["documentos", data.tribunal, data.numero, "--doc-id", data.idDocumento];
      if (data.certPath && data.certSenha) {
        args.push("--cert", data.certPath, "--senha", data.certSenha);
      }

      const py = spawn("python3", [espelhoPath, ...args]);
      let stdout = "";
      py.stdout.on("data", (d: Buffer) => stdout += d.toString());
      py.on("close", (code: number) => {
        try {
          res.json(JSON.parse(stdout.trim()));
        } catch {
          res.status(500).json({ error: "Erro ao processar documento" });
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: "Erro MNI documento" });
    }
  });

  // MNI Espelho: Pendencias/Intimacoes
  app.post("/api/mni/pendencias", async (req, res) => {
    try {
      const schema = z.object({
        tribunal: z.string().min(1),
        certPath: z.string().optional(),
        certSenha: z.string().optional(),
      });
      const data = schema.parse(req.body);

      const { spawn } = await import("child_process");
      const path = await import("path");
      const espelhoPath = path.join(process.cwd(), "scraper", "mni", "mni_espelho.py");

      const args = ["pendencias", data.tribunal];
      if (data.certPath && data.certSenha) {
        args.push("--cert", data.certPath, "--senha", data.certSenha);
      }

      const py = spawn("python3", [espelhoPath, ...args]);
      let stdout = "";
      py.stdout.on("data", (d: Buffer) => stdout += d.toString());
      py.on("close", (code: number) => {
        try {
          res.json(JSON.parse(stdout.trim()));
        } catch {
          res.status(500).json({ error: "Erro ao processar pendencias" });
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: "Erro MNI pendencias" });
    }
  });

  // MNI Espelho: Status do certificado digital
  app.post("/api/mni/status", async (req, res) => {
    try {
      const schema = z.object({
        certPath: z.string().min(1),
        certSenha: z.string().min(1),
      });
      const data = schema.parse(req.body);

      const { spawn } = await import("child_process");
      const path = await import("path");
      const espelhoPath = path.join(process.cwd(), "scraper", "mni", "mni_espelho.py");

      const py = spawn("python3", [espelhoPath, "status", "--cert", data.certPath, "--senha", data.certSenha]);
      let stdout = "";
      py.stdout.on("data", (d: Buffer) => stdout += d.toString());
      py.on("close", (code: number) => {
        try {
          res.json(JSON.parse(stdout.trim()));
        } catch {
          res.status(500).json({ error: "Erro ao verificar certificado" });
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao verificar certificado" });
    }
  });

  // MNI: Lista de tribunais com MNI disponivel
  app.get("/api/mni/tribunais", async (_req, res) => {
    try {
      const { spawn } = await import("child_process");
      const path = await import("path");
      const espelhoPath = path.join(process.cwd(), "scraper", "mni", "mni_espelho.py");

      const py = spawn("python3", [espelhoPath, "tribunais"]);
      let stdout = "";
      py.stdout.on("data", (d: Buffer) => stdout += d.toString());
      py.on("close", () => {
        try {
          res.json(JSON.parse(stdout.trim()));
        } catch {
          res.status(500).json({ error: "Erro ao listar tribunais MNI" });
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao listar tribunais MNI" });
    }
  });

  // ==================== PECAS PROCESSUAIS ====================
  app.get("/api/pecas", async (req, res) => {
    try {
      const processoId = req.query.processoId as string;
      const pecas = await storage.getPecas(processoId);
      res.json(pecas);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar pecas" });
    }
  });

  app.get("/api/pecas/:id", async (req, res) => {
    try {
      const peca = await storage.getPeca(req.params.id);
      if (!peca) return res.status(404).json({ error: "Peca nao encontrada" });
      res.json(peca);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar peca" });
    }
  });

  app.post("/api/pecas", async (req, res) => {
    try {
      const data = insertPecaProcessualSchema.parse(req.body);
      const peca = await storage.createPeca(data);
      res.status(201).json(peca);
    } catch (error) {
      res.status(400).json({ error: "Dados invalidos" });
    }
  });

  app.delete("/api/pecas/:id", async (req, res) => {
    try {
      const ok = await storage.deletePeca(req.params.id);
      if (!ok) return res.status(404).json({ error: "Peca nao encontrada" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir peca" });
    }
  });

  // ==================== PUBLICACOES DJE ====================
  app.get("/api/publicacoes-dje", async (req, res) => {
    try {
      const tribunal = req.query.tribunal as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const publicacoes = await storage.getPublicacoes(tribunal, limit);
      res.json(publicacoes);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar publicacoes" });
    }
  });

  app.get("/api/publicacoes-dje/busca", async (req, res) => {
    try {
      const termo = (req.query.termo as string) || "";
      if (!termo) return res.status(400).json({ error: "Termo de busca obrigatorio" });
      const publicacoes = await storage.buscarPublicacoes(termo);
      res.json(publicacoes);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar publicacoes" });
    }
  });

  app.get("/api/publicacoes-dje/:id", async (req, res) => {
    try {
      const pub = await storage.getPublicacao(req.params.id);
      if (!pub) return res.status(404).json({ error: "Publicacao nao encontrada" });
      res.json(pub);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar publicacao" });
    }
  });

  app.post("/api/publicacoes-dje", async (req, res) => {
    try {
      const data = insertPublicacaoDjeSchema.parse(req.body);
      const pub = await storage.createPublicacao(data);
      res.status(201).json(pub);
    } catch (error) {
      res.status(400).json({ error: "Dados invalidos" });
    }
  });

  // ==================== DOCUMENT UPLOAD ====================
  app.post("/api/documentos/upload", async (req, res) => {
    try {
      const multer = (await import("multer")).default;
      const path = await import("path");
      const fs = await import("fs");
      
      const uploadDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const storageConfig = multer.diskStorage({
        destination: (_req: any, _file: any, cb: any) => cb(null, uploadDir),
        filename: (_req: any, file: any, cb: any) => {
          const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
          cb(null, uniqueSuffix + path.extname(file.originalname));
        },
      });
      
      const upload = multer({
        storage: storageConfig,
        limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
        fileFilter: (_req: any, file: any, cb: any) => {
          const allowed = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".png", ".rtf", ".odt"];
          const ext = path.extname(file.originalname).toLowerCase();
          if (allowed.includes(ext)) cb(null, true);
          else cb(new Error("Formato de arquivo nao permitido"));
        },
      }).single("file");
      
      upload(req, res, async (err: any) => {
        if (err) return res.status(400).json({ error: err.message || "Erro no upload" });
        if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
        
        // Auto-extract text to markdown using OCR pipeline
        let conteudoMarkdown: string | null = null;
        let metodoExtracao: string | null = null;
        
        try {
          const { spawn: spawnExtract } = await import("child_process");
          const extractPath = path.join(process.cwd(), "scraper", "doc_to_markdown.py");
          
          const extractResult = await new Promise<{ markdown: string; method: string }>((resolve, reject) => {
            const proc = spawnExtract("python3", [extractPath, req.file!.path], { timeout: 120000 });
            let stdout = "";
            let stderr = "";
            proc.stdout.on("data", (d: Buffer) => stdout += d.toString());
            proc.stderr.on("data", (d: Buffer) => stderr += d.toString());
            proc.on("close", (code: number) => {
              if (code !== 0) { reject(new Error(stderr || "Extraction failed")); return; }
              try {
                const result = JSON.parse(stdout);
                resolve({ markdown: result.markdown || "", method: result.method || "unknown" });
              } catch { reject(new Error("Invalid extraction output")); }
            });
            proc.on("error", reject);
          });
          
          if (extractResult.markdown && extractResult.markdown.length > 10) {
            conteudoMarkdown = extractResult.markdown;
            metodoExtracao = extractResult.method;
            console.log(`[OCR] Extracted ${conteudoMarkdown.length} chars using ${metodoExtracao} from ${req.file!.originalname}`);
          }
        } catch (extractError: any) {
          console.log(`[OCR] Extraction skipped for ${req.file!.originalname}: ${extractError.message}`);
        }
        
        const documento = await storage.createDocumento({
          nome: req.body.nome || req.file.originalname,
          tipo: req.body.tipo || path.extname(req.file.originalname).replace(".", "").toUpperCase(),
          processoId: req.body.processoId || null,
          tamanho: `${(req.file.size / 1024).toFixed(1)} KB`,
          caminho: req.file.path,
          enviadoPor: req.body.enviadoPor || null,
          versao: 1,
          conteudoMarkdown,
          metodoExtracao,
        });
        res.status(201).json(documento);
      });
    } catch (error) {
      res.status(500).json({ error: "Erro no upload de documento" });
    }
  });

  // ==================== FINANCIAL REPORTS ====================
  app.get("/api/relatorios/financeiro", async (req, res) => {
    try {
      const periodo = (req.query.periodo as string) || "mensal";
      const contasReceber = await storage.getContasReceber();
      const contasPagar = await storage.getContasPagar();
      const honorariosData = await storage.getHonorarios();

      const now = new Date();
      const filtrarPorPeriodo = (data: string | null) => {
        if (!data) return false;
        const d = new Date(data);
        if (periodo === "mensal") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (periodo === "trimestral") return Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3) && d.getFullYear() === now.getFullYear();
        if (periodo === "anual") return d.getFullYear() === now.getFullYear();
        return true;
      };

      const receberPeriodo = contasReceber.filter(c => filtrarPorPeriodo(c.vencimento));
      const pagarPeriodo = contasPagar.filter(c => filtrarPorPeriodo(c.vencimento));

      const totalReceber = receberPeriodo.reduce((acc, c) => acc + parseFloat(String(c.valor || "0")), 0);
      const totalPagar = pagarPeriodo.reduce((acc, c) => acc + parseFloat(String(c.valor || "0")), 0);
      const recebido = receberPeriodo.filter(c => c.status === "Pago").reduce((acc, c) => acc + parseFloat(String(c.valor || "0")), 0);
      const pago = pagarPeriodo.filter(c => c.status === "Pago").reduce((acc, c) => acc + parseFloat(String(c.valor || "0")), 0);
      const pendReceber = receberPeriodo.filter(c => c.status === "Pendente").reduce((acc, c) => acc + parseFloat(String(c.valor || "0")), 0);
      const pendPagar = pagarPeriodo.filter(c => c.status === "Pendente").reduce((acc, c) => acc + parseFloat(String(c.valor || "0")), 0);

      // Agrupar por tipo/categoria
      const receberPorTipo: Record<string, number> = {};
      receberPeriodo.forEach(c => {
        receberPorTipo[c.tipo] = (receberPorTipo[c.tipo] || 0) + parseFloat(String(c.valor || "0"));
      });
      const pagarPorCategoria: Record<string, number> = {};
      pagarPeriodo.forEach(c => {
        pagarPorCategoria[c.categoria] = (pagarPorCategoria[c.categoria] || 0) + parseFloat(String(c.valor || "0"));
      });

      // Honorarios summary
      const totalContratado = honorariosData.reduce((acc, h) => acc + parseFloat(String(h.valorContratado || "0")), 0);
      const totalRecebidoHon = honorariosData.reduce((acc, h) => acc + parseFloat(String(h.valorRecebido || "0")), 0);

      // Vencimentos proximos (7 dias)
      const in7d = new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0];
      const hoje = now.toISOString().split("T")[0];
      const vencimentosProximos = [
        ...receberPeriodo.filter(c => c.status === "Pendente" && c.vencimento >= hoje && c.vencimento <= in7d).map(c => ({ ...c, conta_tipo: "receber" })),
        ...pagarPeriodo.filter(c => c.status === "Pendente" && c.vencimento >= hoje && c.vencimento <= in7d).map(c => ({ ...c, conta_tipo: "pagar" })),
      ].sort((a, b) => a.vencimento.localeCompare(b.vencimento));

      res.json({
        periodo,
        resumo: {
          totalReceber,
          totalPagar,
          recebido,
          pago,
          pendReceber,
          pendPagar,
          saldo: recebido - pago,
          saldoProjetado: totalReceber - totalPagar,
        },
        receberPorTipo,
        pagarPorCategoria,
        honorarios: {
          totalContratado,
          totalRecebido: totalRecebidoHon,
          pendente: totalContratado - totalRecebidoHon,
          contratos: honorariosData.length,
        },
        vencimentosProximos: vencimentosProximos.slice(0, 10),
        contasReceber: { total: receberPeriodo.length, pagas: receberPeriodo.filter(c => c.status === "Pago").length, pendentes: receberPeriodo.filter(c => c.status === "Pendente").length },
        contasPagar: { total: pagarPeriodo.length, pagas: pagarPeriodo.filter(c => c.status === "Pago").length, pendentes: pagarPeriodo.filter(c => c.status === "Pendente").length },
      });
    } catch (error) {
      console.error("Financial report error:", error);
      res.status(500).json({ error: "Erro ao gerar relatorio financeiro" });
    }
  });

  // ==================== TRIBUNAL MAPEAMENTO ====================
  app.get("/api/tribunais/mapeamento", async (req, res) => {
    try {
      const { spawn } = await import("child_process");
      const path = await import("path");
      const scriptPath = path.join(process.cwd(), "scraper", "tribunal_mapeamento.py");
      const py = spawn("python3", [scriptPath, "resumo"]);
      let stdout = "", stderr = "";
      py.stdout.on("data", (d: Buffer) => stdout += d.toString());
      py.stderr.on("data", (d: Buffer) => stderr += d.toString());
      py.on("close", (code: number) => {
        if (code !== 0) return res.status(500).json({ error: "Erro ao buscar mapeamento" });
        try { res.json(JSON.parse(stdout)); } catch { res.status(500).json({ error: "Erro ao processar" }); }
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar mapeamento de tribunais" });
    }
  });

  app.get("/api/tribunais/mapeamento/:sigla", async (req, res) => {
    try {
      const { spawn } = await import("child_process");
      const path = await import("path");
      const scriptPath = path.join(process.cwd(), "scraper", "tribunal_mapeamento.py");
      const py = spawn("python3", [scriptPath, "tribunal", req.params.sigla.toUpperCase()]);
      let stdout = "", stderr = "";
      py.stdout.on("data", (d: Buffer) => stdout += d.toString());
      py.stderr.on("data", (d: Buffer) => stderr += d.toString());
      py.on("close", (code: number) => {
        if (code !== 0) return res.status(500).json({ error: "Erro ao buscar tribunal" });
        try { res.json(JSON.parse(stdout)); } catch { res.status(500).json({ error: "Erro ao processar" }); }
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar tribunal" });
    }
  });

  app.get("/api/mni/status", async (req, res) => {
    try {
      const { spawn } = await import("child_process");
      const path = await import("path");
      const scraperPath = path.join(process.cwd(), "scraper", "run_scraper.py");
      const py = spawn("python3", [scraperPath, "mni_status"]);
      let stdout = "", stderr = "";
      py.stdout.on("data", (d: Buffer) => stdout += d.toString());
      py.stderr.on("data", (d: Buffer) => stderr += d.toString());
      py.on("close", (code: number) => {
        if (code !== 0) return res.json({ total_endpoints_mni: 0, tribunais_mni: [], error: stderr });
        try { res.json(JSON.parse(stdout)); } catch { res.json({ total_endpoints_mni: 0 }); }
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar status MNI" });
    }
  });

  // ==================== MONITORING WORKER ====================
  app.post("/api/monitoramento/executar", async (req, res) => {
    try {
      const { spawn } = await import("child_process");
      const path = await import("path");
      const workerPath = path.join(process.cwd(), "scraper", "workers", "monitoring_worker.py");
      const py = spawn("python3", [workerPath, "run_once"]);
      let stdout = "", stderr = "";
      py.stdout.on("data", (d: Buffer) => stdout += d.toString());
      py.stderr.on("data", (d: Buffer) => stderr += d.toString());
      py.on("close", (code: number) => {
        if (code !== 0) return res.status(500).json({ error: "Erro no worker", details: stderr });
        try { res.json(JSON.parse(stdout)); } catch { res.json({ status: "executado", output: stdout }); }
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao executar monitoramento" });
    }
  });

  app.get("/api/monitoramento/metricas", async (req, res) => {
    try {
      const monitoramentos = await storage.getMonitoramentosAtivos();
      const totalNovos = monitoramentos.reduce((acc, m) => acc + (m.novosAndamentos || 0), 0);
      const totalProcessos = monitoramentos.length;
      const comNovos = monitoramentos.filter(m => (m.novosAndamentos || 0) > 0).length;
      
      res.json({
        totalProcessosMonitorados: totalProcessos,
        totalNovosAndamentos: totalNovos,
        monitoramentosComNovos: comNovos,
        monitoramentos: monitoramentos.map(m => ({
          id: m.id,
          numeroProcesso: m.numeroProcesso,
          tribunal: m.tribunal,
          novosAndamentos: m.novosAndamentos,
          ultimaChecagem: m.ultimaChecagem,
          proximaChecagem: m.proximaChecagem,
          frequenciaMinutos: m.frequenciaMinutos,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar metricas" });
    }
  });

  // ==================== SCRAPER ADVANCED API ====================

  // Helper: run python scraper command and return JSON
  const runScraperCommand = (args: string[], input?: string, timeout = 15000): Promise<any> => {
    return new Promise(async (resolve, reject) => {
      const { spawn } = await import("child_process");
      const path = await import("path");
      const scraperPath = path.join(process.cwd(), "scraper", "run_scraper.py");
      const proc = spawn("python3", [scraperPath, ...args], {
        cwd: path.join(process.cwd(), "scraper"),
        timeout,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
      proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

      if (input) {
        proc.stdin.write(input);
        proc.stdin.end();
      }

      proc.on("close", (code: number) => {
        if (code !== 0) {
          reject(new Error(stderr || `Process exited with code ${code}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(new Error(`Invalid JSON: ${stdout.substring(0, 200)}`));
        }
      });

      proc.on("error", (err: Error) => reject(err));
    });
  };

  // Parse andamento with NLP classifier
  app.post("/api/scraper/parse-andamento", async (req, res) => {
    try {
      const { texto } = req.body;
      if (!texto) {
        return res.status(400).json({ error: "Campo 'texto' obrigatorio" });
      }
      const result = await runScraperCommand(["parse_andamento", texto]);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao classificar andamento", detalhes: error.message });
    }
  });

  // Parse batch of andamentos with NLP
  app.post("/api/scraper/parse-batch", async (req, res) => {
    try {
      const { andamentos } = req.body;
      if (!andamentos || !Array.isArray(andamentos)) {
        return res.status(400).json({ error: "Campo 'andamentos' (array) obrigatorio" });
      }
      const input = JSON.stringify({ andamentos });
      const result = await runScraperCommand(["parse_batch"], input, 30000);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao classificar andamentos", detalhes: error.message });
    }
  });

  // Resilient query with cascading fallback
  app.post("/api/scraper/resilient-query", async (req, res) => {
    try {
      const { tribunal, numero, cert_path, cert_password } = req.body;
      if (!tribunal || !numero) {
        return res.status(400).json({ error: "Campos 'tribunal' e 'numero' obrigatorios" });
      }
      const args = ["resilient", tribunal, numero];
      if (cert_path) args.push(cert_path);
      if (cert_password) args.push(cert_password);
      const result = await runScraperCommand(args, undefined, 60000);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: "Erro na consulta resiliente", detalhes: error.message });
    }
  });

  // Resilient orchestrator metrics
  app.get("/api/scraper/resilient-metrics", async (req, res) => {
    try {
      const result = await runScraperCommand(["resilient_metrics"]);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao buscar metricas", detalhes: error.message });
    }
  });

  // Healthcheck / circuit breaker status
  app.get("/api/scraper/healthcheck", async (req, res) => {
    try {
      const result = await runScraperCommand(["healthcheck"]);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: "Erro no healthcheck", detalhes: error.message });
    }
  });

  // Calculate deadline (prazo processual)
  app.post("/api/scraper/calcular-prazo", async (req, res) => {
    try {
      const { data_intimacao, dias, dias_uteis = "true", estado } = req.body;
      if (!data_intimacao || !dias) {
        return res.status(400).json({ error: "Campos 'data_intimacao' e 'dias' obrigatorios" });
      }
      const args = ["calcular_prazo", data_intimacao, String(dias), String(dias_uteis)];
      if (estado) args.push(estado);
      const result = await runScraperCommand(args);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao calcular prazo", detalhes: error.message });
    }
  });

  // List holidays for year/state
  app.get("/api/scraper/feriados", async (req, res) => {
    try {
      const ano = String(req.query.ano || new Date().getFullYear());
      const estado = String(req.query.estado || "");
      const args = ["feriados", ano];
      if (estado) args.push(estado);
      const result = await runScraperCommand(args);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao listar feriados", detalhes: error.message });
    }
  });

  // System capabilities report
  app.get("/api/scraper/capabilities", async (req, res) => {
    try {
      res.json({
        layers: {
          layer0_mcp_techjustica: {
            descricao: "MCP Tech Justica - Fonte primaria para TODOS os 92 tribunais via MNI",
            status: "PRODUCAO",
            features: [
              "JSON-RPC 2.0 sobre HTTP (protocolo MCP padrao)",
              "92 tribunais brasileiros: STF, STJ, TST, TSE, STM, TRFs, TJs, TRTs",
              "Acesso via MNI (Modelo Nacional de Interoperabilidade) - dados completos",
              "Capa do processo: classe, partes, assuntos, relator, orgao julgador",
              "Movimentacoes processuais com datas e codigos CNJ",
              "Download de documentos e pecas processuais",
              "Busca por numero, nome da parte, OAB, CNPJ",
              "Cache inteligente com TTL de 5 minutos",
              "Retry com backoff exponencial (max 3 tentativas)",
              "STF incluido via MNI 2.2.2 (ws.stf.jus.br/servico-intercomunicacao-2.2.2)",
            ],
            tribunais: "STF, STJ, TST, TSE, STM, TRF1-TRF6, 27 TJs, 24 TRTs, 27 TREs, 3 TJMs",
            nota: "Unica fonte de dados - substitui DataJud (que so retornava metadados sem partes)",
          },
          layer1_mni: {
            descricao: "Motor MNI SOAP/XML com mTLS e fallback (via MCP)",
            status: "PRODUCAO",
            features: [
              "Certificado A1 PFX -> PEM extraction via OpenSSL/cryptography",
              "mTLS com TLS 1.2+ enforced",
              "Cascading fallback: mTLS -> publico -> identity proxy",
              "92 tribunais com endpoints MNI (incluindo STF MNI 2.2.2)",
              "Operacoes: consultarProcesso, consultarMovimentacao, baixarDocumento, listarPendencias",
              "STF MNI: https://ws.stf.jus.br/servico-intercomunicacao-2.2.2/intercomunicacao",
              "PJe MNI: https://pje.{tribunal}.jus.br/{instancia}/intercomunicacao?wsdl",
            ],
          },
          layer2_scraping: {
            descricao: "Elite Stealth Scraping (fallback via MCP)",
            status: "PRODUCAO",
            features: [
              "Patchright (Playwright patched) para browser sem flags de automacao",
              "Browserforge fingerprinting (UA, viewport, canvas, WebGL spoof)",
              "Bezier cubic mouse paths com jitter natural",
              "Realistic typing 50-200ms com erros ocasionais e correcao",
              "Residential proxy rotation (Bright Data, Oxylabs, SmartProxy)",
              "Dynamic waits com comportamento humano durante espera",
              "Stealth scripts: webdriver, plugins, languages, chrome, canvas, WebGL",
              "Scrapers: eSAJ (7 TJs), eProc (7 TRFs/TJs), PJe (59 tribunais), PROJUDI (5), DCP, STJ, STF",
            ],
          },
          layer3_intelligence: {
            descricao: "Motor de Prazos e Inteligencia",
            status: "PRODUCAO",
            features: [
              "Parser NLP de andamentos (spaCy pt_core_news_sm)",
              "Regex patterns para 20+ tipos de eventos processuais",
              "Codigos SGT/CNJ integrados",
              "Calendario BR completo: feriados nacionais, estaduais, moveis, recesso forense 20/12-20/01",
              "Calculo de prazos em dias uteis (Art. 224 CPC)",
              "PDF extraction: Base64 decode MNI + stream download scraping",
              "PDF parsing: pdfplumber + PyPDF2 fallback",
              "Date extraction de textos livres",
            ],
          },
          layer4_resilience: {
            descricao: "Orquestracao e Resiliencia",
            status: "PRODUCAO",
            features: [
              "Cascata: MCP Tech Justica (MNI) -> Scraping Resiliente -> CAPTCHA (2Captcha)",
              "Circuit breaker por tribunal (5 falhas -> OPEN, 5min recovery)",
              "Rate limiting por tribunal (token bucket)",
              "Healthcheck de seletores CSS com auto-sugestao de alternativas",
              "Deteccao de mudanca de layout via hash de estrutura HTML",
              "Metricas por estrategia (taxa sucesso, tempo medio)",
            ],
          },
        },
        cobertura: {
          total_tribunais: 92,
          mcp_techjustica: 92,
          mni_endpoints: 92,
          stf_mni: "https://ws.stf.jus.br/servico-intercomunicacao-2.2.2/intercomunicacao",
          todos_em_producao: true,
        },
        sistemas: ["MCP Tech Justica", "MNI SOAP", "PJe", "eSAJ", "eProc", "PROJUDI", "DCP", "STJ Portal", "STM Portal", "THEMIS", "Tucujuris"],
        cascata_consulta: [
          "1. MCP Tech Justica - 92 tribunais via MNI (dados completos com partes, capa, movimentacoes)",
          "2. Scraping resiliente (Playwright stealth) - fallback",
          "3. 2Captcha (se CAPTCHA detectado)",
        ],
        nota_arquitetura: "DataJud foi REMOVIDO pois retorna apenas metadados (sem nomes de partes, sem capa do processo). Toda consulta processual agora passa exclusivamente pelo MCP Tech Justica que acessa o MNI de cada tribunal.",
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar capabilities" });
    }
  });

  // ==================== MCP TECHJUSTICA ====================

  // Import MCP client
  const { getMCPClient, TRIBUNAIS_MCP, MCP_API_KEY, MCP_BASE_URL } = await import("./mcp-techjustica");
  const mcpClient = getMCPClient();

  // MCP status/health check
  app.get("/api/mcp/status", async (req, res) => {
    try {
      const status = await mcpClient.verificarStatus();
      const metrics = mcpClient.getMetrics();
      res.json({
        ...status,
        metrics,
        api_key_configured: !!MCP_API_KEY,
        base_url: MCP_BASE_URL,
        tribunais_suportados: Object.keys(TRIBUNAIS_MCP).length,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao verificar status MCP", detalhes: error.message });
    }
  });

  // MCP list all supported courts
  app.get("/api/mcp/tribunais", async (req, res) => {
    try {
      const tribunais = await mcpClient.listarTribunais();
      res.json(tribunais);
    } catch (error: any) {
      // Fallback to local list
      res.json({
        total: Object.keys(TRIBUNAIS_MCP).length,
        tribunais: Object.fromEntries(
          Object.entries(TRIBUNAIS_MCP).map(([k, v]: [string, any]) => [k, v.nome])
        ),
        fonte: "local_cache",
      });
    }
  });

  // MCP consult process in any court
  app.post("/api/mcp/consultar", async (req, res) => {
    try {
      const schema = z.object({
        tribunal: z.string().min(1),
        numeroProcesso: z.string().min(1),
        tipoBusca: z.enum(["numero", "nome", "oab", "cnpj"]).default("numero"),
        incluirMovimentos: z.boolean().default(true),
        incluirDocumentos: z.boolean().default(false),
      });
      const validResult = schema.safeParse(req.body);
      if (!validResult.success) {
        return res.status(400).json({ error: "Dados invalidos", details: validResult.error.errors });
      }
      const { tribunal, numeroProcesso, tipoBusca, incluirMovimentos, incluirDocumentos } = validResult.data;

      const resultado = await mcpClient.consultarProcesso(
        tribunal, numeroProcesso, tipoBusca, incluirMovimentos, incluirDocumentos
      );

      // Also store in consulta processual history
      const tribunalRecord = await storage.getTribunalBySigla(tribunal);
      if (resultado && !resultado.erro) {
        await storage.createConsultaProcessual({
          tribunalId: tribunalRecord?.id || null,
          tipoBusca,
          termoBusca: numeroProcesso,
          numeroProcesso: resultado.numero,
          classe: resultado.classe || null,
          assunto: resultado.assunto || null,
          relator: resultado.relator || null,
          origem: null,
          partes: JSON.stringify(resultado.partes || []),
          movimentacoes: JSON.stringify(resultado.movimentacoes || []),
          urlProcesso: resultado.url || null,
          sucesso: true,
          erro: null,
          usuarioId: null,
        });
      }

      res.json({
        ...resultado,
        fonte: "mcp_techjustica",
        tribunal_nome: (TRIBUNAIS_MCP as any)[tribunal.toUpperCase()]?.nome || tribunal,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Erro na consulta MCP", detalhes: error.message });
    }
  });

  // MCP get case movements
  app.post("/api/mcp/movimentacoes", async (req, res) => {
    try {
      const { tribunal, numeroProcesso, limite } = req.body;
      if (!tribunal || !numeroProcesso) {
        return res.status(400).json({ error: "Campos 'tribunal' e 'numeroProcesso' obrigatorios" });
      }
      const movimentacoes = await mcpClient.consultarMovimentacoes(
        tribunal, numeroProcesso, limite || 50
      );
      res.json({ movimentacoes, total: movimentacoes.length });
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao buscar movimentacoes", detalhes: error.message });
    }
  });

  // MCP download document/piece
  app.post("/api/mcp/documento", async (req, res) => {
    try {
      const { tribunal, numeroProcesso, idDocumento } = req.body;
      if (!tribunal || !numeroProcesso || !idDocumento) {
        return res.status(400).json({ error: "Campos 'tribunal', 'numeroProcesso' e 'idDocumento' obrigatorios" });
      }
      const documento = await mcpClient.baixarDocumento(tribunal, numeroProcesso, idDocumento);
      if (!documento) {
        return res.status(404).json({ error: "Documento nao encontrado" });
      }
      res.json(documento);
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao baixar documento", detalhes: error.message });
    }
  });

  // MCP search by party name
  app.post("/api/mcp/buscar-parte", async (req, res) => {
    try {
      const { tribunal, nomeParte, limite } = req.body;
      if (!tribunal || !nomeParte) {
        return res.status(400).json({ error: "Campos 'tribunal' e 'nomeParte' obrigatorios" });
      }
      const resultados = await mcpClient.buscarPorParte(tribunal, nomeParte, limite || 20);
      res.json({ processos: resultados, total: resultados.length });
    } catch (error: any) {
      res.status(500).json({ error: "Erro na busca por parte", detalhes: error.message });
    }
  });

  // MCP search by OAB number
  app.post("/api/mcp/buscar-oab", async (req, res) => {
    try {
      const { numeroOAB, estadoOAB, tribunal } = req.body;
      if (!numeroOAB || !estadoOAB) {
        return res.status(400).json({ error: "Campos 'numeroOAB' e 'estadoOAB' obrigatorios" });
      }
      const resultados = await mcpClient.buscarPorOAB(numeroOAB, estadoOAB, tribunal);
      res.json({ processos: resultados, total: resultados.length });
    } catch (error: any) {
      res.status(500).json({ error: "Erro na busca por OAB", detalhes: error.message });
    }
  });

  // MCP metrics
  app.get("/api/mcp/metrics", async (req, res) => {
    try {
      res.json(mcpClient.getMetrics());
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao buscar metricas MCP" });
    }
  });

  // MCP configuration info
  app.get("/api/mcp/config", async (req, res) => {
    res.json({
      provider: "MCP Techjustica",
      protocol: "JSON-RPC 2.0 over HTTP",
      transport: "Streamable HTTP (Node.js 18+)",
      base_url: MCP_BASE_URL,
      api_key_status: MCP_API_KEY ? "configured" : "missing",
      api_key_prefix: MCP_API_KEY ? MCP_API_KEY.substring(0, 12) + "..." : null,
      tribunais_suportados: Object.keys(TRIBUNAIS_MCP).length,
      categorias: {
        superiores: ["STF", "STJ", "TST", "TSE", "STM"],
        federais: ["TRF1", "TRF2", "TRF3", "TRF4", "TRF5", "TRF6"],
        estaduais: Object.keys(TRIBUNAIS_MCP).filter(k => k.startsWith("TJ")).length,
        trabalhistas: Object.keys(TRIBUNAIS_MCP).filter(k => k.startsWith("TRT")).length,
      },
      claude_desktop_config: {
        mcpServers: {
          techjustica: {
            command: "npx",
            args: ["-y", "mcp-remote", MCP_BASE_URL, "--header", `X-API-Key:${MCP_API_KEY ? "***" : "MISSING"}`],
          },
        },
      },
      curl_test: `curl -X POST ${MCP_BASE_URL}/messages -H "Content-Type: application/json" -H "X-API-Key: ${MCP_API_KEY ? MCP_API_KEY.substring(0, 12) + '...' : 'YOUR_KEY'}" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"verificar_status","arguments":{}}}'`,
    });
  });

  // ==================== UNIFIED CONSULTATION (MCP Tech Justica as primary source) ====================

  app.post("/api/consulta-unificada", async (req, res) => {
    try {
      const { tribunal, termoBusca, tipoBusca } = req.body;
      if (!tribunal || !termoBusca) {
        return res.status(400).json({ error: "Campos 'tribunal' e 'termoBusca' obrigatorios" });
      }

      const tribunalUpper = tribunal.toUpperCase().trim();
      const errors: string[] = [];

      // Strategy 1: MCP Tech Justica (primary - all 92 tribunals including STF via MNI)
      try {
        const mcpResult = await mcpClient.consultarProcesso(tribunalUpper, termoBusca, tipoBusca || "numero", true, false);
        if (mcpResult && !mcpResult.erro && (mcpResult.classe || mcpResult.movimentacoes?.length > 0 || mcpResult.partes?.length > 0)) {
          // Store in history
          const tribunalRecord = await storage.getTribunalBySigla(tribunalUpper);
          await storage.createConsultaProcessual({
            tribunalId: tribunalRecord?.id || null,
            tipoBusca: tipoBusca || "numero",
            termoBusca,
            numeroProcesso: mcpResult.numero,
            classe: mcpResult.classe || null,
            assunto: mcpResult.assunto || null,
            relator: mcpResult.relator || null,
            origem: null,
            partes: JSON.stringify(mcpResult.partes || []),
            movimentacoes: JSON.stringify(mcpResult.movimentacoes || []),
            urlProcesso: mcpResult.url || null,
            sucesso: true,
            erro: null,
            usuarioId: null,
          });

          return res.json({
            tribunal: tribunalUpper,
            tipo_busca: tipoBusca || "numero",
            termo_busca: termoBusca,
            processos: [{
              numero: mcpResult.numero,
              tribunal: mcpResult.tribunal,
              classe: mcpResult.classe,
              assunto: mcpResult.assunto,
              relator: mcpResult.relator,
              partes: mcpResult.partes,
              movimentacoes: mcpResult.movimentacoes,
              documentos: mcpResult.documentos,
              url: mcpResult.url,
            }],
            total_encontrados: 1,
            fonte: "mcp_techjustica",
            metodo: "mcp_mni",
            cascata: ["mcp_techjustica"],
          });
        }
        errors.push(`MCP: ${mcpResult?.erro || "sem resultado"}`);
      } catch (e: any) { errors.push(`MCP: ${e.message}`); }

      // Strategy 2: Python scraper as fallback (MNI + scraping resiliente)
      try {
        const result = await runScraperCommand(["consultar", tribunalUpper, termoBusca, tipoBusca || "numero"], undefined, 60000);
        if (result && (result.processos?.length > 0 || result.numero)) {
          return res.json({
            ...result,
            fonte: "python_scraper",
            metodo: "scraping_resiliente",
            cascata: ["mcp_techjustica", "python_scraper"],
          });
        }
        errors.push("Python scraper: sem resultado");
      } catch (e: any) { errors.push(`Python scraper: ${e.message}`); }

      // All strategies failed
      res.json({
        tribunal: tribunalUpper,
        tipo_busca: tipoBusca || "numero",
        termo_busca: termoBusca,
        processos: [],
        total_encontrados: 0,
        fonte: "nenhuma",
        metodo: "cascata_completa",
        cascata: ["mcp_techjustica", "python_scraper"],
        erros: errors,
        nota: "Todas as fontes foram tentadas sem sucesso. O MCP Tech Justica acessa todos os 92 tribunais via MNI.",
      });
    } catch (error: any) {
      res.status(500).json({ error: "Erro na consulta unificada", detalhes: error.message });
    }
  });

  // Implementation Plan - detailed tribunal x system mapping
  app.get("/api/scraper/implementation-plan", async (req, res) => {
    try {
      const { spawn } = await import("child_process");
      const path = await import("path");
      const pyCode = `
import sys; sys.path.insert(0,'${process.cwd()}/scraper')
from tribunal_mapeamento import IMPLEMENTATION_PLAN, resumo_mapeamento, TRIBUNAIS
import json
plan = IMPLEMENTATION_PLAN
summary = resumo_mapeamento()
# Build full status list
statuses = {}
for sigla, t in TRIBUNAIS.items():
    statuses[sigla] = {
        "nome": t.nome, "tipo": t.tipo, "uf": t.uf,
        "status": t.status.value,
        "sistemas": [s.sistema.value for s in t.sistemas],
        "mni": any(s.suporta_mni for s in t.sistemas),
    }
output = {"plan": plan, "summary": summary, "tribunais_status": statuses}
print(json.dumps(output, ensure_ascii=False, default=str))
`;
      const py = spawn("python3", ["-c", pyCode]);
      let stdout = "", stderr = "";
      py.stdout.on("data", (d: Buffer) => stdout += d.toString());
      py.stderr.on("data", (d: Buffer) => stderr += d.toString());
      py.on("close", (code: number) => {
        if (code !== 0) return res.status(500).json({ error: "Erro ao gerar plano", details: stderr });
        try { res.json(JSON.parse(stdout)); } catch { res.status(500).json({ error: "Erro ao processar" }); }
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar plano de implementacao" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
