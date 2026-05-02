import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { JurisprudenciaItem, ProcessoScrapeData, ScrapingResult } from "./types";
import { DATAJUD_AUTH } from "./types";
import { fetchUrl, fetchJson, makeLogger, withRetry, randomDelay } from "./utils";
import { crawlUrl } from "./crawler";
import { extrairIntegraDecisao } from "./playwrightCrawler";

interface StfJurisprudenciaResponse {
  result?: {
    hits?: {
      hits?: Array<{
        _source?: {
          numeroProcesso?: string;
          classeProcessual?: string;
          relator?: string;
          dataPublicacaoDOU?: string;
          ementa?: string;
          url?: string;
          tema?: string;
        };
      }>;
    };
  };
}

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

/**
 * Busca dados do processo no STF via DataJud api_publica_stf e portal STF.
 * Usa PlaywrightCrawler (com degradação para CheerioCrawler) para extrair
 * movimentações do portal JS-rendered do STF.
 */
export async function buscarProcessoStf(numero: string): Promise<ScrapingResult<ProcessoScrapeData | null>> {
  const t0 = Date.now();
  const { logs, log } = makeLogger();

  log("info", `Buscando processo STF: ${numero}`);

  let processo: ProcessoScrapeData | null = null;

  // Tentativa 1: DataJud api_publica_stf
  try {
    const body = JSON.stringify({ query: { match: { numeroProcesso: numero } }, size: 1 });
    const data = await withRetry(() =>
      fetchJson<{ hits?: { hits?: DataJudHit[] } }>(
        "https://api.datajud.cnj.jus.br/api_publica_stf/_search",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": DATAJUD_AUTH },
          body,
          timeoutMs: 15000,
        }
      )
    );

    const src = data?.hits?.hits?.[0]?._source;
    if (src) {
      processo = {
        numero: src.numeroProcesso || numero,
        tribunal: "STF",
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
        urlPortal: `https://portal.stf.jus.br/processos/detalhe.asp?incidente=${encodeURIComponent(numero)}`,
      };
      log("info", `DataJud STF: processo ${src.numeroProcesso} encontrado`);
    }
  } catch (err) {
    log("warn", `DataJud STF falhou: ${err}`);
  }

  // Tentativa 2: Portal STF via PlaywrightCrawler (JS-rendered) com degradação para Cheerio
  if (!processo) {
    const portalUrl = `https://portal.stf.jus.br/processos/detalhe.asp?incidente=${encodeURIComponent(numero)}`;
    log("info", `Tentando portal STF via PlaywrightCrawler: ${portalUrl}`);

    try {
      await randomDelay(1000, 2000);
      const { html, usedBrowser } = await import("./playwrightCrawler").then(m =>
        m.crawlUrlWithBrowser(portalUrl, {
          timeoutMs: 25000,
          waitForSelector: ".partes, .movimentacoes, #incidente",
        })
      );

      log("info", `Portal STF: ${usedBrowser ? "Playwright" : "CheerioCrawler"} — ${html.length} chars`);

      const $ = cheerio.load(html);

      const partes: string[] = [];
      $(".parte, .partes td, .polo td").each((_: number, el: AnyNode) => {
        const t = $(el).text().trim();
        if (t && t.length > 2) partes.push(t);
      });

      const movs: ProcessoScrapeData["movimentacoes"] = [];
      $(".movimentacao tr, .andamento tr, table.movimentacoes tr").each((_: number, el: AnyNode) => {
        const cells = $(el).find("td");
        if (cells.length >= 2) {
          const data = $(cells.get(0)).text().trim();
          const desc = $(cells.get(cells.length - 1)).text().trim();
          if (data.match(/\d{2}\/\d{2}\/\d{4}/) && desc) {
            movs.push({ data, descricao: desc });
          }
        }
      });

      const docs: ProcessoScrapeData["documentos"] = [];
      $("a[href*='download'], a[href*='documento'], a.docLink").each((_: number, el: AnyNode) => {
        const titulo = $(el).text().trim() || "Documento";
        const link = $(el).attr("href");
        if (link) {
          docs.push({
            titulo,
            link: link.startsWith("http") ? link : `https://portal.stf.jus.br${link}`,
            tipo: "PDF",
          });
        }
      });

      if (movs.length > 0 || partes.length > 0) {
        processo = {
          numero,
          tribunal: "STF",
          partes: Array.from(new Set(partes)).slice(0, 10),
          movimentacoes: movs,
          documentos: docs,
          urlPortal: portalUrl,
        };
        log("info", `Portal STF: ${movs.length} movs, ${partes.length} partes, ${docs.length} docs`);
      }
    } catch (portalErr) {
      log("warn", `Portal STF falhou: ${portalErr}`);
    }
  }

  // Enriquecer com íntegra da decisão mais recente
  if (processo && processo.movimentacoes.length > 0) {
    const ultimaMovLink = processo.urlPortal;
    if (ultimaMovLink) {
      try {
        const integra = await extrairIntegraDecisao(ultimaMovLink);
        if (integra && integra.length > 100) {
          processo.documentos = processo.documentos ?? [];
          processo.documentos.unshift({
            titulo: "Íntegra extraída",
            tipo: "Markdown",
          });
          log("info", `Íntegra STF extraída: ${integra.length} chars`);
        }
      } catch (integraErr) {
        log("warn", `Falha ao extrair íntegra STF: ${integraErr}`);
      }
    }
  }

  const md = processo
    ? [
        `# Processo STF — ${processo.numero}`,
        processo.classe ? `**Classe:** ${processo.classe}` : "",
        processo.assunto ? `**Assunto:** ${processo.assunto}` : "",
        "",
        "## Partes",
        processo.partes.length > 0 ? processo.partes.map(p => `- ${p}`).join("\n") : "Não disponível",
        "",
        "## Movimentações",
        processo.movimentacoes.slice(0, 20).map(m =>
          `**${m.data}** — ${m.descricao}${m.detalhes ? ` (${m.detalhes})` : ""}`
        ).join("\n"),
        "",
        processo.urlPortal ? `[Ver no portal STF](${processo.urlPortal})` : "",
      ].filter(l => l !== null && l !== undefined).join("\n")
    : "";

  return {
    source: "stf",
    sourceLabel: "STF — DataJud / Portal (Playwright)",
    data: processo,
    markdownContent: md,
    durationMs: Date.now() - t0,
    logs,
    error: processo ? undefined : `Processo ${numero} não encontrado no STF`,
  };
}

