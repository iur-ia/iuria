"""
Base para todos os scrapers organizados por sistema processual.
Integra anti-deteccao, retry, logging e metricas.
"""
import asyncio
import hashlib
import json
import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Any
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import ProcessoInfo, Movimentacao, ResultadoBusca
from anti_detection import AntiDetection, ProxyManager, ProxyConfig

logger = logging.getLogger("iuria.sistemas")


@dataclass
class ScraperConfig:
    """Configuracao de um scraper de sistema"""
    sistema: str                          # pje, esaj, eproc, etc.
    tribunal: str                         # Sigla do tribunal (TJSP, TRF2, etc.)
    url_consulta: str                     # URL de consulta publica
    url_mni: Optional[str] = None         # URL do WSDL MNI (se disponivel)
    grau: str = "1g"                      # 1g, 2g, turma_recursal
    suporta_mni: bool = False
    suporta_certificado: bool = False
    tipos_processo: list[str] = field(default_factory=lambda: ["civel", "criminal"])
    max_retries: int = 3
    timeout_seconds: int = 60
    headless: bool = True


@dataclass
class ScraperMetrics:
    """Metricas de execucao do scraper"""
    tribunal: str = ""
    sistema: str = ""
    total_consultas: int = 0
    consultas_sucesso: int = 0
    consultas_erro: int = 0
    tempo_medio_ms: float = 0.0
    ultima_consulta: Optional[str] = None
    captchas_resolvidos: int = 0
    proxies_usados: int = 0
    erros_recentes: list[str] = field(default_factory=list)

    @property
    def taxa_sucesso(self) -> float:
        if self.total_consultas == 0:
            return 0.0
        return self.consultas_sucesso / self.total_consultas * 100


