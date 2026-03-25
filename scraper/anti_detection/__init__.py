"""
Modulo Anti-Deteccao para Scrapers - iuria LexFutura
Fingerprinting, emulacao humana, proxies, CAPTCHA bypass
"""

import asyncio
import random
import time
import logging
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger("iuria.anti_detection")


@dataclass
class ProxyConfig:
    """Configuracao de proxy"""
    host: str
    port: int
    username: Optional[str] = None
    password: Optional[str] = None
    protocol: str = "http"  # http, https, socks5

    @property
    def url(self) -> str:
        auth = f"{self.username}:{self.password}@" if self.username else ""
        return f"{self.protocol}://{auth}{self.host}:{self.port}"

    def to_playwright(self) -> dict:
        d = {"server": f"{self.protocol}://{self.host}:{self.port}"}
        if self.username:
            d["username"] = self.username
            d["password"] = self.password
        return d


class FingerprintManager:
    """Gera fingerprints realistas para navegadores usando browserforge"""

    def __init__(self):
        self._forge = None

    def _get_forge(self):
        if self._forge is None:
            try:
                from browserforge.fingerprints import FingerprintGenerator
                self._forge = FingerprintGenerator(
                    browser=["chrome", "firefox", "edge"],
                    os=["windows", "macos", "linux"],
                )
            except ImportError:
                logger.warning("browserforge nao disponivel, usando fingerprint basico")
        return self._forge

    def generate(self) -> dict:
        """Gera um fingerprint completo"""
        forge = self._get_forge()
        if forge:
            try:
                fp = forge.generate()
                return {
                    "user_agent": fp.navigator.userAgent,
                    "viewport": {"width": fp.screen.width, "height": fp.screen.height},
                    "locale": fp.navigator.language or "pt-BR",
                    "timezone_id": "America/Sao_Paulo",
                    "platform": fp.navigator.platform,
                    "color_depth": getattr(fp.screen, 'colorDepth', 24),
                }
            except Exception as e:
                logger.warning(f"Erro ao gerar fingerprint: {e}")

        # Fallback manual
        agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
        ]
        resolutions = [(1920, 1080), (1366, 768), (1536, 864), (1440, 900), (2560, 1440)]
        w, h = random.choice(resolutions)
        return {
            "user_agent": random.choice(agents),
            "viewport": {"width": w, "height": h},
            "locale": "pt-BR",
            "timezone_id": "America/Sao_Paulo",
            "platform": random.choice(["Win32", "MacIntel", "Linux x86_64"]),
            "color_depth": 24,
        }


class HumanEmulator:
    """Emula comportamento humano em interacoes com paginas"""

    @staticmethod
    async def random_delay(min_ms: int = 500, max_ms: int = 2500):
        """Pausa aleatoria entre acoes"""
        delay = random.uniform(min_ms / 1000, max_ms / 1000)
        await asyncio.sleep(delay)

    @staticmethod
    async def type_like_human(page, selector: str, text: str, clear: bool = True):
        """Digita texto com pausas entre teclas simulando humano"""
        element = page.locator(selector)
        if clear:
            await element.click()
            await element.press("Control+a")
            await asyncio.sleep(random.uniform(0.05, 0.15))
            await element.press("Backspace")
            await asyncio.sleep(random.uniform(0.1, 0.3))

        for char in text:
            await element.type(char, delay=random.uniform(30, 120))
            # Pausa extra ocasional (como se pensando)
            if random.random() < 0.05:
                await asyncio.sleep(random.uniform(0.3, 0.8))

    @staticmethod
    async def random_mouse_move(page, count: int = 3):
        """Move o mouse aleatoriamente pela pagina"""
        try:
            viewport = page.viewport_size or {"width": 1280, "height": 720}
            for _ in range(count):
                x = random.randint(100, viewport["width"] - 100)
                y = random.randint(100, viewport["height"] - 100)
                await page.mouse.move(x, y)
                await asyncio.sleep(random.uniform(0.1, 0.4))
        except Exception:
            pass

    @staticmethod
    async def random_scroll(page, min_px: int = 100, max_px: int = 500):
        """Scroll aleatorio na pagina"""
        scroll_amount = random.randint(min_px, max_px)
        await page.mouse.wheel(0, scroll_amount)
        await asyncio.sleep(random.uniform(0.3, 0.8))

    @staticmethod
    async def click_like_human(page, selector: str):
        """Click com pequeno offset aleatorio"""
        element = page.locator(selector)
        box = await element.bounding_box()
        if box:
            x = box["x"] + box["width"] * random.uniform(0.2, 0.8)
            y = box["y"] + box["height"] * random.uniform(0.2, 0.8)
            await page.mouse.click(x, y)
        else:
            await element.click()
        await HumanEmulator.random_delay(200, 800)


