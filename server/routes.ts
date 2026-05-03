import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// Augment Express Request to include session (added by express-session middleware)
declare module "express-serve-static-core" {
  interface Request {
    session: Record<string, any> & {
      certificado?: Record<string, any>;
      pje?: Record<string, any>;
      pjeOAuth?: Record<string, any>;
    };
  }
}
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  insertClienteSchema, insertEquipeSchema, insertProcessoSchema,
  insertAtividadeSchema, insertDocumentoSchema, insertContaReceberSchema,
  insertContaPagarSchema, insertHonorarioSchema, insertTemplateSchema,
  insertMonitoramentoSchema,
  insertAcervoProcessoSchema, insertAcervoAndamentoSchema,
  insertAcervoDocumentoSchema, insertAcervoTramitacaoSchema,
  insertProcessoAcompanhadoSchema,
  insertDeadlineRuleSchema,
} from "@shared/schema";
import { aplicarRegrasDeadline, seedRegrasPreconfigured, detectarEventoGatilho } from "./deadlineEngine";
import { iniciarJobAlertas } from "./emailAlerts";
import { z } from "zod";

// ==================== CAMINHOS CONFIÁVEIS (allowlist de segurança) ====================
// Apenas arquivos nesses diretórios são permitidos para extração.
// Inclui: uploads do usuário + downloads do scraper de tribunais.
const uploadDir = path.join(process.cwd(), "uploads");
const scraperDownloadsDir = path.join(process.cwd(), "scraper", "downloads");
const TRUSTED_DIRS = [uploadDir, scraperDownloadsDir];
for (const dir of TRUSTED_DIRS) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ts = Date.now();
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${ts}_${safe}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// ==================== EXTRAÇÃO MARKDOWN HELPERS ====================

interface ExtracaoResultado {
  status: string;
  markdown: string;
  chars: number;
  pages: number;
  method: string;
  erro?: string;
}

async function executarExtrator(caminho: string): Promise<ExtracaoResultado> {
  const { spawn } = await import("child_process");
  const path = await import("path");
  const scriptPath = path.join(process.cwd(), "scraper", "extractor.py");

  return new Promise((resolve) => {
    const proc = spawn("python3", [scriptPath, caminho]);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.on("close", () => {
      try {
        const jsonStart = stdout.indexOf("{");
        const jsonEnd = stdout.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          resolve(JSON.parse(stdout.slice(jsonStart, jsonEnd + 1)));
        } else {
          resolve({ status: "erro", markdown: "", chars: 0, pages: 0, method: "none", erro: stderr || "Sem saída do extrator" });
        }
      } catch {
        resolve({ status: "erro", markdown: "", chars: 0, pages: 0, method: "none", erro: "Erro ao parsear resultado" });
      }
    });
  });
}

function isCaminhoSeguro(caminho: string): boolean {
  const resolved = path.resolve(caminho);
  return TRUSTED_DIRS.some((dir) => resolved.startsWith(path.resolve(dir) + path.sep));
}