class SistemaScraperBase(ABC):
    """
    Classe base para scrapers organizados por sistema processual.
    Um scraper por sistema, reutilizado por todos os tribunais que usam esse sistema.
    """

    def __init__(self, config: ScraperConfig, anti_detection: Optional[AntiDetection] = None):
        self.config = config
        self.anti = anti_detection or AntiDetection()
        self.metrics = ScraperMetrics(tribunal=config.tribunal, sistema=config.sistema)
        self._browser = None
        self._playwright = None
        self._page = None
        self.logger = logging.getLogger(f"iuria.{config.sistema}.{config.tribunal}")

    # ==================== LIFECYCLE ====================

    async def _init_browser(self):
        """Inicia Playwright com anti-deteccao"""
        if self._playwright is None:
            from playwright.async_api import async_playwright
            self._playwright = await async_playwright().start()

        if self._browser is None:
            launch_args = [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
                "--disable-infobars",
            ]
            self._browser = await self._playwright.chromium.launch(
                headless=self.config.headless,
                args=launch_args,
            )

        if self._page is None:
            ctx_opts = self.anti.get_playwright_context_options()
            context = await self._browser.new_context(**ctx_opts)
            self._page = await context.new_page()
            # Aplica stealth patches
            await self.anti.stealth_page_setup(self._page)
            self.logger.info(f"Browser inicializado para {self.config.tribunal}/{self.config.sistema}")

    async def _close_browser(self):
        """Fecha browser de forma segura"""
        try:
            if self._page:
                await self._page.close()
                self._page = None
            if self._browser:
                await self._browser.close()
                self._browser = None
            if self._playwright:
                await self._playwright.stop()
                self._playwright = None
        except Exception as e:
            self.logger.warning(f"Erro ao fechar browser: {e}")

    # ==================== HUMAN EMULATION ====================

    async def _human_delay(self, min_ms: int = 800, max_ms: int = 3000):
        """Delay humanizado entre acoes"""
        await self.anti.human.random_delay(min_ms, max_ms)

    async def _human_type(self, selector: str, text: str):
        """Digita como humano"""
        await self.anti.human.type_like_human(self._page, selector, text)

    async def _human_click(self, selector: str):
        """Clica como humano"""
        await self.anti.human.click_like_human(self._page, selector)

    async def _human_scroll(self):
        """Scroll aleatorio"""
        await self.anti.human.random_scroll(self._page)

    async def _human_mouse_move(self):
        """Movimenta mouse aleatoriamente"""
        await self.anti.human.random_mouse_move(self._page)

    # ==================== CAPTCHA HANDLING ====================

    async def _check_captcha(self) -> bool:
        """Verifica se ha CAPTCHA na pagina"""
        if not self._page:
            return False
        try:
            captcha_selectors = [
                "iframe[src*='recaptcha']",
                "iframe[src*='hcaptcha']",
                ".g-recaptcha",
                "#captcha",
                "img[src*='captcha']",
                ".captcha-container",
            ]
            for sel in captcha_selectors:
                el = await self._page.query_selector(sel)
                if el:
                    self.logger.warning(f"CAPTCHA detectado: {sel}")
                    return True
        except Exception:
            pass
        return False

    async def _solve_captcha(self) -> bool:
        """Tenta resolver CAPTCHA se detectado"""
        if not await self._check_captcha():
            return True  # Sem CAPTCHA

        self.logger.info("Tentando resolver CAPTCHA...")
        # Tenta reCAPTCHA v2
        try:
            iframe = await self._page.query_selector("iframe[src*='recaptcha']")
            if iframe:
                src = await iframe.get_attribute("src")
                if src and "k=" in src:
                    site_key = src.split("k=")[1].split("&")[0]
                    token = await self.anti.captcha_solver.solve_recaptcha_v2(
                        site_key, self._page.url
                    )
                    if token:
                        await self._page.evaluate(
                            f"document.getElementById('g-recaptcha-response').value = '{token}';"
                        )
                        self.metrics.captchas_resolvidos += 1
                        return True
        except Exception as e:
            self.logger.error(f"Erro ao resolver CAPTCHA: {e}")

        return False

    # ==================== RETRY LOGIC ====================

    async def _execute_with_retry(self, func, *args, **kwargs) -> Any:
        """Executa funcao com retry e rotacao de proxy"""
        last_error = None
        for attempt in range(self.config.max_retries):
            try:
                start = time.time()
                result = await func(*args, **kwargs)
                elapsed_ms = (time.time() - start) * 1000

                # Update metrics
                self.metrics.total_consultas += 1
                self.metrics.consultas_sucesso += 1
                self.metrics.tempo_medio_ms = (
                    (self.metrics.tempo_medio_ms * (self.metrics.total_consultas - 1) + elapsed_ms)
                    / self.metrics.total_consultas
                )
                self.metrics.ultima_consulta = datetime.now().isoformat()
                return result

            except Exception as e:
                last_error = e
                self.logger.warning(
                    f"Tentativa {attempt + 1}/{self.config.max_retries} falhou: {e}"
                )
                # Close and reinit browser with new fingerprint/proxy
                await self._close_browser()
                if attempt < self.config.max_retries - 1:
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff

        # All retries failed
        self.metrics.total_consultas += 1
        self.metrics.consultas_erro += 1
        self.metrics.erros_recentes.append(str(last_error))
        if len(self.metrics.erros_recentes) > 10:
            self.metrics.erros_recentes = self.metrics.erros_recentes[-10:]
        raise last_error

    # ==================== CHANGE DETECTION ====================

    @staticmethod
    def compute_hash(andamentos: list[dict]) -> str:
        """Calcula hash dos andamentos para detectar mudancas"""
        content = json.dumps(andamentos, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(content.encode()).hexdigest()

    @staticmethod
    def detect_new_andamentos(
        antigos: list[dict], novos: list[dict]
    ) -> list[dict]:
        """Compara listas de andamentos e retorna os novos"""
        antigos_set = set()
        for a in antigos:
            key = f"{a.get('data','')}|{a.get('descricao','')}"
            antigos_set.add(key)

        novos_detectados = []
        for n in novos:
            key = f"{n.get('data','')}|{n.get('descricao','')}"
            if key not in antigos_set:
                novos_detectados.append(n)

        return novos_detectados

    # ==================== ABSTRACT METHODS ====================

    @abstractmethod
    async def consultar_processo(self, numero: str) -> ProcessoInfo:
        """Consulta um processo pelo numero. Deve ser implementado por cada sistema."""
        pass

    @abstractmethod
    async def buscar_por_nome(self, nome: str) -> list[ProcessoInfo]:
        """Busca processos por nome da parte."""
        pass

    # ==================== PUBLIC API ====================

    async def consultar(self, numero: str) -> ResultadoBusca:
        """Consulta processo com retry e anti-deteccao"""
        resultado = ResultadoBusca(
            tribunal=self.config.tribunal,
            tipo_busca="numero",
            termo_busca=numero,
        )
        try:
            processo = await self._execute_with_retry(self.consultar_processo, numero)
            resultado.processos = [processo] if processo else []
        except Exception as e:
            resultado.erro = str(e)
        finally:
            await self._close_browser()
        return resultado

    async def buscar(self, nome: str) -> ResultadoBusca:
        """Busca por nome com retry e anti-deteccao"""
        resultado = ResultadoBusca(
            tribunal=self.config.tribunal,
            tipo_busca="nome",
            termo_busca=nome,
        )
        try:
            processos = await self._execute_with_retry(self.buscar_por_nome, nome)
            resultado.processos = processos or []
        except Exception as e:
            resultado.erro = str(e)
        finally:
            await self._close_browser()
        return resultado

    def get_metrics(self) -> dict:
        """Retorna metricas do scraper"""
        return {
            "tribunal": self.metrics.tribunal,
            "sistema": self.metrics.sistema,
            "total_consultas": self.metrics.total_consultas,
            "consultas_sucesso": self.metrics.consultas_sucesso,
            "consultas_erro": self.metrics.consultas_erro,
            "taxa_sucesso": f"{self.metrics.taxa_sucesso:.1f}%",
            "tempo_medio_ms": round(self.metrics.tempo_medio_ms, 1),
            "ultima_consulta": self.metrics.ultima_consulta,
            "captchas_resolvidos": self.metrics.captchas_resolvidos,
        }
