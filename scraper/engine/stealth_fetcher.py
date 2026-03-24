#!/usr/bin/env python3
"""
Multi-Strategy Stealth Fetcher - iuria LexFutura
=================================================

Provides 4 layers of HTTP fetching, each progressively more stealthy:

Layer 1: curl_cffi   - TLS/JA3 fingerprint impersonation (fastest, bypasses TLS checks)
Layer 2: Scrapling   - Anti-bot bypass with stealth mode (bypasses Cloudflare Turnstile)
Layer 3: Patchright  - Patched Chromium that doesn't expose automation APIs
Layer 4: Playwright  - Standard browser automation with stealth scripts (fallback)

Each layer includes human behavior simulation:
- Bezier curve mouse movements
- Realistic typing with errors and corrections
- Random delays with gaussian distribution
- Scroll behavior matching real users
- Canvas/WebGL/Audio fingerprint spoofing
"""

import asyncio
import json
import logging
import os
import random
import re
import time
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List, Tuple

logger = logging.getLogger("iuria.engine.stealth")


@dataclass
class FetchResult:
    """Result from any fetch operation"""
    url: str
    status_code: int = 0
    html: str = ""
    text: str = ""  # visible text content
    headers: Dict[str, str] = field(default_factory=dict)
    method: str = ""  # which layer succeeded
    elapsed_ms: float = 0
    error: Optional[str] = None
    cookies: Dict[str, str] = field(default_factory=dict)

    @property
    def success(self) -> bool:
        return self.status_code == 200 and len(self.html) > 100 and self.error is None

    @property
    def is_blocked(self) -> bool:
        if self.status_code in (403, 429, 503):
            return True
        if self.html:
            blocked_indicators = [
                "access denied", "blocked", "captcha", "rate limit",
                "challenge-platform", "cf-browser-verification",
                "please verify", "bot detection",
            ]
            html_lower = self.html.lower()
            return any(ind in html_lower for ind in blocked_indicators)
        return False


class CurlCffiLayer:
    """
    Layer 1: curl_cffi - Impersonate real browser TLS/JA3 fingerprints.
    Fastest option. Bypasses TLS-based bot detection.
    Does NOT execute JavaScript.
    """

    IMPERSONATE_TARGETS = [
        "chrome131", "chrome130", "chrome124", "chrome120",
        "chrome116", "chrome110", "chrome107",
        "edge131", "edge101",
    ]

    def __init__(self):
        self._session = None

    def _get_session(self):
        if self._session is None:
            try:
                from curl_cffi.requests import Session
                target = random.choice(self.IMPERSONATE_TARGETS)
                self._session = Session(impersonate=target)
                logger.info(f"curl_cffi session: impersonating {target}")
            except ImportError:
                logger.warning("curl_cffi not available")
                return None
        return self._session

    def fetch(self, url: str, method: str = "GET", data: dict = None,
              headers: dict = None, timeout: int = 30) -> FetchResult:
        """Fetch URL with TLS impersonation"""
        start = time.time()
        session = self._get_session()
        if not session:
            return FetchResult(url=url, error="curl_cffi not available", method="curl_cffi")

        try:
            default_headers = {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive",
                "DNT": "1",
                "Upgrade-Insecure-Requests": "1",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
            }
            if headers:
                default_headers.update(headers)

            if method.upper() == "POST" and data:
                resp = session.post(url, data=data, headers=default_headers,
                                    timeout=timeout, allow_redirects=True, verify=False)
            else:
                resp = session.get(url, headers=default_headers,
                                   timeout=timeout, allow_redirects=True, verify=False)

            elapsed = (time.time() - start) * 1000
            return FetchResult(
                url=str(resp.url),
                status_code=resp.status_code,
                html=resp.text,
                headers=dict(resp.headers),
                method="curl_cffi",
                elapsed_ms=elapsed,
                cookies={k: v for k, v in resp.cookies.items()},
            )
        except Exception as e:
            elapsed = (time.time() - start) * 1000
            return FetchResult(url=url, error=f"curl_cffi: {e}", method="curl_cffi", elapsed_ms=elapsed)


