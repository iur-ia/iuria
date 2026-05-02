/**
 * Firecrawl-compatible markdown extraction wrapper.
 *
 * Uses the real Firecrawl API when FIRECRAWL_API_KEY is set in the environment.
 * Falls back to our local htmlToMarkdown (cheerio-based) otherwise.
 * This keeps the call-sites clean and allows upgrading to Firecrawl without
 * changing any scraper code.
 */

import { fetchUrl, htmlToMarkdown } from "./utils";

interface FirecrawlOptions {
  /** Optional timeout in ms (default 20000) */
  timeoutMs?: number;
  /** Use ScraperAPI proxy when fetching (bypasses anti-bot) */
  useScraperApi?: boolean;
}

interface FirecrawlResult {
  /** Normalised Markdown extracted from the page */
  markdown: string;
  /** Raw HTML (may be empty when using Firecrawl API) */
  html: string;
  /** URL that was actually crawled */
  url: string;
}

/**
 * Fetch a URL and return its content as Markdown.
 *
 * When FIRECRAWL_API_KEY is present, delegates to the Firecrawl /scrape endpoint
 * which handles JS rendering, anti-bot, and markdown normalisation.
 * Otherwise fetches the URL directly and converts HTML → Markdown locally.
 */
export async function toMarkdown(url: string, opts: FirecrawlOptions = {}): Promise<FirecrawlResult> {
  const { timeoutMs = 20000, useScraperApi = false } = opts;
  const apiKey = process.env.FIRECRAWL_API_KEY;

  if (apiKey) {
    const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ url, formats: ["markdown"] }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!resp.ok) {
      throw new Error(`Firecrawl API HTTP ${resp.status}: ${url}`);
    }

    const json = await resp.json() as { success?: boolean; data?: { markdown?: string; html?: string } };

    if (!json.success || !json.data) {
      throw new Error(`Firecrawl: resposta inesperada para ${url}`);
    }

    return {
      markdown: json.data.markdown || "",
      html: json.data.html || "",
      url,
    };
  }

  const html = await fetchUrl(url, { timeoutMs, useScraperApi });
  return {
    markdown: htmlToMarkdown(html),
    html,
    url,
  };
}
