import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { JurisprudenciaItem, ProcessoScrapeData, ScrapingResult, TribunalInfo } from "./types";
import { DATAJUD_AUTH } from "./types";
import { fetchJson, makeLogger, withRetry, randomDelay } from "./utils";
import { CrawlerManager } from "./crawlerManager";

const TRF_INDICES: Record<string, string> = {
  TRF1: "api_publica_trf1",
  TRF2: "api_publica_trf2",
  TRF3: "api_publica_trf3",
  TRF4: "api_publica_trf4",
  TRF5: "api_publica_trf5",
  TRF6: "api_publica_trf6",
};

/**
 * Portal PJe URLs per TRF tribunal.
 * PJe is the primary e-process system used by TRF1–TRF6.
 */
const TRF_PJE_URLS: Record<string, string> = {
  TRF1: "https://pje.trf1.jus.br/pje/ConsultaPublica/listView.seam",
  TRF2: "https://pje.trf2.jus.br/pje/ConsultaPublica/listView.seam",
  TRF3: "https://pje.trf3.jus.br/pje/ConsultaPublica/listView.seam",
  TRF4: "https://pje2.trf4.jus.br/pje/ConsultaPublica/listView.seam",
  TRF5: "https://pje.trf5.jus.br/pje/ConsultaPublica/listView.seam",
  TRF6: "https://pje.trf6.jus.br/pje/ConsultaPublica/listView.seam",
};

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
    headers: { "Content-Type": "application/json", "Authorization": DATAJUD_AUTH },
    body,
    timeoutMs: 20000,
  });
}

/**
 * Direct portal scraping of PJe (Processo Judicial Eletrônico) for TRF tribunals.
 * Extracts process data from the public consultation page.
 */
async function buscarProcessoTrfPje(
  numero: string,
  sigla: string,
  tribunal: TribunalInfo,
  log: (l: "info" | "warn" | "error", m: string) => void
): Promise<ProcessoScrapeData | null> {
  const pjeBase = TRF_PJE_URLS[sigla];
  if (!pjeBase) return null;

  // PJe public consultation endpoint (GET with query param)
  const pjeUrl = `${pjeBase}?numeroProcesso=${encodeURIComponent(numero)}`;
  log("info", `Scraping PJe ${sigla} direto: ${pjeUrl}`);

  try {
    await randomDelay(1000, 2000);
    const { $, html } = await CrawlerManager.fetch(pjeUrl, {
      maxRequestsPerMinute: 60,
      maxRetries: 2,
      timeoutSecs: 30,
      useProxy: !!process.env.SCRAPER_API_KEY,
    });

    log("info", `PJe ${sigla}: ${html.length} bytes`);

    const partes: string[] = [];
    // PJe renders parties in dl/dt/dd or table rows
    $("dt:contains('Polo Ativo'), dt:contains('Polo Passivo'), dt:contains('Autor'), dt:contains('Réu')")
      .each((_: number, el: AnyNode) => {
        const dd = $(el).next("dd");
        const t = dd.text().trim();
        if (t) partes.push(t);
      });

    $(".parteAutora td, .parteRe td, .parte td, [id*='parte'] td").each((_: number, el: AnyNode) => {
      const t = $(el).text().trim();
      if (t && t.length > 3) partes.push(t);
    });

    const movs: ProcessoScrapeData["movimentacoes"] = [];
    // PJe movement table rows — date in first cell, description in last
    $(".movimentacao tr, .andamentos tr, [id*='movimento'] tr, [id*='andamento'] tr").each((_: number, el: AnyNode) => {
      const tds = $(el).find("td");
      if (tds.length >= 2) {
        const dataStr = $(tds.get(0)).text().trim();
        const desc = $(tds.get(tds.length - 1)).text().trim();
        if (dataStr.match(/\d{2}\/\d{2}\/\d{4}/) && desc) {
          movs.push({ data: dataStr, descricao: desc });
        }
      }
    });

    // Extract basic process info from page header/summary
    const classe = $(".classeProcessual, [id*='classe'] .valor, dt:contains('Classe')").first().next().text().trim()
      || $("dd").filter((_: number, el: AnyNode) => $(el).prev("dt").text().includes("Classe")).first().text().trim()
      || undefined;

    const assunto = $(".assunto, [id*='assunto'] .valor, dt:contains('Assunto')").first().next().text().trim()
      || $("dd").filter((_: number, el: AnyNode) => $(el).prev("dt").text().includes("Assunto")).first().text().trim()
      || undefined;

    const docs: ProcessoScrapeData["documentos"] = [];
    $("a[href*='documento'], a[href*='download'], a[href$='.pdf']").each((_: number, el: AnyNode) => {
      const titulo = $(el).text().trim() || "Documento";
      const link = $(el).attr("href");
      if (link) {
        docs.push({
          titulo,
          link: link.startsWith("http") ? link : `${new URL(pjeBase).origin}${link}`,
          tipo: "PDF",
        });
      }
    });

    if (movs.length === 0 && partes.length === 0 && !classe) {
      log("warn", `PJe ${sigla}: sem dados estruturados para ${numero}`);
      return null;
    }

    log("info", `PJe ${sigla}: ${movs.length} movs, ${partes.length} partes`);

    return {
      numero,
      tribunal: sigla,
      classe: classe || undefined,
      assunto: assunto || undefined,
      partes: Array.from(new Set(partes)).slice(0, 10),
      movimentacoes: movs.slice(0, 50),
      documentos: docs.slice(0, 20),
      urlPortal: tribunal.urlPortal || pjeBase,
    };
  } catch (err) {
    log("warn", `PJe ${sigla} scraping falhou: ${err}`);
    return null;
  }
}

