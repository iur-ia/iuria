import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";

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
import sanitizeHtml from "sanitize-html";

// Sanitização HTML estrita para conteúdo de petições (IA, import, export, acervo)
function sanitizeLegalHtml(html: string): string {
  if (!html) return "";
  return sanitizeHtml(html, {
    allowedTags: [
      "h1","h2","h3","h4","h5","h6","p","br","hr","span","div",
      "strong","b","em","i","u","s","sub","sup","small","mark",
      "ul","ol","li","blockquote","pre","code",
      "table","thead","tbody","tfoot","tr","th","td",
      "a","img",
    ],
    allowedAttributes: {
      "*": ["style","class","data-*"],
      a: ["href","title","target","rel"],
      img: ["src","alt","title","width","height"],
      td: ["colspan","rowspan"],
      th: ["colspan","rowspan"],
    },
    allowedSchemes: ["http","https","mailto","tel","data"],
    allowedSchemesByTag: { img: ["http","https","data"] },
    allowedStyles: {
      "*": {
        "color": [/.*/],
        "background-color": [/.*/],
        "text-align": [/^left$|^right$|^center$|^justify$/],
        "font-family": [/.*/],
        "font-size": [/.*/],
        "font-weight": [/.*/],
        "font-style": [/.*/],
        "text-decoration": [/.*/],
        "text-indent": [/.*/],
        "margin": [/.*/], "margin-left": [/.*/], "margin-right": [/.*/], "margin-top": [/.*/], "margin-bottom": [/.*/],
        "padding": [/.*/], "padding-left": [/.*/], "padding-right": [/.*/], "padding-top": [/.*/], "padding-bottom": [/.*/],
        "width": [/.*/], "height": [/.*/],
        "border": [/.*/], "border-collapse": [/.*/],
      },
    },
    transformTags: {
      a: (tag, attribs) => ({
        tagName: "a",
        attribs: { ...attribs, rel: "noopener noreferrer", target: attribs.target || "_blank" },
      }),
    },
  });
}
import { 
  insertClienteSchema, insertEquipeSchema, insertProcessoSchema,
  insertAtividadeSchema, insertDocumentoSchema, insertContaReceberSchema,
  insertContaPagarSchema, insertHonorarioSchema, insertTemplateSchema,
  insertMonitoramentoSchema,
  insertAcervoProcessoSchema, insertAcervoAndamentoSchema,
  insertAcervoDocumentoSchema, insertAcervoTramitacaoSchema,
  insertProcessoAcompanhadoSchema,
  insertDeadlineRuleSchema,
  insertPeticaoRascunhoSchema,
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

      // headerHtml pode conter HTML rico (cabeçalho/rodapé das petições);
      // sanitiza no mesmo padrão dos demais endpoints para evitar XSS armazenado.
      if (typeof data.headerHtml === "string") {
        data.headerHtml = sanitizeLegalHtml(data.headerHtml);
      }

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
      const patch = { ...req.body };
      if (typeof patch.headerHtml === "string") {
        patch.headerHtml = sanitizeLegalHtml(patch.headerHtml);
      }
      const documento = await storage.updateDocumento(req.params.id, patch);
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
      const sanitized = {
        ...data,
        conteudoHtml: data.conteudoHtml ? sanitizeLegalHtml(data.conteudoHtml) : data.conteudoHtml,
        headerHtml: data.headerHtml ? sanitizeLegalHtml(data.headerHtml) : data.headerHtml,
      };
      const template = await storage.createTemplate(sanitized);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ error: "Dados inválidos" });
    }
  });

  app.patch("/api/templates/:id", async (req, res) => {
    try {
      const body = { ...req.body };
      if (typeof body.conteudoHtml === "string") body.conteudoHtml = sanitizeLegalHtml(body.conteudoHtml);
      if (typeof body.headerHtml === "string") body.headerHtml = sanitizeLegalHtml(body.headerHtml);
      const template = await storage.updateTemplate(req.params.id, body);
      if (!template) {
        return res.status(404).json({ error: "Template não encontrado" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar template" });
    }
  });

  app.post("/api/templates/:id/uso", async (req, res) => {
    try {
      await storage.incrementTemplateUsos(req.params.id);
      res.status(204).send();
    } catch {
      res.status(500).json({ error: "Erro ao registrar uso" });
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

  // Marcar template como padrão (toggle)
  app.post("/api/templates/:id/padrao", async (req, res) => {
    try {
      const { isPadrao } = req.body as { isPadrao: boolean };
      const t = await storage.setTemplatePadrao(req.params.id, !!isPadrao);
      if (!t) return res.status(404).json({ error: "Template não encontrado" });
      res.json(t);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar template" });
    }
  });

  // Importar arquivo .docx / .html / .txt como template ou rascunho
  app.post("/api/templates/import", upload.single("arquivo"), async (req: Request, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
      const ext = path.extname(req.file.originalname).toLowerCase();
      const allowed = [".docx", ".html", ".htm", ".txt"];
      if (!allowed.includes(ext)) {
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(415).json({ error: `Formato '${ext}' não suportado. Aceitos: ${allowed.join(", ")}` });
      }

      let html = "";
      let headerHtmlRaw = "";
      let footerHtmlRaw = "";
      let headerSource: "xml" | "heuristic" | "none" = "none";
      if (ext === ".docx") {
        const { importDocxFile } = await import("./docxImporter");
        const result = importDocxFile(req.file.path);
        html = result.bodyHtml || "";
        headerHtmlRaw = result.headerHtml || "";
        footerHtmlRaw = result.footerHtml || "";
        headerSource = result.headerSource;
        // Fallback: se nosso conversor não produziu corpo, usamos mammoth
        if (!html.replace(/<[^>]+>/g, "").trim()) {
          const mammoth = (await import("mammoth")).default;
          const mres = await mammoth.convertToHtml({ path: req.file.path });
          html = mres.value || "";
        }
      } else if (ext === ".html" || ext === ".htm") {
        html = fs.readFileSync(req.file.path, "utf-8");
      } else {
        const txt = fs.readFileSync(req.file.path, "utf-8");
        html = txt.split(/\r?\n\r?\n/).map(p => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("\n");
      }

      try { fs.unlinkSync(req.file.path); } catch {}

      const safeHtml = sanitizeLegalHtml(html);
      const safeHeader = headerHtmlRaw ? sanitizeLegalHtml(headerHtmlRaw) : "";
      const safeFooter = footerHtmlRaw ? sanitizeLegalHtml(footerHtmlRaw) : "";
      // headerHtml combina cabeçalho + rodapé separados por marcador para o editor renderizar nas duas zonas
      const combinedHeader = (safeHeader || safeFooter)
        ? `${safeHeader}${safeFooter ? `<hr data-iuria-footer="1"/>${safeFooter}` : ""}`
        : "";

      // Se vier ?asTemplate=1, persiste como Template; senão devolve apenas o html
      if (req.query.asTemplate === "1") {
        const nome = (req.body.nome as string) || req.file.originalname.replace(ext, "");
        const categoria = (req.body.categoria as string) || "Importado";
        const descricao = (req.body.descricao as string) || `Importado de ${req.file.originalname}`;
        const created = await storage.createTemplate({
          nome, categoria, descricao,
          conteudo: safeHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000),
          conteudoHtml: safeHtml,
          headerHtml: combinedHeader || null,
          origem: "importado",
          isPadrao: false,
          usos: 0,
        });
        return res.status(201).json({ template: created, html: safeHtml, headerHtml: combinedHeader, footerHtml: safeFooter });
      }

      res.json({
        html: safeHtml,
        headerHtml: combinedHeader,
        footerHtml: safeFooter,
        fileName: req.file.originalname,
        headerSource,
      });
    } catch (error: any) {
      console.error("[templates/import]", error);
      res.status(500).json({ error: error?.message || "Erro ao importar arquivo" });
    }
  });

  // ==================== PETIÇÕES — RASCUNHOS ====================
  app.get("/api/peticao-rascunhos", async (_req, res) => {
    try { res.json(await storage.getPeticaoRascunhos()); }
    catch { res.status(500).json({ error: "Erro ao buscar rascunhos" }); }
  });

  app.get("/api/peticao-rascunhos/:id", async (req, res) => {
    try {
      const r = await storage.getPeticaoRascunho(req.params.id);
      if (!r) return res.status(404).json({ error: "Rascunho não encontrado" });
      res.json(r);
    } catch { res.status(500).json({ error: "Erro" }); }
  });

  app.post("/api/peticao-rascunhos", async (req, res) => {
    try {
      const data = insertPeticaoRascunhoSchema.parse(req.body);
      const sanitized = {
        ...data,
        conteudoHtml: sanitizeLegalHtml(data.conteudoHtml || ""),
        headerHtml: data.headerHtml ? sanitizeLegalHtml(data.headerHtml) : data.headerHtml ?? null,
      };
      const r = await storage.createPeticaoRascunho(sanitized);
      res.status(201).json(r);
    } catch (e: any) { res.status(400).json({ error: e?.message || "Dados inválidos" }); }
  });

  app.patch("/api/peticao-rascunhos/:id", async (req, res) => {
    try {
      const body = { ...req.body };
      if (typeof body.conteudoHtml === "string") body.conteudoHtml = sanitizeLegalHtml(body.conteudoHtml);
      if (typeof body.headerHtml === "string") body.headerHtml = sanitizeLegalHtml(body.headerHtml);
      const r = await storage.updatePeticaoRascunho(req.params.id, body);
      if (!r) return res.status(404).json({ error: "Rascunho não encontrado" });
      res.json(r);
    } catch { res.status(500).json({ error: "Erro" }); }
  });

  app.delete("/api/peticao-rascunhos/:id", async (req, res) => {
    try {
      const ok = await storage.deletePeticaoRascunho(req.params.id);
      if (!ok) return res.status(404).json({ error: "Rascunho não encontrado" });
      res.status(204).send();
    } catch { res.status(500).json({ error: "Erro" }); }
  });

  // ==================== PETIÇÕES IA — CHAT ====================
  app.post("/api/peticoes-ia/chat", async (req, res) => {
    try {
      const { instruction, contentHtml, selection, mode } = req.body as {
        instruction: string;
        contentHtml?: string;
        selection?: string;
        mode?: "gerar" | "editar" | "revisar";
      };
      if (!instruction || typeof instruction !== "string") {
        return res.status(400).json({ error: "Instrução é obrigatória" });
      }

      const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: "Chave de IA não configurada. Defina ANTHROPIC_API_KEY ou OPENAI_API_KEY nos secrets do projeto.",
          hint: "missing_api_key",
        });
      }

      const systemPrompt = [
        "Você é um redator jurídico brasileiro sênior, especializado em peças processuais.",
        "Sempre devolva HTML semântico (<h1>, <h2>, <p>, <strong>, <em>, <ul>, <ol>, <blockquote>) — sem <html>, <body> ou <script>.",
        "Mantenha tom técnico, formal, citando fundamentos legais (CF/88, CPC, CLT, leis específicas) quando pertinente.",
        "Nunca invente jurisprudência. Se não souber a citação exata, sinalize com [conferir].",
        "Use parágrafos curtos e numerados quando apropriado. Não use markdown — apenas HTML.",
      ].join(" ");

      const userPrompt = (() => {
        if (mode === "editar" && selection) {
          return `Reescreva apenas o trecho selecionado do documento conforme a instrução.\n\nINSTRUÇÃO: ${instruction}\n\nTRECHO SELECIONADO (HTML):\n${selection}\n\nDocumento completo (contexto, não reescreva):\n${contentHtml || "(vazio)"}\n\nResponda apenas com o HTML do novo trecho, sem explicações.`;
        }
        if (mode === "revisar") {
          return `Revise tecnicamente o documento abaixo conforme a instrução, mantendo a estrutura geral. Aprimore redação, fundamentação e clareza.\n\nINSTRUÇÃO: ${instruction}\n\nDOCUMENTO ATUAL (HTML):\n${contentHtml || "(vazio)"}\n\nResponda apenas com o HTML completo revisado.`;
        }
        return `Gere uma peça jurídica em HTML conforme a instrução.\n\nINSTRUÇÃO: ${instruction}\n\nDocumento atual (continue/integre se houver):\n${contentHtml || "(vazio)"}\n\nResponda apenas com o HTML completo.`;
      })();

      const tryAnthropic = async (): Promise<string> => {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": process.env.ANTHROPIC_API_KEY!,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-latest",
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
          }),
        });
        if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 200)}`);
        const j = await r.json();
        return j?.content?.[0]?.text || "";
      };
      const tryOpenAI = async (): Promise<string> => {
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "authorization": `Bearer ${process.env.OPENAI_API_KEY!}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 4096,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        });
        if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
        const j = await r.json();
        return j?.choices?.[0]?.message?.content || "";
      };

      let resultHtml = "";
      let provider = "";
      const errors: string[] = [];
      const order: ("anthropic" | "openai")[] = process.env.ANTHROPIC_API_KEY
        ? ["anthropic", "openai"]
        : ["openai", "anthropic"];

      for (const p of order) {
        if (p === "anthropic" && !process.env.ANTHROPIC_API_KEY) continue;
        if (p === "openai" && !process.env.OPENAI_API_KEY) continue;
        try {
          resultHtml = p === "anthropic" ? await tryAnthropic() : await tryOpenAI();
          provider = p;
          break;
        } catch (e: any) {
          errors.push(`${p}: ${e.message}`);
        }
      }

      if (!resultHtml) {
        return res.status(502).json({ error: `Falha em todos os provedores. ${errors.join(" | ")}` });
      }

      // Remove fences ```html
      resultHtml = resultHtml.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

      // Sanitização HTML estrita
      resultHtml = sanitizeLegalHtml(resultHtml);

      res.json({ html: resultHtml, provider, mode: mode || "gerar" });
    } catch (error: any) {
      console.error("[peticoes-ia/chat]", error);
      res.status(500).json({ error: error?.message || "Erro na IA" });
    }
  });

  // ==================== PETIÇÕES IA — EXPORT ====================
  app.post("/api/peticoes-ia/export", async (req, res) => {
    try {
      const body = req.body as {
        html?: string;
        bodyHtml?: string;
        headerHtml?: string;
        footerHtml?: string;
        format: "docx" | "pdf";
        titulo?: string;
      };
      const { format, titulo } = body;
      // Backward-compat: cliente antigo enviava apenas `html`.
      const rawBody = body.bodyHtml ?? body.html ?? "";
      const rawHeader = body.headerHtml ?? "";
      const rawFooter = body.footerHtml ?? "";
      if (!rawBody) return res.status(400).json({ error: "HTML é obrigatório" });

      const safeTitle = (titulo || "peticao").replace(/[^a-zA-Z0-9._-]/g, "_");
      const safeBody = sanitizeLegalHtml(rawBody);
      const safeHeader = rawHeader ? sanitizeLegalHtml(rawHeader) : "";
      const safeFooter = rawFooter ? sanitizeLegalHtml(rawFooter) : "";

      const baseStyle = `
body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #000; margin: 0; }
h1 { font-size: 16pt; text-align: center; margin: 1em 0; }
h2 { font-size: 14pt; margin: 1em 0 0.5em; }
h3 { font-size: 12pt; margin: 0.8em 0 0.4em; }
p { text-align: justify; margin: 0.5em 0; text-indent: 2em; }
blockquote { margin: 0.5em 2em; font-style: italic; }
table { border-collapse: collapse; width: 100%; }
td, th { border: 1px solid #444; padding: 4px 8px; }`;

      if (format === "docx") {
        // Para DOCX:
        //  1. Header/footer são passados separadamente para html-to-docx,
        //     que os transforma em word/header1.xml e word/footer1.xml.
        //  2. Substituímos cada <span class="iuria-field" data-field="PAGE">
        //     por um marcador único de texto.
        //  3. Após gerar o .docx pós-processamos o zip e trocamos os
        //     marcadores pelos elementos <w:fldSimple w:instr=" PAGE "/>
        //     reais — assim o Word recalcula a numeração ao abrir.
        const PAGE_TOKEN = "\u0001IURIAFLDPAGE\u0001";
        const NUMPAGES_TOKEN = "\u0001IURIAFLDNUMPAGES\u0001";
        const tokenize = (h: string) =>
          h
            .replace(/<span\b[^>]*\bdata-field="PAGE"[^>]*>[^<]*<\/span>/gi, PAGE_TOKEN)
            .replace(/<span\b[^>]*\bdata-field="NUMPAGES"[^>]*>[^<]*<\/span>/gi, NUMPAGES_TOKEN);
        const wrapHtml = (inner: string) =>
          `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title>
<style>${baseStyle}</style></head><body>${inner}</body></html>`;

        const docBody = wrapHtml(tokenize(safeBody));
        const docHeader = safeHeader ? wrapHtml(tokenize(safeHeader)) : undefined;
        const docFooter = safeFooter ? wrapHtml(tokenize(safeFooter)) : undefined;

        const htmlToDocx = (await import("html-to-docx")).default as (
          html: string,
          headerHTMLString?: string,
          options?: Record<string, unknown>,
          footerHTMLString?: string,
        ) => Promise<Buffer>;
        const buffer = await htmlToDocx(
          docBody,
          docHeader,
          {
            orientation: "portrait",
            margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            header: !!docHeader,
            footer: !!docFooter,
          },
          docFooter,
        );

        // Pós-processa o .docx: troca os marcadores de texto por <w:fldSimple>.
        const AdmZipMod = (await import("adm-zip")).default;
        const zip = new AdmZipMod(Buffer.from(buffer));
        // O html-to-docx emite os elementos sem o prefixo `w:` (usa apenas o
        // namespace default herdado de <ftr xmlns="…">), então injetamos os
        // fragmentos no mesmo estilo. Declaramos `xmlns:w` localmente apenas
        // para validar o atributo `w:instr` que é obrigatório no schema.
        const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
        const FLD_PAGE = `</t></r><fldSimple xmlns:w="${W_NS}" w:instr=" PAGE "><r><t>1</t></r></fldSimple><r><t xml:space="preserve">`;
        const FLD_NUMPAGES = `</t></r><fldSimple xmlns:w="${W_NS}" w:instr=" NUMPAGES "><r><t>1</t></r></fldSimple><r><t xml:space="preserve">`;
        for (const entry of zip.getEntries()) {
          // Restringe ao header/footer: o corpo (document.xml) usa o prefixo
          // `w:` no html-to-docx atual, então a substituição sem prefixo
          // poderia produzir XML inválido. Campos PAGE/NUMPAGES no corpo são
          // raros — por ora ficam como literal "1" no .docx.
          if (!/^word\/(header\d*|footer\d*)\.xml$/.test(entry.entryName)) continue;
          let xml = entry.getData().toString("utf-8");
          if (!xml.includes(PAGE_TOKEN) && !xml.includes(NUMPAGES_TOKEN)) continue;
          xml = xml.split(PAGE_TOKEN).join(FLD_PAGE).split(NUMPAGES_TOKEN).join(FLD_NUMPAGES);
          zip.updateFile(entry.entryName, Buffer.from(xml, "utf-8"));
        }
        const finalBuffer = zip.toBuffer();

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.docx"`);
        return res.send(finalBuffer);
      }

      if (format === "pdf") {
        // Para PDF usamos os recursos nativos do Puppeteer:
        //   displayHeaderFooter + headerTemplate + footerTemplate
        // que são repetidos automaticamente em todas as páginas. Os campos
        // PAGE/NUMPAGES são reescritos para os tokens nativos `pageNumber`
        // e `totalPages` que o Chromium substitui pelo valor real por página.
        const toPagedTemplate = (h: string): string => {
          if (!h) return "";
          return h
            .replace(
              /<span\b[^>]*\bdata-field="PAGE"[^>]*>[^<]*<\/span>/gi,
              '<span class="pageNumber"></span>',
            )
            .replace(
              /<span\b[^>]*\bdata-field="NUMPAGES"[^>]*>[^<]*<\/span>/gi,
              '<span class="totalPages"></span>',
            );
        };
        // Templates do Puppeteer rodam isolados — precisam de estilos inline.
        const wrapTemplate = (inner: string): string =>
          inner
            ? `<div style="font-family:'Times New Roman',serif;font-size:10pt;color:#000;width:100%;padding:0 3cm 0 3cm;text-align:center;">${toPagedTemplate(
                inner,
              )}</div>`
            : "<span></span>";

        const headerTemplate = wrapTemplate(safeHeader);
        const footerTemplate = wrapTemplate(safeFooter);
        const displayHeaderFooter = !!(safeHeader || safeFooter);

        // No corpo da página os spans iuria-field são esvaziados — caso
        // apareçam fora do header/footer (raro), usamos counter() inline.
        const pdfBody = safeBody.replace(
          /(<span\b[^>]*\bclass="[^"]*\biuria-field\b[^"]*"[^>]*>)[^<]*(<\/span>)/gi,
          "$1$2",
        );
        const fieldCss = `
.iuria-field[data-field="PAGE"]::before { content: counter(page); }
.iuria-field[data-field="NUMPAGES"]::before { content: counter(pages); }`;
        const fullHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title>
<style>${baseStyle}${fieldCss}</style></head><body>${pdfBody}</body></html>`;

        const htmlPdf = (await import("html-pdf-node")).default;
        const file = { content: fullHtml };
        const buffer = await htmlPdf.generatePdf(file, {
          format: "A4",
          margin: { top: "2.5cm", bottom: "2.5cm", left: "3cm", right: "2cm" },
          displayHeaderFooter,
          headerTemplate,
          footerTemplate,
          printBackground: true,
        });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.pdf"`);
        return res.send(buffer);
      }

      return res.status(400).json({ error: "Formato inválido. Use 'docx' ou 'pdf'." });
    } catch (error: any) {
      console.error("[peticoes-ia/export]", error);
      res.status(500).json({ error: error?.message || "Erro no export" });
    }
  });

  // ==================== PETIÇÕES IA — SALVAR NO ACERVO ====================
  app.post("/api/peticoes-ia/salvar-no-acervo", async (req, res) => {
    try {
      const { titulo, html, headerHtml, processoId, clienteId } = req.body as {
        titulo: string; html: string; headerHtml?: string; processoId?: string; clienteId?: string;
      };
      if (!titulo || !html) return res.status(400).json({ error: "Título e conteúdo são obrigatórios" });
      const safeHtml = sanitizeLegalHtml(html);
      const safeHeaderHtml = headerHtml ? sanitizeLegalHtml(headerHtml) : null;

      const doc = await storage.createDocumento({
        nome: `${titulo}.html`,
        tipo: "Petição",
        tamanho: `${(safeHtml.length / 1024).toFixed(1)} KB`,
        conteudoMarkdown: safeHtml,
        headerHtml: safeHeaderHtml,
        extracaoStatus: "concluida",
        versao: 1,
        processoId: processoId || null,
        clienteId: clienteId || null,
      });
      res.status(201).json(doc);
    } catch (error: any) {
      console.error("[peticoes-ia/salvar-no-acervo]", error);
      res.status(500).json({ error: error?.message || "Erro ao salvar no acervo" });
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

  // ==================== DASHBOARD KPIs ====================
  app.get("/api/dashboard/kpis", async (req, res) => {
    try {
      const [proc, atv, cr, cp, acomp, eq, hon, ts, cli] = await Promise.all([
        storage.getProcessos(),
        storage.getAtividades(),
        storage.getContasReceber(),
        storage.getContasPagar(),
        storage.getProcessosAcompanhados(),
        storage.getEquipe(),
        storage.getHonorarios(),
        storage.getTimesheetEntries(),
        storage.getClientes(),
      ]);

      // ---- Query params ----
      const periodo = (req.query.periodo as string) || "mes";
      const areaFiltro = (req.query.area as string) || "";
      const responsavelFiltro = (req.query.responsavel as string) || "";
      const clienteFiltro = (req.query.cliente as string) || "";

      const hoje = new Date();
      const hojeStr = hoje.toISOString().split("T")[0];
      const em7d = new Date(hoje.getTime() + 7 * 86400000).toISOString().split("T")[0];
      const ha30dDate = new Date(hoje.getTime() - 30 * 86400000).toISOString().split("T")[0];

      // Período personalizado: accept dataInicio / dataFim; fall back to predefined ranges
      let haPeriodo: string;
      let emPeriodo: string;
      let periodoLabel: string;
      if (periodo === "personalizado") {
        haPeriodo = (req.query.dataInicio as string) || ha30dDate;
        emPeriodo = (req.query.dataFim as string) || hojeStr;
        periodoLabel = `${haPeriodo} → ${emPeriodo}`;
      } else {
        const periodoDias = periodo === "semana" ? 7 : periodo === "trimestre" ? 90 : 30;
        periodoLabel = periodo === "semana" ? "7 dias" : periodo === "trimestre" ? "90 dias" : "30 dias";
        haPeriodo = new Date(hoje.getTime() - periodoDias * 86400000).toISOString().split("T")[0];
        emPeriodo = new Date(hoje.getTime() + periodoDias * 86400000).toISOString().split("T")[0];
      }

      // ---- Build lookup maps (needed before filtering) ----
      const processoMap = new Map(proc.map((p) => [p.id, p]));
      const equipeMap = new Map(eq.map((m) => [m.id, m.nome]));
      const clienteMap = new Map(cli.map((c) => [c.id, c.nome]));

      // ---- Apply global filters (área, responsável, cliente) — all KPIs ----
      const procFiltrado = proc
        .filter((p) => !areaFiltro || p.area === areaFiltro)
        .filter((p) => !responsavelFiltro || p.responsavelId === responsavelFiltro)
        .filter((p) => !clienteFiltro || p.clienteId === clienteFiltro);
      const atvFiltrada = atv
        .filter((a) => {
          if (responsavelFiltro && a.responsavelId !== responsavelFiltro) return false;
          if (areaFiltro || clienteFiltro) {
            const p = a.processoId ? processoMap.get(a.processoId) : null;
            if (areaFiltro && p?.area !== areaFiltro) return false;
            if (clienteFiltro && p?.clienteId !== clienteFiltro) return false;
          }
          return true;
        });
      const crFiltrado = cr.filter((c) => {
        if (!clienteFiltro) return true;
        // Prefer direct clienteId on the record; fall back to linked processo's clienteId
        if (c.clienteId) return c.clienteId === clienteFiltro;
        const proc = c.processoId ? processoMap.get(c.processoId) : null;
        return proc ? proc.clienteId === clienteFiltro : false;
      });
      // contasPagar has no processoId/clienteId link — can't filter by client
      const cpFiltrado = cp;
      const tsFiltrado = ts.filter((t) => {
        if (responsavelFiltro && t.equipeId !== responsavelFiltro) return false;
        if (clienteFiltro && t.clienteId !== clienteFiltro) return false;
        return true;
      });

      // ---- Processos KPIs ----
      const processosAtivos = procFiltrado.filter((p) => p.status === "Ativo");
      const porAreaMap: Record<string, number> = {};
      for (const p of processosAtivos) {
        porAreaMap[p.area] = (porAreaMap[p.area] || 0) + 1;
      }
      const semMovimentacao30d = procFiltrado.filter(
        (p) => p.status === "Ativo" && p.dataAtualizacao && p.dataAtualizacao < ha30dDate
      ).length;

      // ---- Atividades KPIs ----
      const naoConc = atvFiltrada.filter((a) => a.status !== "Concluído" && a.status !== "Cancelado");
      const atrasadas = naoConc.filter((a) => a.data < hojeStr);
      const vencendo7dList = naoConc.filter((a) => a.data >= hojeStr && a.data <= em7d);
      const vencendoPeriodoList = naoConc.filter((a) => a.data >= hojeStr && a.data <= emPeriodo);
      const porRisco = { CRITICO: 0, ALTO: 0, MEDIO: 0, BAIXO: 0 };
      for (const a of naoConc) {
        if (a.risco === "CRITICO") porRisco.CRITICO++;
        else if (a.risco === "ALTO") porRisco.ALTO++;
        else if (a.risco === "MEDIO") porRisco.MEDIO++;
        else if (a.risco === "BAIXO") porRisco.BAIXO++;
      }

      // ---- Composite risk score for Mapa de Risco ----
      // Score = deadline imminence (0-4) + valor causa (0-3) + days without movement (0-2)
      const computeRiscoScore = (a: (typeof atv)[0]): number => {
        const diasAtraso = a.data < hojeStr
          ? Math.round((new Date(hojeStr).getTime() - new Date(a.data + "T00:00:00").getTime()) / 86400000)
          : 0;
        const deadlinePts = diasAtraso > 30 ? 4 : diasAtraso > 7 ? 3 : diasAtraso > 0 ? 2 : a.data <= em7d ? 1 : 0;

        const processo = a.processoId ? processoMap.get(a.processoId) : null;
        const valor = processo?.valorCausa ? parseFloat(processo.valorCausa) : 0;
        const valorPts = valor >= 500000 ? 3 : valor >= 100000 ? 2 : valor >= 10000 ? 1 : 0;

        const diasSemMov = processo?.dataAtualizacao
          ? Math.round((hoje.getTime() - new Date(processo.dataAtualizacao + "T00:00:00").getTime()) / 86400000)
          : 0;
        const movPts = diasSemMov > 60 ? 2 : diasSemMov > 30 ? 1 : 0;

        return deadlinePts + valorPts + movPts;
      };

      // Include all risk levels (CRITICO/ALTO/MEDIO/BAIXO) ordered by composite score
      const riscoWindow = naoConc.filter((a) => a.data <= emPeriodo);
      const seenIds = new Set<string>();
      const mapaRisco = [...atrasadas, ...riscoWindow]
        .filter((a) => {
          if (seenIds.has(a.id)) return false;
          seenIds.add(a.id);
          return true;
        })
        .map((a) => {
          const score = computeRiscoScore(a);
          const processo = a.processoId ? processoMap.get(a.processoId) : null;
          const diasAtraso = a.data < hojeStr
            ? Math.round((new Date(hojeStr).getTime() - new Date(a.data + "T00:00:00").getTime()) / 86400000)
            : 0;
          return {
            id: a.id,
            titulo: a.titulo,
            risco: a.risco,
            data: a.data,
            tipo: a.tipo,
            processoNumero: processo?.numero ?? null,
            area: processo?.area ?? null,
            responsavel: a.responsavelId ? equipeMap.get(a.responsavelId) ?? null : null,
            valorCausa: processo?.valorCausa ?? null,
            diasAtraso,
            score,
          };
        })
        .sort((a, b) => b.score - a.score || a.data.localeCompare(b.data))
        .slice(0, 15);

      // ---- Financial KPIs (using filtered data) ----
      const totalReceber = crFiltrado
        .filter((c) => c.status !== "Pago")
        .reduce((acc, c) => acc + parseFloat(c.valor), 0);
      const totalRecebidoPeriodo = crFiltrado
        .filter((c) => c.status === "Pago" && c.dataPagamento && c.dataPagamento >= haPeriodo)
        .reduce((acc, c) => acc + parseFloat(c.valor), 0);
      const totalPagarPeriodo = cpFiltrado
        .filter((c) => c.status !== "Pago" && c.vencimento <= emPeriodo)
        .reduce((acc, c) => acc + parseFloat(c.valor), 0);

      // ---- Honorários por status + por cliente ----
      const honorariosPorStatus = crFiltrado.reduce<Record<string, number>>((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + parseFloat(c.valor);
        return acc;
      }, {});

      // Honorários: breakdown by cliente from honorarios table
      const honFiltrado = hon.filter((h) => !clienteFiltro || h.clienteId === clienteFiltro);
      const honorariosPorCliente = cli.map((c) => {
        const total = honFiltrado
          .filter((h) => h.clienteId === c.id)
          .reduce((acc, h) => acc + parseFloat(h.valorContratado ?? "0"), 0);
        const recebido = honFiltrado
          .filter((h) => h.clienteId === c.id)
          .reduce((acc, h) => acc + parseFloat(h.valorRecebido ?? "0"), 0);
        return { clienteId: c.id, nome: c.nome, total, recebido, pendente: total - recebido };
      }).filter((x) => x.total > 0).sort((a, b) => b.pendente - a.pendente).slice(0, 8);

      // ---- Receita realizada no mês vs meta (previous 3-month avg) ----
      const anoMesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
      const receitaMesAtual = crFiltrado
        .filter((c) => c.dataPagamento && c.dataPagamento.startsWith(anoMesAtual) && c.status === "Pago")
        .reduce((acc, c) => acc + parseFloat(c.valor), 0);
      // Meta = average of last 3 months received
      let somaMetaMeses = 0;
      for (let i = 1; i <= 3; i++) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const am = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        somaMetaMeses += crFiltrado
          .filter((c) => c.dataPagamento && c.dataPagamento.startsWith(am) && c.status === "Pago")
          .reduce((acc, c) => acc + parseFloat(c.valor), 0);
      }
      const metaReceitaMensal = Math.round(somaMetaMeses / 3);

      // ---- Timesheet KPIs: hours by collaborator in period ----
      const tsPeriodo = tsFiltrado.filter((t) => t.data >= haPeriodo && t.data <= hojeStr);
      const horasPorColaborador = eq.map((m) => {
        const entries = tsPeriodo.filter((t) => t.equipeId === m.id);
        const total = entries.reduce((acc, t) => acc + parseFloat(t.horas), 0);
        const faturavel = entries.filter((t) => t.faturavel).reduce((acc, t) => acc + parseFloat(t.horas), 0);
        return { equipeId: m.id, nome: m.nome, totalHoras: Math.round(total * 10) / 10, horasFaturaveis: Math.round(faturavel * 10) / 10 };
      }).filter((x) => x.totalHoras > 0).sort((a, b) => b.totalHoras - a.totalHoras);
      const totalHorasRegistradas = horasPorColaborador.reduce((acc, x) => acc + x.totalHoras, 0);

      // ---- Financial trend: last 6 months ----
      const trendFinanceiro: { mes: string; label: string; recebido: number; pago: number; aVencer: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const anoMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
        const recebido = crFiltrado
          .filter((c) => c.dataPagamento && c.dataPagamento.startsWith(anoMes) && c.status === "Pago")
          .reduce((acc, c) => acc + parseFloat(c.valor), 0);
        const pago = cpFiltrado
          .filter((c) => c.dataPagamento && c.dataPagamento.startsWith(anoMes) && c.status === "Pago")
          .reduce((acc, c) => acc + parseFloat(c.valor), 0);
        const aVencer = crFiltrado
          .filter((c) => c.vencimento && c.vencimento.startsWith(anoMes) && c.status !== "Pago")
          .reduce((acc, c) => acc + parseFloat(c.valor), 0);
        trendFinanceiro.push({ mes: anoMes, label, recebido, pago, aVencer });
      }

      // ---- Tasks by week: last 8 weeks (concluidas vs abertas) ----
      const tarefasPorSemana: { label: string; concluidas: number; abertas: number }[] = [];
      for (let i = 7; i >= 0; i--) {
        const fimD = new Date(hoje.getTime() - i * 7 * 86400000);
        const inicioD = new Date(fimD.getTime() - 6 * 86400000);
        const inicioStr = inicioD.toISOString().split("T")[0];
        const fimStr = fimD.toISOString().split("T")[0];
        const label = `${inicioD.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
        const concluidas = atvFiltrada.filter(
          (a) => a.status === "Concluído" && a.data >= inicioStr && a.data <= fimStr
        ).length;
        const abertas = atvFiltrada.filter(
          (a) => a.status !== "Concluído" && a.status !== "Cancelado" && a.data >= inicioStr && a.data <= fimStr
        ).length;
        tarefasPorSemana.push({ label, concluidas, abertas });
      }

      // ---- Acompanhados ----
      const comNovos = acomp.filter((a) => (a.novosAndamentos ?? 0) > 0).length;

      // ---- Filter options for UI ----
      const areas = Array.from(new Set(proc.map((p) => p.area))).filter(Boolean).sort() as string[];
      const equipeParaFiltro = eq.map((m) => ({ id: m.id, nome: m.nome }));
      const clientesParaFiltro = cli.map((c) => ({ id: c.id, nome: c.nome }));

      res.json({
        processos: {
          total: procFiltrado.length,
          ativos: processosAtivos.length,
          porArea: Object.entries(porAreaMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([area, total]) => ({ area, total })),
          semMovimentacao30d,
        },
        atividades: {
          total: atvFiltrada.length,
          atrasadas: atrasadas.length,
          vencendo7d: vencendo7dList.length,
          vencendoPeriodo: vencendoPeriodoList.length,
          concluidas: atvFiltrada.filter((a) => a.status === "Concluído").length,
          porRisco,
        },
        financeiro: {
          totalReceber,
          totalPagarPeriodo,
          totalRecebidoPeriodo,
          honorariosPendentes: crFiltrado.filter((c) => c.status === "Pendente").length,
          honorariosPorStatus,
          honorariosPorCliente,
          receitaMesAtual,
          metaReceitaMensal,
        },
        timesheet: {
          totalHorasRegistradas: Math.round(totalHorasRegistradas * 10) / 10,
          horasPorColaborador,
        },
        periodo,
        periodoLabel,
        mapaRisco,
        trendFinanceiro,
        tarefasPorSemana,
        acompanhados: {
          total: acomp.length,
          comNovosAndamentos: comNovos,
        },
        filtros: { areas, equipe: equipeParaFiltro, clientes: clientesParaFiltro },
        geradoEm: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[dashboard/kpis]", error);
      res.status(500).json({ error: "Erro ao gerar KPIs do dashboard" });
    }
  });

  // Inicializar seed de regras pré-configuradas e job de alertas
  seedRegrasPreconfigured().catch(console.error);
  iniciarJobAlertas();
  iniciarJobVerificacaoAcompanhamentos();

  // ==================== COMUNICAÇÕES — PLACEHOLDER ENGINE ====================

  function resolverPlaceholders(corpo: string, ctx: Record<string, string>): string {
    // 1) Resolve {{#if key}}...{{/if}} blocks — keep block if value is truthy, else remove
    let result = corpo.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, content) => {
      const k = key.trim();
      const val = ctx[k] ?? "";
      return val ? content : "";
    });
    // 2) Resolve simple {{key}} placeholders
    result = result.replace(/\{\{([^#/][^}]*)\}\}/g, (_, key) => {
      const k = key.trim();
      return ctx[k] ?? "";  // return empty string (not raw token) for missing keys
    });
    return result;
  }

  function buildContexto(
    dados: Record<string, string>,
    escritorio: Record<string, string>,
    processo: Record<string, string>,
    cliente: Record<string, string>,
    advogado: Record<string, string>
  ): Record<string, string> {
    const hoje = new Date();
    const dataAtual = hoje.toLocaleDateString("pt-BR");
    const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
    const dataExtenso = `${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;

    return {
      // Spread ALL dynamic keys from processo (includes parte_ativa.nome, parte_passiva.nome, etc.)
      ...processo,
      // Standard prefixed keys (explicit keys always win over the spread)
      "escritorio.nome": escritorio.nome ?? "",
      "escritorio.oab": escritorio.oab ?? "",
      "escritorio.cnpj": escritorio.cnpj ?? "",
      "escritorio.endereco": [escritorio.endereco, escritorio.complemento].filter(Boolean).join(", "),
      "escritorio.cidade": escritorio.cidade ?? "",
      "escritorio.estado": escritorio.estado ?? "",
      "escritorio.telefone": escritorio.telefone ?? "",
      "escritorio.email": escritorio.email ?? "",
      "escritorio.website": escritorio.website ?? "",
      "processo.numero": processo.numero ?? "",
      "processo.tribunal": processo.tribunal ?? "",
      "processo.classe": processo.classe ?? "",
      "processo.assunto": processo.assunto ?? "",
      "processo.fase": processo.fase ?? "",
      "cliente.nome": cliente.nome ?? "",
      "cliente.cpfCnpj": cliente.cpfCnpj ?? "",
      "cliente.email": cliente.email ?? "",
      "cliente.telefone": cliente.telefone ?? "",
      "advogado.nome": advogado.nome ?? "",
      "advogado.oab": advogado.oab ?? "",
      "data_atual": dataAtual,
      "data_extenso": dataExtenso,
      // User-provided dados overrides everything (last wins)
      ...dados,
    };
  }

  // ==================== ROTAS — ESCRITÓRIO CONFIG ====================

  app.get("/api/escritorio-config", async (_req, res) => {
    const config = await storage.getEscritorioConfig();
    res.json(config ?? {});
  });

  app.put("/api/escritorio-config", async (req, res) => {
    try {
      const config = await storage.upsertEscritorioConfig(req.body);
      res.json(config);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // ==================== ROTAS — COMMUNICATION TEMPLATES ====================

  app.get("/api/communication-templates", async (req, res) => {
    const filters: { categoria?: string; ativo?: boolean } = {};
    if (req.query.categoria) filters.categoria = req.query.categoria as string;
    if (req.query.ativo !== undefined) filters.ativo = req.query.ativo === "true";
    const templates = await storage.getCommunicationTemplates(filters);
    res.json(templates);
  });

  app.get("/api/communication-templates/:id", async (req, res) => {
    const t = await storage.getCommunicationTemplate(req.params.id);
    if (!t) return res.status(404).json({ error: "Template não encontrado" });
    res.json(t);
  });

  app.post("/api/communication-templates", async (req, res) => {
    try {
      const t = await storage.createCommunicationTemplate(req.body);
      res.status(201).json(t);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.patch("/api/communication-templates/:id", async (req, res) => {
    const t = await storage.updateCommunicationTemplate(req.params.id, req.body);
    if (!t) return res.status(404).json({ error: "Template não encontrado" });
    res.json(t);
  });

  app.delete("/api/communication-templates/:id", async (req, res) => {
    const ok = await storage.deleteCommunicationTemplate(req.params.id);
    if (!ok) return res.status(404).json({ error: "Template não encontrado" });
    res.json({ ok: true });
  });

  app.post("/api/communication-templates/:id/render", async (req, res) => {
    const tmpl = await storage.getCommunicationTemplate(req.params.id);
    if (!tmpl) return res.status(404).json({ error: "Template não encontrado" });

    const { dados = {}, acervoId, responsavelId } = req.body as {
      dados?: Record<string, string>;
      acervoId?: string;
      responsavelId?: string;
    };

    let processoCtx: Record<string, string> = {};
    let clienteCtxRender: Record<string, string> = {};
    if (acervoId) {
      const proc = await storage.getAcervoProcesso(acervoId);
      if (proc) {
        processoCtx = {
          numero: proc.numero ?? "",
          tribunal: proc.tribunal ?? "",
          classe: proc.classe ?? "",
          assunto: proc.assunto ?? "",
          fase: proc.fase ?? "",
        };
        if (proc.partes) {
          try {
            const partes = JSON.parse(proc.partes);
            const autor = Array.isArray(partes) ? partes.find((p: any) => p.polo === "ativo" || p.tipo === "autor") : null;
            const reu = Array.isArray(partes) ? partes.find((p: any) => p.polo === "passivo" || p.tipo === "reu") : null;
            if (autor) processoCtx["parte_ativa.nome"] = autor.nome ?? "";
            if (reu) processoCtx["parte_passiva.nome"] = reu.nome ?? "";
            if (reu) processoCtx["parte_contraria.qualificacao"] = [reu.qualificacao, reu.cpfCnpj].filter(Boolean).join(", ");
          } catch { /* ignore */ }
        }
        if (proc.clienteId) {
          const cli = await storage.getCliente(proc.clienteId);
          if (cli) clienteCtxRender = { nome: cli.nome ?? "", cpfCnpj: cli.cpfCnpj ?? "", email: cli.email ?? "", telefone: cli.telefone ?? "" };
        }
      }
    }

    const cfg = await storage.getEscritorioConfig();
    const escritorioCtx: Record<string, string> = {
      nome: cfg?.nome ?? "",
      oab: cfg?.oab ?? "",
      cnpj: cfg?.cnpj ?? "",
      endereco: cfg?.endereco ?? "",
      complemento: cfg?.complemento ?? "",
      cidade: cfg?.cidade ?? "",
      estado: cfg?.estado ?? "",
      telefone: cfg?.telefone ?? "",
      email: cfg?.email ?? "",
      website: cfg?.website ?? "",
    };

    let advogadoCtx: Record<string, string> = {};
    if (responsavelId) {
      const membro = await storage.getMembro(responsavelId);
      if (membro) advogadoCtx = { nome: membro.nome ?? "", oab: membro.oab ?? "" };
    }

    const ctx = buildContexto(dados, escritorioCtx, processoCtx, clienteCtxRender, advogadoCtx);
    const rawHtml = resolverPlaceholders(tmpl.corpo, ctx);
    const sanitizeHtml = (await import("sanitize-html")).default;
    const html = sanitizeHtml(rawHtml, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
      allowedAttributes: { "*": ["style", "class", "id", "align", "width", "height", "alt"], "img": ["src", "alt", "width", "height"] },
      allowedSchemes: ["data"],
      allowVulnerableTags: false,
    });
    res.json({ html, ctx });
  });

  // ==================== ROTAS — COMMUNICATIONS ====================

  app.get("/api/communications", async (req, res) => {
    const filters: { acervoId?: string; status?: string } = {};
    if (req.query.acervoId) filters.acervoId = req.query.acervoId as string;
    if (req.query.status) filters.status = req.query.status as string;
    const comms = await storage.getCommunications(filters);
    const enriched = await Promise.all(comms.map(async (c) => {
      let templateNome: string | null = null;
      if (c.templateId) {
        const tmpl = await storage.getCommunicationTemplate(c.templateId);
        templateNome = tmpl?.nome ?? null;
      }
      return { ...c, templateNome };
    }));
    res.json(enriched);
  });

  app.get("/api/communications/:id", async (req, res) => {
    const c = await storage.getCommunication(req.params.id);
    if (!c) return res.status(404).json({ error: "Comunicação não encontrada" });
    res.json(c);
  });

  app.post("/api/communications/generate", async (req, res) => {
    try {
      const { templateId, acervoId, destinatario, assunto, dados = {}, responsavelId } = req.body as {
        templateId: string; acervoId?: string; destinatario: string;
        assunto?: string; dados?: Record<string, string>; responsavelId?: string;
      };

      if (!templateId || !destinatario) {
        return res.status(400).json({ error: "templateId e destinatario são obrigatórios" });
      }

      const tmpl = await storage.getCommunicationTemplate(templateId);
      if (!tmpl) return res.status(404).json({ error: "Template não encontrado" });

      let processoCtx: Record<string, string> = {};
      let clienteCtx: Record<string, string> = {};
      let acervoNumero: string | undefined;
      if (acervoId) {
        const proc = await storage.getAcervoProcesso(acervoId);
        if (proc) {
          acervoNumero = proc.numero;
          processoCtx = {
            numero: proc.numero ?? "",
            tribunal: proc.tribunal ?? "",
            classe: proc.classe ?? "",
            assunto: proc.assunto ?? "",
            fase: proc.fase ?? "",
          };
          // Enrich with partes data (JSON array stored as text)
          if (proc.partes) {
            try {
              const partes = JSON.parse(proc.partes);
              const autor = Array.isArray(partes) ? partes.find((p: any) => p.polo === "ativo" || p.tipo === "autor") : null;
              const reu = Array.isArray(partes) ? partes.find((p: any) => p.polo === "passivo" || p.tipo === "reu") : null;
              if (autor) processoCtx["parte_ativa.nome"] = autor.nome ?? "";
              if (reu) processoCtx["parte_passiva.nome"] = reu.nome ?? "";
              if (reu) processoCtx["parte_contraria.qualificacao"] = [reu.qualificacao, reu.cpfCnpj].filter(Boolean).join(", ");
            } catch { /* ignore parse errors */ }
          }
          // Lookup client from acervo's clienteId
          if (proc.clienteId) {
            const cli = await storage.getCliente(proc.clienteId);
            if (cli) {
              clienteCtx = {
                nome: cli.nome ?? "",
                cpfCnpj: cli.cpfCnpj ?? "",
                email: cli.email ?? "",
                telefone: cli.telefone ?? "",
              };
            }
          }
        }
      }

      const cfg = await storage.getEscritorioConfig();
      const escritorioCtx: Record<string, string> = {
        nome: cfg?.nome ?? "",
        oab: cfg?.oab ?? "",
        cnpj: cfg?.cnpj ?? "",
        endereco: cfg?.endereco ?? "",
        complemento: cfg?.complemento ?? "",
        cidade: cfg?.cidade ?? "",
        estado: cfg?.estado ?? "",
        telefone: cfg?.telefone ?? "",
        email: cfg?.email ?? "",
        website: cfg?.website ?? "",
      };

      let advogadoCtx: Record<string, string> = {};
      if (responsavelId) {
        const membro = await storage.getMembro(responsavelId);
        if (membro) advogadoCtx = { nome: membro.nome ?? "", oab: membro.oab ?? "" };
      }

      const dadosFull = { ...dados, destinatario, assunto: assunto ?? "" };
      const ctx = buildContexto(dadosFull, escritorioCtx, processoCtx, clienteCtx, advogadoCtx);
      const rawHtml = resolverPlaceholders(tmpl.corpo, ctx);
      // Sanitize HTML — only data: URIs allowed for img.src to prevent SSRF during PDF render
      const sanitizeHtml = (await import("sanitize-html")).default;
      const htmlGerado = sanitizeHtml(rawHtml, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
        allowedAttributes: { "*": ["style", "class", "id", "align", "width", "height", "alt"], "img": ["src", "alt", "width", "height"] },
        allowedSchemes: ["data"],
        allowVulnerableTags: false,
      });

      await storage.updateCommunicationTemplate(templateId, { usos: (tmpl.usos ?? 0) + 1 });

      // Auto-generate sequential office number using DB sequences (race-safe)
      let numeroOficio: string | null = null;
      if (tmpl.categoria === "oficio" || tmpl.categoria === "notificacao") {
        const anoAtual = new Date().getFullYear();
        const seqName = tmpl.categoria === "notificacao" ? "notificacao_seq" : "oficio_seq";
        const prefixo = tmpl.categoria === "notificacao" ? "NOT" : "OFI";
        const seqResult = await pool.query(`SELECT nextval($1) AS n`, [seqName]);
        const seqNum = Number((seqResult.rows[0] as { n: string }).n);
        numeroOficio = `${prefixo}-${String(seqNum).padStart(4, "0")}/${anoAtual}`;
      }

      const comm = await storage.createCommunication({
        templateId,
        acervoId: acervoId ?? null,
        acervoNumero: acervoNumero ?? null,
        destinatario,
        assunto: assunto ?? null,
        dadosPreenchidos: JSON.stringify(dados),
        htmlGerado,
        status: "gerada",
        protocolo: null,
        numeroOficio,
        responsavelId: responsavelId ?? null,
      });

      res.status(201).json({ ...comm, templateNome: tmpl.nome });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.patch("/api/communications/:id", async (req, res) => {
    const updateData = { ...req.body };
    // Auto-set enviadoEm when status transitions to "enviada"
    if (updateData.status === "enviada") {
      const existing = await storage.getCommunication(req.params.id);
      if (existing && !existing.enviadoEm) {
        updateData.enviadoEm = new Date();
      }
    }
    const c = await storage.updateCommunication(req.params.id, updateData);
    if (!c) return res.status(404).json({ error: "Comunicação não encontrada" });
    res.json(c);
  });

  app.delete("/api/communications/:id", async (req, res) => {
    const ok = await storage.deleteCommunication(req.params.id);
    if (!ok) return res.status(404).json({ error: "Comunicação não encontrada" });
    res.json({ ok: true });
  });

  // ==================== PDF GENERATION ====================
  app.get("/api/communications/:id/pdf", async (req, res) => {
    try {
      const comm = await storage.getCommunication(req.params.id);
      if (!comm) return res.status(404).json({ error: "Comunicação não encontrada" });
      if (!comm.htmlGerado) return res.status(400).json({ error: "Comunicação sem conteúdo HTML" });

      // Load escritório config for server-side header/footer (independent of template body)
      const escConf = await storage.getEscritorioConfig();
      const escritorioNome = escConf?.nome ?? "Escritório de Advocacia";
      const escritorioOab = escConf?.oab ?? "";
      const escritorioEnd = [escConf?.endereco, escConf?.complemento, escConf?.cidade, escConf?.estado]
        .filter(Boolean).join(", ");
      const escritorioTel = escConf?.telefone ?? "";
      const escritorioEmail = escConf?.email ?? "";
      const dataEmissao = new Date().toLocaleDateString("pt-BR");

      const headerHtml = `
        <div style="border-bottom:2px solid #333;padding-bottom:8px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-size:14pt;font-weight:bold;color:#1a1a1a;">${escritorioNome}</div>
            ${escritorioOab ? `<div style="font-size:9pt;color:#555;">OAB: ${escritorioOab}</div>` : ""}
            ${escritorioEnd ? `<div style="font-size:9pt;color:#555;">${escritorioEnd}</div>` : ""}
          </div>
          <div style="text-align:right;font-size:9pt;color:#555;">
            ${escritorioTel ? `<div>${escritorioTel}</div>` : ""}
            ${escritorioEmail ? `<div>${escritorioEmail}</div>` : ""}
          </div>
        </div>
        ${comm.numeroOficio ? `<div style="font-size:9pt;font-weight:bold;margin-bottom:8px;color:#333;">${comm.numeroOficio}</div>` : ""}
      `;
      const footerHtml = `
        <div style="border-top:1px solid #aaa;padding-top:6px;margin-top:20px;font-size:8pt;color:#777;display:flex;justify-content:space-between;">
          <span>${escritorioNome}${escritorioOab ? ` — OAB: ${escritorioOab}` : ""}</span>
          <span>Emitido em ${dataEmissao}</span>
        </div>
      `;

      // Full HTML page for PDF rendering with server-side header/footer
      const fullHtml = `<!DOCTYPE html><html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${comm.assunto ?? "Comunicação"}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12pt; background: #fff; color: #000; }
    @page { size: A4; margin: 20mm 25mm; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>${headerHtml}${comm.htmlGerado}${footerHtml}</body></html>`;

      const filename = comm.numeroOficio
        ? `oficio-${comm.numeroOficio.replace(/\//g, "-")}.pdf`
        : `comunicacao-${comm.id.slice(0, 8)}.pdf`;

      // Serve from persisted PDF if already generated (avoids re-render)
      const storedComm = await storage.getCommunication(comm.id);
      if (storedComm?.pdfConteudo) {
        const pdfBuf = Buffer.from(storedComm.pdfConteudo, "base64");
        res.set({
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": pdfBuf.length,
        });
        return res.end(pdfBuf);
      }

      // Use playwright chromium (system-compatible, has all required shared libs)
      const { chromium } = await import("playwright");
      const browser = await chromium.launch({
        executablePath: (() => {
          // Prefer the playwright-managed chromium that has correct system libs
          const candidates = [
            "/home/runner/workspace/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome",
            "/home/runner/workspace/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome",
            "/home/runner/workspace/.cache/ms-playwright/chromium-1208/chrome-linux/chrome",
            "/home/runner/workspace/.cache/ms-playwright/chromium-1200/chrome-linux/chrome",
            "/home/runner/workspace/.cache/ms-playwright/chromium-1169/chrome-linux/chrome",
          ];
          return candidates.find((p) => fs.existsSync(p)) ?? undefined;
        })(),
        args: [
          "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
          "--disable-gpu", "--disable-extensions",
        ],
      });
      const context = await browser.newContext();
      const page = await context.newPage();
      // Block all network requests (prevent SSRF from PDF renderer)
      await page.route("**/*", (route) => {
        const url = route.request().url();
        if (url.startsWith("data:") || url === "about:blank") {
          route.continue();
        } else {
          route.abort();
        }
      });
      await page.setContent(fullHtml, { waitUntil: "domcontentloaded" });
      const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "20mm", bottom: "20mm", left: "25mm", right: "25mm" } });
      await browser.close();

      // Persist PDF as base64 and record generation timestamp
      const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
      await storage.updateCommunication(comm.id, {
        pdfGeradoEm: new Date(),
        pdfConteudo: pdfBase64,
      });

      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length,
      });
      res.end(pdfBuffer);
    } catch (e: any) {
      console.error("[PDF] Error generating PDF:", e.message);
      res.status(500).json({ error: "Falha ao gerar PDF: " + e.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// ==================== JOB: VERIFICAÇÃO PERIÓDICA DE ACOMPANHAMENTOS ====================
// Roda a cada 2 horas. Reutiliza o mesmo scraper Python tribunal-aware da rota PATCH
// para suportar tanto números CNJ quanto formatos STF/STJ (ex: "ADI 1", "REsp 123456").
function iniciarJobVerificacaoAcompanhamentos() {
  const INTERVALO_MS = 2 * 60 * 60 * 1000; // 2 horas
  let isRunning = false; // guard contra execuções sobrepostas

  const verificar = async () => {
    if (isRunning) return;
    isRunning = true;
    let items: import("@shared/schema").ProcessoAcompanhado[];
    try {
      items = await storage.getProcessosAcompanhados();
    } catch {
      return;
    }
    if (items.length === 0) {
      isRunning = false;
      return;
    }

    try {
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
    } finally {
      isRunning = false;
    }
  };

  // Aguarda 5 minutos antes da primeira execução (deixa o servidor estabilizar)
  setTimeout(() => {
    verificar().catch(console.error);
    setInterval(() => verificar().catch(console.error), INTERVALO_MS);
  }, 5 * 60 * 1000);

}