function triggerExtracaoBackground(documentoId: string, caminho: string): void {
  if (!isCaminhoSeguro(caminho)) {
    console.error(`[extrator] Caminho não permitido rejeitado: ${caminho}`);
    return;
  }
  executarExtrator(caminho).then(async (resultado) => {
    try {
      await storage.updateDocumento(documentoId, {
        conteudoMarkdown: resultado.markdown || null,
        extracaoStatus: resultado.status,
      });
    } catch (err) {
      console.error(`[extrator] Erro ao salvar markdown do doc ${documentoId}:`, err);
      // Tenta marcar como erro para não ficar indefinidamente "pendente"
      try {
        await storage.updateDocumento(documentoId, { extracaoStatus: "erro" });
      } catch {}
    }
  }).catch(async (err) => {
    console.error(`[extrator] Erro ao extrair doc ${documentoId}:`, err);
    try {
      await storage.updateDocumento(documentoId, { extracaoStatus: "erro" });
    } catch {}
  });
}

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
      // conteudoMarkdown e extracaoStatus são sempre gerenciados pelo servidor.
      // caminho é aceito apenas quando aponta para diretório confiável (uploads/ ou scraper/downloads/)
      // para evitar LFI — caminhos arbitrários do cliente são silenciosamente ignorados.
      const { conteudoMarkdown, extracaoStatus, caminho: rawCaminho, ...userPayload } = req.body;
      const caminhoConfiavel = rawCaminho && isCaminhoSeguro(rawCaminho) ? rawCaminho : undefined;

      const data = insertDocumentoSchema.omit({
        conteudoMarkdown: true,
        extracaoStatus: true,
      }).parse({ ...userPayload, caminho: caminhoConfiavel });

      const documento = await storage.createDocumento(data);
      res.status(201).json(documento);

      // Dispara extração em background quando o arquivo já existe em caminho confiável
      // (fluxo: ingestão de portal/scraper que já baixou o arquivo antes de criar o doc)
      if (caminhoConfiavel) {
        triggerExtracaoBackground(documento.id, caminhoConfiavel);
      }
    } catch (error) {
      res.status(400).json({ error: "Dados inválidos" });
    }
  });

  // ==================== UPLOAD DE ARQUIVO ====================
  app.post("/api/documentos/upload", upload.single("arquivo"), async (req: Request, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      // Validação de extensão — formatos suportados pela pipeline de extração
      const extAllow = [".pdf", ".doc", ".docx", ".txt", ".md", ".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp", ".webp"];
      const extFile = path.extname(req.file.originalname).toLowerCase();
      if (!extAllow.includes(extFile)) {
        fs.unlinkSync(req.file.path); // remove arquivo rejeitado
        const supported = extAllow.join(", ");
        return res.status(415).json({
          error: `Formato '${extFile}' não suportado. Formatos aceitos: ${supported}.`
        });
      }

      const caminho = req.file.path;
      const nome = (req.body.nome as string) || req.file.originalname;
      const tipo = (req.body.tipo as string) || "Outro";
      const tamanho = (req.body.tamanho as string) || `${(req.file.size / 1024).toFixed(1)} KB`;

      const documento = await storage.createDocumento({
        nome,
        tipo,
        tamanho,
        caminho,
        extracaoStatus: "pendente",
        versao: 1,
      });

      res.status(201).json(documento);

      // Extração assíncrona em background
      triggerExtracaoBackground(documento.id, caminho);
    } catch (error) {
      console.error("[upload]", error);
      res.status(500).json({ error: "Erro ao processar upload" });
    }
  });

  // ==================== OCR / EXTRAÇÃO MARKDOWN ====================
  app.post("/api/documentos/:id/extrair-texto", async (req, res) => {
    try {
      const documento = await storage.getDocumento(req.params.id);
      if (!documento) {
        return res.status(404).json({ error: "Documento não encontrado" });
      }
      if (!documento.caminho) {
        return res.status(400).json({ error: "Documento sem caminho de arquivo" });
      }

      // Validação de segurança: caminho deve estar em um diretório confiável (TRUSTED_DIRS)
      // Inclui uploads/ e scraper/downloads/ — mesma política do fluxo de background
      if (!isCaminhoSeguro(documento.caminho)) {
        return res.status(403).json({ error: "Caminho de arquivo não permitido" });
      }

      const resultado = await executarExtrator(documento.caminho);

      const updated = await storage.updateDocumento(documento.id, {
        conteudoMarkdown: resultado.markdown || null,
        extracaoStatus: resultado.status,
      });

      res.json({
        id: documento.id,
        status: resultado.status,
        chars: resultado.chars,
        pages: resultado.pages,
        method: resultado.method,
        erro: resultado.erro || null,
        documento: updated,
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao extrair texto do documento" });
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

  // ==================== TECJUSTICA MCP API ====================
  app.get("/api/tecjustica/:numero", async (req, res) => {
    try {
      const { numero } = req.params;
      const { spawn } = await import("child_process");
      const path = await import("path");

      const scriptPath = path.join(process.cwd(), "scraper", "tecjustica_mcp.py");

      // Map CNJ format NNNNNNN-DD.AAAA.J.TT.OOOO to canonical tribunal sigla
      // Key is "J.TT" combining justice segment and tribunal code
      const CNJ_TRIBUNAL_MAP: Record<string, string> = {
        "1.00": "STF",  "1.01": "CNJ",
        "2.00": "STJ",  "2.01": "STJ",
        "5.00": "TST",  "7.00": "TSE",  "6.00": "STM",
        "3.01": "TRF1", "3.02": "TRF2", "3.03": "TRF3",
        "3.04": "TRF4", "3.05": "TRF5", "3.06": "TRF6",
        "8.01": "TJAC", "8.02": "TJAL", "8.03": "TJAP", "8.04": "TJAM",
        "8.05": "TJBA", "8.06": "TJCE", "8.07": "TJDFT","8.08": "TJES",
        "8.09": "TJGO", "8.10": "TJMA", "8.11": "TJMT", "8.12": "TJMS",
        "8.13": "TJMG", "8.14": "TJPA", "8.15": "TJPB", "8.16": "TJPR",
        "8.17": "TJPE", "8.18": "TJPI", "8.19": "TJRJ", "8.20": "TJRN",
        "8.21": "TJRS", "8.22": "TJRO", "8.23": "TJRR", "8.24": "TJSC",
        "8.25": "TJSE", "8.26": "TJSP", "8.27": "TJTO",
      };
      const tribunalMatch = numero.match(/^\d{7}-\d{2}\.\d{4}\.(\d)\.(\d{2})\.\d{4}$/);
      const tribunal = tribunalMatch
        ? (CNJ_TRIBUNAL_MAP[`${tribunalMatch[1]}.${tribunalMatch[2]}`] || "DESCONHECIDO")
        : "DESCONHECIDO";

      const pythonProcess = spawn("python", [scriptPath, tribunal, numero]);

      let stdout = "";
      let stderr = "";

      pythonProcess.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
      pythonProcess.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

      pythonProcess.on("close", (code: number) => {
        if (code !== 0) {
          console.error("TecJustiça MCP error (exit code " + code + "):", stderr);
          return res.status(500).json({
            error: "Erro ao executar consulta TecJustiça MCP",
            details: stderr,
          });
        }
        try {
          const jsonStart = stdout.indexOf('{');
          const jsonEnd = stdout.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const result = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
            result.fonte = "tecjustica";
            result.fonte_label = "TecJustiça MCP";
            result.fonte_descricao = "Dados em tempo real via protocolo MCP do TecJustiça";
            return res.json(result);
          }
          res.status(500).json({ error: "Erro ao processar resposta do TecJustiça MCP" });
        } catch (e) {
          res.status(500).json({ error: "Erro ao processar resposta do TecJustiça MCP" });
        }
      });

      pythonProcess.on("error", (error: Error) => {
        res.status(500).json({ error: "Erro ao iniciar consulta TecJustiça MCP", details: error.message });
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao consultar TecJustiça MCP" });
    }
  });

  // ==================== DATAJUD API ====================
  app.get("/api/datajud/:tribunal/:numero", async (req, res) => {
    try {
      const { tribunal, numero } = req.params;
      const { spawn } = await import("child_process");
      const path = await import("path");

      const scriptPath = path.join(process.cwd(), "scraper", "datajud.py");

      const pythonProcess = spawn("python", [scriptPath, tribunal.toUpperCase(), numero]);

      let stdout = "";
      let stderr = "";

      pythonProcess.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
      pythonProcess.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

      pythonProcess.on("close", (code: number) => {
        try {
          const jsonStart = stdout.indexOf('{');
          const jsonEnd = stdout.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const result = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1));
            return res.json(result);
          }
          res.status(500).json({ error: "Erro ao processar resposta do DataJud" });
        } catch (e) {
          res.status(500).json({ error: "Erro ao processar resposta do DataJud" });
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao consultar DataJud" });
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

  // DTO para entradas de movimentação vindas de diversas fontes (DataJud, PJe, scrapers)
  type MovimentacaoInput = {
    data?: string;
    dataHora?: string;
    descricao?: string;
    texto?: string;
    complementoTabela?: string;
    detalhes?: string;
    [key: string]: unknown;
  };

  // Keywords que classificam um andamento como evento crítico
  const PALAVRAS_CRITICAS = [
    "intima", "intimação", "despacho", "sentença", "acórdão", "decisão",
    "prazo", "liminar", "tutela", "urgente", "embargo", "recurso", "agravo",
    "mandado", "citação", "penhora", "bloqueio", "leilão", "hasta", "arquivamento",
  ];
  function detectarCritico(descricao: string): boolean {
    const lower = descricao.toLowerCase();
    return PALAVRAS_CRITICAS.some((p) => lower.includes(p));
  }

  // Normaliza uma movimentação para data + descricao limpos
  function normalizarMovimentacao(mov: MovimentacaoInput): { data: string; descricao: string; detalhes: string | null } | null {
    const data = (mov.data ?? (typeof mov.dataHora === "string" ? mov.dataHora.split("T")[0] : "") ?? "").trim();
    const descricao = (mov.descricao ?? mov.texto ?? "").trim();
    if (!data || !descricao) return null;
    const detalhes = (mov.complementoTabela ?? mov.detalhes ?? null);
    return { data, descricao, detalhes: typeof detalhes === "string" ? detalhes : null };
  }

  // Helper: sincroniza processo consultado com o acervo (se já estiver cadastrado)
  async function sincronizarProcessoComAcervo(processo: {
    numero?: string; numero_unico?: string; tribunal?: string; classe?: string;
    assunto?: string; relator?: string; partes?: unknown[]; movimentacoes?: unknown[]; url?: string;
  }): Promise<string | null> {
    try {
      const numero = processo.numero_unico || processo.numero;
      if (!numero) return null;
      const existente = await storage.getAcervoProcessoByNumero(numero);
      if (!existente) return null;
      // Atualiza dados básicos
      await storage.updateAcervoProcesso(existente.id, {
        tribunal: processo.tribunal || existente.tribunal,
        classe: processo.classe || existente.classe,
        assunto: processo.assunto || existente.assunto,
        relator: processo.relator || existente.relator,
        partes: processo.partes ? JSON.stringify(processo.partes) : existente.partes,
        urlPortal: processo.url || existente.urlPortal,
        dataUltimaSincronizacao: new Date(),
      });
      // Sincroniza andamentos idempotentemente
      const movimentacoes: MovimentacaoInput[] = Array.isArray(processo.movimentacoes)
        ? (processo.movimentacoes as MovimentacaoInput[])
        : [];
      if (movimentacoes.length > 0) {
        const andamentosExistentes = await storage.getAcervoAndamentos(existente.id);
        const chaves = new Set(andamentosExistentes.map((a) => `${a.data}|${a.descricao}`));
        for (const mov of movimentacoes) {
          const norm = normalizarMovimentacao(mov);
          if (!norm) continue;
          const chave = `${norm.data}|${norm.descricao}`;
          if (!chaves.has(chave)) {
            const critico = detectarCritico(norm.descricao);
            const novoAndamento = await storage.createAcervoAndamento({
              acervoId: existente.id,
              data: norm.data,
              descricao: norm.descricao,
              detalhes: norm.detalhes,
              tipo: "automatico",
              origem: "consulta",
              critico,
            });
            chaves.add(chave);
            // Trigger deadline engine for any recognizable event (not gated by critico)
            const eventoGatilhoSync = detectarEventoGatilho(norm.descricao);
            if (eventoGatilhoSync) {
              const andamentoId = novoAndamento.id;
              const acervoNumero = existente.numero;
              const dataEvento = norm.data ? new Date(norm.data) : new Date();
              (async () => {
                const processoVinculado = await storage.getProcessoByNumero(acervoNumero);
                await aplicarRegrasDeadline({
                  eventoGatilho: eventoGatilhoSync,
                  processoId: processoVinculado?.id || null,
                  dataEvento,
                  sourceEventId: andamentoId,
                  area: processoVinculado?.area || "geral",
                });
              })().catch((err) => console.error("[engine] Erro ao aplicar regras de prazo:", err));
            }
          }
        }
      }
      return existente.id;
    } catch (_err) {
      return null;
    }
  }

  app.post("/api/consulta-processual", async (req, res) => {
    try {
      const validationResult = consultaProcessualSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => e.message).join(", ");
        return res.status(400).json({ error: errors });
      }
      
      const { tribunal, tipoBusca, termoBusca } = validationResult.data;

      // ── PJe Autenticado: tenta MNI como fonte primária para busca por número ──
      // Só ativa quando: sessão PJe válida + busca por número de processo
      const pjeSessao = (req.session as any)?.pje;
      const pjeAtivo = pjeSessao?.access_token && (
        !pjeSessao.expires_at || (Date.now() / 1000) < (pjeSessao.expires_at - 60)
      );
      const buscaPorNumero = tipoBusca === "numero";

      if (pjeAtivo && buscaPorNumero) {
        try {
          const { spawnSync } = await import("child_process");
          const mniPath = path.join(process.cwd(), "scraper", "mni_client.py");
          const mniResult = spawnSync(
            "python3",
            [mniPath, "processo", pjeSessao.access_token, termoBusca, tribunal],
            { encoding: "utf-8", timeout: 20000 }
          );
          const mniOut = mniResult.stdout?.trim();
          if (mniOut) {
            const js = mniOut.indexOf("{"); const je = mniOut.lastIndexOf("}");
            if (js !== -1 && je !== -1) {
              const dados = JSON.parse(mniOut.slice(js, je + 1));
              if (!dados.erro && dados.numero) {
                // MNI retornou dados autenticados — normaliza e responde

                // Normalizar partes: objetos {nome,tipo,cpf_cnpj} → string[]
                // para compatibilidade com o contrato existente do frontend (partes: string[])
                const partesRaw: any[] = dados.partes || [];
                const partesNorm: string[] = partesRaw.map((p: any) => {
                  if (typeof p === "string") return p;
                  if (p?.nome) {
                    const tipo = p.tipo ? `[${p.tipo}] ` : "";
                    const doc = p.cpf_cnpj ? ` (${p.cpf_cnpj})` : "";
                    return `${tipo}${p.nome}${doc}`;
                  }
                  return String(p);
                });

                const tribunalRecord = await storage.getTribunalBySigla(tribunal);
                await storage.createConsultaProcessual({
                  tribunalId: tribunalRecord?.id || null,
                  tipoBusca,
                  termoBusca,
                  numeroProcesso: dados.numero,
                  classe: dados.classe || null,
                  assunto: dados.assunto || null,
                  relator: dados.relator || null,
                  origem: "pje_autenticado",
                  partes: JSON.stringify(dados.partes || []),
                  movimentacoes: JSON.stringify(dados.movimentacoes || []),
                  urlProcesso: dados.url_portal || null,
                  sucesso: true,
                  erro: null,
                  usuarioId: null,
                });
                // Auto-sync com acervo (se processo já estiver cadastrado)
                const pjeAcervoId = await sincronizarProcessoComAcervo({
                  numero: dados.numero,
                  tribunal: dados.tribunal || tribunal,
                  classe: dados.classe,
                  assunto: dados.assunto,
                  relator: dados.relator,
                  partes: dados.partes || [],
                  movimentacoes: dados.movimentacoes || [],
                  url: dados.url_portal,
                });
                const resultado = {
                  processos: [{
                    numero: dados.numero,
                    tribunal: dados.tribunal || tribunal,
                    classe: dados.classe,
                    assunto: dados.assunto,
                    relator: dados.relator,
                    data_distribuicao: dados.data_distribuicao,
                    situacao: dados.situacao,
                    segredo_justica: dados.segredo_justica,
                    partes: partesNorm,
                    movimentacoes: dados.movimentacoes || [],
                    documentos: dados.documentos || [],
                    url: dados.url_portal,
                    fonte: "pje_autenticado",
                    acervoId: pjeAcervoId ?? undefined,
                  }],
                  total_encontrados: 1,
                  fonte: "pje_autenticado",
                  pje_autenticado: true,
                  tribunal_nome: tribunal,
                };
                return res.json(resultado);
              }
            }
          }
        } catch (_mniErr) {
          // Falha silenciosa — cai no scraper público abaixo
        }
      }
      // ── Fim PJe Autenticado ──

      const { spawn } = await import("child_process");
      
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
            // Auto-sync com acervo (se processo já estiver cadastrado)
            const acervoId = await sincronizarProcessoComAcervo(processo);
            if (acervoId) processo.acervoId = acervoId;
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
          
          // ── Fallback automático via motor de scraping TypeScript ──
          // Quando o scraper Python retorna 0 processos em busca por número,
          // tenta automaticamente o orquestrador DataJud/e-SAJ antes de responder.
          if (
            tipoBusca === "numero" &&
            (!resultado.processos || resultado.processos.length === 0) &&
            termoBusca.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/)
          ) {
            try {
              const { pesquisarProcesso } = await import("./scraping/orchestrator");
              console.log(`[consulta-processual] fallback scraping para ${termoBusca}`);
              const scraped = await pesquisarProcesso(termoBusca);
              if (scraped.data) {
                const p = scraped.data;
                resultado.processos = [{
                  numero: p.numero,
                  tribunal: p.tribunal,
                  classe: p.classe,
                  assunto: p.assunto,
                  relator: p.relator,
                  situacao: p.situacao,
                  partes: p.partes,
                  movimentacoes: p.movimentacoes,
                  documentos: p.documentos,
                  url: p.urlPortal,
                  fonte: scraped.sourceLabel,
                  via_scraping_direto: true,
                }];
                resultado.total_encontrados = 1;
                resultado.fonte = scraped.sourceLabel;
                resultado.fonte_label = scraped.sourceLabel;
                resultado.via_scraping_direto = true;
                resultado.erro = undefined;
                console.log(`[consulta-processual] fallback encontrou processo ${p.numero} via ${scraped.sourceLabel}`);
              }
            } catch (scrapErr) {
              console.warn(`[consulta-processual] fallback scraping falhou: ${scrapErr}`);
            }
          }
          // ── Fim do fallback automático ──

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

  // ==================== CERTIFICADO DIGITAL ====================

  // Listar provedores disponíveis
  app.get("/api/certificado/provedores", async (req, res) => {
    try {
      const { execFileSync } = await import("child_process");
      const python = process.env.PYTHON_PATH || "python3";
      const scriptPath = `${process.cwd()}/scraper/cert_digital/factory.py`;
      
      const provedores = [
        {
          id: "certisign",
          nome: "Certisign",
          descricao: "Maior Autoridade Certificadora do Brasil (ICP-Brasil)",
          website: "https://www.certisign.com.br",
          instrucoes: "Baixe o app 'Certisign Assina' e use seu certificado A3 em nuvem",
        },
        {
          id: "birdid",
          nome: "BirdID (Soluti)",
          descricao: "Certificado em nuvem da Soluti — maior volume de certificados PF",
          website: "https://www.birdid.com.br",
          instrucoes: "Baixe o app 'BirdID' da Soluti e ative seu certificado",
        },
        {
          id: "vaultid",
          nome: "VaultID (Dinamo)",
          descricao: "Solução corporativa da Dinamo Networks com HSM em nuvem",
          website: "https://www.vaultid.com.br",
          instrucoes: "Baixe o app 'VaultID' e configure seu certificado corporativo",
        },
        {
          id: "safesign",
          nome: "SafeSign (Safeweb)",
          descricao: "Certificado digital em nuvem da Safeweb Certificadora",
          website: "https://www.safeweb.com.br",
          instrucoes: "Baixe o app 'SafeSign' da Safeweb e ative seu certificado A3",
        },
      ];
      
      res.json({ provedores });
    } catch (error) {
      res.status(500).json({ error: "Erro ao listar provedores" });
    }
  });

  // Iniciar fluxo OAuth2 PKCE com o provedor de certificado
  app.post("/api/certificado/iniciar-auth", async (req, res) => {
    try {
      const { provedor, cpf, redirectUri } = req.body;
      
      if (!provedor) {
        return res.status(400).json({ error: "Provedor é obrigatório" });
      }

      const baseRedirect = redirectUri || `${req.protocol}://${req.get('host')}/api/certificado/callback`;
      
      const { spawnSync } = await import("child_process");
      const python = process.env.PYTHON_PATH || "python3";
      
      const script = `
import sys
sys.path.insert(0, '${process.cwd()}/scraper')
import json
from cert_digital.factory import criar_provedor

try:
    provider = criar_provedor(
        '${provedor}',
        client_id='${process.env[`CERT_${provedor.toUpperCase()}_CLIENT_ID`] || ""}',
        redirect_uri='${baseRedirect}',
        client_secret=${process.env[`CERT_${provedor.toUpperCase()}_CLIENT_SECRET`] ? `'${process.env[`CERT_${provedor.toUpperCase()}_CLIENT_SECRET`]}'` : 'None'},
    )
    resultado = provider.iniciar_autorizacao(cpf=${cpf ? `'${cpf}'` : 'None'})
    print(json.dumps(resultado.to_dict()))
except Exception as e:
    print(json.dumps({'erro': str(e), 'sucesso': False}))
`;

      const result = spawnSync(python, ["-c", script], {
        encoding: "utf-8",
        timeout: 15000,
      });

      const output = result.stdout?.trim();
      if (!output) {
        return res.status(500).json({ 
          error: "Erro ao iniciar autenticação",
          detalhe: result.stderr?.trim() 
        });
      }

      const dados = JSON.parse(output);
      
      if (dados.erro) {
        return res.status(400).json({ error: dados.erro });
      }

      res.json({
        url_autorizacao: dados.url_autorizacao,
        code_verifier: dados.code_verifier,
        state: dados.state,
        provedor,
        instrucoes: `Acesse a URL de autorização e aprove a solicitação no app do ${provedor}`,
      });

    } catch (error: any) {
      res.status(500).json({ error: "Erro ao iniciar fluxo de autenticação: " + error.message });
    }
  });

  // Trocar code OAuth2 por token (callback do provedor)
  app.post("/api/certificado/trocar-token", async (req, res) => {
    try {
      const { provedor, code, codeVerifier, redirectUri } = req.body;
      
      if (!provedor || !code || !codeVerifier) {
        return res.status(400).json({ error: "provedor, code e codeVerifier são obrigatórios" });
      }

      const baseRedirect = redirectUri || `${req.protocol}://${req.get('host')}/api/certificado/callback`;

      const { spawnSync } = await import("child_process");
      const python = process.env.PYTHON_PATH || "python3";
      
      const script = `
import sys
sys.path.insert(0, '${process.cwd()}/scraper')
import json
from cert_digital.factory import criar_provedor

try:
    provider = criar_provedor(
        '${provedor}',
        client_id='${process.env[`CERT_${provedor.toUpperCase()}_CLIENT_ID`] || ""}',
        redirect_uri='${baseRedirect}',
        client_secret=${process.env[`CERT_${provedor.toUpperCase()}_CLIENT_SECRET`] ? `'${process.env[`CERT_${provedor.toUpperCase()}_CLIENT_SECRET`]}'` : 'None'},
    )
    resultado = provider.trocar_code_por_token(
        code=${JSON.stringify(code)},
        code_verifier=${JSON.stringify(codeVerifier)},
    )
    print(json.dumps(resultado.to_dict()))
except Exception as e:
    print(json.dumps({'erro': str(e), 'sucesso': False}))
`;

      const result = spawnSync(python, ["-c", script], {
        encoding: "utf-8",
        timeout: 30000,
      });

      const output = result.stdout?.trim();
      if (!output) {
        return res.status(500).json({ 
          error: "Erro ao trocar token",
          detalhe: result.stderr?.trim()
        });
      }

      const dados = JSON.parse(output);
      
      if (!dados.sucesso) {
        return res.status(400).json({ error: dados.erro || "Falha na autenticação" });
      }

      if (req.session) {
        (req.session as any).certificado = {
          provedor,
          access_token: dados.access_token,
          refresh_token: dados.refresh_token,
          expires_at: dados.expires_at,
          nome_titular: dados.nome_titular,
          cpf_titular: dados.cpf_titular,
          email_titular: dados.email_titular,
        };
      }

      res.json({
        sucesso: true,
        nome_titular: dados.nome_titular,
        cpf_titular: dados.cpf_titular,
        provedor,
        expires_at: dados.expires_at,
        mensagem: "Certificado digital conectado com sucesso!",
      });

    } catch (error: any) {
      res.status(500).json({ error: "Erro ao trocar token: " + error.message });
    }
  });

  // Verificar status do certificado configurado na sessão
  app.get("/api/certificado/status", async (req, res) => {
    try {
      const cert = (req.session as any)?.certificado;
      
      if (!cert || !cert.access_token) {
        return res.json({
          configurado: false,
          mensagem: "Nenhum certificado digital conectado",
        });
      }

      const agora = Date.now() / 1000;
      const valido = cert.expires_at ? cert.expires_at > agora + 60 : true;

      res.json({
        configurado: true,
        valido,
        provedor: cert.provedor,
        nome_titular: cert.nome_titular,
        cpf_titular: cert.cpf_titular,
        email_titular: cert.email_titular,
        expires_at: cert.expires_at,
        mensagem: valido 
          ? `Conectado como ${cert.nome_titular || cert.cpf_titular}` 
          : "Token expirado — reconecte o certificado",
      });

    } catch (error) {
      res.status(500).json({ error: "Erro ao verificar status do certificado" });
    }
  });

  // Desconectar certificado da sessão
  app.delete("/api/certificado/desconectar", async (req, res) => {
    try {
      if (req.session) {
        delete (req.session as any).certificado;
      }
      res.json({ sucesso: true, mensagem: "Certificado digital desconectado" });
    } catch (error) {
      res.status(500).json({ error: "Erro ao desconectar certificado" });
    }
  });

  // Callback OAuth2 do provedor (redireciona para o frontend)
  app.get("/api/certificado/callback", async (req, res) => {
    const { code, state, error } = req.query;
    
    if (error) {
      return res.redirect(`/configuracoes?cert_error=${encodeURIComponent(String(error))}`);
    }
    
    if (code) {
      return res.redirect(`/configuracoes?cert_code=${encodeURIComponent(String(code))}&cert_state=${encodeURIComponent(String(state || ""))}`);
    }
    
    res.redirect("/configuracoes?cert_error=callback_invalido");
  });

  // ==================== PJe SSO NACIONAL ====================

  // Iniciar fluxo OAuth2 PKCE com SSO PJe Nacional
  // CPF é passado como argumento de linha de comando (não interpolado em script) — sem risco de injeção
  app.get("/api/pje/iniciar-auth", async (req, res) => {
    try {
      const { spawnSync } = await import("child_process");
      const python = "python3";
      const cpfRaw = (req.query.cpf as string) || "";
      // Sanitização: apenas dígitos permitidos no CPF
      const cpf = cpfRaw.replace(/\D/g, "").slice(0, 11);
      const redirectUri = `${req.protocol}://${req.get("host")}/api/pje/callback`;
      const scriptPath = path.join(process.cwd(), "scraper", "cert_digital", "pje_sso.py");

      // Invocação por arquivo de script com argumentos — sem interpolação de entrada do usuário
      const args = ["iniciar-auth", redirectUri];
      if (cpf) args.push(cpf);

      const result = spawnSync(python, [scriptPath, ...args], { encoding: "utf-8", timeout: 10000 });
      const output = result.stdout?.trim();
      if (!output) {
        return res.status(500).json({ error: "Erro ao gerar URL de autorização PJe", detalhe: result.stderr?.trim() });
      }
      const dados = JSON.parse(output);
      if (dados.erro) return res.status(400).json({ error: dados.erro });

      // Salvar code_verifier e state na sessão — serão validados no trocar-token
      // O code_verifier NÃO é enviado ao cliente neste ponto (ficará somente no servidor)
      if (req.session) {
        (req.session as any).pjeOAuth = {
          code_verifier: dados.code_verifier,
          state: dados.state,
          redirect_uri: redirectUri,
        };
      }

      // Não retornamos code_verifier ao cliente — permanece apenas na sessão do servidor
      res.json({
        url_autorizacao: dados.url_autorizacao,
        state: dados.state,
        instrucoes: "Acesse a URL e autentique com seu certificado ICP-Brasil no SSO CNJ",
      });
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao iniciar auth PJe: " + error.message });
    }
  });

  // Callback OAuth2 PJe — troca code por token server-side (sem expor code ao frontend)
  app.get("/api/pje/callback", async (req, res) => {
    const { code, state: callbackState, error } = req.query;

    if (error) {
      return res.redirect(`/configuracoes?pje_error=${encodeURIComponent(String(error))}`);
    }

    if (!code) {
      return res.redirect("/configuracoes?pje_error=callback_sem_code");
    }

    // Recuperar state e code_verifier da sessão do servidor
    const pjeOAuth = (req.session as any)?.pjeOAuth;

    // Validação de state CSRF — obrigatória
    if (!pjeOAuth?.state) {
      return res.redirect("/configuracoes?pje_error=sessao_expirada");
    }
    if (String(callbackState) !== pjeOAuth.state) {
      return res.redirect("/configuracoes?pje_error=state_invalido");
    }

    const { code_verifier: codeVerifier, redirect_uri: redirectUri } = pjeOAuth;
    if (!codeVerifier) {
      return res.redirect("/configuracoes?pje_error=verifier_ausente");
    }

    try {
      const { spawnSync } = await import("child_process");
      const scriptPath = path.join(process.cwd(), "scraper", "cert_digital", "pje_sso.py");

      // Troca code por token server-side — argumentos passados como array (sem interpolação)
      const result = spawnSync(
        "python3",
        [scriptPath, "trocar-token", redirectUri, String(code), codeVerifier],
        { encoding: "utf-8", timeout: 30000 }
      );

      const output = result.stdout?.trim();
      if (!output) {
        const err = encodeURIComponent(result.stderr?.trim() || "Sem resposta do SSO");
        return res.redirect(`/configuracoes?pje_error=${err}`);
      }

      const dados = JSON.parse(output);
      if (!dados.sucesso) {
        const err = encodeURIComponent(dados.erro || dados.erro_descricao || "Falha na autenticação PJe");
        return res.redirect(`/configuracoes?pje_error=${err}`);
      }

      // Persistir token na sessão e limpar estado OAuth one-time
      (req.session as any).pje = {
        access_token: dados.access_token,
        refresh_token: dados.refresh_token,
        expires_at: dados.expires_at,
        nome_titular: dados.nome_titular,
        cpf_titular: dados.cpf_titular,
        email_titular: dados.email_titular,
      };
      delete (req.session as any).pjeOAuth;

      // Redirecionar para o frontend apenas com flag de sucesso — sem expor tokens
      const nome = encodeURIComponent(dados.nome_titular || "");
      return res.redirect(`/configuracoes?pje_sucesso=1&pje_nome=${nome}`);
    } catch (err: any) {
      return res.redirect(`/configuracoes?pje_error=${encodeURIComponent(err.message || "Erro interno")}`);
    }
  });

  // Status da autenticação PJe SSO
  app.get("/api/pje/status", async (req, res) => {
    try {
      const pje = (req.session as any)?.pje;
      if (!pje?.access_token) {
        return res.json({ autenticado: false, mensagem: "Não conectado ao PJe Nacional" });
      }
      const agora = Date.now() / 1000;
      const valido = pje.expires_at ? pje.expires_at > agora + 60 : true;
      res.json({
        autenticado: true,
        valido,
        nome_titular: pje.nome_titular,
        cpf_titular: pje.cpf_titular,
        expires_at: pje.expires_at,
        mensagem: valido
          ? `Conectado ao PJe Nacional${pje.nome_titular ? " — " + pje.nome_titular : ""}`
          : "Token PJe expirado — reconecte",
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao verificar status PJe" });
    }
  });

  // Desconectar PJe SSO
  app.delete("/api/pje/desconectar", async (req, res) => {
    try {
      if (req.session) {
        delete (req.session as any).pje;
        delete (req.session as any).pjeOAuth;
      }
      res.json({ sucesso: true, mensagem: "Desconectado do PJe Nacional" });
    } catch (error) {
      res.status(500).json({ error: "Erro ao desconectar PJe" });
    }
  });

  // Buscar processo via PJe autenticado (MNI)
  app.get("/api/pje/processo/:numero", async (req, res) => {
    try {
      const pje = (req.session as any)?.pje;
      if (!pje?.access_token) {
        return res.status(401).json({ error: "Não autenticado no PJe Nacional" });
      }

      const { numero } = req.params;
      const tribunal = (req.query.tribunal as string) || "DESCONHECIDO";

      const { spawn } = await import("child_process");
      const scriptPath = path.join(process.cwd(), "scraper", "mni_client.py");

      const proc = spawn("python3", [scriptPath, "processo", pje.access_token, numero, tribunal]);
      let stdout = ""; let stderr = "";
      proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
      proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

      const resposta = await new Promise<any>((resolve) => {
        const timer = setTimeout(() => { proc.kill(); resolve({ erro: "Timeout MNI" }); }, 25000);
        proc.on("close", () => {
          clearTimeout(timer);
          try {
            const js = stdout.indexOf("{"); const je = stdout.lastIndexOf("}");
            if (js !== -1) resolve(JSON.parse(stdout.slice(js, je + 1)));
            else resolve({ erro: stderr || "Sem resposta" });
          } catch { resolve({ erro: "Erro ao parsear resposta" }); }
        });
      });

      if (resposta.erro) {
        return res.status(502).json({ error: resposta.erro });
      }
      res.json({ ...resposta, fonte: "pje_autenticado", fonte_label: "PJe Autenticado" });
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao consultar processo via PJe: " + error.message });
    }
  });

  // Listar intimações via PJe SSO (CNJ Painel do Advogado)
  app.get("/api/pje/intimacoes", async (req, res) => {
    try {
      const pje = (req.session as any)?.pje;
      if (!pje?.access_token) {
        return res.status(401).json({ error: "Não autenticado no PJe Nacional" });
      }

      const apenasNaoLidas = req.query.nao_lidas !== "false";
      const { spawn } = await import("child_process");
      const scriptPath = path.join(process.cwd(), "scraper", "mni_client.py");
      const proc = spawn("python3", [scriptPath, "intimacoes", pje.access_token, String(apenasNaoLidas)]);

      let stdout = ""; let stderr = "";
      proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
      proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

      const intimacoes = await new Promise<any>((resolve) => {
        const timer = setTimeout(() => { proc.kill(); resolve([]); }, 20000);
        proc.on("close", () => {
          clearTimeout(timer);
          try {
            const as_ = stdout.indexOf("["); const ae = stdout.lastIndexOf("]");
            if (as_ !== -1) resolve(JSON.parse(stdout.slice(as_, ae + 1)));
            else resolve([]);
          } catch { resolve([]); }
        });
      });

      res.json({ intimacoes, total: intimacoes.length });
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao buscar intimações PJe: " + error.message });
    }
  });

  // Sincronizar intimações PJe com o módulo de Monitoramento
  app.post("/api/pje/sincronizar-intimacoes", async (req, res) => {
    try {
      const pje = (req.session as any)?.pje;
      if (!pje?.access_token) {
        return res.status(401).json({ error: "Não autenticado no PJe Nacional" });
      }

      const { spawn } = await import("child_process");
      const scriptPath = path.join(process.cwd(), "scraper", "mni_client.py");
      const proc = spawn("python3", [scriptPath, "intimacoes", pje.access_token, "true"]);

      let stdout = ""; let stderr = "";
      proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
      proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

      const intimacoes: any[] = await new Promise((resolve) => {
        const timer = setTimeout(() => { proc.kill(); resolve([]); }, 20000);
        proc.on("close", () => {
          clearTimeout(timer);
          try {
            const as_ = stdout.indexOf("["); const ae = stdout.lastIndexOf("]");
            if (as_ !== -1) resolve(JSON.parse(stdout.slice(as_, ae + 1)));
            else resolve([]);
          } catch { resolve([]); }
        });
      });

      let sincronizados = 0;
      let jaExistentes = 0;

      for (const int_ of intimacoes) {
        if (!int_.numero_processo || !int_.tribunal) continue;
        const existente = await storage.getMonitoramentoByNumero(int_.numero_processo);
        if (existente) {
          jaExistentes++;
          // Incrementar contador de novos andamentos para gerar alerta
          await storage.updateMonitoramento(existente.id, {
            novosAndamentos: (existente.novosAndamentos || 0) + 1,
          });
        } else {
          await storage.createMonitoramento({
            numeroProcesso: int_.numero_processo,
            tribunal: int_.tribunal,
            urlProcesso: int_.url_processo || undefined,
            frequenciaMinutos: 60,
            ultimaChecagem: new Date(),
            proximaChecagem: new Date(Date.now() + 60 * 60 * 1000),
            contadorAndamentos: 0,
            novosAndamentos: 1,
            ativo: true,
          });
          sincronizados++;
        }
      }

      res.json({
        sucesso: true,
        total_intimacoes: intimacoes.length,
        sincronizados,
        ja_existentes: jaExistentes,
        mensagem: `${intimacoes.length} intimação(ões) processada(s): ${sincronizados} nova(s) adicionada(s) ao monitoramento`,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao sincronizar intimações: " + error.message });
    }
  });

  // Download de documento via PJe autenticado (MNI)
  app.get("/api/pje/documento/:id", async (req, res) => {
    try {
      const pje = (req.session as any)?.pje;
      if (!pje?.access_token) {
        return res.status(401).json({ error: "Não autenticado no PJe Nacional" });
      }

      const { id } = req.params;
      const tribunal = (req.query.tribunal as string) || "DESCONHECIDO";
      const numeroProcesso = (req.query.processo as string) || "";
      const { spawnSync } = await import("child_process");
      const scriptPath = path.join(process.cwd(), "scraper", "mni_client.py");

      const args = ["documento", pje.access_token, id, tribunal];
      if (numeroProcesso) args.push(numeroProcesso);

      const result = spawnSync("python3", [scriptPath, ...args], {
        encoding: "utf-8",
        timeout: 35000,
      });

      const output = result.stdout?.trim();
      if (!output) {
        return res.status(502).json({ error: "Sem resposta do cliente MNI", detalhe: result.stderr?.trim() });
      }

      const js = output.indexOf("{"); const je = output.lastIndexOf("}");
      if (js === -1) return res.status(502).json({ error: "Resposta inválida" });
      const dados = JSON.parse(output.slice(js, je + 1));

      if (dados.erro) {
        return res.status(404).json({ error: dados.erro });
      }

      if (dados.conteudo_base64) {
        // Retornar arquivo diretamente para download
        const buffer = Buffer.from(dados.conteudo_base64, "base64");
        res.setHeader("Content-Type", dados.mime_type || "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${dados.nome_arquivo || `documento_${id}.pdf`}"`);
        res.setHeader("Content-Length", buffer.length);
        return res.send(buffer);
      }

      res.status(404).json({ error: "Documento não disponível" });
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao baixar documento PJe: " + error.message });
    }
  });

  // ==================== PROCESSOS ACOMPANHADOS ====================
  app.get("/api/acompanhamentos", async (req, res) => {
    try {
      const items = await storage.getProcessosAcompanhados();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar processos acompanhados" });
    }
  });

  // Resumo de alertas: total de processos com novos andamentos não vistos
  app.get("/api/acompanhamentos/alertas", async (req, res) => {
    try {
      const items = await storage.getProcessosAcompanhados();
      const comNovos = items.filter((i) => (i.novosAndamentos ?? 0) > 0);
      res.json({
        totalNovos: comNovos.reduce((acc, i) => acc + (i.novosAndamentos ?? 0), 0),
        processosComNovos: comNovos.map((i) => i.id),
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar alertas" });
    }
  });

  // Marcar processo acompanhado como visto (zera contador)
  app.post("/api/acompanhamentos/:id/marcar-visto", async (req, res) => {
    try {
      const existing = await storage.getProcessoAcompanhado(req.params.id);
      if (!existing) return res.status(404).json({ error: "Não encontrado" });
      const updated = await storage.updateProcessoAcompanhado(existing.id, {
        novosAndamentos: 0,
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao marcar como visto: " + error.message });
    }
  });

  // Marcar todos como vistos
  app.post("/api/acompanhamentos/marcar-todos-vistos", async (req, res) => {
    try {
      const items = await storage.getProcessosAcompanhados();
      await Promise.all(
        items
          .filter((i) => (i.novosAndamentos ?? 0) > 0)
          .map((i) => storage.updateProcessoAcompanhado(i.id, { novosAndamentos: 0 }))
      );
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: "Erro: " + error.message });
    }
  });

  app.post("/api/acompanhamentos", async (req, res) => {
    try {
      const body = req.body as Record<string, any>;

      // Auto-lookup path: if only numeroProcesso and optionally tribunal/anotacao are provided,
      // fetch process data via scraper before persisting.
      const isAutoLookup = body.numeroProcesso && !body.ultimoAndamento && !body.classe;

      if (isAutoLookup && body.tribunal) {
        const { spawn } = await import("child_process");
        const scriptPath = path.join(process.cwd(), "scraper", "run_scraper.py");

        const scraperResult = await new Promise<any>((resolve) => {
          const proc = spawn("python3", [scriptPath, "consultar", body.tribunal, body.numeroProcesso, "numero"], {
            env: { ...process.env },
            timeout: 60000,
          });
          let stdout = "";
          proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
          proc.on("close", () => {
            try {
              const js = stdout.indexOf("{"); const je = stdout.lastIndexOf("}");
              if (js !== -1) resolve(JSON.parse(stdout.slice(js, je + 1)));
              else resolve(null);
            } catch { resolve(null); }
          });
          proc.on("error", () => resolve(null));
        });

        if (scraperResult && scraperResult.processos && scraperResult.processos.length > 0) {
          const proc = scraperResult.processos[0];
          const movs: Array<{ data: string; descricao: string }> = proc.movimentacoes || [];
          const ultimo = movs[0];
          body.classe = proc.classe || null;
          body.assunto = proc.assunto || null;
          body.tribunal = proc.tribunal || body.tribunal;
          body.ultimoAndamento = ultimo?.descricao || null;
          body.dataUltimoAndamento = ultimo?.data || null;
          body.fonte = scraperResult.fonte || null;
        }
      }

      const data = insertProcessoAcompanhadoSchema.parse(body);
      const item = await storage.createProcessoAcompanhado(data);
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ error: "Dados inválidos" });
    }
  });

  app.patch("/api/acompanhamentos/:id", async (req, res) => {
    try {
      const existing = await storage.getProcessoAcompanhado(req.params.id);
      if (!existing) return res.status(404).json({ error: "Processo acompanhado não encontrado" });

      // If refresh=true, re-fetch via scraper and update stored data
      if (req.body.refresh === true) {
        const { spawn } = await import("child_process");
        const scriptPath = path.join(process.cwd(), "scraper", "run_scraper.py");

        const scraperResult = await new Promise<any>((resolve) => {
          const proc = spawn("python3", [scriptPath, "consultar", existing.tribunal, existing.numeroProcesso, "numero"], {
            env: { ...process.env },
            timeout: 60000,
          });
          let stdout = "";
          proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
          proc.on("close", () => {
            try {
              const js = stdout.indexOf("{"); const je = stdout.lastIndexOf("}");
              if (js !== -1) resolve(JSON.parse(stdout.slice(js, je + 1)));
              else resolve(null);
            } catch { resolve(null); }
          });
          proc.on("error", () => resolve(null));
        });

        if (scraperResult && scraperResult.processos && scraperResult.processos.length > 0) {
          const proc = scraperResult.processos[0];
          const movs: Array<{ data: string; descricao: string }> = proc.movimentacoes || [];
          const ultimo = movs[0];
          const updated = await storage.updateProcessoAcompanhado(existing.id, {
            classe: proc.classe || existing.classe,
            assunto: proc.assunto || existing.assunto,
            tribunal: proc.tribunal || existing.tribunal,
            ultimoAndamento: ultimo?.descricao || existing.ultimoAndamento,
            dataUltimoAndamento: ultimo?.data || existing.dataUltimoAndamento,
            fonte: scraperResult.fonte || existing.fonte,
          });
          return res.json(updated);
        }

        // Even if no new data found, just touch updatedAt
        const updated = await storage.updateProcessoAcompanhado(existing.id, {});
        return res.json(updated);
      }

      // Regular update (anotacao, etc.)
      const { refresh: _r, ...updateData } = req.body;
      const updated = await storage.updateProcessoAcompanhado(existing.id, updateData);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao atualizar processo acompanhado: " + error.message });
    }
  });

  app.delete("/api/acompanhamentos/:id", async (req, res) => {
    try {
      const success = await storage.deleteProcessoAcompanhado(req.params.id);
      if (!success) return res.status(404).json({ error: "Processo acompanhado não encontrado" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao remover processo acompanhado" });
    }
  });

  // Verificar status da ScraperAPI
  app.get("/api/scraper-api/status", async (req, res) => {
    try {
      const apiKey = process.env.SCRAPER_API_KEY;
      if (!apiKey) {
        return res.json({ configurada: false, mensagem: "SCRAPER_API_KEY não configurada" });
      }

      const response = await fetch(
        `https://api.scraperapi.com/account?api_key=${apiKey}`,
        { signal: AbortSignal.timeout(10000) }
      );
      
      if (!response.ok) {
        return res.json({ configurada: true, online: false, mensagem: "Erro ao verificar créditos" });
      }

      const data = await response.json() as any;
      res.json({
        configurada: true,
        online: true,
        requestCount: data.requestCount,
        requestLimit: data.requestLimit,
        creditosRestantes: data.requestLimit - data.requestCount,
        percentualUsado: Math.round((data.requestCount / data.requestLimit) * 100),
      });
    } catch (error: any) {
      res.json({ configurada: true, online: false, mensagem: error.message });
    }
  });

  // ==================== ACERVO DE PROCESSOS ====================

  app.get("/api/acervo", async (req, res) => {
    try {
      const filters: Record<string, string> = {};
      if (req.query.tipo) filters.tipo = req.query.tipo as string;
      if (req.query.tribunal) filters.tribunal = req.query.tribunal as string;
      if (req.query.fase) filters.fase = req.query.fase as string;
      if (req.query.responsavelId) filters.responsavelId = req.query.responsavelId as string;
      if (req.query.statusInterno) filters.statusInterno = req.query.statusInterno as string;
      if (req.query.prazoAte) filters.prazoAte = req.query.prazoAte as string;
      const processos = await storage.getAcervoProcessos(Object.keys(filters).length > 0 ? filters : undefined);

      // Enrich with último andamento and responsável name when requested
      if (req.query.enriquecer === "true" && processos.length > 0) {
        const ids = processos.map((p) => p.id);
        const ultimosAndamentos = await storage.getUltimoAndamentoPorAcervo(ids);
        const equipeMembers = await storage.getEquipe();
        const equipeMap: Record<string, string> = {};
        for (const m of equipeMembers) equipeMap[m.id] = m.nome;
        const enriched = processos.map((p) => ({
          ...p,
          ultimoAndamento: ultimosAndamentos[p.id] || null,
          responsavelNome: p.responsavelId ? equipeMap[p.responsavelId] || null : null,
        }));
        return res.json(enriched);
      }

      res.json(processos);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar acervo" });
    }
  });

  app.get("/api/acervo/buscar", async (req, res) => {
    try {
      const numero = req.query.numero as string;
      if (!numero) return res.status(400).json({ error: "Número obrigatório" });
      const processo = await storage.getAcervoProcessoByNumero(numero);
      if (!processo) return res.status(404).json({ error: "Processo não encontrado no acervo" });
      res.json(processo);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar processo no acervo" });
    }
  });

  app.get("/api/acervo/:id", async (req, res) => {
    try {
      const processo = await storage.getAcervoProcesso(req.params.id);
      if (!processo) return res.status(404).json({ error: "Processo não encontrado" });
      res.json(processo);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar processo do acervo" });
    }
  });

  app.post("/api/acervo", async (req, res) => {
    try {
      const data = insertAcervoProcessoSchema.parse(req.body);
      const processo = await storage.createAcervoProcesso(data);
      res.status(201).json(processo);
    } catch (error) {
      res.status(400).json({ error: "Dados inválidos" });
    }
  });

  // Salvar processo da Consulta Processual direto no acervo (cria ou atualiza)
  app.post("/api/acervo/salvar-processo", async (req, res) => {
    try {
      const { numero, tribunal, classe, assunto, relator, partes, movimentacoes, urlPortal } = req.body;
      if (!numero) return res.status(400).json({ error: "Número do processo obrigatório" });

      const partesStr = Array.isArray(partes) ? JSON.stringify(partes) : partes;
      const existente = await storage.getAcervoProcessoByNumero(numero);

      let processo;
      if (existente) {
        processo = await storage.updateAcervoProcesso(existente.id, {
          tribunal: tribunal || existente.tribunal,
          classe: classe || existente.classe,
          assunto: assunto || existente.assunto,
          relator: relator || existente.relator,
          partes: partesStr || existente.partes,
          urlPortal: urlPortal || existente.urlPortal,
          dataUltimaSincronizacao: new Date(),
        });

        // Sincronizar andamentos — normaliza variantes de formato via normalizarMovimentacao
        const movs: MovimentacaoInput[] = Array.isArray(movimentacoes) ? (movimentacoes as MovimentacaoInput[]) : [];
        if (movs.length > 0) {
          const andamentosExistentes = await storage.getAcervoAndamentos(existente.id);
          const chaves = new Set(andamentosExistentes.map((a) => `${a.data}|${a.descricao}`));
          for (const mov of movs) {
            const norm = normalizarMovimentacao(mov);
            if (!norm) continue;
            const chave = `${norm.data}|${norm.descricao}`;
            if (!chaves.has(chave)) {
              const critico = detectarCritico(norm.descricao);
              const novoAndamento = await storage.createAcervoAndamento({
                acervoId: existente.id,
                data: norm.data,
                descricao: norm.descricao,
                detalhes: norm.detalhes,
                tipo: "automatico",
                origem: "consulta",
                critico,
              });
              chaves.add(chave);
              // Trigger deadline engine for any recognizable event (not gated by critico)
              const eventoGatilhoUpdate = detectarEventoGatilho(norm.descricao);
              if (eventoGatilhoUpdate) {
                const andamentoId = novoAndamento.id;
                const acervoNumero = existente.numero;
                const dataEvento = norm.data ? new Date(norm.data) : new Date();
                (async () => {
                  const processoVinculado = await storage.getProcessoByNumero(acervoNumero);
                  await aplicarRegrasDeadline({
                    eventoGatilho: eventoGatilhoUpdate,
                    processoId: processoVinculado?.id || null,
                    dataEvento,
                    sourceEventId: andamentoId,
                    area: processoVinculado?.area || "geral",
                  });
                })().catch((err) => console.error("[engine] Erro ao aplicar regras de prazo:", err));
              }
            }
          }
        }

        return res.json({ processo, criado: false, mensagem: "Processo atualizado no acervo" });
      }

      processo = await storage.createAcervoProcesso({
        tipo: "judicial",
        numero,
        tribunal: tribunal || null,
        classe: classe || null,
        assunto: assunto || null,
        relator: relator || null,
        partes: partesStr || null,
        urlPortal: urlPortal || null,
        dataUltimaSincronizacao: new Date(),
        statusInterno: "ativo",
      });

      // Criar andamentos iniciais — normaliza e detecta criticidade
      const movsNovos: MovimentacaoInput[] = Array.isArray(movimentacoes) ? (movimentacoes as MovimentacaoInput[]) : [];
      if (movsNovos.length > 0) {
        const chaves = new Set<string>();
        for (const mov of movsNovos) {
          const norm = normalizarMovimentacao(mov);
          if (!norm) continue;
          const chave = `${norm.data}|${norm.descricao}`;
          if (!chaves.has(chave)) {
            const critico = detectarCritico(norm.descricao);
            const novoAndamento = await storage.createAcervoAndamento({
              acervoId: processo.id,
              data: norm.data,
              descricao: norm.descricao,
              detalhes: norm.detalhes,
              tipo: "automatico",
              origem: "consulta",
              critico,
            });
            chaves.add(chave);
            // Trigger deadline engine for any recognizable event (not gated by critico)
            const eventoGatilhoCreate = detectarEventoGatilho(norm.descricao);
            if (eventoGatilhoCreate) {
              const andamentoId = novoAndamento.id;
              const acervoNumero = processo.numero;
              const dataEvento = norm.data ? new Date(norm.data) : new Date();
              (async () => {
                const processoVinculado = await storage.getProcessoByNumero(acervoNumero);
                await aplicarRegrasDeadline({
                  eventoGatilho: eventoGatilhoCreate,
                  processoId: processoVinculado?.id || null,
                  dataEvento,
                  sourceEventId: andamentoId,
                  area: processoVinculado?.area || "geral",
                });
              })().catch((err) => console.error("[engine] Erro ao aplicar regras de prazo:", err));
            }
          }
        }
      }

      res.status(201).json({ processo, criado: true, mensagem: "Processo salvo no acervo" });
    } catch (error: any) {
      res.status(500).json({ error: "Erro ao salvar processo no acervo: " + error.message });
    }
  });

  app.patch("/api/acervo/:id", async (req, res) => {
    try {
      const anterior = await storage.getAcervoProcesso(req.params.id);
      if (!anterior) return res.status(404).json({ error: "Processo não encontrado" });
      const processo = await storage.updateAcervoProcesso(req.params.id, req.body);
      if (!processo) return res.status(404).json({ error: "Processo não encontrado" });
      // Registra tramitação quando a fase muda (audit trail para processos administrativos)
      if (req.body.fase && req.body.fase !== anterior.fase) {
        const hoje = new Date().toISOString().split("T")[0];
        await storage.createAcervoTramitacao({
          acervoId: req.params.id,
          fase: req.body.fase,
          dataInicio: hoje,
          responsavelId: processo.responsavelId ?? null,
          observacoes: `Movido de "${anterior.fase ?? "—"}" para "${req.body.fase}"`,
        });
      }
      res.json(processo);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar processo do acervo" });
    }
  });

  app.delete("/api/acervo/:id", async (req, res) => {
    try {
      const success = await storage.deleteAcervoProcesso(req.params.id);
      if (!success) return res.status(404).json({ error: "Processo não encontrado" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir processo do acervo" });
    }
  });

  // Andamentos
  app.get("/api/acervo/:id/andamentos", async (req, res) => {
    try {
      const andamentos = await storage.getAcervoAndamentos(req.params.id);
      res.json(andamentos);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar andamentos" });
    }
  });

  app.post("/api/acervo/:id/andamentos", async (req, res) => {
    try {
      const data = insertAcervoAndamentoSchema.parse({ ...req.body, acervoId: req.params.id });
      const andamento = await storage.createAcervoAndamento(data);
      res.status(201).json(andamento);

      // Trigger deadline engine whenever a recognizable event is recorded (non-blocking, after response sent)
      const eventoGatilho = detectarEventoGatilho(andamento.descricao);
      if (eventoGatilho) {
        const acervoId = req.params.id;
        const andamentoId = andamento.id;
        const dataEvento = andamento.data ? new Date(andamento.data) : new Date();
        (async () => {
          const acervoProcesso = await storage.getAcervoProcesso(acervoId);
          const processoVinculado = acervoProcesso
            ? await storage.getProcessoByNumero(acervoProcesso.numero)
            : undefined;
          await aplicarRegrasDeadline({
            eventoGatilho,
            processoId: processoVinculado?.id || null,
            dataEvento,
            sourceEventId: andamentoId,
            area: processoVinculado?.area || "geral",
          });
        })().catch((err) => console.error("[engine] Erro ao aplicar regras (andamento manual):", err));
      }
    } catch (error) {
      res.status(400).json({ error: "Dados inválidos" });
    }
  });

  app.delete("/api/acervo/:id/andamentos/:andamentoId", async (req, res) => {
    try {
      const success = await storage.deleteAcervoAndamento(req.params.andamentoId);
      if (!success) return res.status(404).json({ error: "Andamento não encontrado" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir andamento" });
    }
  });

  // Documentos do acervo
  app.get("/api/acervo/:id/documentos", async (req, res) => {
    try {
      const documentos = await storage.getAcervoDocumentos(req.params.id);
      res.json(documentos);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar documentos do acervo" });
    }
  });

  app.post("/api/acervo/:id/documentos", async (req, res) => {
    try {
      const data = insertAcervoDocumentoSchema.parse({ ...req.body, acervoId: req.params.id });
      const documento = await storage.createAcervoDocumento(data);
      res.status(201).json(documento);
    } catch (error) {
      res.status(400).json({ error: "Dados inválidos" });
    }
  });

  app.delete("/api/acervo/:id/documentos/:docId", async (req, res) => {
    try {
      const success = await storage.deleteAcervoDocumento(req.params.docId);
      if (!success) return res.status(404).json({ error: "Documento não encontrado" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir documento do acervo" });
    }
  });

  // Tramitações do acervo
  app.get("/api/acervo/:id/tramitacoes", async (req, res) => {
    try {
      const tramitacoes = await storage.getAcervoTramitacoes(req.params.id);
      res.json(tramitacoes);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar tramitações" });
    }
  });

  app.post("/api/acervo/:id/tramitacoes", async (req, res) => {
    try {
      const data = insertAcervoTramitacaoSchema.parse({ ...req.body, acervoId: req.params.id });
      const tramitacao = await storage.createAcervoTramitacao(data);
      res.status(201).json(tramitacao);
    } catch (error) {
      res.status(400).json({ error: "Dados inválidos" });
    }
  });

  app.patch("/api/acervo/:id/tramitacoes/:tramId", async (req, res) => {
    try {
      const tramitacao = await storage.updateAcervoTramitacao(req.params.tramId, req.body);
      if (!tramitacao) return res.status(404).json({ error: "Tramitação não encontrada" });
      res.json(tramitacao);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar tramitação" });
    }
  });

  app.delete("/api/acervo/:id/tramitacoes/:tramId", async (req, res) => {
    try {
      const success = await storage.deleteAcervoTramitacao(req.params.tramId);
      if (!success) return res.status(404).json({ error: "Tramitação não encontrada" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir tramitação" });
    }
  });

  // ==================== PESQUISA JURÍDICA (Motor de Scraping) ====================

  app.get("/api/pesquisa/processo/:numero", async (req, res) => {
    try {
      const { pesquisarProcesso } = await import("./scraping/orchestrator");
      const numero = decodeURIComponent(req.params.numero).trim();
      if (!numero) return res.status(400).json({ error: "Número de processo obrigatório" });

      console.log(`[pesquisa] Processo: ${numero}`);
      const resultado = await pesquisarProcesso(numero);
      res.json(resultado);
    } catch (error) {
      console.error("[pesquisa/processo]", error);
      res.status(500).json({ error: "Erro ao pesquisar processo", details: String(error) });
    }
  });

  app.get("/api/pesquisa/jurisprudencia", async (req, res) => {
    try {
      const { pesquisarJurisprudencia } = await import("./scraping/orchestrator");
      const q = String(req.query.q || "").trim();
      const tribunal = String(req.query.tribunal || "").trim();
      if (!q) return res.status(400).json({ error: "Parâmetro 'q' obrigatório" });

      console.log(`[pesquisa] Jurisprudência: "${q}" tribunal="${tribunal}"`);
      const resultado = await pesquisarJurisprudencia(q, tribunal);
      res.json(resultado);
    } catch (error) {
      console.error("[pesquisa/jurisprudencia]", error);
      res.status(500).json({ error: "Erro ao pesquisar jurisprudência", details: String(error) });
    }
  });

  app.get("/api/pesquisa/doutrina", async (req, res) => {
    try {
      const { pesquisarDoutrina } = await import("./scraping/orchestrator");
      const q = String(req.query.q || "").trim();
      if (!q) return res.status(400).json({ error: "Parâmetro 'q' obrigatório" });

      console.log(`[pesquisa] Doutrina: "${q}"`);
      const resultado = await pesquisarDoutrina(q);
      res.json(resultado);
    } catch (error) {
      console.error("[pesquisa/doutrina]", error);
      res.status(500).json({ error: "Erro ao pesquisar doutrina", details: String(error) });
    }
  });

  app.get("/api/pesquisa/cnpj/:cnpj", async (req, res) => {
    try {
      const { pesquisarCnpj } = await import("./scraping/orchestrator");
      const cnpj = req.params.cnpj.replace(/\D/g, "");
      if (!cnpj || cnpj.length !== 14) {
        return res.status(400).json({ error: "CNPJ deve ter 14 dígitos" });
      }

      console.log(`[pesquisa] CNPJ: ${cnpj}`);
      const resultado = await pesquisarCnpj(cnpj);
      res.json(resultado);
    } catch (error) {
      console.error("[pesquisa/cnpj]", error);
      res.status(500).json({ error: "Erro ao consultar CNPJ", details: String(error) });
    }
  });

  // ==================== ENGINE DE PRAZOS LEGAIS ====================

  // Regras de Prazos
  app.get("/api/deadline-rules", async (req, res) => {
    try {
      const filters: { ativo?: boolean; area?: string } = {};
      if (req.query.ativo !== undefined) filters.ativo = req.query.ativo === "true";
      if (req.query.area) filters.area = req.query.area as string;
      const rules = await storage.getDeadlineRules(filters);
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar regras de prazos" });
    }
  });

  app.get("/api/deadline-rules/:id", async (req, res) => {
    try {
      const rule = await storage.getDeadlineRule(req.params.id);
      if (!rule) return res.status(404).json({ error: "Regra não encontrada" });
      res.json(rule);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar regra" });
    }
  });

  app.post("/api/deadline-rules", async (req, res) => {
    try {
      const data = insertDeadlineRuleSchema.parse(req.body);
      const rule = await storage.createDeadlineRule(data);
      res.status(201).json(rule);
    } catch (error) {
      res.status(400).json({ error: "Dados inválidos" });
    }
  });

  app.patch("/api/deadline-rules/:id", async (req, res) => {
    try {
      const rule = await storage.updateDeadlineRule(req.params.id, req.body);
      if (!rule) return res.status(404).json({ error: "Regra não encontrada" });
      res.json(rule);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar regra" });
    }
  });

  app.delete("/api/deadline-rules/:id", async (req, res) => {
    try {
      const success = await storage.deleteDeadlineRule(req.params.id);
      if (!success) return res.status(404).json({ error: "Regra não encontrada" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir regra" });
    }
  });

  // Aplicar regras manualmente (disparar engine)
  const aplicarRegrasSchema = z.object({
    eventoGatilho: z.string().min(1),
    processoId: z.string().optional().nullable(),
    dataEvento: z.string().min(1),
    sourceEventId: z.string().optional(),
    area: z.string().optional(),
  });

  app.post("/api/deadline-rules/aplicar", async (req, res) => {
    try {
      const data = aplicarRegrasSchema.parse(req.body);
      const resultado = await aplicarRegrasDeadline({
        ...data,
        dataEvento: new Date(data.dataEvento),
      });
      res.json(resultado);
    } catch (error) {
      res.status(400).json({ error: "Dados inválidos" });
    }
  });

  // Painel de prazos críticos (próximas 72h)
  app.get("/api/prazos-criticos", async (req, res) => {
    try {
      const horas = parseInt(req.query.horas as string) || 72;
      const tarefas = await storage.getAtividadesPrazosCriticos(horas);
      res.json(tarefas);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar prazos críticos" });
    }
  });

  // Inicializar seed de regras pré-configuradas e job de alertas
  seedRegrasPreconfigured().catch(console.error);
  iniciarJobAlertas();
  iniciarJobVerificacaoAcompanhamentos();

  const httpServer = createServer(app);
  return httpServer;
}

// ==================== JOB: VERIFICAÇÃO PERIÓDICA DE ACOMPANHAMENTOS ====================
// Roda a cada 2 horas. Reutiliza o mesmo scraper Python tribunal-aware da rota PATCH
// para suportar tanto números CNJ quanto formatos STF/STJ (ex: "ADI 1", "REsp 123456").
function iniciarJobVerificacaoAcompanhamentos() {
  const INTERVALO_MS = 2 * 60 * 60 * 1000; // 2 horas

  const verificar = async () => {
    let items: import("@shared/schema").ProcessoAcompanhado[];
    try {
      items = await storage.getProcessosAcompanhados();
    } catch {
      return;
    }
    if (items.length === 0) return;

    const { spawn } = await import("child_process");
    const scriptPath = path.join(process.cwd(), "scraper", "run_scraper.py");

    for (const item of items) {
      try {
        // Mesma lógica da rota PATCH refresh=true — tribunal-aware via scraper Python
        const scraperResult = await new Promise<Record<string, unknown> | null>((resolve) => {
          const proc = spawn(
            "python3",
            [scriptPath, "consultar", item.tribunal, item.numeroProcesso, "numero"],
            { env: { ...process.env }, timeout: 60000 }
          );
          let stdout = "";
          proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
          proc.on("close", () => {
            try {
              const js = stdout.indexOf("{");
              const je = stdout.lastIndexOf("}");
              if (js !== -1) resolve(JSON.parse(stdout.slice(js, je + 1)) as Record<string, unknown>);
              else resolve(null);
            } catch { resolve(null); }
          });
          proc.on("error", () => resolve(null));
        });

        const update: Partial<import("@shared/schema").InsertProcessoAcompanhado> = {
          ultimaVerificacao: new Date(),
        };

        if (scraperResult) {
          const processos = scraperResult.processos as Array<{
            classe?: string;
            assunto?: string;
            tribunal?: string;
            movimentacoes?: Array<{ data: string; descricao: string }>;
          }> | undefined;
          const fonte = scraperResult.fonte as string | undefined;

          if (fonte) update.fonte = fonte;

          if (processos && processos.length > 0) {
            const proc = processos[0];
            const movs = proc.movimentacoes ?? [];
            const novoUltimoAndamento = movs[0]?.descricao ?? null;
            const novaData = movs[0]?.data ?? null;

            const mudou = novoUltimoAndamento !== null && novoUltimoAndamento !== item.ultimoAndamento;

            if (mudou) {
              update.ultimoAndamento = novoUltimoAndamento;
              update.dataUltimoAndamento = novaData ?? item.dataUltimoAndamento ?? undefined;
              update.novosAndamentos = (item.novosAndamentos ?? 0) + 1;
              if (proc.classe) update.classe = proc.classe;
              if (proc.assunto) update.assunto = proc.assunto;
              if (proc.tribunal) update.tribunal = proc.tribunal;
            }
          }
        }

        await storage.updateProcessoAcompanhado(item.id, update);
      } catch {
        // Ignora falhas individuais — não interrompe o job
      }
      // Pausa entre consultas para não sobrecarregar os tribunais
      await new Promise((r) => setTimeout(r, 3000));
    }
  };

  // Aguarda 5 minutos antes da primeira execução (deixa o servidor estabilizar)
  setTimeout(() => {
    verificar().catch(console.error);
    setInterval(() => verificar().catch(console.error), INTERVALO_MS);
  }, 5 * 60 * 1000);
}
