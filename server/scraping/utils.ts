import * as cheerio from "cheerio";
import type { ScrapingLog } from "./types";

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || "";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
];

export function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export function randomDelay(minMs = 800, maxMs = 2500): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1200
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw lastErr;
}

interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  useScraperApi?: boolean;
  countryCode?: string;
  timeoutMs?: number;
}

export async function fetchUrl(url: string, options: FetchOptions = {}): Promise<string> {
  const { useScraperApi = false, countryCode = "br", timeoutMs = 20000, ...fetchOpts } = options;

  let targetUrl = url;
  const headers: Record<string, string> = {
    "User-Agent": randomUserAgent(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    ...fetchOpts.headers,
  };

  if (useScraperApi && SCRAPER_API_KEY) {
    const params = new URLSearchParams({
      api_key: SCRAPER_API_KEY,
      url: targetUrl,
      country_code: countryCode,
      render: "false",
    });
    targetUrl = `http://api.scraperapi.com/?${params}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      method: fetchOpts.method || "GET",
      headers,
      body: fetchOpts.body,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T = unknown>(url: string, options: FetchOptions = {}): Promise<T> {
  const opts: FetchOptions = {
    ...options,
    headers: { "Accept": "application/json", ...(options.headers || {}) },
  };
  const text = await fetchUrl(url, opts);
  return JSON.parse(text) as T;
}

export function htmlToMarkdown(html: string): string {
  const $ = cheerio.load(html);

  $("script, style, nav, footer, header, iframe, noscript").remove();

  function processNode(el: ReturnType<typeof $>[number]): string {
    const node = el as any;
    if (node.type === "text") {
      return (node.data || "").replace(/\s+/g, " ");
    }
    if (node.type !== "tag") return "";

    const tag = (node.tagName || "").toLowerCase();
    const children: any[] = node.children || [];
    const childText = children.map(processNode).join("");

    switch (tag) {
      case "h1": return `\n# ${childText.trim()}\n\n`;
      case "h2": return `\n## ${childText.trim()}\n\n`;
      case "h3": return `\n### ${childText.trim()}\n\n`;
      case "h4": return `\n#### ${childText.trim()}\n\n`;
      case "p": return `\n${childText.trim()}\n`;
      case "br": return "\n";
      case "hr": return "\n---\n";
      case "strong": case "b": return `**${childText.trim()}**`;
      case "em": case "i": return `*${childText.trim()}*`;
      case "a": {
        const href = (node.attribs || {}).href || "";
        const text = childText.trim();
        if (!href || href.startsWith("#")) return text;
        return `[${text}](${href})`;
      }
      case "ul": {
        const items = (children as any[])
          .filter((c: any) => c.tagName === "li")
          .map((c: any) => `- ${processNode(c).trim()}`)
          .join("\n");
        return `\n${items}\n`;
      }
      case "ol": {
        let i = 1;
        const items = (children as any[])
          .filter((c: any) => c.tagName === "li")
          .map((c: any) => `${i++}. ${processNode(c).trim()}`)
          .join("\n");
        return `\n${items}\n`;
      }
      case "li": return childText;
      case "table": return `\n${childText}\n`;
      case "tr": {
        const cols = (children as any[])
          .filter((c: any) => c.tagName === "td" || c.tagName === "th")
          .map((c: any) => processNode(c).trim())
          .join(" | ");
        return `| ${cols} |\n`;
      }
      case "td": case "th": return childText;
      case "blockquote": return `\n> ${childText.trim()}\n`;
      case "pre": case "code": return `\`${childText.trim()}\``;
      default: return childText;
    }
  }

  const body = $("body").get(0) || $("*").get(0);
  let md = "";
  if (body) {
    md = processNode(body);
  }

  return md
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function makeLogger() {
  const logs: ScrapingLog[] = [];
  const log = (level: "info" | "warn" | "error", msg: string) => {
    logs.push({ ts: new Date().toISOString(), level, msg });
    if (level === "error") console.error(`[scraping] ${msg}`);
    else if (level === "warn") console.warn(`[scraping] ${msg}`);
    else console.log(`[scraping] ${msg}`);
  };
  return { logs, log };
}
