import * as cheerio from "cheerio";
import type { JurisprudenciaItem, ScrapingResult } from "./types";
import { fetchUrl, fetchJson, makeLogger, withRetry, randomDelay } from "./utils";

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

      $(".resultado-pesquisa, .jurisprudencia-item, table tr").each((_, el) => {
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
              "Authorization": "ApiKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TaEN1dW1xTVh5eGFKZw==",
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
            numero: src.numeroProcesso || undefined,
            ementa: src.assuntos?.[0]?.descricao || src.classe?.descricao || "Processo STF",
            link: src.numeroProcesso ? `https://portal.stf.jus.br/processos/detalhe.asp?incidente=${encodeURIComponent(src.numeroProcesso)}` : undefined,
          });
        }

        log("info", `DataJud STF retornou ${items.length} resultado(s)`);
      } catch (err3) {
        log("error", `Todas as fontes STF falharam: ${err3}`);
      }
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
          item.link ? `[Ver no portal STF](${item.link})` : "",
          "",
        ].filter(Boolean).join("\n")),
      ].join("\n")
    : `Nenhum resultado encontrado no STF para "${q}".`;

  return {
    source: "stf",
    sourceLabel: "STF — Portal de Jurisprudência",
    data: items,
    markdownContent: md,
    durationMs: Date.now() - t0,
    logs,
  };
}
