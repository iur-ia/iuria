import type {
  ScrapingResult,
  ProcessoScrapeData,
  JurisprudenciaItem,
  DoutrinaItem,
  EmpresaData,
  ScrapingTelemetry,
} from "./types";
import { identificarTribunalCNJ, TRIBUNAIS } from "./types";
import { makeLogger } from "./utils";
import { queryDataJudShared, type DataJudHit as SharedDataJudHit } from "./datajudClient";
import { buscarProcessoEsaj } from "./esajScraper";
import { buscarProcessoStj, buscarJurisprudenciaStj } from "./stjScraper";
import { buscarJurisprudenciaStf, buscarProcessoStf } from "./stfScraper";
import { buscarProcessoTrf, buscarJurisprudenciaTrf } from "./trfScraper";
import { buscarCnpj } from "./cnpjScraper";
import { buscarDoutrina } from "./doutrinaScraper";

type DataJudHit = SharedDataJudHit;

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
  TRT1: "api_publica_trt1",
  TRT2: "api_publica_trt2",
  TRT3: "api_publica_trt3",
  TRT4: "api_publica_trt4",
  TRT5: "api_publica_trt5",
  TRT6: "api_publica_trt6",
  TRT7: "api_publica_trt7",
  TRT8: "api_publica_trt8",
  TRT9: "api_publica_trt9",
  TRT10: "api_publica_trt10",
  TRT11: "api_publica_trt11",
  TRT12: "api_publica_trt12",
  TRT13: "api_publica_trt13",
  TRT14: "api_publica_trt14",
  TRT15: "api_publica_trt15",
  TRT16: "api_publica_trt16",
  TRT17: "api_publica_trt17",
  TRT18: "api_publica_trt18",
  TRT19: "api_publica_trt19",
  TRT20: "api_publica_trt20",
  TRT21: "api_publica_trt21",
  TRT22: "api_publica_trt22",
  TRT23: "api_publica_trt23",
  TRT24: "api_publica_trt24",
  TJGO: "api_publica_tjgo",
  TJPR: "api_publica_tjpr",
  TJPI: "api_publica_tjpi",
  TJMT: "api_publica_tjmt",
  TJPA: "api_publica_tjpa",
  TJPB: "api_publica_tjpb",
};

function contarCamposProcesso(p: ProcessoScrapeData | null): number {
  if (!p) return 0;
  const campos = [p.classe, p.assunto, p.vara, p.relator, p.comarca, p.valorCausa, p.dataDistribuicao];
  return campos.filter(Boolean).length
    + Math.min(p.partes.length, 5)
    + Math.min(p.movimentacoes.length, 10)
    + Math.min((p.advogados || []).length, 3);
}

// ---------------------------------------------------------------------------
// DataJud hit parser — shared between live fetch and cache-hit paths
// ---------------------------------------------------------------------------

function _parseDataJudSource(
  src: DataJudHit["_source"] | undefined,
  numero: string,
  sigla: string
): ProcessoScrapeData | null {
  if (!src) return null;

  const partes: string[] = [];
  const advogados: string[] = [];
  for (const p of src.partes || []) {
    const polo = p.polo || p.tipo || "Parte";
    if (p.nome) partes.push(`${polo}: ${p.nome}`);
    for (const adv of p.advogados || []) {
      if (adv.nome) {
        const oabStr = adv.estadoOAB && adv.numeroOAB
          ? ` (OAB ${adv.estadoOAB} ${adv.numeroOAB})`
          : adv.numeroOAB ? ` (OAB ${adv.numeroOAB})` : "";
        advogados.push(`${adv.nome}${oabStr}`);
      }
    }
  }

  const valorCausa = src.valorCausa
    ? src.valorCausa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
    : undefined;

  return {
    numero: src.numeroProcesso || numero,
    tribunal: sigla,
    classe: src.classe?.nome || src.classe?.descricao || undefined,
    assunto: src.assuntos?.map(a => a.nome || a.descricao).filter(Boolean).join(" / ") || undefined,
    vara: src.orgaoJulgador?.nome || undefined,
    comarca: src.comarca || undefined,
    valorCausa,
    dataDistribuicao: src.dataAjuizamento?.slice(0, 10) || undefined,
    partes,
    advogados: advogados.length ? advogados : undefined,
    movimentacoes: (src.movimentos || []).slice(0, 50).map(m => ({
      data: m.dataHora?.slice(0, 10) || "",
      descricao: m.nome || "",
      detalhes: m.complementosTabelados?.map(c => c.nome || c.descricao).filter(Boolean).join("; ") || undefined,
    })),
    documentos: [],
  };
}

// ---------------------------------------------------------------------------
// DataJud orchestrator client — delegates to the shared polite client
// All pacing, cache, and auth-first logic lives in datajudClient.ts
// ---------------------------------------------------------------------------

