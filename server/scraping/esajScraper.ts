import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { ProcessoScrapeData, ScrapingResult, ScrapingSource, TribunalInfo } from "./types";
import { makeLogger, randomDelay } from "./utils";
import { CrawlerManager } from "./crawlerManager";
import { queryDataJudShared, type DataJudHit } from "./datajudClient";

/** Tribunais que usam Cloudflare — rebrowser-playwright é mais eficaz */
const CLOUDFLARE_TRIBUNAIS = new Set(["TJSP", "TJBA", "TJCE"]);

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

/**
 * Busca processo no DataJud via cliente compartilhado (pacing, cache, auth-first).
 * Returns the processo and the actual source label for attribution.
 */
async function buscarViaDataJud(
  numero: string,
  sigla: string,
  log: (l: "info" | "warn" | "error", m: string) => void
): Promise<ProcessoScrapeData | null> {
  const indice = ESAJ_INDICE[sigla];
  if (!indice) return null;

  log("info", `Consultando DataJud ${sigla} para ${numero} (cliente compartilhado)`);

  const body = JSON.stringify({ query: { match: { numeroProcesso: numero } }, size: 1 });

  try {
    const data = await queryDataJudShared(indice, body, log);
    const src: DataJudHit["_source"] = data?.hits?.hits?.[0]?._source;
    if (!src) return null;

    const partes: string[] = [];
    const advogados: string[] = [];
    for (const p of src.partes || []) {
      const polo = p.polo || p.tipo || "Parte";
      if (p.nome) partes.push(`${polo}: ${p.nome}`);
      for (const adv of p.advogados || []) {
        if (adv.nome) {
          const oab = adv.numeroOAB && adv.estadoOAB
            ? ` (OAB ${adv.estadoOAB} ${adv.numeroOAB})`
            : adv.numeroOAB ? ` (OAB ${adv.numeroOAB})` : "";
          advogados.push(`${adv.nome}${oab}`);
        }
      }
    }

    const valorCausa = src.valorCausa
      ? src.valorCausa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
      : undefined;

    const proc: ProcessoScrapeData = {
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

    const camposPreenchidos = [
      proc.classe, proc.assunto, proc.vara, proc.comarca, proc.valorCausa, proc.dataDistribuicao
    ].filter(Boolean).length + Math.min(partes.length, 5) + Math.min(proc.movimentacoes.length, 10);

    log("info", `[telemetria] fonte=DataJud tribunal=${sigla} campos=${camposPreenchidos} movs=${proc.movimentacoes.length} partes=${partes.length} advs=${advogados.length}`);

    return proc;
  } catch (err) {
    log("warn", `DataJud ${sigla} falhou: ${err}`);
    return null;
  }
}

/**
 * Scraping direto do portal e-SAJ via Crawlee CheerioCrawler.
 * Campos expandidos: classe, assunto, valor da causa, comarca, vara, juiz,
 * distribuição, partes (polo), advogados (OAB), movimentações completas.
 */
async function buscarViaEsajPortal(
  numero: string,
  tribunal: TribunalInfo,
  log: (l: "info" | "warn" | "error", m: string) => void
): Promise<ProcessoScrapeData | null> {
  if (!tribunal.urlConsulta) return null;

  log("info", `Crawlee: scraping e-SAJ ${tribunal.sigla}: ${tribunal.urlConsulta}`);

  try {
    const formUrl = `${tribunal.urlConsulta}?processo.codigo=&processo.foro=&processo.numero=${encodeURIComponent(numero)}&uuidCaptcha=`;
    await randomDelay(1000, 2500);

    let html: string;
    let $: ReturnType<typeof cheerio.load>;

    if (CLOUDFLARE_TRIBUNAIS.has(tribunal.sigla)) {
      // Cloudflare portais: rebrowser-playwright para bypass anti-bot
      log("info", `${tribunal.sigla} usa Cloudflare — rebrowserCrawler`);
      const { html: rbHtml, usedRebrowser } = await import("./rebrowserCrawler").then(m =>
        m.crawlUrlWithRebrowser(formUrl, {
          timeoutMs: 35000,
          waitForSelector: ".nomeParteEAdvogado, .fundoClaro, .containerMovimentacao",
          engine: "firefox",
        })
      );
      log("info", `e-SAJ ${tribunal.sigla}: ${usedRebrowser ? "rebrowser" : "Playwright/Cheerio"} — ${rbHtml.length} chars`);
      html = rbHtml;
      $ = cheerio.load(rbHtml);
    } else {
      const scraperKey = process.env.SCRAPER_API_KEY;
      const proxyUrl = scraperKey
        ? `http://scraperapi:${scraperKey}@proxy-server.scraperapi.com:8001`
        : undefined;

      const result = await CrawlerManager.fetch(formUrl, {
        maxRequestsPerMinute: 60,
        maxConcurrency: 1,
        timeoutSecs: 35,
        maxRetries: 2,
        proxyUrl,
      });
      html = result.html;
      $ = cheerio.load(result.html);
    }

    // Partes com polo
    const partesMap = new Map<string, string>();
    $(".nomeParteEAdvogado, .nomeParte, td.direita").each((_: number, el: AnyNode) => {
      const t = $(el).text().trim();
      if (t && t.length > 2) partesMap.set(t, t);
    });

    // Partes com polo explícito (tabela fundoClaro/fundoEscuro = eSAJ)
    $(".fundoClaro, .fundoEscuro").each((_: number, el: AnyNode) => {
      const cells = $(el).find("td");
      if (cells.length >= 2) {
        const polo = $(cells[0]).text().trim();
        const nome = $(cells[1]).text().trim();
        if (nome && nome.length > 2) {
          const key = polo ? `${polo}: ${nome}` : nome;
          partesMap.set(key, key);
        }
      }
    });

    // Advogados com OAB
    const advogados: string[] = [];
    $(".advogadoNome, .nomeAdvogado").each((_: number, el: AnyNode) => {
      const t = $(el).text().trim();
      if (t && t.length > 2) advogados.push(t);
    });
    // Tentar extrair OAB do texto
    const htmlText = $.root().text();
    const oabRegex = /([A-ZÁÉÍÓÚÂÊÎÔÛÀÃÕÇÜ][^\n]{5,60})\s+OAB\s*([A-Z]{2}[\s\d/]+)/gi;
    let oabM;
    while ((oabM = oabRegex.exec(htmlText)) !== null && advogados.length < 10) {
      const nome = oabM[1].trim();
      const oab = oabM[2].trim();
      const entrada = `${nome} (OAB ${oab})`;
      if (!advogados.includes(entrada)) advogados.push(entrada);
    }

    // Movimentações
    const movimentacoes: ProcessoScrapeData["movimentacoes"] = [];
    $("tbody tr, .movimentacaoProcesso tr, tr.containerMovimentacao").each((_: number, el: AnyNode) => {
      const cells = $(el).find("td");
      if (cells.length >= 2) {
        const data = $(cells[0]).text().trim();
        const descricao = $(cells[cells.length - 1]).text().trim();
        if (data.match(/\d{2}\/\d{2}\/\d{4}/) && descricao) {
          movimentacoes.push({ data, descricao });
        }
      }
    });

    // Documentos
    const documentos: ProcessoScrapeData["documentos"] = [];
    $("a[href*='abrirDocumento'], a[href*='download'], a.linkDocumento").each((_: number, el: AnyNode) => {
      const titulo = $(el).text().trim() || "Documento";
      const link = $(el).attr("href");
      if (link) {
        documentos.push({
          titulo,
          link: link.startsWith("http") ? link : `${tribunal.urlPortal}${link}`,
          tipo: "PDF",
        });
      }
    });

    // Campos básicos
    const classe = $(
      "span#classeProcesso, .classeProcesso, span[id*='classe'], .unj-tag"
    ).first().text().trim();

    const assunto = $(
      "span#assuntoProcesso, .assuntoProcesso, .assuntoDescricao, span[id*='assunto']"
    ).first().text().trim();

    const vara = $(
      "span#varaProcesso, .varaProcesso, span[id*='vara'], span[id*='orgao']"
    ).first().text().trim();

    const juiz = $(
      "#juizPrincipal, .juiz, .nomeRelator, #magistrado"
    ).first().text().trim();

    const comarca = $(
      "#comarcaProcesso, .comarcaProcesso, span[id*='comarca']"
    ).first().text().trim() || (() => {
      const m = htmlText.match(/[Cc]omarca[:\s]+([^\n|<]{3,80})/);
      return m ? m[1].trim() : "";
    })();

    const valorCausa = (() => {
      const m = htmlText.match(/[Vv]alor\s+da\s+[Aa]ção[:\s]+R?\$?\s*([\d.,]+)/);
      return m ? m[1].trim() : undefined;
    })();

    const dataDistribuicao = (() => {
      const m = htmlText.match(/[Dd]istribuição[:\s]+(\d{2}\/\d{2}\/\d{4})/);
      return m ? m[1] : undefined;
    })();

    const partes = Array.from(partesMap.values()).slice(0, 12);

    if (!movimentacoes.length && !partes.length && !classe) {
      log("warn", `e-SAJ ${tribunal.sigla}: Crawlee não encontrou dados reconhecíveis`);
      return null;
    }

    const camposPreenchidos = [
      classe, assunto, vara, juiz, comarca, valorCausa, dataDistribuicao
    ].filter(Boolean).length + Math.min(partes.length, 5) + Math.min(movimentacoes.length, 10);

    log("info", `[telemetria] fonte=eSAJ-Crawlee tribunal=${tribunal.sigla} campos=${camposPreenchidos} movs=${movimentacoes.length} partes=${partes.length} advs=${advogados.length}`);

    return {
      numero,
      tribunal: tribunal.sigla,
      classe: classe || undefined,
      assunto: assunto || undefined,
      vara: vara || undefined,
      relator: juiz || undefined,
      comarca: comarca || undefined,
      valorCausa,
      dataDistribuicao,
      partes,
      advogados: advogados.length ? advogados : undefined,
      movimentacoes,
      documentos,
      urlPortal: tribunal.urlConsulta,
    };
  } catch (err) {
    log("warn", `Crawlee e-SAJ ${tribunal.sigla} falhou: ${err}`);
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
  let actualSource: ScrapingSource = "datajud";

  processo = await buscarViaDataJud(numero, sigla, log);

  if (!processo) {
    log("info", `DataJud ${sigla}: sem resultado — tentando portal e-SAJ via Crawlee`);
    processo = await buscarViaEsajPortal(numero, tribunal, log);
    if (processo) {
      // Distinguish Rebrowser (Cloudflare portals) from plain Playwright scraping
      const engine = CLOUDFLARE_TRIBUNAIS.has(sigla) ? "Rebrowser" : "Crawlee/Playwright";
      sourceLabel = `${sigla} — Portal e-SAJ (${engine})`;
      actualSource = "esaj";
    }
  }

  let md = "";
  if (processo) {
    const linhas = [
      `# Processo ${sigla} — ${processo.numero}`,
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
    ];

    if (processo.advogados && processo.advogados.length > 0) {
      linhas.push("", "## Advogados");
      linhas.push(...processo.advogados.map(a => `- ${a}`));
    }

    linhas.push(
      "",
      "## Movimentações",
      processo.movimentacoes.length > 0
        ? processo.movimentacoes.slice(0, 20).map(m =>
            `**${m.data}** — ${m.descricao}${m.detalhes ? ` (${m.detalhes})` : ""}`
          ).join("\n")
        : "Sem movimentações disponíveis",
    );

    if (processo.documentos.length > 0) {
      linhas.push("", "## Documentos");
      linhas.push(...processo.documentos.slice(0, 10).map(d => `- [${d.titulo}](${d.link || "#"})`));
    }

    md = linhas.filter(l => l !== null && l !== undefined).join("\n");
  }

  const camposPreenchidos = processo
    ? [processo.classe, processo.assunto, processo.vara, processo.relator,
       processo.comarca, processo.valorCausa, processo.dataDistribuicao]
        .filter(Boolean).length
      + Math.min(processo.partes.length, 5)
      + Math.min(processo.movimentacoes.length, 10)
    : 0;

  return {
    source: actualSource,
    sourceLabel,
    data: processo,
    markdownContent: md,
    durationMs: Date.now() - t0,
    logs,
    error: processo ? undefined : `Processo ${numero} não encontrado no ${sigla}`,
    telemetry: {
      fonte: sourceLabel,
      latenciaMs: Date.now() - t0,
      camposPreenchidos,
      tribunal: sigla,
    },
  };
}
