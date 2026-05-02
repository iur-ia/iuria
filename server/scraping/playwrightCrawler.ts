/**
 * Playwright-based browser crawler for JS-heavy tribunal portals.
 *
 * Uses Crawlee's PlaywrightCrawler with MemoryStorage.
 * Targets STF (portal.stf.jus.br), PJe (pje.jus.br), and other portals
 * that require JavaScript rendering for full page content extraction.
 *
 * Falls back gracefully to CheerioCrawler when the Playwright browser
 * binary is not available in the current deployment environment.
 */

import { Configuration, log as crawleeLog } from "crawlee";
import { MemoryStorage } from "@crawlee/memory-storage";
import { htmlToMarkdown } from "./utils";
import { crawlUrl, type CrawlResult } from "./crawler";

crawleeLog.setLevel(crawleeLog.LEVELS.WARNING);

export interface BrowserCrawlResult {
  url: string;
  html: string;
  markdown: string;
  title: string;
  usedBrowser: boolean;
}

interface BrowserCrawlOptions {
  /** Page wait timeout in ms (default: 20000) */
  timeoutMs?: number;
  /** CSS selector to wait for before extracting content */
  waitForSelector?: string;
  /** Max retry attempts (default: 2) */
  maxRetries?: number;
}

/**
 * Attempt to crawl a URL using Crawlee's PlaywrightCrawler.
 * If Playwright browser binaries are unavailable, falls back to CheerioCrawler.
 */
export async function crawlUrlWithBrowser(
  url: string,
  opts: BrowserCrawlOptions = {}
): Promise<BrowserCrawlResult> {
  const { timeoutMs = 20000, waitForSelector, maxRetries = 2 } = opts;

  // Attempt Playwright-based crawl first (for JS-rendered content)
  try {
    const { PlaywrightCrawler } = await import("crawlee");
    const config = new Configuration({ storageClient: new MemoryStorage() });

    let html = "";
    let title = "";

    const crawler = new PlaywrightCrawler(
      {
        maxConcurrency: 1,
        requestHandlerTimeoutSecs: Math.ceil(timeoutMs / 1000) + 10,
        maxRequestRetries: maxRetries,
        async requestHandler({ page, request }) {
          if (waitForSelector) {
            await page.waitForSelector(waitForSelector, { timeout: timeoutMs }).catch(() => {});
          } else {
            await page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => {});
          }
          html = await page.content();
          title = await page.title();
          void request; // mark as used
        },
        failedRequestHandler({ request, error }) {
          const msg = error instanceof Error ? error.message : String(error);
          console.warn(`[playwrightCrawler] Failed ${request.url}: ${msg}`);
        },
        launchContext: {
          launchOptions: {
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
          },
        },
      },
      config
    );

    await crawler.run([url]);

    if (!html) throw new Error("Playwright: conteúdo vazio");

    return {
      url,
      html,
      markdown: htmlToMarkdown(html),
      title,
      usedBrowser: true,
    };
  } catch (playwrightErr) {
    // Playwright unavailable or failed — degrade to CheerioCrawler
    const errMsg = playwrightErr instanceof Error ? playwrightErr.message : String(playwrightErr);
    console.warn(`[playwrightCrawler] Playwright indisponível (${errMsg}), usando CheerioCrawler`);

    const result: CrawlResult = await crawlUrl(url, {
      maxConcurrency: 1,
      maxRetries,
      timeoutSecs: Math.ceil(timeoutMs / 1000) + 5,
    });

    return {
      url: result.url,
      html: result.html,
      markdown: htmlToMarkdown(result.html),
      title: result.$("title").text().trim(),
      usedBrowser: false,
    };
  }
}

/**
 * Extract full decision text (íntegra) from a tribunal portal page.
 * Optimised for STF and STJ decision pages.
 */
export async function extrairIntegraDecisao(url: string): Promise<string> {
  try {
    const { html, markdown } = await crawlUrlWithBrowser(url, {
      timeoutMs: 25000,
      waitForSelector: ".ementa, .decisao, #acordao, .inteiro-teor, .acordaoTexto",
    });

    if (markdown && markdown.length > 200) return markdown.slice(0, 10000);

    // Fallback: use CheerioCrawler with cheerio extraction
    const result = await crawlUrl(url, { timeoutSecs: 20 });
    const $ = result.$;
    const integra = $(
      ".ementa, .decisao, #acordao, .inteiro-teor, .acordaoTexto, article, main"
    ).text().trim();

    void html; // mark as used
    return integra.slice(0, 10000) || markdown.slice(0, 10000);
  } catch (err) {
    console.warn(`[playwrightCrawler] Falha ao extrair íntegra de ${url}: ${err}`);
    return "";
  }
}
