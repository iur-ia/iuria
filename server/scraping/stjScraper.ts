import type { JurisprudenciaItem, ProcessoScrapeData, ScrapingResult } from "./types";
import { DATAJUD_AUTH } from "./types";
import { fetchJson, makeLogger, withRetry, randomDelay } from "./utils";
import { crawlUrl } from "./crawler";
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

async function buscarProcessoStjDataJud(numero: string, log: (l: "info" | "warn" | "error", m: string) => void): Promise<ProcessoScrapeData | null> {
  const url = `https://api.datajud.cnj.jus.br/api_publica_stj/_search`;

  log("info", `Consultando DataJud STJ para processo ${numero}`);

  const body = JSON.stringify({
    query: { match: { numeroProcesso: numero } },
    size: 1,
  });

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

export async function buscarProcessoStj(numero: string): Promise<ScrapingResult<ProcessoScrapeData | null>> {
  const t0 = Date.now();
  const { logs, log } = makeLogger();

  log("info", `Iniciando busca processo STJ: ${numero}`);

  const processo = await buscarProcessoStjDataJud(numero, log);

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
      processo.movimentacoes.slice(0, 20).map(m => `**${m.data}** — ${m.descricao}${m.detalhes ? ` (${m.detalhes})` : ""}`).join("\n"),
    ].filter(l => l.trim()).join("\n");
    log("info", `Processo STJ encontrado: ${processo.numero}`);
  }

  return {
    source: "stj",
    sourceLabel: "STJ — Portal Processual",
    data: processo,
    markdownContent: md,
    durationMs: Date.now() - t0,
    logs,
  };
}

export async function buscarJurisprudenciaStj(q: string): Promise<ScrapingResult<JurisprudenciaItem[]>> {
  const t0 = Date.now();
  const { logs, log } = makeLogger();

  log("info", `Buscando jurisprudência STJ via Crawlee CheerioCrawler: "${q}"`);

  const items: JurisprudenciaItem[] = [];

  try {
    const sconUrl = `https://scon.stj.jus.br/SCON/jurisprudencia/toc.jsp?b=ACOR&livre=${encodeURIComponent(q)}&i=1&l=10`;
    await randomDelay(500, 1200);

    log("info", `Crawlee: buscando SCON STJ ${sconUrl}`);
    const { $ } = await crawlUrl(sconUrl, {
      maxRequestsPerMinute: 20,
      maxRetries: 3,
      timeoutSecs: 30,
    });

    $(".classElemento, .documento, tr.fundocinza, tr.fundocinzaclaro").each((_: number, el: any) => {
      const elRef = $(el);
      const ementa = elRef.find(".ementa, .docEmentaFraseTxt, td.docEmentaTxt").text().trim();
      const relator = elRef.find(".docRelator, .relator").text().replace(/Relator[:\s]*/i, "").trim();
      const data = elRef.find(".docData, .dataPublicacao").text().trim();
      const numero = elRef.find(".docNumeroRegistro, .numeroRegistro").text().trim();
      const linkEl = elRef.find("a[href]").first();
      const link = linkEl.attr("href") || "";
      const fullLink = link ? (link.startsWith("http") ? link : `https://scon.stj.jus.br${link}`) : undefined;

      if (ementa && ementa.length > 10) {
        items.push({
          tribunal: "STJ",
          numero: numero || undefined,
          ementa,
          relator: relator || undefined,
          data: data || undefined,
          link: fullLink,
        });
      }
    });

    log("info", `STJ SCON retornou ${items.length} resultado(s)`);

    // Enriquecer o primeiro resultado com íntegra via toMarkdown
    if (items.length > 0 && items[0].link) {
      try {
        log("info", `Buscando íntegra do primeiro acórdão STJ via toMarkdown`);
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
    log("warn", `Crawlee SCON STJ falhou: ${err}. Tentando DataJud...`);

    try {
      const apiUrl = "https://api.datajud.cnj.jus.br/api_publica_stj/_search";
      const body = JSON.stringify({
        query: { multi_match: { query: q, fields: ["ementa", "assuntos.descricao", "classe.descricao"] } },
        size: 10,
        sort: [{ dataJulgamento: { order: "desc" } }],
      });

      const data = await withRetry(() =>
        fetchJson<{ hits?: { hits?: DataJudProcesso[] } }>(apiUrl, {
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
          numero: src.numeroProcesso || undefined,
          ementa: src.assuntos?.[0]?.descricao || src.classe?.descricao || "Processo STJ",
          link: src.numeroProcesso ? `https://processo.stj.jus.br/processo/pesquisa/?termo=${encodeURIComponent(src.numeroProcesso)}` : undefined,
        });
      }

      log("info", `DataJud STJ retornou ${items.length} resultado(s)`);
    } catch (err2) {
      log("error", `DataJud STJ também falhou: ${err2}`);
    }
  }

  const md = items.length > 0
    ? [
        `# Jurisprudência STJ — "${q}"`,
        "",
        ...items.map((item, i) => [
          `## ${i + 1}. ${item.numero || "STJ"}`,
          item.relator ? `**Relator:** ${item.relator}` : "",
          item.data ? `**Data:** ${item.data}` : "",
          "",
          item.ementa,
          item.markdownContent ? `\n### Íntegra\n${item.markdownContent.slice(0, 2000)}` : "",
          item.link ? `[Ver íntegra](${item.link})` : "",
          "",
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