function buildProcessoMd(processo: ProcessoScrapeData, sigla: string): string {
  return [
    `# Processo ${sigla} — ${processo.numero}`,
    processo.classe ? `**Classe:** ${processo.classe}` : "",
    processo.assunto ? `**Assunto:** ${processo.assunto}` : "",
    processo.vara ? `**Órgão Julgador:** ${processo.vara}` : "",
    "",
    "## Partes",
    processo.partes.length > 0 ? processo.partes.map(p => `- ${p}`).join("\n") : "Não disponível",
    "",
    "## Movimentações",
    processo.movimentacoes.slice(0, 20).map(m =>
      `**${m.data}** — ${m.descricao}${m.detalhes ? ` (${m.detalhes})` : ""}`
    ).join("\n"),
    processo.urlPortal ? `\n[Ver no portal ${sigla}](${processo.urlPortal})` : "",
  ].filter(l => l.trim()).join("\n");
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

  // Tentativa 1: Scraping direto do portal PJe
  let processo = await buscarProcessoTrfPje(numero, sigla, tribunal, log);
  let sourceLabel = `${sigla} — Portal PJe (scraping direto)`;

  // Tentativa 2: DataJud como fallback/enriquecimento
  if (!processo) {
    log("info", `PJe sem resultado para ${sigla} — usando DataJud como fallback`);
    try {
      const body = JSON.stringify({ query: { match: { numeroProcesso: numero } }, size: 1 });
      const data = await withRetry(() => consultarDataJud(indice, body));
      const src = data?.hits?.hits?.[0]?._source;

      if (src) {
        processo = {
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
        sourceLabel = `${sigla} — DataJud (fallback)`;
        log("info", `DataJud ${sigla}: processo encontrado`);
      }
    } catch (err) {
      log("error", `DataJud ${sigla} falhou: ${err}`);
    }
  } else {
    // Enriquecer com DataJud se PJe não trouxe todos os metadados
    if (!processo.classe || !processo.assunto || processo.movimentacoes.length === 0) {
      try {
        const body = JSON.stringify({ query: { match: { numeroProcesso: numero } }, size: 1 });
        const data = await withRetry(() => consultarDataJud(indice, body));
        const src = data?.hits?.hits?.[0]?._source;
        if (src) {
          processo.classe = processo.classe || src.classe?.descricao || undefined;
          processo.assunto = processo.assunto || src.assuntos?.[0]?.descricao || undefined;
          processo.vara = processo.vara || src.orgaoJulgador?.nome || undefined;
          if (processo.movimentacoes.length === 0) {
            processo.movimentacoes = (src.movimentos || []).slice(0, 50).map(m => ({
              data: m.dataHora?.slice(0, 10) || "",
              descricao: m.nome || "",
              detalhes: m.complementosTabelados?.map(c => c.descricao).join("; ") || undefined,
            }));
          }
          log("info", `DataJud ${sigla}: dados de enriquecimento mesclados`);
        }
      } catch (enrichErr) {
        log("warn", `Falha ao enriquecer com DataJud ${sigla}: ${enrichErr}`);
      }
    }
  }

  if (!processo) {
    return {
      source: "trf",
      sourceLabel: sigla,
      data: null,
      markdownContent: "",
      durationMs: Date.now() - t0,
      logs,
      error: `Processo ${numero} não encontrado no ${sigla}`,
    };
  }

  return {
    source: "trf",
    sourceLabel,
    data: processo,
    markdownContent: buildProcessoMd(processo, sigla),
    durationMs: Date.now() - t0,
    logs,
  };
}

export async function buscarJurisprudenciaTrf(
  q: string,
  tribunal: TribunalInfo
): Promise<ScrapingResult<JurisprudenciaItem[]>> {
  const t0 = Date.now();
  const { logs, log } = makeLogger();
  const sigla = tribunal.sigla;
  const indice = TRF_INDICES[sigla];

  if (!indice) {
    return {
      source: "trf",
      sourceLabel: sigla,
      data: [],
      markdownContent: "",
      durationMs: Date.now() - t0,
      logs,
      error: `Tribunal ${sigla} não suportado`,
    };
  }

  const items: JurisprudenciaItem[] = [];

  // Tentativa 1: Scraping direto do portal de jurisprudência do TRF
  const portalJuri: Record<string, string> = {
    TRF1: `https://arquivo.trf1.jus.br/default.aspx?pesquisaLivre=${encodeURIComponent(q)}`,
    TRF2: `https://www10.trf2.jus.br/consultas/juri/pesq_juri.php?tipo=A&numac=&proc=&ano=&secao=&relator=&ementa=${encodeURIComponent(q)}`,
    TRF3: `https://web.trf3.jus.br/jurisprudencia/Pesquisar?palavrasChave=${encodeURIComponent(q)}`,
    TRF4: `https://jurisprudencia.trf4.jus.br/pesquisa/pesquisa.php?tipo=1&pesquisa=${encodeURIComponent(q)}`,
    TRF5: `https://www.trf5.jus.br/index.php?option=com_juri&Itemid=&juri_num_processo=&juri_relator=&juri_palavras=${encodeURIComponent(q)}`,
    TRF6: `https://www.trf6.jus.br/site/consulta-de-jurisprudencia?q=${encodeURIComponent(q)}`,
  };

  if (portalJuri[sigla]) {
    try {
      await randomDelay(500, 1500);
      log("info", `Scraping jurisprudência ${sigla} direto: ${portalJuri[sigla]}`);

      const { $ } = await CrawlerManager.fetch(portalJuri[sigla], {
        maxRequestsPerMinute: 60,
        maxRetries: 2,
        timeoutSecs: 25,
        useProxy: !!process.env.SCRAPER_API_KEY,
      });

      $(".resultado, .juri-item, .acórdão, tr.resultado, .item-jurisprudencia, article").each((_: number, el: AnyNode) => {
        const elRef = $(el);
        const ementa = elRef.find(".ementa, .texto, p, td").first().text().trim()
          || elRef.text().trim();
        const link = elRef.find("a[href]").first().attr("href");
        const relator = elRef.find(".relator, td:nth-child(3)").text().replace(/Relator[:\s]*/i, "").trim();
        const data = elRef.find(".data, td:nth-child(2), .dataJulgamento").text().trim();

        if (ementa && ementa.length > 20) {
          items.push({
            tribunal: sigla,
            ementa: ementa.slice(0, 800),
            relator: relator || undefined,
            data: data || undefined,
            link: link ? (link.startsWith("http") ? link : `https://www.${sigla.toLowerCase()}.jus.br${link}`) : undefined,
          });
        }
      });

      log("info", `Portal jurisprudência ${sigla}: ${items.length} resultados`);
    } catch (portalErr) {
      log("warn", `Portal jurisprudência ${sigla} falhou: ${portalErr}`);
    }
  }

  // Fallback: DataJud
  if (items.length === 0) {
    log("info", `Usando DataJud como fallback para jurisprudência ${sigla}`);
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
          ementa: src.assuntos?.[0]?.descricao || src.classe?.descricao || "Processo",
          numero: src.numeroProcesso || undefined,
          relator: src.relator || undefined,
          link: tribunal.urlPortal,
        });
      }
      log("info", `DataJud ${sigla}: ${items.length} resultados`);
    } catch (err) {
      log("error", `DataJud ${sigla} também falhou: ${err}`);
    }
  }

  const md = items.length > 0
    ? [`# Jurisprudência ${sigla} — "${q}"`, "",
        ...items.map((item, i) => [
          `## ${i + 1}. ${item.numero || sigla}`,
          item.relator ? `**Relator:** ${item.relator}` : "",
          item.data ? `**Data:** ${item.data}` : "",
          "", item.ementa,
          item.link ? `[Ver acórdão](${item.link})` : "", "",
        ].filter(Boolean).join("\n")),
      ].join("\n")
    : `Nenhum resultado encontrado no ${sigla} para "${q}".`;

  return {
    source: "trf",
    sourceLabel: items.length > 0 ? `${sigla} — Portal / DataJud` : sigla,
    data: items,
    markdownContent: md,
    durationMs: Date.now() - t0,
    logs,
  };
}
