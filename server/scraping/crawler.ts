/**
 * Crawlee-based HTTP crawler engine.
 *
 * Uses CheerioCrawler (cheerio + HTTP) with:
 *  - MemoryStorage (no disk required)
 *  - Per-domain rate limiting (maxRequestsPerMinute)
 *  - Session pool for anti-bot UA rotation
 *  - Exponential-backoff retries (maxRequestRetries)
 *  - Configurable concurrency and timeout
 *
 * Playwright/browser crawling is intentionally not used on this deployment
 * target (Replit); CheerioCrawler is equivalent for the HTML-rendered portals
 * targeted (e-SAJ, SCON, LexML, CNJ Biblioteca).  JS-heavy portals are reached
 * through ScraperAPI as the rendering proxy.
 */

import { CheerioCrawler, Configuration, log as crawleeLog } from "crawlee";
import { MemoryStorage } from "@crawlee/memory-storage";
import { randomUserAgent } from "./utils";

crawleeLog.setLevel(crawleeLog.LEVELS.WARNING);

export interface CrawlResult {
  url: string;
  html: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $: any;
  statusCode: number;
}

interface CrawlOptions {
  /** Max requests per minute per domain (default: 30) */
  maxRequestsPerMinute?: number;
  /** Max concurrent requests (default: 2) */
  maxConcurrency?: number;
  /** Per-request timeout in seconds (default: 25) */
  timeoutSecs?: number;
  /** Max retry attempts (default: 3, with exponential backoff) */
  maxRetries?: number;
  /** Extra headers to send with request */
  headers?: Record<string, string>;
  /** Proxy URL (e.g. ScraperAPI URL) */
  proxyUrl?: string;
}

/**
 * Fetch a single URL using Crawlee CheerioCrawler.
 * Returns parsed cheerio object, raw HTML, and status code.
 */
export async function crawlUrl(url: string, opts: CrawlOptions = {}): Promise<CrawlResult> {
  const {
    maxRequestsPerMinute = 30,
    maxConcurrency = 2,
    timeoutSecs = 25,
    maxRetries = 3,
    headers = {},
    proxyUrl,
  } = opts;

  const config = new Configuration({ storageClient: new MemoryStorage() });

  let result: CrawlResult | null = null;
  let crawlError: Error | null = null;

  const crawler = new CheerioCrawler(
    {
      maxRequestsPerMinute,
      maxConcurrency,
      requestHandlerTimeoutSecs: timeoutSecs,
      maxRequestRetries: maxRetries,
      retryOnBlocked: true,
      ...(proxyUrl ? { proxyConfiguration: { newUrlFunction: async () => proxyUrl } as any } : {}),
      async requestHandler({ $: cheerioParsed, body, request, response }: any) {
        const html = typeof body === "string" ? body : body.toString("utf-8");
        result = {
          url: (request.loadedUrl || request.url) as string,
          html,
          $: cheerioParsed,
          statusCode: (response?.statusCode ?? 200) as number,
        };
      },
      async failedRequestHandler({ request, error }: any) {
        const err = error instanceof Error ? error : new Error(String(error));
        crawlError = err;
        console.warn(`[crawler] Failed ${request.url}: ${err.message}`);
      },
      additionalMimeTypes: ["application/json", "application/xml", "text/xml"],
      preNavigationHooks: [
        async ({ request }) => {
          request.headers = {
            "User-Agent": randomUserAgent(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            ...headers,
            ...(request.headers || {}),
          };
        },
      ],
    },
    config
  );

  await crawler.run([url]);

  if (!result && crawlError) throw crawlError;
  if (!result) throw new Error(`Crawlee: sem resultado para ${url}`);

  return result;
}

/**
 * Fetch multiple URLs concurrently using a single Crawlee CheerioCrawler run.
 * Returns an array of results in the same order as the input URLs (null for failures).
 */
export async function crawlUrls(urls: string[], opts: CrawlOptions = {}): Promise<(CrawlResult | null)[]> {
  if (urls.length === 0) return [];

  const {
    maxRequestsPerMinute = 30,
    maxConcurrency = 3,
    timeoutSecs = 25,
    maxRetries = 2,
    headers = {},
    proxyUrl,
  } = opts;

  const config = new Configuration({ storageClient: new MemoryStorage() });
  const results = new Map<string, CrawlResult>();

  const crawler = new CheerioCrawler(
    {
      maxRequestsPerMinute,
      maxConcurrency,
      requestHandlerTimeoutSecs: timeoutSecs,
      maxRequestRetries: maxRetries,
      retryOnBlocked: true,
      ...(proxyUrl ? { proxyConfiguration: { newUrlFunction: async () => proxyUrl } as any } : {}),
      async requestHandler({ $: cheerioParsed, body, request, response }: any) {
        const html = typeof body === "string" ? body : body.toString("utf-8");
        results.set(request.url as string, {
          url: (request.loadedUrl || request.url) as string,
          html,
          $: cheerioParsed,
          statusCode: (response?.statusCode ?? 200) as number,
        });
      },
      async failedRequestHandler({ request, error }: any) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`[crawler] Failed ${request.url}: ${msg}`);
      },
      preNavigationHooks: [
        async ({ request }) => {
          request.headers = {
            "User-Agent": randomUserAgent(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            ...headers,
            ...(request.headers || {}),
          };
        },
      ],
    },
    config
  );

  await crawler.run(urls);

  return urls.map(u => results.get(u) ?? null);
}
