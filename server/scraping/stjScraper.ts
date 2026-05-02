import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { JurisprudenciaItem, ProcessoScrapeData, ScrapingResult } from "./types";
import { DATAJUD_AUTH } from "./types";
import { fetchJson, makeLogger, withRetry, randomDelay } from "./utils";
import { CrawlerManager } from "./crawlerManager";
import { toMarkdown } from "./firecrawl";

interface DataJudProcesso {
  _source?: {
    numeroProcesso?: string;
    classe?: { descricao?: string };
    assuntos?: { descricao?: string }[];
    tribunal?: string;
    orgaoJulgador?: { nome?: string };
    partes?: { nome?: string; tipo?: string }[];
    movimentos?: { dataHora?: string; nome?: string; complementosTabelados?: { descricao?: string }[] }[];
    dataAjuizamento?: string;
  };
}

async function buscarProcessoStjDataJud(
  numero: string,
  log: (l: "info" | "warn" | "error", m: string) => void
): Promise<ProcessoScrapeData | null> {
  const url = `https://api.datajud.cnj.jus.br/api_publica_stj/_search`;
  log("info", `Consultando DataJud STJ para processo ${numero}`);
  const body = JSON.stringify({ query: { match: { numeroProcesso: numero } }, size: 1 });
  try {
    const data = await withRetry(() =>
      fetchJson<{ hits?: { hits?: DataJudProcesso[] } }>(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": DATAJUD_AUTH },
        body,
        timeoutMs: 15000,
      })
    );
    const hit = data?.hits?.hits?.[0]?._source;
    if (!hit) return null;
    return {
      numero: hit.numeroProcesso || numero,
      tribunal: "STJ",
      classe: hit.classe?.descricao || undefined,
      assunto: hit.assuntos?.[0]?.descricao || undefined,
      vara: hit.orgaoJulgador?.nome || undefined,
      partes: (hit.partes || []).map(p => `${p.tipo || "Parte"}: ${p.nome || ""}`),
      movimentacoes: (hit.movimentos || []).slice(0, 50).map(m => ({
        data: m.dataHora?.slice(0, 10) || "",
        descricao: m.nome || "",
        detalhes: m.complementosTabelados?.map(c => c.descricao).join("; ") || undefined,
      })),
      documentos: [],
      urlPortal: `https://processo.stj.jus.br/processo/pesquisa/?tipoPesquisa=tipoPesquisaNumeroRegistro&termo=${encodeURIComponent(numero)}`,
    };
  } catch (err) {
    log("warn", `DataJud STJ falhou: ${err}`);
    return null;
  }
}

/**
 * Scraping direto do portal STJ processo.stj.jus.br via CrawlerManager.
 * Extrai partes, movimentos e documentos do HTML do portal.
 */
