"""
Scraper para Portal do STJ (Superior Tribunal de Justica)
URL: https://processo.stj.jus.br/processo/pesquisa/
Sistema proprietario do STJ.

STJ usa Cloudflare WAF com "Verificação automática" challenge.
Estrategia multi-camada:
  1. Patchright (Chromium patched) com stealth CDP - nao expoe automacao
  2. Espera ate 30s para challenge resolver automaticamente
  3. Scrapling StealthyFetcher como fallback
  4. curl_cffi com TLS impersonation
"""
import asyncio
import random
import re
import sys
import os
import time
from typing import Optional
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import ProcessoInfo, Movimentacao
from sistemas.base_sistema import SistemaScraperBase, ScraperConfig

import logging
logger = logging.getLogger("iuria.stj_scraper")


class STJPortalScraper(SistemaScraperBase):
    """Bot para portal do STJ com bypass Cloudflare multi-camada"""

    CLASSES_STJ = [
        "AREsp", "REsp", "HC", "RHC", "AgInt", "AgRg", "CC", "Rcl",
        "RMS", "MC", "MS", "Pet", "SE", "CR", "EREsp", "EAREsp",
        "IF", "AR", "AP", "Inq", "ED", "CAT", "SS", "SL", "STA",
    ]

    def _parse_stj_number(self, numero: str) -> tuple:
        """Parse STJ number - formats: REsp 1234567, HC 123456"""
        numero_str = numero.strip()
        for classe in sorted(self.CLASSES_STJ, key=len, reverse=True):
            pattern = rf'^({classe})\s*[nN]?[oOº]?\s*(\d+)'
            match = re.match(pattern, numero_str, re.IGNORECASE)
            if match:
                return match.group(1), match.group(2)
        if numero_str.replace(".", "").replace("-", "").replace("/", "").isdigit():
            return None, re.sub(r'[^\d]', '', numero_str)
        return None, None

    async def _init_browser_patchright(self):
        """
        Inicializa browser usando Patchright (Chromium patched) quando disponivel.
        Patchright nao possui flags de automacao detectaveis pelo Cloudflare.
        Fallback para Playwright padrao se Patchright nao estiver instalado.
        """
        if self._page is not None:
            return

        launch_args = [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled",
            "--disable-infobars",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding",
            "--window-size=1920,1080",
            "--lang=pt-BR",
        ]

        try:
            from patchright.async_api import async_playwright
            self._playwright = await async_playwright().start()
            self._use_patchright = True
            logger.info("STJ: usando patchright (browser patched)")
        except ImportError:
            from playwright.async_api import async_playwright
            self._playwright = await async_playwright().start()
            self._use_patchright = False
            logger.info("STJ: usando playwright padrao")

        self._browser = await self._playwright.chromium.launch(
            headless=self.config.headless,
            args=launch_args,
        )

        # Fingerprint realista
        ua = random.choice([
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        ])
        viewport = random.choice([
            {"width": 1920, "height": 1080},
            {"width": 1536, "height": 864},
            {"width": 2560, "height": 1440},
        ])

        context = await self._browser.new_context(
            user_agent=ua,
            viewport=viewport,
            locale="pt-BR",
            timezone_id="America/Sao_Paulo",
            java_script_enabled=True,
            has_touch=False,
            is_mobile=False,
            color_scheme="light",
        )
        self._page = await context.new_page()

        # Inject stealth scripts
        await self._page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            delete navigator.__proto__.webdriver;
            Object.defineProperty(navigator, 'plugins', {
                get: () => [{name:'Chrome PDF Plugin',filename:'internal-pdf-viewer'}]
            });
            Object.defineProperty(navigator, 'languages', {get: () => ['pt-BR','pt','en-US','en']});
            window.chrome = {runtime: {}, csi: function(){}, loadTimes: function(){}};
        """)

    async def _wait_cloudflare_challenge(self, max_wait_seconds: int = 30) -> bool:
        """
        Wait for Cloudflare's automatic verification challenge to resolve.
        The STJ site shows "Verificação automática" which auto-resolves after JS execution.
        Returns True if challenge was resolved, False if timeout.
        """
        for i in range(max_wait_seconds * 2):  # Check every 500ms
            try:
                page_text = await self._page.evaluate("() => document.body ? document.body.innerText : ''")
                # Challenge resolved when we no longer see verification text
                if "Verificação" not in page_text and "Checking" not in page_text and "challenge" not in page_text.lower():
                    logger.info(f"STJ Cloudflare challenge resolved after {i * 0.5:.1f}s")
                    return True
                # Check for specific resolved content
                if "processo" in page_text.lower() and len(page_text) > 1000:
                    logger.info(f"STJ content loaded after {i * 0.5:.1f}s")
                    return True
            except Exception:
                pass
            # Human-like behavior while waiting
            if i % 4 == 0 and i > 0:
                try:
                    await self._page.mouse.move(
                        random.randint(100, 800), random.randint(100, 600)
                    )
                except Exception:
                    pass
            await asyncio.sleep(0.5)

        logger.warning("STJ Cloudflare challenge did NOT resolve in time")
        return False

    async def _try_scrapling_fetch(self, url: str) -> Optional[str]:
        """Try Scrapling StealthyFetcher as alternative Cloudflare bypass"""
        try:
            from scrapling import StealthyFetcher
            fetcher = StealthyFetcher()
            response = fetcher.fetch(url, headless=True)
            if response and response.status == 200:
                html = response.html_content or str(response.text)
                if "Verificação" not in html[:500] and len(html) > 2000:
                    logger.info("STJ: Scrapling StealthyFetcher bypassed Cloudflare")
                    return html
        except Exception as e:
            logger.warning(f"STJ Scrapling failed: {e}")
        return None

    async def consultar_processo(self, numero: str) -> Optional[ProcessoInfo]:
        """Consulta processo no STJ com bypass Cloudflare multi-camada"""
        # Use our enhanced browser init with Patchright
        await self._init_browser_patchright()

        classe, num = self._parse_stj_number(numero)
        base_url = "https://processo.stj.jus.br"

        self.logger.info(f"Consultando STJ: {numero}")

        if classe and num:
            url = f"{base_url}/processo/pesquisa/?aplicacao=processos.ea&tipoPesquisa=tipoPesquisaNumeroRegistro&classe={classe}&numeroProcesso={num}"
        else:
            url = f"{base_url}/processo/pesquisa/?aplicacao=processos.ea&tipoPesquisa=tipoPesquisaNumeroRegistro&numeroProcesso={num or numero}"

        # Navigate with extended timeout for Cloudflare
        await self._page.goto(url, wait_until="domcontentloaded", timeout=45000)

        # Wait for Cloudflare challenge to auto-resolve (up to 30s)
        challenge_resolved = await self._wait_cloudflare_challenge(30)

        if not challenge_resolved:
            # Fallback: try Scrapling fetcher
            self.logger.info("Trying Scrapling StealthyFetcher as fallback...")
            html = await self._try_scrapling_fetch(url)
            if html:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(html, "html.parser")
                page_text = soup.get_text()
                return self._parse_stj_text(page_text, numero, classe, num, url)
            raise Exception("STJ Cloudflare WAF nao resolvido - necessita proxy residencial brasileiro")

        await self._human_delay(1500, 3000)

        # Handle cookie consent
        try:
            btn = await self._page.query_selector("button:has-text('Aceito'), button:has-text('Aceitar')")
            if btn:
                await btn.click()
                await self._human_delay(500, 1000)
        except Exception:
            pass

        if await self._check_captcha():
            solved = await self._solve_captcha()
            if not solved:
                raise Exception("CAPTCHA nao resolvido no STJ")

        page_text = await self._page.evaluate("() => document.body.innerText")
        if "nenhum processo" in page_text.lower() or "não foram encontrados" in page_text.lower():
            return None

        # Se retornou lista, clica no primeiro resultado
        try:
            first_link = await self._page.query_selector("a[href*='processo/revista']")
            if first_link:
                await first_link.click()
                await self._human_delay(2000, 4000)
                page_text = await self._page.evaluate("() => document.body.innerText")
        except Exception:
            pass

        # Try to expand all movements before parsing
        try:
            expand = await self._page.query_selector("a:has-text('Todos'), a:has-text('andamentos')")
            if expand:
                await expand.click()
                await self._human_delay(1500, 3000)
                page_text = await self._page.evaluate("() => document.body.innerText")
        except Exception:
            pass

        processo = self._parse_stj_text(page_text, numero, classe, num, self._page.url)
        return processo

    def _parse_stj_text(self, page_text: str, numero: str, classe: Optional[str], num: Optional[str], url: str) -> Optional[ProcessoInfo]:
        """Parse STJ page text into ProcessoInfo (shared between browser and HTTP paths)"""
        if "nenhum processo" in page_text.lower() or "não foram encontrados" in page_text.lower():
            return None

        processo = ProcessoInfo(
            numero=f"{classe} {num}" if classe else numero,
            tribunal="STJ",
            url=url,
        )

        try:
            match = re.search(r'Classe:\s*(.+?)(?:\n|$)', page_text)
            if match:
                processo.classe = match.group(1).strip()
            match = re.search(r'Registro:\s*(\d{4}/\d+)', page_text)
            if match:
                processo.numero_unico = match.group(1)
            for pat in [r'Relator\(a\):\s*(.+?)(?:\n|$)', r'Ministro\(a\):\s*(.+?)(?:\n|$)']:
                match = re.search(pat, page_text)
                if match:
                    processo.relator = match.group(1).strip()
                    break
            match = re.search(r'(?:Órgão [Jj]ulgador|Seção|Turma):\s*(.+?)(?:\n|$)', page_text)
            if match:
                processo.origem = match.group(1).strip()
            match = re.search(r'Assunto[s]?:\s*(.+?)(?:\n|$)', page_text)
            if match:
                processo.assunto = match.group(1).strip()
        except Exception:
            pass

        try:
            partes_matches = re.findall(
                r'((?:Recorrente|Recorrido|Impetrante|Impetrado|Autor|Réu|Agravante|Agravado|Requerente|Requerido)[^:]*:\s*.+?)(?:\n|$)',
                page_text
            )
            processo.partes = [p.strip() for p in partes_matches[:20]]
        except Exception:
            pass

        try:
            movs = []
            for line in page_text.split('\n'):
                match = re.match(r'\s*(\d{2}/\d{2}/\d{4})\s+(.+)', line.strip())
                if match:
                    movs.append(Movimentacao(data=match.group(1), descricao=match.group(2).strip()[:500]))
            processo.movimentacoes = movs[:50]
        except Exception:
            pass

        return processo

    async def buscar_por_nome(self, nome: str) -> list[ProcessoInfo]:
        """Busca por nome no STJ"""
        await self._init_browser_patchright()

        url = f"https://processo.stj.jus.br/processo/pesquisa/?aplicacao=processos.ea&tipoPesquisa=tipoPesquisaPartes&nomeParte={quote(nome)}"
        self.logger.info(f"Buscando por nome no STJ: {nome}")
        await self._page.goto(url, wait_until="domcontentloaded", timeout=45000)
        
        # Wait for Cloudflare challenge
        await self._wait_cloudflare_challenge(30)
        await self._human_delay(2000, 4000)

        if await self._check_captcha():
            await self._solve_captcha()

        processos = []
        try:
            page_text = await self._page.evaluate("() => document.body.innerText")
            # STJ usa formato CLASSE NUMERO
            for cls in self.CLASSES_STJ:
                matches = re.findall(rf'\b({cls})\s+[nN]?[oOº]?\s*(\d{{3,8}})', page_text)
                for c, n in matches[:10]:
                    key = f"{c} {n}"
                    if not any(p.numero == key for p in processos):
                        processos.append(ProcessoInfo(numero=key, tribunal="STJ"))
        except Exception:
            pass

        return processos[:20]


def get_stj_scraper() -> STJPortalScraper:
    config = ScraperConfig(
        sistema="stj_portal",
        tribunal="STJ",
        url_consulta="https://processo.stj.jus.br/processo/pesquisa/",
    )
    return STJPortalScraper(config)
