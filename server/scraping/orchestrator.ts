import type {
  ScrapingResult,
  ProcessoScrapeData,
  JurisprudenciaItem,
  DoutrinaItem,
  EmpresaData,
} from "./types";
import { identificarTribunalCNJ, TRIBUNAIS, DATAJUD_AUTH } from "./types";
import { makeLogger, fetchJson, withRetry } from "./utils";
import { buscarProcessoEsaj } from "./esajScraper";
import { buscarProcessoStj, buscarJurisprudenciaStj } from "./stjScraper";
import { buscarJurisprudenciaStf } from "./stfScraper";
import { buscarProcessoTrf, buscarJurisprudenciaTrf } from "./trfScraper";
import { buscarCnpj } from "./cnpjScraper";
import { buscarDoutrina } from "./doutrinaScraper";

interface DataJudHit {
  _source?: {
    numeroProcesso?: string;
    classe?: { descricao?: string };
    assuntos?: { descricao?: string }[];
    tribunal?: string;
    orgaoJulgador?: { nome?: string };
    partes?: { nome?: string; tipo?: string }[];
    movimentos?: { dataHora?: string; nome?: string; complementosTabelados?: { descricao?: string }[] }[];
    dataAjuizamento?: string;
    relator?: string;
  };
}

const TRIBUNAL_INDICE: Record<string, string> = {
  TJSP: "api_publica_tjsp",
  TJRJ: "api_publica_tjrj",
  TJMG: "api_publica_tjmg",
  TJRS: "api_publica_tjrs",
  TJBA: "api_publica_tjba",
  TJSC: "api_publica_tjsc",
  TJCE: "api_publica_tjce",
  TJPE: "api_publica_tjpe",
  TJMA: "api_publica_tjma",
  TJMS: "api_publica_tjms",
  TJAL: "api_publica_tjal",
  TJRN: "api_publica_tjrn",
  TRF1: "api_publica_trf1",
  TRF2: "api_publica_trf2",
  TRF3: "api_publica_trf3",
  TRF4: "api_publica_trf4",
  TRF5: "api_publica_trf5",
  TRF6: "api_publica_trf6",
  STJ: "api_publica_stj",
  STF: "api_publica_stf",
};

