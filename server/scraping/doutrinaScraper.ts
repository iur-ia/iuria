import * as cheerio from "cheerio";
import type { DoutrinaItem, ScrapingResult } from "./types";
import { fetchUrl, fetchJson, makeLogger, withRetry, randomDelay } from "./utils";

interface CnjBibliotecaItem {
  id?: string | number;
  titulo?: string;
  autor?: string;
  autores?: string[];
  resumo?: string;
  abstract?: string;
  url?: string;
  link?: string;
  ano?: string | number;
  tipo?: string;
  assunto?: string;
}

async function buscarCnjBiblioteca(q: string, log: (l: "info" | "warn" | "error", m: string) => void): Promise<DoutrinaItem[]> {
  log("info", `Buscando CNJ Biblioteca: "${q}"`);

  try {
    const url = `https://bibliotecadigital.cnj.jus.br/xmlui/discover?query=${encodeURIComponent(q)}&rpp=10&format=json`;
    await randomDelay(500, 1200);

    const html = await withRetry(() => fetchUrl(url, { timeoutMs: 20000 }));
    const $ = cheerio.load(html);

    const items: DoutrinaItem[] = [];

    $(".artifact-title, .ds-artifact-item, li.ds-artifact-item").each((_, el) => {
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

    if (items.length === 0) {
      const url2 = `https://biblioteca.cnj.jus.br/pergamumweb/vinculos/000075/0000756f.htm#search=${encodeURIComponent(q)}`;
      log("info", `Tentando Pergamum CNJ: ${url2}`);
    }

    log("info", `CNJ Biblioteca retornou ${items.length} resultado(s)`);
    return items;
  } catch (err) {
    log("warn", `CNJ Biblioteca falhou: ${err}`);
    return [];
  }
}

async function buscarLeisJusBrasil(q: string, log: (l: "info" | "warn" | "error", m: string) => void): Promise<DoutrinaItem[]> {
  log("info", `Buscando Planalto/LexML: "${q}"`);

  try {
    const url = `https://www.lexml.gov.br/busca/SRU?operation=searchRetrieve&query=${encodeURIComponent(q)}&maximumRecords=10&recordSchema=dc`;
    await randomDelay(400, 900);

    const xml = await withRetry(() => fetchUrl(url, { timeoutMs: 15000 }));
    const $ = cheerio.load(xml, { xmlMode: true });

    const items: DoutrinaItem[] = [];

    $("record, srw\\:record, zs\\:record").each((_, el) => {
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
  log("info", `Buscando Senado Federal: "${q}"`);

  try {
    const url = `https://www.senado.leg.br/atividade/const/con1988/ADC1988_12.07.2016/pesquisa.asp?pesquisa=${encodeURIComponent(q)}`;
    await randomDelay(400, 900);

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
  log("info", `Buscando biblioteca STF: "${q}"`);

  try {
    const url = `https://portal.stf.jus.br/pesquisa/pesquisarConteudo.asp?palavraChave=${encodeURIComponent(q)}`;
    await randomDelay(600, 1400);

    const html = await withRetry(() => fetchUrl(url, { timeoutMs: 20000 }));
    const $ = cheerio.load(html);

    const items: DoutrinaItem[] = [];

    $(".resultado-pesquisa a, .pesquisa-resultado a, li.resultado a").each((_, el) => {
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
    return items;
  } catch (err) {
    log("warn", `STF doutrina falhou: ${err}`);
    return [];
  }
}

export async function buscarDoutrina(q: string): Promise<ScrapingResult<DoutrinaItem[]>> {
  const t0 = Date.now();
  const { logs, log } = makeLogger();

  log("info", `Buscando doutrina/legislação: "${q}"`);

  const [cnj, lexml, senado, stf] = await Promise.allSettled([
    buscarCnjBiblioteca(q, log),
    buscarLeisJusBrasil(q, log),
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
