/**
 * PlaywrightCrawler wrapper for JS-heavy tribunal portals (STF, PJe etc.).
 *
 * Uses Crawlee's PlaywrightCrawler backed by Playwright/Chromium.
 * Degrades gracefully to CheerioCrawler when Playwright is unavailable
 * (missing binary or runtime error).
 *
 * Playwright is now an explicit dependency (package.json) so browser-based
 * scraping is available in production. Binary download on first use:
 *   node_modules/.bin/playwright install chromium --with-deps
 */

import { htmlToMarkdown } from "./utils";
import { CrawlerManager } from "./crawlerManager";

export interface BrowserFetchResult {
  url: string;
  html: string;
  markdown: string;
  title: string;
  usedBrowser: boolean;
}

export interface BrowserFetchOptions {
  /** Playwright page timeout in ms. Default: 20 000. */
  timeoutMs?: number;
  /** CSS selector to wait for before capturing HTML. */
  waitForSelector?: string;
  /** Max retries (degraded to Cheerio after first Playwright failure). */
  maxRetries?: number;
}

/**
 * Fetch a URL using Playwright (Chromium) for full JS-rendering.
 * Falls back to CheerioCrawler if Playwright cannot launch.
 */
export async function crawlUrlWithBrowser(
  url: string,
  opts: BrowserFetchOptions = {}
): Promise<BrowserFetchResult> {
  const { timeoutMs = 20000, waitForSelector, maxRetries = 2 } = opts;

  try {
    // Dynamic import so the module loads even when @crawlee/playwright is missing
    const { PlaywrightCrawler, Configuration } = await import("@crawlee/playwright");
    const { MemoryStorage } = await import("@crawlee/memory-storage");

    let html = "";
    let title = "";

    const config = new Configuration({ storageClient: new MemoryStorage() });

    const crawler = new PlaywrightCrawler(
      {
        maxConcurrency: 1,
        requestHandlerTimeoutSecs: Math.ceil(timeoutMs / 1000) + 10,
        maxRequestRetries: maxRetries,
        headless: true,
        launchContext: {
          launchOptions: {
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
          },
        },
        async requestHandler({ page, request }) {
          if (waitForSelector) {
            await page.waitForSelector(waitForSelector, { timeout: timeoutMs }).catch(() => {});
          } else {
            await page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => {});
          }
          html = await page.content();
          title = await page.title();
          void request;
        },
        failedRequestHandler({ request, error }) {
          const msg = error instanceof Error ? error.message : String(error);
          console.warn(`[playwrightCrawler] Failed ${request.url}: ${msg}`);
        },
      },
      config
    );

    await crawler.run([url]);

    if (!html) throw new Error("Playwright: empty content");

    return {
      url,
      html,
      markdown: htmlToMarkdown(html),
      title,
      usedBrowser: true,
    };
  } catch (playwrightErr) {
    // Playwright unavailable or timed out — degrade to CheerioCrawler
    const errMsg = playwrightErr instanceof Error ? playwrightErr.message : String(playwrightErr);
    console.warn(`[playwrightCrawler] Playwright indisponível (${errMsg}), usando CheerioCrawler`);

    const result = await CrawlerManager.fetch(url, {
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

    // Fallback: Cheerio-only extraction
    const result = await CrawlerManager.fetch(url, { timeoutSecs: 20 });
    const $ = result.$;
    const integra = $(
      ".ementa, .decisao, #acordao, .inteiro-teor, .acordaoTexto, article, main"
    ).text().trim();

    void html;
    return integra.slice(0, 10000) || markdown.slice(0, 10000);
  } catch (err) {
    console.warn(`[playwrightCrawler] Falha ao extrair íntegra de ${url}: ${err}`);
    return "";
  }
}
