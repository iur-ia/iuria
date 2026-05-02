import type { DoutrinaItem, ScrapingResult } from "./types";
import { fetchJson, makeLogger, withRetry, randomDelay } from "./utils";
import { crawlUrl, crawlUrls } from "./crawler";
import { toMarkdown } from "./firecrawl";

async function buscarCnjBiblioteca(q: string, log: (l: "info" | "warn" | "error", m: string) => void): Promise<DoutrinaItem[]> {
  log("info", `Crawlee: buscando CNJ Biblioteca: "${q}"`);

  try {
    const url = `https://bibliotecadigital.cnj.jus.br/xmlui/discover?query=${encodeURIComponent(q)}&rpp=10&format=json`;
    await randomDelay(500, 1200);

    const { $ } = await crawlUrl(url, {
      maxRequestsPerMinute: 20,
      maxRetries: 2,
      timeoutSecs: 25,
    });

    const items: DoutrinaItem[] = [];

    $(".artifact-title, .ds-artifact-item, li.ds-artifact-item").each((_: number, el: any) => {
      const elRef = $(el);
      const titulo = elRef.find("a.artifact-title, h4, .artifact-title a").first().text().trim();
      const autor = elRef.find(".artifact-info span, .author").first().text().trim();
      const resumo = elRef.find(".artifact-abstract, .abstract, p").first().text().trim();
      const link = elRef.find("a").first().attr("href");

      if (titulo && titulo.length > 3) {
        items.push({
          titulo,
          autor: autor || undefined,
          resumo: resumo?.slice(0, 500) || undefined,
          link: link ? (link.startsWith("http") ? link : `https://bibliotecadigital.cnj.jus.br${link}`) : undefined,
          fonte: "Biblioteca Digital CNJ",
        });
      }
    });

    log("info", `CNJ Biblioteca retornou ${items.length} resultado(s)`);
    return items;
  } catch (err) {
    log("warn", `CNJ Biblioteca falhou: ${err}`);
    return [];
  }
}

async function buscarLexML(q: string, log: (l: "info" | "warn" | "error", m: string) => void): Promise<DoutrinaItem[]> {
  log("info", `Crawlee: buscando LexML: "${q}"`);

  try {
    const url = `https://www.lexml.gov.br/busca/SRU?operation=searchRetrieve&query=${encodeURIComponent(q)}&maximumRecords=10&recordSchema=dc`;
    await randomDelay(400, 900);

    const { $ } = await crawlUrl(url, {
      maxRequestsPerMinute: 20,
      maxRetries: 2,
      timeoutSecs: 20,
    });

    const items: DoutrinaItem[] = [];

    $("record, srw\\:record, zs\\:record").each((_: number, el: any) => {
      const elRef = $(el);
      const titulo = elRef.find("dc\\:title, title").first().text().trim();
      const autor = elRef.find("dc\\:creator, creator").first().text().trim();
      const resumo = elRef.find("dc\\:description, description").first().text().trim();
      const link = elRef.find("dc\\:identifier, identifier").first().text().trim();
      const ano = elRef.find("dc\\:date, date").first().text().trim();

      if (titulo && titulo.length > 3) {
        items.push({
          titulo,
          autor: autor || undefined,
          resumo: resumo?.slice(0, 500) || undefined,
          link: link?.startsWith("http") ? link : undefined,
          ano: ano?.slice(0, 4) || undefined,
          fonte: "LexML Brasil",
        });
      }
    });

    log("info", `LexML retornou ${items.length} resultado(s)`);
    return items;
  } catch (err) {
    log("warn", `LexML falhou: ${err}`);
    return [];
  }
}

async function buscarSenadoLegislacao(q: string, log: (l: "info" | "warn" | "error", m: string) => void): Promise<DoutrinaItem[]> {
  log("info", `Buscando Senado Federal API: "${q}"`);

  try {
    const apiUrl = `https://legis.senado.leg.br/norma/pesquisa?norma=${encodeURIComponent(q)}&formato=json&numeroResultados=10`;
    const data = await withRetry(() =>
      fetchJson<{ resultado?: { items?: { titulo?: string; ementa?: string; link?: string; ano?: string; autor?: string }[] } }>(
        apiUrl, { timeoutMs: 15000 }
      )
    );

    const items: DoutrinaItem[] = (data?.resultado?.items || []).map(item => ({
      titulo: item.titulo || "Documento do Senado",
      autor: item.autor || undefined,
      resumo: item.ementa?.slice(0, 500) || undefined,
      link: item.link || undefined,
      ano: item.ano || undefined,
      fonte: "Senado Federal",
    }));

    log("info", `Senado retornou ${items.length} resultado(s)`);
    return items;
  } catch (err) {
    log("warn", `Senado falhou: ${err}`);
    return [];
  }
}