class CaptchaSolver:
    """Interface para resolucao de CAPTCHAs"""

    def __init__(self, api_key: Optional[str] = None, provider: str = "2captcha"):
        self.api_key = api_key
        self.provider = provider
        self._solver = None

    def _get_solver(self):
        if self._solver is None and self.api_key:
            if self.provider == "2captcha":
                try:
                    from twocaptcha import TwoCaptcha
                    self._solver = TwoCaptcha(self.api_key)
                except ImportError:
                    logger.warning("2captcha-python nao disponivel")
        return self._solver

    async def solve_recaptcha_v2(self, site_key: str, page_url: str) -> Optional[str]:
        """Resolve reCAPTCHA v2"""
        solver = self._get_solver()
        if not solver:
            logger.warning("Nenhum solver de CAPTCHA configurado")
            return None
        try:
            result = solver.recaptcha(sitekey=site_key, url=page_url)
            return result.get("code")
        except Exception as e:
            logger.error(f"Erro ao resolver CAPTCHA: {e}")
            return None

    async def solve_image_captcha(self, image_path: str) -> Optional[str]:
        """Resolve CAPTCHA de imagem"""
        solver = self._get_solver()
        if not solver:
            return None
        try:
            result = solver.normal(image_path)
            return result.get("code")
        except Exception as e:
            logger.error(f"Erro ao resolver CAPTCHA de imagem: {e}")
            return None


class ProxyManager:
    """Gerencia pool de proxies rotativos"""

    def __init__(self, proxies: Optional[list[ProxyConfig]] = None):
        self._proxies = proxies or []
        self._current_idx = 0
        self._failed: set[str] = set()

    def add_proxy(self, proxy: ProxyConfig):
        self._proxies.append(proxy)

    def get_next(self) -> Optional[ProxyConfig]:
        """Retorna proximo proxy disponivel (round-robin)"""
        available = [p for p in self._proxies if p.url not in self._failed]
        if not available:
            # Reset failed se todos falharam
            self._failed.clear()
            available = self._proxies
        if not available:
            return None
        proxy = available[self._current_idx % len(available)]
        self._current_idx += 1
        return proxy

    def mark_failed(self, proxy: ProxyConfig):
        self._failed.add(proxy.url)
        logger.warning(f"Proxy marcado como falho: {proxy.host}:{proxy.port}")

    @property
    def count(self) -> int:
        return len(self._proxies)

    @property
    def available(self) -> int:
        return len([p for p in self._proxies if p.url not in self._failed])


class AntiDetection:
    """Classe principal que combina todas as tecnicas anti-deteccao"""

    def __init__(
        self,
        proxy_manager: Optional[ProxyManager] = None,
        captcha_api_key: Optional[str] = None,
    ):
        self.fingerprint_manager = FingerprintManager()
        self.human = HumanEmulator()
        self.captcha_solver = CaptchaSolver(api_key=captcha_api_key)
        self.proxy_manager = proxy_manager or ProxyManager()

    def get_playwright_context_options(self) -> dict:
        """Retorna opcoes para criar contexto Playwright com anti-deteccao"""
        fp = self.fingerprint_manager.generate()
        opts = {
            "user_agent": fp["user_agent"],
            "viewport": fp["viewport"],
            "locale": fp["locale"],
            "timezone_id": fp["timezone_id"],
            "permissions": ["geolocation"],
            "geolocation": {"latitude": -22.9068, "longitude": -43.1729},  # Rio de Janeiro
            "color_scheme": "light",
            "java_script_enabled": True,
            "has_touch": False,
            "is_mobile": False,
            "device_scale_factor": random.choice([1, 1.25, 1.5, 2]),
        }

        # Add proxy if available
        proxy = self.proxy_manager.get_next()
        if proxy:
            opts["proxy"] = proxy.to_playwright()

        return opts

    async def stealth_page_setup(self, page):
        """Aplica patches de stealth em uma pagina Playwright"""
        # Override navigator properties to avoid bot detection
        await page.add_init_script("""
            // Override webdriver
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});

            // Override plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5].map(() => ({
                    name: 'Chrome PDF Plugin',
                    filename: 'internal-pdf-viewer',
                })),
            });

            // Override languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['pt-BR', 'pt', 'en-US', 'en'],
            });

            // Override platform
            Object.defineProperty(navigator, 'platform', {
                get: () => 'Win32',
            });

            // Override chrome
            window.chrome = {runtime: {}, loadTimes: function(){}, csi: function(){}, app: {}};

            // Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );

            // Remove automation indicators
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
        """)