export async function buscarJurisprudenciaStf(q: string): Promise<ScrapingResult<JurisprudenciaItem[]>> {
  const t0 = Date.now();
  const { logs, log } = makeLogger();

  log("info", `Buscando jurisprudência STF: "${q}"`);

  const items: JurisprudenciaItem[] = [];

  try {
    const apiUrl = `https://jurisprudencia.stf.jus.br/api/search/search?query=${encodeURIComponent(q)}&page=1&pageSize=10&sort=_score&sortBy=desc`;
    await randomDelay(300, 800);

    const data = await withRetry(() =>
      fetchJson<StfJurisprudenciaResponse>(apiUrl, {
        headers: {
          "Accept": "application/json",
          "Referer": "https://jurisprudencia.stf.jus.br/",
          "Origin": "https://jurisprudencia.stf.jus.br",
        },
        timeoutMs: 20000,
      })
    );

    for (const hit of data?.result?.hits?.hits || []) {
      const src = hit._source;
      if (!src) continue;
      items.push({
        tribunal: "STF",
        numero: src.numeroProcesso || undefined,
        ementa: src.ementa || src.classeProcessual || "Decisão STF",
        relator: src.relator || undefined,
        data: src.dataPublicacaoDOU?.slice(0, 10) || undefined,
        tema: src.tema || undefined,
        link: src.url || (src.numeroProcesso ? `https://portal.stf.jus.br/processos/detalhe.asp?incidente=${encodeURIComponent(src.numeroProcesso)}` : undefined),
      });
    }

    log("info", `API STF retornou ${items.length} resultado(s)`);
  } catch (err) {
    log("warn", `API STF falhou: ${err}. Tentando scraping do portal...`);

    try {
      const url = `https://portal.stf.jus.br/jurisprudencia/pesquisarJurisprudencia.asp?s1=${encodeURIComponent(q)}&base=acordaos&bn=1`;
      await randomDelay(800, 1800);

      const html = await withRetry(() => fetchUrl(url, {
        useScraperApi: !!process.env.SCRAPER_API_KEY,
        timeoutMs: 25000,
      }));

      const $ = cheerio.load(html);

      $(".resultado-pesquisa, .jurisprudencia-item, table tr").each((_: number, el: AnyNode) => {
        const elRef = $(el);
        const ementa = elRef.find(".ementa, td").text().trim();
        const link = elRef.find("a").first().attr("href");

        if (ementa && ementa.length > 20) {
          items.push({
            tribunal: "STF",
            ementa: ementa.slice(0, 800),
            link: link ? (link.startsWith("http") ? link : `https://portal.stf.jus.br${link}`) : undefined,
          });
        }
      });

      log("info", `Scraping STF retornou ${items.length} resultado(s)`);
    } catch (err2) {
      log("warn", `Scraping STF falhou: ${err2}. Tentando DataJud...`);

      try {
        const apiUrl = "https://api.datajud.cnj.jus.br/api_publica_stf/_search";
        const body = JSON.stringify({
          query: { multi_match: { query: q, fields: ["ementa", "assuntos.descricao", "classe.descricao"] } },
          size: 10,
          sort: [{ dataJulgamento: { order: "desc" } }],
        });

        const data = await withRetry(() =>
          fetchJson<{ hits?: { hits?: Array<{ _source?: { numeroProcesso?: string; classe?: { descricao?: string }; assuntos?: { descricao?: string }[]; orgaoJulgador?: { nome?: string } } }> } }>(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": DATAJUD_AUTH,
            },
            body,
            timeoutMs: 15000,
          })
        );

        for (const hit of data?.hits?.hits || []) {
          const src = hit._source;
          if (!src) continue;
          items.push({
            tribunal: "STF",
            ementa: src.assuntos?.[0]?.descricao || src.classe?.descricao || "Processo STF",
            numero: src.numeroProcesso || undefined,
            link: src.numeroProcesso
              ? `https://portal.stf.jus.br/processos/detalhe.asp?incidente=${encodeURIComponent(src.numeroProcesso)}`
              : undefined,
          });
        }

        log("info", `DataJud STF retornou ${items.length} resultado(s)`);
      } catch (err3) {
        log("error", `DataJud STF também falhou: ${err3}`);
      }
    }
  }

  // Enriquecer primeiro resultado com íntegra via Playwright
  if (items.length > 0 && items[0].link) {
    try {
      log("info", `Extraindo íntegra do primeiro acórdão STF via Playwright`);
      const integra = await extrairIntegraDecisao(items[0].link);
      if (integra && integra.length > 100) {
        items[0].markdownContent = integra.slice(0, 6000);
        log("info", `Íntegra STF extraída: ${integra.length} chars`);
      }
    } catch (integraErr) {
      log("warn", `Falha ao extrair íntegra STF: ${integraErr}`);
    }
  }

  const md = items.length > 0
    ? [
        `# Jurisprudência STF — "${q}"`,
        "",
        ...items.map((item, i) => [
          `## ${i + 1}. ${item.numero || "STF"}`,
          item.relator ? `**Relator:** ${item.relator}` : "",
          item.data ? `**Data:** ${item.data}` : "",
          item.tema ? `**Tema:** ${item.tema}` : "",
          "",
          item.ementa,
          item.markdownContent ? `\n### Íntegra\n${item.markdownContent.slice(0, 2000)}` : "",
          item.link ? `[Ver íntegra](${item.link})` : "",
          "",
        ].filter(Boolean).join("\n")),
      ].join("\n")
    : `Nenhum resultado encontrado no STF para "${q}".`;

  return {
    source: "stf",
    sourceLabel: "STF — Jurisprudência / DataJud",
    data: items,
    markdownContent: md,
    durationMs: Date.now() - t0,
    logs,
  };
}