async function buscarStfDoutrina(q: string, log: (l: "info" | "warn" | "error", m: string) => void): Promise<DoutrinaItem[]> {
  log("info", `Crawlee: buscando biblioteca STF: "${q}"`);

  try {
    const url = `https://portal.stf.jus.br/pesquisa/pesquisarConteudo.asp?palavraChave=${encodeURIComponent(q)}`;
    await randomDelay(600, 1400);

    const { $ } = await crawlUrl(url, {
      maxRequestsPerMinute: 15,
      maxRetries: 2,
      timeoutSecs: 25,
    });

    const items: DoutrinaItem[] = [];

    $(".resultado-pesquisa a, .pesquisa-resultado a, li.resultado a").each((_: number, el: any) => {
      const elRef = $(el);
      const titulo = elRef.text().trim();
      const link = elRef.attr("href") || "";
      if (titulo && titulo.length > 5) {
        items.push({
          titulo,
          link: link.startsWith("http") ? link : link ? `https://portal.stf.jus.br${link}` : undefined,
          fonte: "Portal STF",
        });
      }
    });

    log("info", `STF doutrina retornou ${items.length} resultado(s)`);

    // Enriquecer primeiro resultado com conteúdo via toMarkdown
    if (items.length > 0 && items[0].link) {
      try {
        const doc = await toMarkdown(items[0].link, { timeoutMs: 12000 });
        if (doc.markdown && doc.markdown.length > 100) {
          items[0].resumo = doc.markdown.slice(0, 600);
          log("info", `STF doutrina: íntegra extraída para "${items[0].titulo}"`);
        }
      } catch (enrichErr) {
        log("warn", `Falha ao enriquecer doutrina STF: ${enrichErr}`);
      }
    }

    return items;
  } catch (err) {
    log("warn", `STF doutrina falhou: ${err}`);
    return [];
  }
}

export async function buscarDoutrina(q: string): Promise<ScrapingResult<DoutrinaItem[]>> {
  const t0 = Date.now();
  const { logs, log } = makeLogger();

  log("info", `Motor Crawlee: buscando doutrina/legislação: "${q}"`);

  const [cnj, lexml, senado, stf] = await Promise.allSettled([
    buscarCnjBiblioteca(q, log),
    buscarLexML(q, log),
    buscarSenadoLegislacao(q, log),
    buscarStfDoutrina(q, log),
  ]);

  const items: DoutrinaItem[] = [
    ...(cnj.status === "fulfilled" ? cnj.value : []),
    ...(lexml.status === "fulfilled" ? lexml.value : []),
    ...(senado.status === "fulfilled" ? senado.value : []),
    ...(stf.status === "fulfilled" ? stf.value : []),
  ];

  log("info", `Total doutrina: ${items.length} resultado(s) de múltiplas fontes`);

  const md = items.length > 0
    ? [
        `# Pesquisa de Doutrina/Legislação — "${q}"`,
        "",
        ...items.map((item, i) => [
          `## ${i + 1}. ${item.titulo}`,
          item.autor ? `**Autor:** ${item.autor}` : "",
          item.ano ? `**Ano:** ${item.ano}` : "",
          item.fonte ? `**Fonte:** ${item.fonte}` : "",
          "",
          item.resumo || "",
          item.link ? `[Acessar documento](${item.link})` : "",
          "",
        ].filter(Boolean).join("\n")),
      ].join("\n")
    : `Nenhum resultado encontrado para "${q}" nas fontes disponíveis.`;

  return {
    source: "cnj_biblioteca",
    sourceLabel: "CNJ Biblioteca / LexML / Senado / STF",
    data: items,
    markdownContent: md,
    durationMs: Date.now() - t0,
    logs,
  };
}