async function buscarDataJudGenerico(
  numero: string,
  sigla: string,
  log: (l: "info" | "warn" | "error", m: string) => void
): Promise<ProcessoScrapeData | null> {
  const indice = TRIBUNAL_INDICE[sigla];
  if (!indice) return null;

  log("info", `DataJud genérico (cliente compartilhado): ${sigla} — ${numero}`);

  try {
    const body = JSON.stringify({ query: { match: { numeroProcesso: numero } }, size: 1 });
    const data = await queryDataJudShared(indice, body, log);

    const proc = _parseDataJudSource(data?.hits?.hits?.[0]?._source, numero, sigla);
    if (proc) {
      const campos = contarCamposProcesso(proc);
      log("info", `[telemetria] fonte=DataJud tribunal=${sigla} campos=${campos} movs=${proc.movimentacoes.length} partes=${proc.partes.length} advs=${(proc.advogados || []).length}`);
    }

    return proc;
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

  log("info", `Tribunal identificado: ${tribunal.sigla} (segmento ${tribunal.segmento})`);

  let processo: ProcessoScrapeData | null = null;
  let sourceLabel = `${tribunal.sigla} — DataJud`;
  // Track actual responder so ScrapingResult.source reflects the backend
  // that answered (DataJud/MNI/e-SAJ/portal), not just the planned route.
  let actualSource: import("./types").ScrapingSource = "datajud";

  if (tribunal.sigla === "STJ") {
    const r = await buscarProcessoStj(numero);
    logs.push(...r.logs);
    processo = r.data;
    sourceLabel = r.sourceLabel;
    actualSource = r.source;
  } else if (tribunal.sigla === "STF") {
    const r = await buscarProcessoStf(numero);
    logs.push(...r.logs);
    processo = r.data;
    sourceLabel = r.sourceLabel;
    actualSource = r.source;
  } else if (tribunal.sigla.startsWith("TRF")) {
    const r = await buscarProcessoTrf(numero, tribunal);
    logs.push(...r.logs);
    processo = r.data;
    sourceLabel = r.sourceLabel;
    actualSource = r.source;
  } else if (tribunal.usaEsaj) {
    const r = await buscarProcessoEsaj(numero, tribunal);
    logs.push(...r.logs);
    processo = r.data;
    sourceLabel = r.sourceLabel;
    actualSource = r.source;
  } else {
    processo = await buscarDataJudGenerico(numero, tribunal.sigla, log);
    sourceLabel = `${tribunal.sigla} — DataJud`;
    actualSource = "datajud";
  }

  const durationMs = Date.now() - t0;
  const camposPreenchidos = contarCamposProcesso(processo);

  const telemetry: ScrapingTelemetry = {
    fonte: sourceLabel,
    tribunal: tribunal.sigla,
    latenciaMs: durationMs,
    camposPreenchidos,
  };

  log("info",
    `[telemetria-final] fonte="${sourceLabel}" tribunal=${tribunal.sigla} ` +
    `latencia=${durationMs}ms campos=${camposPreenchidos} ` +
    `processoEncontrado=${!!processo}`
  );

  const md = processo
    ? [
        `# Processo ${tribunal.sigla} — ${processo.numero}`,
        `**Fonte:** ${sourceLabel}`,
        processo.classe ? `**Classe:** ${processo.classe}` : "",
        processo.assunto ? `**Assunto:** ${processo.assunto}` : "",
        processo.vara ? `**Vara/Órgão:** ${processo.vara}` : "",
        processo.relator ? `**Juiz/Relator:** ${processo.relator}` : "",
        processo.comarca ? `**Comarca:** ${processo.comarca}` : "",
        processo.valorCausa ? `**Valor da causa:** R$ ${processo.valorCausa}` : "",
        processo.dataDistribuicao ? `**Distribuição:** ${processo.dataDistribuicao}` : "",
        "",
        "## Partes",
        processo.partes.length > 0 ? processo.partes.map(p => `- ${p}`).join("\n") : "Não disponível",
        ...(processo.advogados && processo.advogados.length > 0
          ? ["", "## Advogados", ...processo.advogados.map(a => `- ${a}`)]
          : []),
        "",
        "## Últimas Movimentações",
        processo.movimentacoes.slice(0, 15).map(m =>
          `- **${m.data}** — ${m.descricao}${m.detalhes ? ` (${m.detalhes})` : ""}`
        ).join("\n"),
      ].filter(Boolean).join("\n")
    : "";

  return {
    // Use the source the sub-scraper actually resolved to (may differ from
    // planned route when a fallback occurs, e.g. e-SAJ → DataJud).
    source: actualSource,
    sourceLabel,
    data: processo,
    markdownContent: md,
    durationMs,
    logs,
    error: processo ? undefined : `Processo ${numero} não encontrado`,
    telemetry,
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
          fields: ["ementa", "assuntos.descricao", "assuntos.nome", "classe.descricao"],
        },
      },
      size: 10,
      sort: [{ dataJulgamento: { order: "desc" } }],
    });

    const data = await queryDataJudShared(indice, body, log);

    for (const hit of data?.hits?.hits || []) {
      const src = hit._source;
      if (!src) continue;
      const ementa = src.assuntos?.map(a => a.nome || a.descricao).filter(Boolean).join("; ")
        || src.classe?.nome || src.classe?.descricao
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
    const tribunalTrf = TRIBUNAIS[trib] ?? { sigla: trib, nome: trib, segmento: "federal" as const, urlPortal: "" };
    return buscarJurisprudenciaTrf(q, tribunalTrf);
  }
  if (trib === "TJSP" || trib.startsWith("TJ")) {
    return buscarJurisprudenciaTjEstadual(q, trib, t0, logs, log);
  }
  if (!trib || trib === "TODOS") {
    const [stf, stj, trf, tjsp] = await Promise.allSettled([
      buscarJurisprudenciaStf(q),
      buscarJurisprudenciaStj(q),
      buscarJurisprudenciaTrf(q, TRIBUNAIS["TRF1"] ?? { sigla: "TRF1", nome: "TRF1", segmento: "federal" as const, urlPortal: "" }),
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
