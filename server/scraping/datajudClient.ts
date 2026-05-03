/**
 * Shared DataJud HTTP client — pacing, cache, auth-first strategy.
 *
 * ALL DataJud requests across every scraper must go through
 * `queryDataJudShared()` so that the politeness controls (rate-limit
 * serialisation, TTL cache, and Bearer-token auth-first) are applied
 * consistently process-wide rather than per-module.
 */

import { fetchJson } from "./utils";
import { DATAJUD_AUTH, DATAJUD_AUTH_TOKEN } from "./types";

// ---------------------------------------------------------------------------
// Types — exported so scrapers need not redeclare them
// ---------------------------------------------------------------------------

export interface DataJudHit {
  _source?: {
    numeroProcesso?: string;
    classe?: { descricao?: string; nome?: string };
    assuntos?: { descricao?: string; nome?: string }[];
    orgaoJulgador?: { nome?: string; descricao?: string };
    partes?: {
      nome?: string;
      tipo?: string;
      polo?: string;
      advogados?: { nome?: string; numeroOAB?: string; estadoOAB?: string }[];
    }[];
    movimentos?: {
      dataHora?: string;
      nome?: string;
      complementosTabelados?: { descricao?: string; nome?: string }[];
    }[];
    dataAjuizamento?: string;
    dataJulgamento?: string;
    relator?: string;
    valorCausa?: number;
    comarca?: string;
    tribunal?: string;
  };
}

export type DataJudResponse = { hits?: { hits?: DataJudHit[] } };

// ---------------------------------------------------------------------------
// Politeness controls — shared state (single instance per Node.js process)
// ---------------------------------------------------------------------------

const DATAJUD_MIN_INTERVAL_MS = Number(process.env.DATAJUD_MIN_INTERVAL_MS ?? 1000);
const DATAJUD_CACHE_TTL_MS = Number(process.env.DATAJUD_CACHE_TTL_MS ?? 300_000);

const _djCache = new Map<string, { ts: number; data: DataJudResponse | null }>();
let _djLastRequestTs = 0;

/**
 * Serialising promise chain.  Every caller appends to the tail so that
 * DataJud requests are strictly sequential — eliminating the race where two
 * concurrent callers both see elapsed > MIN and fire simultaneously.
 */
let _djQueue: Promise<void> = Promise.resolve();

function _djPace(): Promise<void> {
  const prev = _djQueue;
  let release!: () => void;
  _djQueue = new Promise<void>(res => { release = res; });

  const paced = prev.then(async () => {
    const elapsed = Date.now() - _djLastRequestTs;
    if (elapsed < DATAJUD_MIN_INTERVAL_MS) {
      await new Promise<void>(r => setTimeout(r, DATAJUD_MIN_INTERVAL_MS - elapsed));
    }
    _djLastRequestTs = Date.now();
    release();
  });

  return paced;
}

async function _djFetch(
  url: string,
  auth: string,
  body: string,
  log: (l: "info" | "warn" | "error", m: string) => void
): Promise<DataJudResponse> {
  const maxAttempts = 4;
  let delayMs = 2000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await _djPace();
    try {
      return await fetchJson<DataJudResponse>(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: auth,
          "User-Agent": "SistemaGestaoJuridica/2.0 (+https://lexos.app; contato@lexos.app)",
        },
        body,
        timeoutMs: 18000,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const is429 = msg.includes("429");
      const is503 = msg.includes("503");
      if ((is429 || is503) && attempt < maxAttempts) {
        log("warn", `DataJud ${is429 ? "429 rate-limit" : "503 sobrecarga"} — aguardando ${delayMs}ms (tentativa ${attempt}/${maxAttempts})`);
        await new Promise<void>(r => setTimeout(r, delayMs));
        delayMs *= 2;
        continue;
      }
      throw err;
    }
  }
  throw new Error("DataJud: máximo de tentativas atingido");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Query a DataJud index with:
 *   1. TTL cache check (no duplicate requests within 5 min)
 *   2. Polite pacing (min 1 s between requests, serialised queue)
 *   3. Auth-first strategy: Bearer token (api.cnj.jus.br) → APIKey public fallback
 *
 * Returns raw DataJud JSON or null on failure.
 *
 * Every scraper (eSAJ, STF, TRF, orchestrator) MUST route DataJud calls
 * through this function to guarantee consistent politeness process-wide.
 */
export async function queryDataJudShared(
  indice: string,
  body: string,
  log: (l: "info" | "warn" | "error", m: string) => void
): Promise<DataJudResponse | null> {
  const cacheKey = `${indice}::${body}`;
  const cached = _djCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < DATAJUD_CACHE_TTL_MS) {
    log("info", `DataJud cache hit para ${indice}`);
    return cached.data;
  }

  let data: DataJudResponse | null = null;

  // Authenticated endpoint first (api.cnj.jus.br + Bearer)
  if (DATAJUD_AUTH_TOKEN) {
    try {
      const authResult = await _djFetch(
        `https://api.cnj.jus.br/${indice}/_search`,
        DATAJUD_AUTH_TOKEN as string,
        body,
        log
      );
      if (authResult?.hits?.hits?.length) {
        log("info", `DataJud ${indice}: resposta via endpoint autenticado (api.cnj.jus.br)`);
        data = authResult;
      }
    } catch (authErr) {
      log("warn", `DataJud endpoint autenticado falhou (${authErr}); usando público`);
    }
  }

  // Public endpoint (APIKey) — always available as fallback
  // Canonical public host: api-publica.datajud.cnj.jus.br
  if (!data) {
    try {
      data = await _djFetch(
        `https://api-publica.datajud.cnj.jus.br/${indice}/_search`,
        DATAJUD_AUTH,
        body,
        log
      );
    } catch (publicErr) {
      log("error", `DataJud público falhou: ${publicErr}`);
      data = null;
    }
  }

  _djCache.set(cacheKey, { ts: Date.now(), data });
  return data;
}