async function buscarDataJudGenerico(
  numero: string,
  sigla: string,
  log: (l: "info" | "warn" | "error", m: string) => void
): Promise<ProcessoScrapeData | null> {
  const indice = TRIBUNAL_INDICE[sigla];
  if (!indice) return null;

  log("info", `DataJud genérico: ${sigla} — ${numero}`);

  try {
    const body = JSON.stringify({ query: { match: { numeroProcesso: numero } }, size: 1 });
    const data = await withRetry(() =>
      fetchJson<{ hits?: { hits?: DataJudHit[] } }>(
        `https://api.datajud.cnj.jus.br/${indice}/_search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": DATAJUD_AUTH },
          body,
          timeoutMs: 18000,
        }
      )
    );

    const src = data?.hits?.hits?.[0]?._source;
    if (!src) return null;

    return {
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
    };
  } catch (err) {
    log("warn", `DataJud ${sigla} falhou: ${err}`);
    return null;
  }
}

export async function pesquisarProcesso(numero: string): Promise<ScrapingResult<ProcessoScrapeData | null>> {
  const t0 = Date.now();
  const { logs, log } = makeLogger();

  log("info", `Orquestrador: pesquisar processo ${numero}`);

  const tribunal = identificarTribunalCNJ(numero);
  if (!tribunal) {
    log("warn", `Número CNJ não reconhecido: ${numero}`);
    return {
      source: "datajud",
      sourceLabel: "DataJud CNJ",
      data: null,
      markdownContent: "",
      durationMs: Date.now() - t0,
      logs,
      error: `Formato de número CNJ inválido ou tribunal não identificado: ${numero}`,
    };
  }

  log("info", `Tribunal identificado: ${tribunal.sigla} (segmento ${tribunal.segmento}, TR ${tribunal.codigoTR})`);

  let processo: ProcessoScrapeData | null = null;
  let sourceLabel = `${tribunal.sigla} — DataJud`;

  if (tribunal.sigla === "STJ") {
    const r = await buscarProcessoStj(numero);
    logs.push(...r.logs);
    processo = r.data;
    sourceLabel = r.sourceLabel;
  } else if (tribunal.sigla === "STF") {
    processo = await buscarDataJudGenerico(numero, "STF", log);
    sourceLabel = "STF — DataJud";
  } else if (tribunal.sigla.startsWith("TRF")) {
    const r = await buscarProcessoTrf(numero, tribunal);
    logs.push(...r.logs);
    processo = r.data;
    sourceLabel = r.sourceLabel;
  } else if (tribunal.usaEsaj) {
    const r = await buscarProcessoEsaj(numero, tribunal);
    logs.push(...r.logs);
    processo = r.data;
    sourceLabel = r.sourceLabel;
  } else {
    processo = await buscarDataJudGenerico(numero, tribunal.sigla, log);
    sourceLabel = `${tribunal.sigla} — DataJud`;
  }

  const md = processo
    ? [
        `# Processo ${tribunal.sigla} — ${processo.numero}`,
        `**Fonte:** ${sourceLabel}`,
        processo.classe ? `**Classe:** ${processo.classe}` : "",
        processo.assunto ? `**Assunto:** ${processo.assunto}` : "",
        processo.vara ? `**Vara/Órgão:** ${processo.vara}` : "",
        "",
        "## Partes",
        processo.partes.length > 0 ? processo.partes.map(p => `- ${p}`).join("\n") : "Não disponível",
        "",
        "## Últimas Movimentações",
        processo.movimentacoes.slice(0, 15).map(m =>
          `- **${m.data}** — ${m.descricao}${m.detalhes ? ` (${m.detalhes})` : ""}`
        ).join("\n"),
      ].filter(Boolean).join("\n")
    : "";

  return {
    source: tribunal.sigla.startsWith("TRF") ? "trf" : tribunal.usaEsaj ? "esaj" : tribunal.sigla === "STJ" ? "stj" : tribunal.sigla === "STF" ? "stf" : "datajud",
    sourceLabel,
    data: processo,
    markdownContent: md,
    durationMs: Date.now() - t0,
    logs,
    error: processo ? undefined : `Processo ${numero} não encontrado`,
  };
}

const TJ_DATAJUD_INDICE: Record<string, string> = {
  TJSP: "api_publica_tjsp",
  TJBA: "api_publica_tjba",
  TJSC: "api_publica_tjsc",
  TJCE: "api_publica_tjce",
  TJPE: "api_publica_tjpe",
  TJMA: "api_publica_tjma",
  TJMS: "api_publica_tjms",
  TJAL: "api_publica_tjal",
  TJRN: "api_publica_tjrn",
  TJRS: "api_publica_tjrs",
  TJMG: "api_publica_tjmg",
  TJRJ: "api_publica_tjrj",
  TJGO: "api_publica_tjgo",
  TJPR: "api_publica_tjpr",
};

async function buscarJurisprudenciaTjEstadual(
  q: string,
  sigla: string,
  t0: number,
  logsIn: import("./types").ScrapingLog[],
  logFn: (l: "info" | "warn" | "error", m: string) => void
): Promise<ScrapingResult<JurisprudenciaItem[]>> {
  const { logs, log } = makeLogger();
  const allLogs = [...logsIn];

  const indice = TJ_DATAJUD_INDICE[sigla] || "api_publica_tjsp";
  log("info", `Buscando jurisprudência ${sigla} via DataJud (${indice}): "${q}"`);

  const items: JurisprudenciaItem[] = [];

  try {
    const body = JSON.stringify({
      query: {
        multi_match: {
          query: q,
          fields: ["ementa", "assuntos.descricao", "classe.descricao"],
        },
      },
      size: 10,
      sort: [{ dataJulgamento: { order: "desc" } }],
    });

    const data = await withRetry(() =>
      fetchJson<{ hits?: { hits?: DataJudHit[] } }>(
        `https://api.datajud.cnj.jus.br/${indice}/_search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": DATAJUD_AUTH },
          body,
          timeoutMs: 15000,
        }
      )
    );

    for (const hit of data?.hits?.hits || []) {
      const src = hit._source;
      if (!src) continue;
      const ementa = src.assuntos?.map(a => a.descricao).join("; ")
        || src.classe?.descricao
        || "Processo " + sigla;
      items.push({
        tribunal: sigla,
        numero: src.numeroProcesso || undefined,
        ementa,
        relator: src.relator || undefined,
        data: src.dataAjuizamento?.slice(0, 10) || undefined,
        link: src.numeroProcesso
          ? `https://www.${sigla.toLowerCase()}.jus.br/processo?numero=${encodeURIComponent(src.numeroProcesso)}`
          : undefined,
      });
    }

    log("info", `${sigla} DataJud retornou ${items.length} resultado(s)`);
  } catch (err) {
    log("error", `${sigla} DataJud falhou: ${err}`);
    logFn("warn", `${sigla}: falha na busca de jurisprudência`);
  }

  const md = items.length > 0
    ? [
        `# Jurisprudência ${sigla} — "${q}"`,
        "",
        ...items.map((item, i) => [
          `## ${i + 1}. ${item.numero || sigla}`,
          item.relator ? `**Relator:** ${item.relator}` : "",
          item.data ? `**Data:** ${item.data}` : "",
          "",
          item.ementa,
          item.link ? `[Ver processo](${item.link})` : "",
          "",
        ].filter(Boolean).join("\n")),
      ].join("\n")
    : `Nenhum resultado no ${sigla} para "${q}".`;

  return {
    source: "datajud",
    sourceLabel: `${sigla} — DataJud`,
    data: items,
    markdownContent: md,
    durationMs: Date.now() - t0,
    logs: [...allLogs, ...logs],
  };
}

export async function pesquisarJurisprudencia(
  q: string,
  tribunal: string
): Promise<ScrapingResult<JurisprudenciaItem[]>> {
  const t0 = Date.now();
  const { logs, log } = makeLogger();
  const trib = tribunal.toUpperCase().trim();

  log("info", `Pesquisar jurisprudência: "${q}" tribunal="${trib}"`);

  if (trib === "STF") {
    return buscarJurisprudenciaStf(q);
  }
  if (trib === "STJ") {
    return buscarJurisprudenciaStj(q);
  }
  if (trib.startsWith("TRF")) {
    return buscarJurisprudenciaTrf(q, trib);
  }
  if (trib === "TJSP" || trib.startsWith("TJ")) {
    return buscarJurisprudenciaTjEstadual(q, trib, t0, logs, log);
  }
  if (!trib || trib === "TODOS") {
    const [stf, stj, trf, tjsp] = await Promise.allSettled([
      buscarJurisprudenciaStf(q),
      buscarJurisprudenciaStj(q),
      buscarJurisprudenciaTrf(q, ""),
      buscarJurisprudenciaTjEstadual(q, "TJSP", Date.now(), [], () => {}),
    ]);

    const allItems: JurisprudenciaItem[] = [
      ...(stf.status === "fulfilled" ? stf.value.data : []),
      ...(stj.status === "fulfilled" ? stj.value.data : []),
      ...(trf.status === "fulfilled" ? trf.value.data : []),
      ...(tjsp.status === "fulfilled" ? tjsp.value.data : []),
    ];

    const md = allItems.length > 0
      ? [
          `# Jurisprudência — "${q}" (Todos os Tribunais)`,
          "",
          ...allItems.map((item, i) => [
            `## ${i + 1}. ${item.tribunal} — ${item.numero || "Acórdão"}`,
            item.relator ? `**Relator:** ${item.relator}` : "",
            item.data ? `**Data:** ${item.data}` : "",
            "",
            item.ementa,
            item.link ? `[Ver íntegra](${item.link})` : "",
            "",
          ].filter(Boolean).join("\n")),
        ].join("\n")
      : `Nenhum resultado para "${q}".`;

    return {
      source: "datajud",
      sourceLabel: "STF / STJ / TRFs / TJSP — Múltiplas Fontes",
      data: allItems,
      markdownContent: md,
      durationMs: Date.now() - t0,
      logs: [
        ...(stf.status === "fulfilled" ? stf.value.logs : []),
        ...(stj.status === "fulfilled" ? stj.value.logs : []),
        ...(trf.status === "fulfilled" ? trf.value.logs : []),
        ...(tjsp.status === "fulfilled" ? tjsp.value.logs : []),
      ],
    };
  }

  log("warn", `Tribunal "${trib}" não suportado para jurisprudência`);
  return {
    source: "datajud",
    sourceLabel: trib,
    data: [],
    markdownContent: `Tribunal "${trib}" não suportado.`,
    durationMs: Date.now() - t0,
    logs,
  };
}

export { buscarDoutrina as pesquisarDoutrina };
export { buscarCnpj as pesquisarCnpj };
