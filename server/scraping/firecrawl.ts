/**
 * Firecrawl-compatible markdown extraction wrapper.
 *
 * toMarkdown(urlOrHtml, opts):
 *  - If `urlOrHtml` is an HTML document string (starts with `<`), converts
 *    it locally via htmlToMarkdown (no network request).
 *  - If `urlOrHtml` is a URL, and FIRECRAWL_API_KEY is set, delegates to the
 *    Firecrawl /v1/scrape API for JS-rendered, anti-bot-bypassed extraction.
 *  - Otherwise fetches the URL directly and converts HTML → Markdown locally.
 *
 * This keeps call-sites clean and allows upgrading to full Firecrawl without
 * changing any scraper code.
 */

import { fetchUrl, htmlToMarkdown } from "./utils";

interface FirecrawlOptions {
  /** Optional timeout in ms (default: 20000) */
  timeoutMs?: number;
  /** Use ScraperAPI proxy when fetching directly (default: false) */
  useScraperApi?: boolean;
}

interface FirecrawlResult {
  /** Normalised Markdown extracted from the page */
  markdown: string;
  /** Raw HTML (empty when input was already HTML or when using Firecrawl API) */
  html: string;
  /** URL that was crawled, or empty string when input was raw HTML */
  url: string;
}

/**
 * Convert a URL **or** raw HTML string to Markdown.
 *
 * Detection:
 *  - If `urlOrHtml` starts with `<` or `<!` it is treated as HTML content.
 *  - Otherwise it is treated as a URL.
 */
export async function toMarkdown(
  urlOrHtml: string,
  opts: FirecrawlOptions = {}
): Promise<FirecrawlResult> {
  const { timeoutMs = 20000, useScraperApi = false } = opts;

  // ── Detect raw HTML input ──────────────────────────────────────────────────
  const trimmed = urlOrHtml.trimStart();
  const isHtmlContent =
    trimmed.startsWith("<") ||
    trimmed.toLowerCase().startsWith("<!doctype") ||
    trimmed.toLowerCase().startsWith("<!DOCTYPE");

  if (isHtmlContent) {
    return {
      markdown: htmlToMarkdown(urlOrHtml),
      html: urlOrHtml,
      url: "",
    };
  }

  // ── URL path ───────────────────────────────────────────────────────────────
  const url = urlOrHtml;
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (apiKey) {
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ url, formats: ["markdown", "html"] }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!resp.ok) {
      throw new Error(`Firecrawl API HTTP ${resp.status}: ${url}`);
    }

    const json = await resp.json() as {
      success?: boolean;
      data?: { markdown?: string; html?: string };
    };

    if (!json.success || !json.data) {
      throw new Error(`Firecrawl: resposta inesperada para ${url}`);
    }

    return {
      markdown: json.data.markdown || "",
      html: json.data.html || "",
      url,
    };
  }

  // ── Local fallback: fetch + htmlToMarkdown ─────────────────────────────────
  const html = await fetchUrl(url, { timeoutMs, useScraperApi });
  return {
    markdown: htmlToMarkdown(html),
    html,
    url,
  };
}