async function buscarProcessoStjPortal(
  numero: string,
  log: (l: "info" | "warn" | "error", m: string) => void
): Promise<ProcessoScrapeData | null> {
  const portalUrl = `https://processo.stj.jus.br/processo/pesquisa/?tipoPesquisa=tipoPesquisaNumeroRegistro&termo=${encodeURIComponent(numero)}`;
  log("info", `Scraping portal STJ direto: ${portalUrl}`);

  try {
    await randomDelay(800, 1600);
    const { $, html } = await CrawlerManager.fetch(portalUrl, {
      maxRequestsPerMinute: 60,
      maxRetries: 3,
      timeoutSecs: 30,
      useProxy: !!process.env.SCRAPER_API_KEY,
    });

    log("info", `Portal STJ: ${html.length} bytes recebidos`);

    const partes: string[] = [];
    $(".partes td, .parteSigla, .nomePartePassivo, .nomeParteAtivo, td[data-label='Parte']").each((_: number, el: AnyNode) => {
      const t = $(el).text().trim();
      if (t && t.length > 2 && !t.includes("Parte")) partes.push(t);
    });

    // Fallback: tabela de partes genérica
    if (partes.length === 0) {
      $("table").each((_: number, tbl: AnyNode) => {
        const head = $(tbl).find("th").first().text().toLowerCase();
        if (head.includes("parte") || head.includes("autor") || head.includes("réu")) {
          $(tbl).find("td").each((_: number, td: AnyNode) => {
            const t = $(td).text().trim();
            if (t && t.length > 3) partes.push(t);
          });
        }
      });
    }

    const movs: ProcessoScrapeData["movimentacoes"] = [];
    $(".andamento tr, .movimentacao tr, table tr").each((_: number, el: AnyNode) => {
      const tds = $(el).find("td");
      if (tds.length >= 2) {
        const dataStr = $(tds.get(0)).text().trim();
        const desc = $(tds.get(tds.length - 1)).text().trim();
        if (dataStr.match(/\d{2}\/\d{2}\/\d{4}/) && desc && desc.length > 3) {
          movs.push({ data: dataStr, descricao: desc });
        }
      }
    });

    const docs: ProcessoScrapeData["documentos"] = [];
    $("a[href*='documento'], a[href*='download'], a[href$='.pdf']").each((_: number, el: AnyNode) => {
      const titulo = $(el).text().trim() || "Documento";
      const link = $(el).attr("href");
      if (link) {
        docs.push({
          titulo,
          link: link.startsWith("http") ? link : `https://processo.stj.jus.br${link}`,
          tipo: "PDF",
        });
      }
    });

    if (movs.length === 0 && partes.length === 0) {
      log("warn", `Portal STJ: sem dados estruturados encontrados para ${numero}`);
      return null;
    }

    log("info", `Portal STJ direto: ${movs.length} movs, ${partes.length} partes, ${docs.length} docs`);

    return {
      numero,
      tribunal: "STJ",
      partes: Array.from(new Set(partes)).slice(0, 10),
      movimentacoes: movs.slice(0, 50),
      documentos: docs.slice(0, 20),
      urlPortal: portalUrl,
    };
  } catch (err) {
    log("warn", `Portal STJ direto falhou: ${err}`);
    return null;
  }
}

export async function buscarProcessoStj(numero: string): Promise<ScrapingResult<ProcessoScrapeData | null>> {
  const t0 = Date.now();
  const { logs, log } = makeLogger();
  log("info", `Iniciando busca processo STJ: ${numero}`);

  // Tentativa 1: Portal direto (scraping agressivo)
  let processo = await buscarProcessoStjPortal(numero, log);
  let sourceLabel = "STJ — Portal Processual (scraping direto)";

  // Tentativa 2: DataJud como fallback/enriquecimento
  if (!processo) {
    log("info", `Portal STJ sem resultado — tentando DataJud como fallback`);
    processo = await buscarProcessoStjDataJud(numero, log);
    sourceLabel = "STJ — DataJud (fallback)";
  } else {
    // Enriquecer com DataJud se portal encontrou mas sem classe/assunto
    if (!processo.classe || !processo.assunto) {
      const datajudData = await buscarProcessoStjDataJud(numero, log);
      if (datajudData) {
        processo.classe = processo.classe || datajudData.classe;
        processo.assunto = processo.assunto || datajudData.assunto;
        if (processo.movimentacoes.length === 0) {
          processo.movimentacoes = datajudData.movimentacoes;
        }
        log("info", `DataJud STJ: dados de enriquecimento mesclados`);
      }
    }
  }

  let md = "";
  if (processo) {
    md = [
      `# Processo STJ — ${processo.numero}`,
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
      processo.urlPortal ? `\n[Ver no portal STJ](${processo.urlPortal})` : "",
    ].filter(l => l.trim()).join("\n");
    log("info", `Processo STJ encontrado: ${processo.numero}`);
  }

  return {
    source: "stj",
    sourceLabel,
    data: processo,
    markdownContent: md,
    durationMs: Date.now() - t0,
    logs,
    error: processo ? undefined : `Processo ${numero} não encontrado no STJ`,
  };
}

