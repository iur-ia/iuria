/**
 * Crawlee-based HTTP crawler engine (CheerioCrawler).
 *
 * Uses CheerioCrawler (cheerio + HTTP) with:
 *  - MemoryStorage (no disk required, suitable for serverless/Replit)
 *  - Per-domain rate limiting (maxRequestsPerMinute)
 *  - Session pool for User-Agent rotation as anti-bot measure
 *  - Exponential-backoff retries (maxRequestRetries)
 *  - Configurable concurrency and timeout
 *  - ProxyConfiguration for ScraperAPI integration
 *
 * For JS-heavy portals (STF, PJe), see playwrightCrawler.ts which wraps
 * Crawlee's PlaywrightCrawler with graceful degradation.
 */

import {
  CheerioCrawler,
  Configuration,
  ProxyConfiguration,
  log as crawleeLog,
} from "crawlee";
import { MemoryStorage } from "@crawlee/memory-storage";
import type { CheerioCrawlingContext } from "@crawlee/cheerio";
import { randomUserAgent } from "./utils";

crawleeLog.setLevel(crawleeLog.LEVELS.WARNING);

/** Cheerio API type from Crawlee's bundled cheerio. */
export type CrawleeCheerioAPI = CheerioCrawlingContext["$"];

export interface CrawlResult {
  url: string;
  html: string;
  $: CrawleeCheerioAPI;
  statusCode: number;
}

interface CrawlOptions {
  /** Max requests per minute (default: 30) */
  maxRequestsPerMinute?: number;
  /** Max concurrent requests (default: 2) */
  maxConcurrency?: number;
  /** Per-request timeout in seconds (default: 25) */
  timeoutSecs?: number;
  /** Max retry attempts with exponential backoff (default: 3) */
  maxRetries?: number;
  /** Extra headers to send */
  headers?: Record<string, string>;
  /** Proxy URL (e.g. ScraperAPI endpoint) */
  proxyUrl?: string;
}

/**
 * Fetch a single URL via Crawlee CheerioCrawler.
 * Returns parsed cheerio handle, raw HTML, and HTTP status code.
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

  const proxyConfiguration = proxyUrl
    ? new ProxyConfiguration({ proxyUrls: [proxyUrl] })
    : undefined;

  const crawler = new CheerioCrawler(
    {
      maxRequestsPerMinute,
      maxConcurrency,
      requestHandlerTimeoutSecs: timeoutSecs,
      maxRequestRetries: maxRetries,
      retryOnBlocked: true,
      ...(proxyConfiguration ? { proxyConfiguration } : {}),
      async requestHandler(ctx: CheerioCrawlingContext) {
        const { $: cheerioParsed, body, request, response } = ctx;
        const html = typeof body === "string" ? body : (body as Buffer).toString("utf-8");
        result = {
          url: (request.loadedUrl || request.url) as string,
          html,
          $: cheerioParsed,
          statusCode: response?.statusCode ?? 200,
        };
      },
      failedRequestHandler({ request, error }) {
        crawlError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[crawler] Failed ${request.url}: ${crawlError.message}`);
      },
      additionalMimeTypes: ["application/json", "application/xml", "text/xml"],
      preNavigationHooks: [
        async ({ request }: { request: CheerioCrawlingContext["request"] }) => {
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
 * Fetch multiple URLs concurrently via a single Crawlee CheerioCrawler run.
 * Returns results in the same order as the input URLs; null for failures.
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

  const proxyConfiguration = proxyUrl
    ? new ProxyConfiguration({ proxyUrls: [proxyUrl] })
    : undefined;

  const crawler = new CheerioCrawler(
    {
      maxRequestsPerMinute,
      maxConcurrency,
      requestHandlerTimeoutSecs: timeoutSecs,
      maxRequestRetries: maxRetries,
      retryOnBlocked: true,
      ...(proxyConfiguration ? { proxyConfiguration } : {}),
      async requestHandler(ctx: CheerioCrawlingContext) {
        const { $: cheerioParsed, body, request, response } = ctx;
        const html = typeof body === "string" ? body : (body as Buffer).toString("utf-8");
        results.set(request.url as string, {
          url: (request.loadedUrl || request.url) as string,
          html,
          $: cheerioParsed,
          statusCode: response?.statusCode ?? 200,
        });
      },
      failedRequestHandler({ request, error }) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`[crawler] Failed ${request.url}: ${msg}`);
      },
      preNavigationHooks: [
        async ({ request }: { request: CheerioCrawlingContext["request"] }) => {
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
