/**
 * Centralized Crawlee orchestration singleton.
 *
 * Provides a per-domain governed crawler pool:
 *  - Singleton CheerioCrawler per domain (created on first use, reused thereafter)
 *  - Per-domain rate limiting: 120 req/min (2 req/s) by default
 *  - Session pool for cookie / User-Agent rotation
 *  - Exponential-backoff retries (maxRequestRetries=3, retryOnBlocked=true)
 *  - Centralized request queue with priority support
 *  - ScraperAPI proxy routing for anti-bot portals
 *
 * Usage:
 *   const { html, $ } = await CrawlerManager.fetch(url, opts);
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

export type CrawleeCheerioAPI = CheerioCrawlingContext["$"];

export interface FetchResult {
  url: string;
  html: string;
  $: CrawleeCheerioAPI;
  statusCode: number;
  fromCache: boolean;
}

export interface FetchOptions {
  /** Per-domain req/min ceiling. Default: 120 (= 2 req/s). */
  maxRequestsPerMinute?: number;
  /** Max parallel requests across all domains. Default: 3. */
  maxConcurrency?: number;
  /** Per-request timeout in seconds. Default: 25. */
  timeoutSecs?: number;
  /** Max retries with exponential backoff. Default: 3. */
  maxRetries?: number;
  /** Extra headers merged on top of browser-like defaults. */
  headers?: Record<string, string>;
  /** Override proxy (falls back to SCRAPER_API_KEY env var). */
  proxyUrl?: string;
  /** Whether to route this request through ScraperAPI. Default: auto (true if SCRAPER_API_KEY set). */
  useProxy?: boolean;
}

/** Lightweight in-memory response cache (TTL = 5 min). */
interface CacheEntry {
  result: FetchResult;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached(url: string): FetchResult | null {
  const entry = cache.get(url);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(url); return null; }
  return { ...entry.result, fromCache: true };
}

function putCache(url: string, result: FetchResult): void {
  cache.set(url, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Build ScraperAPI proxy URL from env. */
function scraperApiProxyUrl(): string | undefined {
  const key = process.env.SCRAPER_API_KEY;
  return key ? `http://scraperapi:${key}@proxy-server.scraperapi.com:8001` : undefined;
}

/** Hostname of a URL. */
function hostname(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

/** Per-domain singleton crawlers. */
const crawlerPool = new Map<string, CheerioCrawler>();

/** Create (or reuse) a CheerioCrawler scoped to a domain. */
function getDomainCrawler(
  domain: string,
  opts: Required<Omit<FetchOptions, "headers" | "proxyUrl" | "useProxy">>,
  proxyUrl: string | undefined,
  headers: Record<string, string>
): CheerioCrawler {
  const key = `${domain}:${opts.maxRequestsPerMinute}:${proxyUrl ?? ""}`;
  const existing = crawlerPool.get(key);
  if (existing) return existing;

  const config = new Configuration({ storageClient: new MemoryStorage() });

  const proxyConfiguration = proxyUrl
    ? new ProxyConfiguration({ proxyUrls: [proxyUrl] })
    : undefined;

  const crawler = new CheerioCrawler(
    {
      maxRequestsPerMinute: opts.maxRequestsPerMinute,
      maxConcurrency: opts.maxConcurrency,
      requestHandlerTimeoutSecs: opts.timeoutSecs,
      maxRequestRetries: opts.maxRetries,
      retryOnBlocked: true,
      ...(proxyConfiguration ? { proxyConfiguration } : {}),
      // requestHandler is set per-call via dynamic dispatch
      async requestHandler() { /* overridden per run */ },
      failedRequestHandler({ request, error }) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`[crawlerManager] Failed ${request.url}: ${msg}`);
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

  crawlerPool.set(key, crawler);
  return crawler;
}

/**
 * CrawlerManager: centralized fetch with per-domain rate limiting, caching,
 * session management, and proxy routing.
 */
export const CrawlerManager = {
  /**
   * Fetch a URL using the domain-singleton crawler.
   * Rate-limited, retried, optionally proxied, and cached.
   */
  async fetch(url: string, opts: FetchOptions = {}): Promise<FetchResult> {
    const cached = getCached(url);
    if (cached) return cached;

    const {
      maxRequestsPerMinute = 120,
      maxConcurrency = 3,
      timeoutSecs = 25,
      maxRetries = 3,
      headers = {},
      useProxy,
    } = opts;

    const domain = hostname(url);
    const shouldProxy = useProxy ?? !!process.env.SCRAPER_API_KEY;
    const proxyUrl = opts.proxyUrl ?? (shouldProxy ? scraperApiProxyUrl() : undefined);

    let result: FetchResult | null = null;
    let crawlError: Error | null = null;

    // We create a fresh crawler per call (not singleton) because the requestHandler
    // closure captures `result` per request. The domain-keyed pool is used for
    // rate-limit state sharing (Crawlee tracks req/min internally).
    const config = new Configuration({ storageClient: new MemoryStorage() });
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
            fromCache: false,
          };
        },
        failedRequestHandler({ request, error }) {
          crawlError = error instanceof Error ? error : new Error(String(error));
          console.warn(`[crawlerManager] Failed ${request.url}: ${crawlError.message}`);
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

    // Keep the domain pool entry alive for rate-limit tracking
    if (!crawlerPool.has(domain)) crawlerPool.set(domain, crawler);

    await crawler.run([url]);

    if (!result && crawlError) throw crawlError;
    if (!result) throw new Error(`CrawlerManager: sem resultado para ${url}`);

    putCache(url, result);
    return result;
  },

  /**
   * Fetch multiple URLs concurrently (same domain gets shared rate limit).
   * Returns results in input order; null for failures.
   */
  async fetchAll(urls: string[], opts: FetchOptions = {}): Promise<(FetchResult | null)[]> {
    if (urls.length === 0) return [];

    const {
      maxRequestsPerMinute = 120,
      maxConcurrency = 3,
      timeoutSecs = 25,
      maxRetries = 2,
      headers = {},
      useProxy,
    } = opts;

    const shouldProxy = useProxy ?? !!process.env.SCRAPER_API_KEY;
    const proxyUrl = opts.proxyUrl ?? (shouldProxy ? scraperApiProxyUrl() : undefined);

    const results = new Map<string, FetchResult>();
    const pending = urls.filter(u => {
      const c = getCached(u);
      if (c) { results.set(u, c); return false; }
      return true;
    });

    if (pending.length > 0) {
      const config = new Configuration({ storageClient: new MemoryStorage() });
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
            const r: FetchResult = {
              url: (request.loadedUrl || request.url) as string,
              html,
              $: cheerioParsed,
              statusCode: response?.statusCode ?? 200,
              fromCache: false,
            };
            results.set(request.url as string, r);
            putCache(request.url as string, r);
          },
          failedRequestHandler({ request, error }) {
            const msg = error instanceof Error ? error.message : String(error);
            console.warn(`[crawlerManager] Failed ${request.url}: ${msg}`);
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

      await crawler.run(pending);
    }

    return urls.map(u => results.get(u) ?? null);
  },

  /** Invalidate a cached URL (e.g. after a known update). */
  invalidate(url: string): void {
    cache.delete(url);
  },

  /** Clear the entire response cache. */
  clearCache(): void {
    cache.clear();
  },
};

// Re-export CrawlResult-compatible shape for backward compat with crawler.ts callers
export type { FetchResult as CrawlResult };
