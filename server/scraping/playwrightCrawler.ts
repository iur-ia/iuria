/**
 * PlaywrightCrawler wrapper for JS-heavy tribunal portals (STF, PJe etc.).
 *
 * Anti-detecção reforçada:
 * - Viewport / screen realistas (1366×768, 1440×900, 1920×1080)
 * - Locale pt-BR e timezone America/Sao_Paulo
 * - webdriver property oculta via addInitScript
 * - Chromium com --disable-blink-features=AutomationControlled
 * - Firefox via launchContext.launcher = playwright.firefox + firefoxUserPrefs
 * - browserPoolOptions.fingerprintOptions com fingerprint-generator
 *
 * Degrades gracefully to CheerioCrawler when Playwright is unavailable.
 */

import type { PlaywrightCrawlerOptions } from "@crawlee/playwright";
import type { BrowserType } from "playwright";
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
  /**
   * Browser engine preference.
   * 'firefox' → Firefox fingerprint (mais difícil de detectar em portais Angular)
   * 'chromium' → padrão (mais rápido)
   */
  engine?: "firefox" | "chromium";
}

const REALISTIC_VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 1280, height: 800 },
] as const;

function randomViewport() {
  return REALISTIC_VIEWPORTS[Math.floor(Math.random() * REALISTIC_VIEWPORTS.length)];
}

const FIREFOX_UAS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
];

const CHROMIUM_UAS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];

function randomUA(engine: "firefox" | "chromium"): string {
  const pool = engine === "firefox" ? FIREFOX_UAS : CHROMIUM_UAS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Build typed PlaywrightCrawlerOptions for a given engine.
 * No `any` casts — uses PlaywrightCrawlerOptions directly.
 * @param launcher — the playwright BrowserType (playwright.firefox or playwright.chromium).
 *   Must be supplied by the async caller so the launcher is real, not the default Chromium.
 */
function buildCrawlerOptions(
  engine: "firefox" | "chromium",
  launcher: BrowserType,
  userAgent: string,
  timeoutMs: number,
  maxRetries: number,
  viewport: { width: number; height: number },
  waitForSelector: string | undefined,
  htmlRef: { value: string },
  titleRef: { value: string }
): PlaywrightCrawlerOptions {
  const isFirefox = engine === "firefox";

  const chromiumArgs = isFirefox
    ? []
    : [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
      ];

  /**
   * Fingerprint options for Crawlee BrowserPool.
   * fingerprint-generator is installed; these options inject realistic
   * Firefox/Chromium fingerprints at the HTTP + JS layer.
   */
  const browserPoolOptions: PlaywrightCrawlerOptions["browserPoolOptions"] = {
    fingerprintOptions: {
      fingerprintGeneratorOptions: {
        browsers: [isFirefox ? ("firefox" as const) : ("chrome" as const)],
        operatingSystems: ["windows" as const, "macos" as const, "linux" as const],
        locales: ["pt-BR"],
      },
    },
  };

  return {
    maxConcurrency: 1,
    requestHandlerTimeoutSecs: Math.ceil(timeoutMs / 1000) + 10,
    maxRequestRetries: maxRetries,
    headless: true,
    browserPoolOptions,
    launchContext: {
      /**
       * launcher = playwright.firefox or playwright.chromium passed from the
       * async caller. This is what actually switches Crawlee to Firefox —
       * firefoxUserPrefs alone does NOT switch the browser type.
       */
      launcher,
      launchOptions: {
        headless: true,
        args: chromiumArgs,
        // Spread Firefox-specific prefs only when the Firefox launcher is active.
        // Omitting the key entirely (not undefined) avoids Playwright option
        // validation warnings when Chromium is the launcher.
        ...(isFirefox
          ? {
              firefoxUserPrefs: {
                "dom.webdriver.enabled": false,
                "useAutomationExtension": false,
                "privacy.trackingprotection.enabled": false,
                "intl.accept_languages": "pt-BR,pt,en-US,en",
              },
            }
          : {}),
      },
      useIncognitoPages: true,
    },
    preNavigationHooks: [
      async ({ page }) => {
        await page.setExtraHTTPHeaders({
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
          "Referer": "https://www.google.com.br/",
          "User-Agent": userAgent,
        });
        await page.setViewportSize(viewport);

        // Mascarar sinais de automação
        await page.addInitScript(() => {
          Object.defineProperty(navigator, "webdriver", { get: () => undefined });
          Object.defineProperty(navigator, "languages", {
            get: () => ["pt-BR", "pt", "en-US", "en"],
          });
          // Suprimir chrome.runtime detection em Chromium
          if (!(window as unknown as Record<string, unknown>)["chrome"]) {
            (window as unknown as Record<string, unknown>)["chrome"] = { runtime: {} };
          }
        });
      },
    ],
    async requestHandler({ page, request }) {
      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout: timeoutMs }).catch(() => {});
      } else {
        await page.waitForLoadState("networkidle", { timeout: timeoutMs }).catch(() => {});
      }
      htmlRef.value = await page.content();
      titleRef.value = await page.title();
      void request;
    },
    failedRequestHandler({ request, error }) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[playwrightCrawler] Failed ${request.url}: ${msg}`);
    },
  };
}

/**
 * Fetch a URL using Playwright for full JS-rendering.
 * Falls back to CheerioCrawler if Playwright cannot launch.
 */
export async function crawlUrlWithBrowser(
  url: string,
  opts: BrowserFetchOptions = {}
): Promise<BrowserFetchResult> {
  const { timeoutMs = 20000, waitForSelector, maxRetries = 2, engine = "chromium" } = opts;
  const viewport = randomViewport();
  const userAgent = randomUA(engine);

  try {
    const { PlaywrightCrawler, Configuration } = await import("@crawlee/playwright");
    const { MemoryStorage } = await import("@crawlee/memory-storage");
    // Import playwright to get the actual browser type — this is what makes
    // Crawlee actually launch Firefox instead of defaulting to Chromium.
    const pw = await import("playwright");
    const launcher: BrowserType = engine === "firefox" ? pw.firefox : pw.chromium;

    const htmlRef = { value: "" };
    const titleRef = { value: "" };

    const config = new Configuration({ storageClient: new MemoryStorage() });

    const crawlerOptions = buildCrawlerOptions(
      engine, launcher, userAgent, timeoutMs, maxRetries, viewport,
      waitForSelector, htmlRef, titleRef
    );

    const crawler = new PlaywrightCrawler(crawlerOptions, config);
    await crawler.run([url]);

    if (!htmlRef.value) throw new Error("Playwright: empty content");

    return {
      url,
      html: htmlRef.value,
      markdown: htmlToMarkdown(htmlRef.value),
      title: titleRef.value,
      usedBrowser: true,
    };
  } catch (playwrightErr) {
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
