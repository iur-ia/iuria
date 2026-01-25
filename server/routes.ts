import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertClienteSchema, insertEquipeSchema, insertProcessoSchema,
  insertAtividadeSchema, insertDocumentoSchema, insertContaReceberSchema,
  insertContaPagarSchema, insertHonorarioSchema, insertTemplateSchema,
  insertMonitoramentoSchema
} from "@shared/schema";
import { z } from "zod";

const consultaProcessualSchema = z.object({
  tribunal: z.string().min(1, "Tribunal e obrigatorio"),
  tipoBusca: z.enum(["numero", "nome", "oab", "cnpj"], { 
    errorMap: () => ({ message: "Tipo de busca deve ser 'numero', 'nome', 'oab' ou 'cnpj'" })
  }),
  termoBusca: z.string().min(1, "Termo de busca e obrigatorio")
});

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

  // ==================== TRIBUNAIS ====================
  app.get("/api/tribunais", async (req, res) => {
    try {
      const tribunais = await storage.getTribunais();
      res.json(tribunais);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar tribunais" });
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
      
      const { spawn } = await import("child_process");
      const path = await import("path");
      
      const scraperPath = path.join(process.cwd(), "scraper", "run_scraper.py");
      
      const pythonProcess = spawn("python", [
        scraperPath,
        "consultar",
        tribunal,
        termoBusca,
        tipoBusca
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

  const httpServer = createServer(app);
  return httpServer;
}