export async function buscarJurisprudenciaStj(q: string): Promise<ScrapingResult<JurisprudenciaItem[]>> {
  const t0 = Date.now();
  const { logs, log } = makeLogger();
  log("info", `Buscando jurisprudência STJ via CrawlerManager: "${q}"`);

  const items: JurisprudenciaItem[] = [];

  try {
    const sconUrl = `https://scon.stj.jus.br/SCON/jurisprudencia/toc.jsp?b=ACOR&livre=${encodeURIComponent(q)}&i=1&l=10`;
    await randomDelay(500, 1200);
    log("info", `CrawlerManager: buscando SCON STJ`);

    const { $ } = await CrawlerManager.fetch(sconUrl, {
      maxRequestsPerMinute: 60,
      maxRetries: 3,
      timeoutSecs: 30,
      useProxy: !!process.env.SCRAPER_API_KEY,
    });

    $(".classElemento, .documento, tr.fundocinza, tr.fundocinzaclaro").each((_: number, el: AnyNode) => {
      const elRef = $(el);
      const ementa = elRef.find(".ementa, .docEmentaFraseTxt, td.docEmentaTxt").text().trim();
      const relator = elRef.find(".docRelator, .relator").text().replace(/Relator[:\s]*/i, "").trim();
      const data = elRef.find(".docData, .dataPublicacao").text().trim();
      const numero = elRef.find(".docNumeroRegistro, .numeroRegistro").text().trim();
      const linkEl = elRef.find("a[href]").first();
      const link = linkEl.attr("href") || "";
      const fullLink = link ? (link.startsWith("http") ? link : `https://scon.stj.jus.br${link}`) : undefined;

      if (ementa && ementa.length > 10) {
        items.push({ tribunal: "STJ", numero: numero || undefined, ementa, relator: relator || undefined, data: data || undefined, link: fullLink });
      }
    });

    log("info", `STJ SCON retornou ${items.length} resultado(s)`);

    if (items.length > 0 && items[0].link) {
      try {
        log("info", `Buscando íntegra do primeiro acórdão STJ`);
        const integra = await toMarkdown(items[0].link, { timeoutMs: 15000 });
        if (integra.markdown && integra.markdown.length > 100) {
          items[0].markdownContent = integra.markdown.slice(0, 8000);
          log("info", `Íntegra STJ extraída: ${integra.markdown.length} chars`);
        }
      } catch (integraErr) {
        log("warn", `Falha ao extrair íntegra STJ: ${integraErr}`);
      }
    }
  } catch (err) {
    log("warn", `SCON STJ falhou: ${err}. Tentando DataJud...`);

    try {
      const apiUrl = "https://api.datajud.cnj.jus.br/api_publica_stj/_search";
      const body = JSON.stringify({
        query: { multi_match: { query: q, fields: ["ementa", "assuntos.descricao", "classe.descricao"] } },
        size: 10,
        sort: [{ dataJulgamento: { order: "desc" } }],
      });
      const data = await withRetry(() =>
        fetchJson<{
          hits?: {
            hits?: Array<{
              _source?: {
                numeroProcesso?: string;
                classe?: { descricao?: string };
                assuntos?: { descricao?: string }[];
                orgaoJulgador?: { nome?: string };
                dataJulgamento?: string;
              };
            }>;
          };
        }>(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": DATAJUD_AUTH },
          body,
          timeoutMs: 15000,
        })
      );
      for (const hit of data?.hits?.hits || []) {
        const src = hit._source;
        if (!src) continue;
        items.push({
          tribunal: "STJ",
          ementa: src.assuntos?.[0]?.descricao || src.classe?.descricao || "Processo STJ",
          numero: src.numeroProcesso || undefined,
          data: src.dataJulgamento?.slice(0, 10) || undefined,
          link: src.numeroProcesso
            ? `https://processo.stj.jus.br/processo/pesquisa/?tipoPesquisa=tipoPesquisaNumeroRegistro&termo=${encodeURIComponent(src.numeroProcesso)}`
            : undefined,
        });
      }
      log("info", `DataJud STJ retornou ${items.length} resultado(s)`);
    } catch (err2) {
      log("error", `DataJud STJ também falhou: ${err2}`);
    }
  }

  const md = items.length > 0
    ? [`# Jurisprudência STJ — "${q}"`, "",
        ...items.map((item, i) => [
          `## ${i + 1}. ${item.numero || "STJ"}`,
          item.relator ? `**Relator:** ${item.relator}` : "",
          item.data ? `**Data:** ${item.data}` : "",
          "", item.ementa,
          item.markdownContent ? `\n### Íntegra\n${item.markdownContent.slice(0, 2000)}` : "",
          item.link ? `[Ver íntegra](${item.link})` : "", "",
        ].filter(Boolean).join("\n")),
      ].join("\n")
    : `Nenhum resultado encontrado no STJ para "${q}".`;

  return {
    source: "stj",
    sourceLabel: "STJ — SCON / DataJud",
    data: items,
    markdownContent: md,
    durationMs: Date.now() - t0,
    logs,
  };
}
