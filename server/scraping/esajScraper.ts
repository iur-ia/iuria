import * as cheerio from "cheerio";
import type { ProcessoScrapeData, ScrapingResult, TribunalInfo } from "./types";
import { DATAJUD_AUTH } from "./types";
import { fetchUrl, fetchJson, makeLogger, withRetry, randomDelay } from "./utils";

const ESAJ_INDICE: Record<string, string> = {
  TJSP: "api_publica_tjsp",
  TJBA: "api_publica_tjba",
  TJSC: "api_publica_tjsc",
  TJCE: "api_publica_tjce",
  TJPE: "api_publica_tjpe",
  TJMA: "api_publica_tjma",
  TJMS: "api_publica_tjms",
  TJAL: "api_publica_tjal",
  TJRN: "api_publica_tjrn",
};

interface DataJudHit {
  _source?: {
    numeroProcesso?: string;
    classe?: { descricao?: string };
    assuntos?: { descricao?: string }[];
    orgaoJulgador?: { nome?: string };
    partes?: { nome?: string; tipo?: string }[];
    movimentos?: { dataHora?: string; nome?: string; complementosTabelados?: { descricao?: string }[] }[];
    dataAjuizamento?: string;
    relator?: string;
  };
}

async function buscarViaDataJud(
  numero: string,
  sigla: string,
  log: (l: "info" | "warn" | "error", m: string) => void
): Promise<ProcessoScrapeData | null> {
  const indice = ESAJ_INDICE[sigla];
  if (!indice) return null;

  log("info", `Consultando DataJud ${sigla} para ${numero}`);

  const body = JSON.stringify({
    query: { match: { numeroProcesso: numero } },
    size: 1,
  });

  try {
    const data = await withRetry(() =>
      fetchJson<{ hits?: { hits?: DataJudHit[] } }>(
        `https://api.datajud.cnj.jus.br/${indice}/_search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": DATAJUD_AUTH,
          },
          body,
          timeoutMs: 15000,
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

async function buscarViaEsajPortal(
  numero: string,
  tribunal: TribunalInfo,
  log: (l: "info" | "warn" | "error", m: string) => void
): Promise<ProcessoScrapeData | null> {
  if (!tribunal.urlConsulta || !process.env.SCRAPER_API_KEY) return null;

  log("info", `Scraping e-SAJ ${tribunal.sigla} via ScraperAPI: ${tribunal.urlConsulta}`);

  try {
    const formUrl = `${tribunal.urlConsulta}?processo.codigo=&processo.foro=&processo.numero=${encodeURIComponent(numero)}&uuidCaptcha=`;
    await randomDelay(1000, 2500);

    const html = await withRetry(() =>
      fetchUrl(formUrl, {
        useScraperApi: true,
        timeoutMs: 30000,
      })
    );

    const $ = cheerio.load(html);

    const partes: string[] = [];
    $(".unj-tag__actor, .nomeParteEAdvogado, .nomeParte, td.direita").each((_, el) => {
      const t = $(el).text().trim();
      if (t && t.length > 2) partes.push(t);
    });

    const movimentacoes: ProcessoScrapeData["movimentacoes"] = [];
    $("tbody tr, .movimentacaoProcesso tr").each((_, el) => {
      const cells = $(el).find("td");
      if (cells.length >= 2) {
        const data = $(cells[0]).text().trim();
        const descricao = $(cells[cells.length - 1]).text().trim();
        if (data.match(/\d{2}\/\d{2}\/\d{4}/) && descricao) {
          movimentacoes.push({ data, descricao });
        }
      }
    });

    const classe = $("span#classeProcesso, .classeProcesso, span[id*='classe']").first().text().trim();
    const assunto = $("span#assuntoProcesso, .assuntoProcesso, span[id*='assunto']").first().text().trim();
    const vara = $("span#varaProcesso, .varaProcesso, span[id*='vara'], span[id*='orgao']").first().text().trim();

    if (!movimentacoes.length && !partes.length) {
      log("warn", `e-SAJ ${tribunal.sigla}: HTML não continha dados de processo reconhecíveis`);
      return null;
    }

    log("info", `e-SAJ ${tribunal.sigla}: ${movimentacoes.length} movimentações, ${partes.length} partes`);

    return {
      numero,
      tribunal: tribunal.sigla,
      classe: classe || undefined,
      assunto: assunto || undefined,
      vara: vara || undefined,
      partes: Array.from(new Set(partes)).slice(0, 10),
      movimentacoes,
      documentos: [],
      urlPortal: tribunal.urlConsulta,
    };
  } catch (err) {
    log("warn", `Scraping e-SAJ ${tribunal.sigla} falhou: ${err}`);
    return null;
  }
}

export async function buscarProcessoEsaj(
  numero: string,
  tribunal: TribunalInfo
): Promise<ScrapingResult<ProcessoScrapeData | null>> {
  const t0 = Date.now();
  const { logs, log } = makeLogger();
  const sigla = tribunal.sigla;

  log("info", `Iniciando busca e-SAJ ${sigla}: ${numero}`);

  let processo: ProcessoScrapeData | null = null;
  let sourceLabel = `${sigla} — DataJud`;

  processo = await buscarViaDataJud(numero, sigla, log);

  if (!processo) {
    log("info", `DataJud não encontrou — tentando portal e-SAJ`);
    processo = await buscarViaEsajPortal(numero, tribunal, log);
    if (processo) sourceLabel = `${sigla} — Portal e-SAJ (ScraperAPI)`;
  }

  let md = "";
  if (processo) {
    md = [
      `# Processo ${sigla} — ${processo.numero}`,
      processo.classe ? `**Classe:** ${processo.classe}` : "",
      processo.assunto ? `**Assunto:** ${processo.assunto}` : "",
      processo.vara ? `**Vara/Órgão:** ${processo.vara}` : "",
      "",
      "## Partes",
      processo.partes.length > 0 ? processo.partes.map(p => `- ${p}`).join("\n") : "Não disponível",
      "",
      "## Movimentações",
      processo.movimentacoes.length > 0
        ? processo.movimentacoes.slice(0, 20).map(m =>
            `**${m.data}** — ${m.descricao}${m.detalhes ? ` (${m.detalhes})` : ""}`
          ).join("\n")
        : "Sem movimentações disponíveis",
    ].filter(l => l !== null && l !== undefined).join("\n");
  }

  return {
    source: "esaj",
    sourceLabel,
    data: processo,
    markdownContent: md,
    durationMs: Date.now() - t0,
    logs,
    error: processo ? undefined : `Processo ${numero} não encontrado no ${sigla}`,
  };
}
