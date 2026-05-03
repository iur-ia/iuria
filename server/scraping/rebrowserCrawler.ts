/**
 * Stealth browser fetch using rebrowser-playwright for Node.js.
 *
 * rebrowser-playwright is a drop-in replacement for playwright that patches
 * browser automation detection vectors at the C++ layer, making automation
 * much harder to fingerprint than standard playwright with init-script tricks.
 *
 * Use this module for portals protected by Cloudflare, Imperva, or similar
 * anti-bot systems where @crawlee/playwright triggers challenges.
 *
 * Falls back to playwrightCrawler if rebrowser-playwright fails to launch.
 */

import { htmlToMarkdown } from "./utils";

export interface RebrowserFetchResult {
  url: string;
  html: string;
  markdown: string;
  title: string;
  /** true = used rebrowser-playwright, false = fell back to standard crawler */
  usedRebrowser: boolean;
}

export interface RebrowserFetchOptions {
  /** Page timeout in ms. Default: 25 000. */
  timeoutMs?: number;
  /** CSS selector to wait for before capturing HTML. */
  waitForSelector?: string;
  /** Max retries before fallback. Default: 2. */
  maxRetries?: number;
  /**
   * Browser engine.
   * 'firefox' → Firefox fingerprint (melhor para portais Angular/eSAJ)
   * 'chromium' → Chromium (padrão, mais rápido)
   */
  engine?: "firefox" | "chromium";
}

const FIREFOX_UAS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:125.0) Gecko/20100101 Firefox/125.0",
];
const CHROMIUM_UAS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];
const VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Fetch a URL using rebrowser-playwright for maximum stealth.
 * Automatically falls back to standard playwrightCrawler on error.
 */
export async function crawlUrlWithRebrowser(
  url: string,
  opts: RebrowserFetchOptions = {}
): Promise<RebrowserFetchResult> {
  const { timeoutMs = 25000, waitForSelector, maxRetries = 2, engine = "chromium" } = opts;

  let lastErr: unknown;

  // Retry loop — uses maxRetries before falling back to playwrightCrawler.
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const viewport = pick(VIEWPORTS);
    const userAgent = engine === "firefox" ? pick(FIREFOX_UAS) : pick(CHROMIUM_UAS);

    try {
      // Dynamic import — rebrowser-playwright is a full playwright drop-in.
      const { chromium, firefox } = await import("rebrowser-playwright");
      const browserType = engine === "firefox" ? firefox : chromium;

      const launchArgs =
        engine === "chromium"
          ? [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-gpu",
              "--disable-dev-shm-usage",
              "--disable-blink-features=AutomationControlled",
            ]
          : [];

      const browser = await browserType.launch({
        headless: true,
        args: launchArgs,
        ...(engine === "firefox"
          ? {
              firefoxUserPrefs: {
                "dom.webdriver.enabled": false,
                "useAutomationExtension": false,
                "privacy.trackingprotection.enabled": false,
                "intl.accept_languages": "pt-BR,pt,en-US,en",
              },
            }
          : {}),
      });

      const context = await browser.newContext({
        userAgent,
        viewport,
        locale: "pt-BR",
        timezoneId: "America/Sao_Paulo",
        extraHTTPHeaders: {
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
          "Referer": "https://www.google.com.br/",
        },
      });

      const page = await context.newPage();

      // Suprimir sinais de automação no contexto da página
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
        Object.defineProperty(navigator, "languages", {
          get: () => ["pt-BR", "pt", "en-US", "en"],
        });
        if (!(window as unknown as Record<string, unknown>)["chrome"]) {
          (window as unknown as Record<string, unknown>)["chrome"] = { runtime: {} };
        }
      });

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });

      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout: timeoutMs }).catch(() => {});
      } else {
        await page.waitForLoadState("networkidle", { timeout: Math.min(timeoutMs, 15000) }).catch(() => {});
      }

      const html = await page.content();
      const title = await page.title();
      await browser.close();

      if (!html || html.length < 200) {
        throw new Error("rebrowser: empty/tiny page content");
      }

      console.log(`[rebrowserCrawler] OK engine=${engine} attempt=${attempt}/${maxRetries} url=${url.slice(0, 80)}`);

      return {
        url,
        html,
        markdown: htmlToMarkdown(html),
        title,
        usedRebrowser: true,
      };
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < maxRetries) {
        const backoffMs = 1500 * attempt;
        console.warn(`[rebrowserCrawler] Tentativa ${attempt}/${maxRetries} falhou (${msg}), aguardando ${backoffMs}ms`);
        await new Promise<void>(r => setTimeout(r, backoffMs));
      }
    }
  }

  // All retries exhausted — fall back to standard Playwright crawler
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  console.warn(`[rebrowserCrawler] ${maxRetries} tentativa(s) falharam (${msg}), usando playwrightCrawler como fallback`);

  const { crawlUrlWithBrowser } = await import("./playwrightCrawler");
  const result = await crawlUrlWithBrowser(url, { timeoutMs, waitForSelector, maxRetries, engine });
  return { ...result, usedRebrowser: false };
}
