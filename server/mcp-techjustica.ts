/**
 * MCP Techjustica Client for Node.js
 * Integrates with MCP Techjustica remote server for all Brazilian courts.
 * 
 * Uses JSON-RPC 2.0 protocol over HTTP (MCP standard).
 * Supports 92+ tribunais: STF, STJ, TRFs, TJs, TRTs.
 * 
 * Configuration:
 *   - API Key: MCP_TECHJUSTICA_API_KEY env var or constructor param
 *   - Base URL: MCP_TECHJUSTICA_URL env var or default endpoint
 */

const MCP_API_KEY = process.env.MCP_TECJUSTICA_TOKEN || "Bearer mcp_33327fa443b949069f8e9f7baa442784";
const MCP_BASE_URL = process.env.MCP_TECJUSTICA_URL || "https://tecjusticamcp-lite-production.up.railway.app/mcp";

// All supported tribunais
const TRIBUNAIS_MCP = {
  // Superiores
  STF: { tool: "consultar_stf", nome: "Supremo Tribunal Federal" },
  STJ: { tool: "consultar_stj", nome: "Superior Tribunal de Justica" },
  TST: { tool: "consultar_tst", nome: "Tribunal Superior do Trabalho" },
  TSE: { tool: "consultar_tse", nome: "Tribunal Superior Eleitoral" },
  STM: { tool: "consultar_stm", nome: "Superior Tribunal Militar" },
  // TRFs
  ...Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map(i => [`TRF${i}`, { tool: `consultar_trf${i}`, nome: `TRF ${i}a Regiao` }])
  ),
  // TJs (by state)
  ...Object.fromEntries(
    ["AC", "AL", "AM", "AP", "BA", "CE", "DFT", "ES", "GO", "MA", "MG", "MS", "MT",
     "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"]
      .map(uf => [`TJ${uf}`, { tool: `consultar_tj${uf.toLowerCase()}`, nome: `TJ ${uf}` }])
  ),
  // Alias TJDFT
  TJDFT: { tool: "consultar_tjdft", nome: "TJ Distrito Federal e Territorios" },
  // TRTs (1-24)
  ...Object.fromEntries(
    Array.from({ length: 24 }, (_, i) => i + 1).map(i => [`TRT${i}`, { tool: `consultar_trt${i}`, nome: `TRT ${i}a Regiao` }])
  ),
};

interface MCPRPCRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: {
    name: string;
    arguments: Record<string, any>;
  };
}

interface MCPProcessoResult {
  numero: string;
  tribunal: string;
  classe?: string;
  assunto?: string;
  orgao_julgador?: string;
  relator?: string;
  data_ajuizamento?: string;
  valor_causa?: number;
  situacao?: string;
  partes: Array<Record<string, any>>;
  movimentacoes: Array<Record<string, any>>;
  documentos: Array<Record<string, any>>;
  url?: string;
  fonte: string;
  metodo: string;
  erro?: string;
}

interface MCPMetrics {
  total_requests: number;
  successful: number;
  failed: number;
  cached_hits: number;
  avg_response_ms: number;
}

class MCPTechjusticaClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;
  private requestId: number = 0;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL: number = 300000; // 5 minutes in ms
  private metrics: MCPMetrics = {
    total_requests: 0,
    successful: 0,
    failed: 0,
    cached_hits: 0,
    avg_response_ms: 0,
  };
  private totalResponseMs: number = 0;

  constructor(options?: {
    apiKey?: string;
    baseUrl?: string;
    timeout?: number;
    maxRetries?: number;
  }) {
    this.apiKey = options?.apiKey || MCP_API_KEY;
    this.baseUrl = options?.baseUrl || MCP_BASE_URL;
    this.timeout = options?.timeout || 30000;
    this.maxRetries = options?.maxRetries || 3;
  }

  private nextId(): number {
    return ++this.requestId;
  }

  private cacheKey(method: string, params: Record<string, any>): string {
    // Simple hash without crypto dependency for ESM compatibility
    const str = JSON.stringify({ method, params });
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `mcp_${Math.abs(hash).toString(36)}`;
  }

  private checkCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.cacheTTL) {
      this.metrics.cached_hits++;
      return entry.data;
    }
    if (entry) this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
    // Evict if too large
    if (this.cache.size > 500) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
  }

  /**
   * Execute JSON-RPC 2.0 call to MCP Techjustica server
   */
  private async rpcCall(
    toolName: string,
    params: Record<string, any>,
    useCache: boolean = true
  ): Promise<any> {
    // Check cache
    if (useCache) {
      const key = this.cacheKey(toolName, params);
      const cached = this.checkCache(key);
      if (cached !== null) return cached;
    }

    this.metrics.total_requests++;
    const start = Date.now();

    const rpcRequest: MCPRPCRequest = {
      jsonrpc: "2.0",
      id: this.nextId(),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: params,
      },
    };

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const url = this.baseUrl;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": this.apiKey.startsWith("Bearer ") ? this.apiKey : `Bearer ${this.apiKey}`,
            "User-Agent": "iuria-lexfutura/3.0 MCPClient/1.0",
            "Accept": "application/json",
          },
          body: JSON.stringify(rpcRequest),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        const elapsed = Date.now() - start;
        this.totalResponseMs += elapsed;

        if (response.ok) {
          const data = await response.json();
          const result = this.parseRpcResponse(data);
          this.metrics.successful++;
          this.metrics.avg_response_ms = this.totalResponseMs / this.metrics.successful;

          if (useCache) {
            this.setCache(this.cacheKey(toolName, params), result);
          }
          return result;
        }

        if (response.status === 401) {
          this.metrics.failed++;
          throw new Error("API key invalida ou expirada");
        }

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get("Retry-After") || "5");
          await new Promise(r => setTimeout(r, retryAfter * 1000));
          continue;
        }

        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);

      } catch (error: any) {
        if (error.name === "AbortError") {
          lastError = new Error(`Timeout after ${this.timeout}ms`);
        } else {
          lastError = error;
        }
        if (attempt < this.maxRetries) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
      }
    }

    this.metrics.failed++;
    throw lastError || new Error("Unknown error in MCP call");
  }

  private parseRpcResponse(data: any): any {
    if (data?.error) {
      throw new Error(`MCP RPC Error (${data.error.code}): ${data.error.message}`);
    }

    if (data?.result) {
      const result = data.result;
      if (result?.content && Array.isArray(result.content)) {
        const first = result.content[0];
        if (first?.type === "text") {
          try {
            return JSON.parse(first.text);
          } catch {
            return first.text;
          }
        }
        return first;
      }
      return result;
    }
    return data;
  }

  // ==================== PUBLIC API ====================

  /**
   * Consult a process in any Brazilian court
   */
  async consultarProcesso(
    tribunal: string,
    numeroProcesso: string,
    tipoBusca: string = "numero",
    incluirMovimentos: boolean = true,
    incluirDocumentos: boolean = false,
  ): Promise<MCPProcessoResult> {
    const tribunalUpper = tribunal.toUpperCase().trim();
    const toolInfo = TRIBUNAIS_MCP[tribunalUpper as keyof typeof TRIBUNAIS_MCP];
    const toolName = toolInfo?.tool || "consultar_processo";

    try {
      const data = await this.rpcCall(toolName, {
        tribunal: tribunalUpper,
        numero_processo: numeroProcesso,
        tipo_busca: tipoBusca,
        incluir_movimentos: incluirMovimentos,
        incluir_documentos: incluirDocumentos,
      });

      return this.parseProcessoResult(data, tribunalUpper, numeroProcesso);
    } catch (error: any) {
      return {
        numero: numeroProcesso,
        tribunal: tribunalUpper,
        partes: [],
        movimentacoes: [],
        documentos: [],
        fonte: "mcp_techjustica",
        metodo: "mcp",
        erro: error.message,
      };
    }
  }

  /**
   * Get case movements/progress
   */
  async consultarMovimentacoes(
    tribunal: string,
    numeroProcesso: string,
    limite: number = 50,
  ): Promise<Array<Record<string, any>>> {
    try {
      const data = await this.rpcCall("consultar_movimentacoes", {
        tribunal: tribunal.toUpperCase(),
        numero_processo: numeroProcesso,
        limite,
      });
      return data?.movimentacoes || (Array.isArray(data) ? data : []);
    } catch {
      return [];
    }
  }

  /**
   * Download a document/piece
   */
  async baixarDocumento(
    tribunal: string,
    numeroProcesso: string,
    idDocumento: string,
  ): Promise<Record<string, any> | null> {
    try {
      return await this.rpcCall("baixar_documento", {
        tribunal: tribunal.toUpperCase(),
        numero_processo: numeroProcesso,
        id_documento: idDocumento,
      }, false);
    } catch {
      return null;
    }
  }

  /**
   * Search by party name
   */
  async buscarPorParte(
    tribunal: string,
    nomeParte: string,
    limite: number = 20,
  ): Promise<MCPProcessoResult[]> {
    try {
      const data = await this.rpcCall("buscar_por_parte", {
        tribunal: tribunal.toUpperCase(),
        nome_parte: nomeParte,
        limite,
      });
      const processos = data?.processos || [];
      return processos.map((p: any) =>
        this.parseProcessoResult(p, tribunal, p.numero || "")
      );
    } catch {
      return [];
    }
  }

  /**
   * Search by OAB number
   */
  async buscarPorOAB(
    numeroOAB: string,
    estadoOAB: string,
    tribunal?: string,
  ): Promise<MCPProcessoResult[]> {
    try {
      const params: Record<string, any> = {
        numero_oab: numeroOAB,
        estado_oab: estadoOAB,
      };
      if (tribunal) params.tribunal = tribunal.toUpperCase();

      const data = await this.rpcCall("buscar_por_oab", params);
      const processos = data?.processos || [];
      return processos.map((p: any) =>
        this.parseProcessoResult(p, p.tribunal || tribunal || "", p.numero || "")
      );
    } catch {
      return [];
    }
  }

  /**
   * List all supported courts
   */
  async listarTribunais(): Promise<Record<string, any>> {
    try {
      return await this.rpcCall("listar_tribunais", {});
    } catch {
      return {
        total: Object.keys(TRIBUNAIS_MCP).length,
        tribunais: Object.fromEntries(
          Object.entries(TRIBUNAIS_MCP).map(([k, v]) => [k, v.nome])
        ),
      };
    }
  }

  /**
   * Health check
   */
  async verificarStatus(): Promise<{ status: string; data?: any; error?: string }> {
    try {
      const data = await this.rpcCall("verificar_status", {}, false);
      return { status: "online", data };
    } catch (error: any) {
      return { status: "offline", error: error.message };
    }
  }

  /**
   * Get client metrics
   */
  getMetrics(): MCPMetrics & { cache_size: number; tribunais_suportados: number } {
    return {
      ...this.metrics,
      cache_size: this.cache.size,
      tribunais_suportados: Object.keys(TRIBUNAIS_MCP).length,
    };
  }

  private parseProcessoResult(data: any, tribunal: string, numero: string): MCPProcessoResult {
    if (!data || typeof data !== "object") {
      return {
        numero, tribunal,
        partes: [], movimentacoes: [], documentos: [],
        fonte: "mcp_techjustica", metodo: "mcp",
      };
    }
    return {
      numero: data.numero || numero,
      tribunal: data.tribunal || tribunal,
      classe: data.classe,
      assunto: data.assunto,
      orgao_julgador: data.orgao_julgador,
      relator: data.relator,
      data_ajuizamento: data.data_ajuizamento,
      valor_causa: data.valor_causa,
      situacao: data.situacao,
      partes: data.partes || [],
      movimentacoes: data.movimentacoes || [],
      documentos: data.documentos || [],
      url: data.url,
      fonte: "mcp_techjustica",
      metodo: "mcp",
    };
  }
}

// Singleton
let _mcpClient: MCPTechjusticaClient | null = null;

function getMCPClient(options?: { apiKey?: string; baseUrl?: string }): MCPTechjusticaClient {
  if (!_mcpClient) {
    _mcpClient = new MCPTechjusticaClient(options);
  }
  return _mcpClient;
}

export { MCPTechjusticaClient, getMCPClient, TRIBUNAIS_MCP, MCP_API_KEY, MCP_BASE_URL };
export type { MCPProcessoResult, MCPMetrics };