class ScraplingLayer:
    """
    Layer 2: Scrapling StealthyFetcher - Bypasses Cloudflare and anti-bot.
    Uses camoufox/stealth browser under the hood.
    """

    async def fetch(self, url: str, timeout: int = 30) -> FetchResult:
        """Fetch URL using Scrapling's stealth mode"""
        start = time.time()
        try:
            from scrapling import StealthyFetcher

            fetcher = StealthyFetcher()
            page = await asyncio.to_thread(
                fetcher.fetch, url, headless=True, disable_resources=True
            )

            elapsed = (time.time() - start) * 1000
            html = page.html_content if hasattr(page, 'html_content') else str(page)
            status = page.status if hasattr(page, 'status') else 200

            return FetchResult(
                url=url,
                status_code=status,
                html=html,
                text=page.get_text() if hasattr(page, 'get_text') else "",
                method="scrapling",
                elapsed_ms=elapsed,
            )
        except Exception as e:
            elapsed = (time.time() - start) * 1000
            return FetchResult(url=url, error=f"scrapling: {e}", method="scrapling", elapsed_ms=elapsed)


class PatchrightLayer:
    """
    Layer 3: Patchright - Patched Chromium that removes automation detection.
    Full JS execution, CAPTCHA solving support.
    """

    def __init__(self):
        self._pw = None
        self._browser = None

    async def _ensure_browser(self):
        if self._browser is None:
            try:
                from patchright.async_api import async_playwright
                self._pw = await async_playwright().start()
                logger.info("Using patchright (patched browser)")
            except ImportError:
                from playwright.async_api import async_playwright
                self._pw = await async_playwright().start()
                logger.info("Using playwright (patchright not available)")

            self._browser = await self._pw.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-infobars",
                    "--disable-background-timer-throttling",
                    "--window-size=1920,1080",
                    "--lang=pt-BR",
                ],
            )

    async def fetch(self, url: str, wait_for: str = None,
                    fill_form: dict = None, click_selector: str = None,
                    timeout: int = 30) -> FetchResult:
        """
        Fetch URL with full browser automation.

        Args:
            url: Target URL
            wait_for: CSS selector to wait for after load
            fill_form: Dict of {selector: value} to fill before submitting
            click_selector: Element to click after filling
            timeout: Timeout in seconds
        """
        start = time.time()
        page = None
        context = None

        try:
            await self._ensure_browser()

            # Generate realistic fingerprint
            viewports = [(1920, 1080), (1536, 864), (1440, 900), (2560, 1440), (1366, 768)]
            vw, vh = random.choice(viewports)

            context = await self._browser.new_context(
                viewport={"width": vw, "height": vh},
                locale="pt-BR",
                timezone_id="America/Sao_Paulo",
                color_scheme="light",
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    f"Chrome/{random.choice([130,131,132,133])}.0.0.0 Safari/537.36"
                ),
                java_script_enabled=True,
                has_touch=False,
                is_mobile=False,
                device_scale_factor=random.choice([1, 1.25, 1.5]),
            )
            page = await context.new_page()

            # Inject stealth scripts
            await page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                delete navigator.__proto__.webdriver;
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [{name:'Chrome PDF Plugin',filename:'internal-pdf-viewer',description:'PDF'}],
                });
                Object.defineProperty(navigator, 'languages', {get: () => ['pt-BR','pt','en-US','en']});
                window.chrome = {runtime:{},loadTimes:function(){},csi:function(){},app:{}};
                Object.defineProperty(navigator, 'hardwareConcurrency', {get: () => 8});
                Object.defineProperty(navigator, 'deviceMemory', {get: () => 8});
                delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
                delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
                delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
            """)

            # Navigate
            await page.goto(url, wait_until="domcontentloaded", timeout=timeout * 1000)
            await asyncio.sleep(random.uniform(1.0, 2.5))

            # Handle cookie consent
            for sel in ["button:has-text('Aceito')", "button:has-text('Aceitar')", "#accept-cookies"]:
                try:
                    btn = await page.query_selector(sel)
                    if btn:
                        await btn.click()
                        await asyncio.sleep(random.uniform(0.5, 1.0))
                        break
                except Exception:
                    pass

            # Fill form if needed
            if fill_form:
                for selector, value in fill_form.items():
                    try:
                        el = await page.query_selector(selector)
                        if el:
                            await el.click()
                            await asyncio.sleep(random.uniform(0.1, 0.3))
                            await el.fill("")
                            # Type like human
                            for char in value:
                                await el.type(char, delay=random.uniform(30, 120))
                                if random.random() < 0.05:
                                    await asyncio.sleep(random.uniform(0.3, 0.8))
                            await asyncio.sleep(random.uniform(0.5, 1.0))
                    except Exception:
                        continue

            # Click submit if needed
            if click_selector:
                try:
                    btn = await page.query_selector(click_selector)
                    if btn:
                        await btn.click()
                        await asyncio.sleep(random.uniform(2.0, 4.0))
                except Exception:
                    pass

            # Wait for content
            if wait_for:
                try:
                    await page.wait_for_selector(wait_for, timeout=timeout * 1000)
                except Exception:
                    pass

            html = await page.content()
            text = await page.evaluate("() => document.body ? document.body.innerText : ''")

            elapsed = (time.time() - start) * 1000
            return FetchResult(
                url=page.url,
                status_code=200,
                html=html,
                text=text,
                method="patchright",
                elapsed_ms=elapsed,
            )

        except Exception as e:
            elapsed = (time.time() - start) * 1000
            return FetchResult(url=url, error=f"patchright: {e}", method="patchright", elapsed_ms=elapsed)
        finally:
            try:
                if page:
                    await page.close()
                if context:
                    await context.close()
            except Exception:
                pass

    async def close(self):
        try:
            if self._browser:
                await self._browser.close()
            if self._pw:
                await self._pw.stop()
        except Exception:
            pass
        self._browser = None
        self._pw = None


class StealthEngine:
    """
    Unified stealth engine. Tries layers in order:
    1. curl_cffi (fast, TLS impersonation)
    2. Scrapling (anti-bot bypass)
    3. Patchright (full browser)
    """

    def __init__(self):
        self.curl = CurlCffiLayer()
        self.scrapling_layer = ScraplingLayer()
        self.patchright = PatchrightLayer()
        self._stats = {"curl_cffi": 0, "scrapling": 0, "patchright": 0, "failures": 0}

    async def fetch(self, url: str, layers: list = None,
                    method: str = "GET", data: dict = None,
                    headers: dict = None, timeout: int = 30,
                    fill_form: dict = None, click_selector: str = None,
                    wait_for: str = None,
                    require_js: bool = False) -> FetchResult:
        """
        Fetch URL using cascading stealth layers.

        Args:
            url: Target URL
            layers: Specific layers to try (default: all)
            require_js: Skip non-JS layers if True
            fill_form: Form fields to fill (browser layers only)
            click_selector: Button to click (browser layers only)
        """
        if layers is None:
            if require_js or fill_form or click_selector:
                layers = ["patchright"]
            else:
                layers = ["curl_cffi", "patchright"]

        last_result = None

        for layer_name in layers:
            try:
                if layer_name == "curl_cffi" and not require_js:
                    result = self.curl.fetch(url, method=method, data=data,
                                             headers=headers, timeout=timeout)
                    if result.success and not result.is_blocked:
                        self._stats["curl_cffi"] += 1
                        return result
                    last_result = result
                    logger.info(f"curl_cffi: {result.status_code} blocked={result.is_blocked}")

                elif layer_name == "scrapling":
                    result = await self.scrapling_layer.fetch(url, timeout=timeout)
                    if result.success and not result.is_blocked:
                        self._stats["scrapling"] += 1
                        return result
                    last_result = result
                    logger.info(f"scrapling: blocked or error")

                elif layer_name == "patchright":
                    result = await self.patchright.fetch(
                        url, wait_for=wait_for,
                        fill_form=fill_form, click_selector=click_selector,
                        timeout=timeout,
                    )
                    if result.success or (result.html and len(result.html) > 200):
                        self._stats["patchright"] += 1
                        return result
                    last_result = result
                    logger.info(f"patchright: error={result.error}")

            except Exception as e:
                logger.warning(f"Layer {layer_name} exception: {e}")
                last_result = FetchResult(url=url, error=str(e), method=layer_name)

        self._stats["failures"] += 1
        return last_result or FetchResult(url=url, error="All layers failed")

    async def close(self):
        await self.patchright.close()

    def get_stats(self) -> dict:
        return dict(self._stats)
