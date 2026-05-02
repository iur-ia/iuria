import type { JurisprudenciaItem, ProcessoScrapeData, ScrapingResult, TribunalInfo } from "./types";
import { fetchJson, makeLogger, withRetry } from "./utils";

const TRF_INDICES: Record<string, string> = {
  TRF1: "api_publica_trf1",
  TRF2: "api_publica_trf2",
  TRF3: "api_publica_trf3",
  TRF4: "api_publica_trf4",
  TRF5: "api_publica_trf5",
  TRF6: "api_publica_trf6",
};

const DATAJUD_AUTH = "ApiKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TaEN1dW1xTVh5eGFKZw==";

interface DataJudHit {
  _source?: {
    numeroProcesso?: string;
    classe?: { descricao?: string };
    assuntos?: { descricao?: string }[];
    tribunal?: string;
    orgaoJulgador?: { nome?: string };
    partes?: { nome?: string; tipo?: string }[];
    movimentos?: {
      dataHora?: string;
      nome?: string;
      complementosTabelados?: { descricao?: string }[];
    }[];
    dataAjuizamento?: string;
    relator?: string;
  };
}

async function consultarDataJud(indice: string, body: string): Promise<{ hits?: { hits?: DataJudHit[] } }> {
  return fetchJson(`https://api.datajud.cnj.jus.br/${indice}/_search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": DATAJUD_AUTH,
    },
    body,
    timeoutMs: 20000,
  });
}

export async function buscarProcessoTrf(
  numero: string,
  tribunal: TribunalInfo
): Promise<ScrapingResult<ProcessoScrapeData | null>> {
  const t0 = Date.now();
  const { logs, log } = makeLogger();
  const sigla = tribunal.sigla;
  const indice = TRF_INDICES[sigla];

  if (!indice) {
    return {
      source: "trf",
      sourceLabel: sigla,
      data: null,
      markdownContent: "",
      durationMs: Date.now() - t0,
      logs,
      error: `Tribunal ${sigla} não suportado`,
    };
  }

  log("info", `Consultando ${sigla} via DataJud para ${numero}`);

  try {
    const body = JSON.stringify({
      query: { match: { numeroProcesso: numero } },
      size: 1,
    });

    const data = await withRetry(() => consultarDataJud(indice, body));
    const src = data?.hits?.hits?.[0]?._source;

    if (!src) {
      log("warn", `Processo ${numero} não encontrado no ${sigla}`);
      return {
        source: "trf",
        sourceLabel: sigla,
        data: null,
        markdownContent: "",
        durationMs: Date.now() - t0,
        logs,
        error: "Processo não encontrado",
      };
    }

    const processo: ProcessoScrapeData = {
      numero: src.numeroProcesso || numero,
      tribunal: sigla,
      classe: src.classe?.descricao || undefined,
      assunto: src.assuntos?.[0]?.descricao || undefined,
      vara: src.orgaoJulgador?.nome || undefined,
      partes: (src.partes || []).map(p => `${p.tipo || "Parte"}: ${p.nome || ""}`),
      movimentacoes: (src.movimentos || []).slice(0, 50).map(m => ({
        data: m.dataHora?.slice(0, 10) || "",
        descricao: m.nome || "",
        detalhes: m.complementosTabelados?.map(c => c.descricao).join("; ") || undefined,
      })),
      documentos: [],
      urlPortal: tribunal.urlPortal,
    };

    const md = [
      `# Processo ${sigla} — ${processo.numero}`,
      processo.classe ? `**Classe:** ${processo.classe}` : "",
      processo.assunto ? `**Assunto:** ${processo.assunto}` : "",
      processo.vara ? `**Órgão Julgador:** ${processo.vara}` : "",
      "",
      "## Partes",
      processo.partes.map(p => `- ${p}`).join("\n"),
      "",
      "## Movimentações",
      processo.movimentacoes.slice(0, 20).map(m =>
        `**${m.data}** — ${m.descricao}${m.detalhes ? ` (${m.detalhes})` : ""}`
      ).join("\n"),
    ].filter(l => l.trim()).join("\n");

    log("info", `Processo ${numero} encontrado no ${sigla}: ${processo.classe || ""}`);

    return {
      source: "trf",
      sourceLabel: `${sigla} — DataJud`,
      data: processo,
      markdownContent: md,
      durationMs: Date.now() - t0,
      logs,
    };
  } catch (err) {
    log("error", `Erro ao consultar ${sigla}: ${err}`);
    return {
      source: "trf",
      sourceLabel: sigla,
      data: null,
      markdownContent: "",
      durationMs: Date.now() - t0,
      logs,
      error: String(err),
    };
  }
}

export async function buscarJurisprudenciaTrf(
  q: string,
  tribunal: string
): Promise<ScrapingResult<JurisprudenciaItem[]>> {
  const t0 = Date.now();
  const { logs, log } = makeLogger();

  const sigla = tribunal.toUpperCase();
  const indice = TRF_INDICES[sigla];

  const items: JurisprudenciaItem[] = [];

  if (!indice) {
    const trfList = Object.keys(TRF_INDICES);
    const results = await Promise.allSettled(
      trfList.map(async (trf) => {
        const idx = TRF_INDICES[trf];
        const body = JSON.stringify({
          query: { multi_match: { query: q, fields: ["ementa", "assuntos.descricao", "classe.descricao"] } },
          size: 5,
          sort: [{ dataJulgamento: { order: "desc" } }],
        });
        const data = await withRetry(() => consultarDataJud(idx, body));
        return { trf, hits: data?.hits?.hits || [] };
      })
    );

    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const hit of r.value.hits) {
        const src = hit._source;
        if (!src) continue;
        items.push({
          tribunal: r.value.trf,
          numero: src.numeroProcesso || undefined,
          ementa: src.assuntos?.[0]?.descricao || src.classe?.descricao || "Processo",
          relator: src.relator || undefined,
        });
      }
    }

    log("info", `Busca em todos TRFs retornou ${items.length} resultado(s)`);
  } else {
    log("info", `Buscando jurisprudência ${sigla}: "${q}"`);

    try {
      const body = JSON.stringify({
        query: { multi_match: { query: q, fields: ["ementa", "assuntos.descricao", "classe.descricao"] } },
        size: 10,
        sort: [{ dataJulgamento: { order: "desc" } }],
      });

      const data = await withRetry(() => consultarDataJud(indice, body));

      for (const hit of data?.hits?.hits || []) {
        const src = hit._source;
        if (!src) continue;
        items.push({
          tribunal: sigla,
          numero: src.numeroProcesso || undefined,
          ementa: src.assuntos?.[0]?.descricao || src.classe?.descricao || "Processo",
          relator: src.relator || undefined,
        });
      }

      log("info", `DataJud ${sigla} retornou ${items.length} resultado(s)`);
    } catch (err) {
      log("error", `Erro DataJud ${sigla}: ${err}`);
    }
  }

  const md = items.length > 0
    ? [
        `# Jurisprudência ${sigla || "TRFs"} — "${q}"`,
        "",
        ...items.map((item, i) => [
          `## ${i + 1}. ${item.tribunal} — ${item.numero || "Processo"}`,
          item.relator ? `**Relator:** ${item.relator}` : "",
          "",
          item.ementa,
          "",
        ].filter(Boolean).join("\n")),
      ].join("\n")
    : `Nenhum resultado encontrado no(s) TRF(s) para "${q}".`;

  return {
    source: "trf",
    sourceLabel: `${sigla || "TRFs"} — DataJud`,
    data: items,
    markdownContent: md,
    durationMs: Date.now() - t0,
    logs,
  };
}
