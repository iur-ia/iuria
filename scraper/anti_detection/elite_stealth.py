"""
Elite Anti-Detection Module - iuria LexFutura
Layer 2: Stealth scraping de nivel profissional.

Componentes:
  - BezierMouseEmulator: movimento de mouse com curvas de Bezier (humano real)
  - EliteFingerprintManager: browserforge + canvas/WebGL spoof
  - ResidentialProxyPool: rotacao de IPs residenciais (Bright Data / Oxylabs)
  - PatchrightBrowser: browser patched que nao expoe automacao
  - StealthPageManager: patches avancados JS anti-bot

Delays realistas: 50-200ms entre teclas, waits dinamicos.
"""
import asyncio
import logging
import math
import random
import time
from dataclasses import dataclass, field
from typing import Optional, List, Tuple, Any

logger = logging.getLogger("iuria.elite_stealth")


# ==================== BEZIER MOUSE MOVEMENT ====================

class BezierMouseEmulator:
    """
    Emula movimento de mouse com curvas de Bezier cubicas.
    Nenhum humano move o mouse em linha reta - usamos 2 pontos de controle
    com variacao aleatoria para gerar caminhos naturais.
    """

    @staticmethod
    def _bezier_point(t: float, p0: Tuple[float, float], p1: Tuple[float, float],
                      p2: Tuple[float, float], p3: Tuple[float, float]) -> Tuple[float, float]:
        """Calcula ponto em curva de Bezier cubica para parametro t [0,1]"""
        x = (1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * p1[0] + \
            3 * (1 - t) * t ** 2 * p2[0] + t ** 3 * p3[0]
        y = (1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * p1[1] + \
            3 * (1 - t) * t ** 2 * p2[1] + t ** 3 * p3[1]
        return (x, y)

    @staticmethod
    def gerar_caminho(
        start: Tuple[float, float],
        end: Tuple[float, float],
        steps: int = 25,
        desvio: float = 0.3,
    ) -> List[Tuple[float, float]]:
        """
        Gera caminho de mouse com curva de Bezier cubica.

        Args:
            start: posicao inicial (x, y)
            end: posicao final (x, y)
            steps: numero de pontos intermediarios
            desvio: fator de curvatura (0 = reto, 1 = muito curvo)
        """
        dx = end[0] - start[0]
        dy = end[1] - start[1]
        distancia = math.sqrt(dx ** 2 + dy ** 2)

        # Pontos de controle com desvio aleatorio
        offset1 = distancia * desvio * random.uniform(-1, 1)
        offset2 = distancia * desvio * random.uniform(-1, 1)

        # Perpendicular ao segmento para variar
        angle = math.atan2(dy, dx)
        perp_x = -math.sin(angle)
        perp_y = math.cos(angle)

        cp1 = (
            start[0] + dx * 0.25 + perp_x * offset1,
            start[1] + dy * 0.25 + perp_y * offset1,
        )
        cp2 = (
            start[0] + dx * 0.75 + perp_x * offset2,
            start[1] + dy * 0.75 + perp_y * offset2,
        )

        # Gera pontos ao longo da curva
        pontos = []
        for i in range(steps + 1):
            t = i / steps
            # Adiciona micro-variacao (tremor natural da mao)
            jitter_x = random.gauss(0, 0.5)
            jitter_y = random.gauss(0, 0.5)
            px, py = BezierMouseEmulator._bezier_point(t, start, cp1, cp2, end)
            pontos.append((px + jitter_x, py + jitter_y))

        # Ultimo ponto exato
        pontos[-1] = end
        return pontos

    @staticmethod
    async def mover_mouse(page, destino_x: float, destino_y: float, velocidade: str = "normal"):
        """
        Move o mouse suavemente ate destino usando Bezier.

        velocidade: 'rapida' (15 steps), 'normal' (25), 'lenta' (40)
        """
        steps_map = {"rapida": 15, "normal": 25, "lenta": 40}
        steps = steps_map.get(velocidade, 25)

        # Posicao atual (estimada)
        viewport = page.viewport_size or {"width": 1920, "height": 1080}
        current_x = random.uniform(viewport["width"] * 0.3, viewport["width"] * 0.7)
        current_y = random.uniform(viewport["height"] * 0.3, viewport["height"] * 0.7)

        caminho = BezierMouseEmulator.gerar_caminho(
            (current_x, current_y), (destino_x, destino_y), steps
        )

        for px, py in caminho:
            await page.mouse.move(px, py)
            # Velocidade variavel - mais rapido no meio, mais lento perto do alvo
            delay = random.uniform(0.005, 0.025)
            await asyncio.sleep(delay)

    @staticmethod
    async def click_bezier(page, x: float, y: float):
        """Move com Bezier e clica com timing humano"""
        await BezierMouseEmulator.mover_mouse(page, x, y)
        # Pequeno delay antes do click (tempo de reacao)
        await asyncio.sleep(random.uniform(0.05, 0.15))
        await page.mouse.down()
        await asyncio.sleep(random.uniform(0.03, 0.1))  # Duracao do click
        await page.mouse.up()

    @staticmethod
    async def click_element_bezier(page, selector: str):
        """Move com Bezier ate um elemento e clica"""
        element = page.locator(selector)
        box = await element.bounding_box()
        if box:
            # Ponto aleatorio dentro do elemento (nao o centro exato)
            x = box["x"] + box["width"] * random.uniform(0.15, 0.85)
            y = box["y"] + box["height"] * random.uniform(0.15, 0.85)
            await BezierMouseEmulator.click_bezier(page, x, y)
        else:
            await element.click()


# ==================== REALISTIC TYPING ====================

class RealisticTyper:
    """
    Digitacao realista com delays de 50-200ms entre teclas.
    Inclui erros de digitacao ocasionais com correcao (backspace).
    """

    @staticmethod
    async def digitar(page, selector: str, texto: str, wpm: int = 60, erros: bool = True):
        """
        Digita texto com ritmo realista.

        Args:
            page: pagina Playwright
            selector: seletor do campo
            texto: texto para digitar
            wpm: palavras por minuto (media humana: 40-80)
            erros: se True, simula erros de digitacao com correcao
        """
        element = page.locator(selector)
        await element.click()

        # Limpa campo
        await element.press("Control+a")
        await asyncio.sleep(random.uniform(0.05, 0.12))
        await element.press("Backspace")
        await asyncio.sleep(random.uniform(0.15, 0.3))

        # Calcula delay base por caractere
        chars_per_second = (wpm * 5) / 60  # 5 chars por palavra media
        base_delay_ms = 1000 / chars_per_second  # ~100ms para 60wpm

        for i, char in enumerate(texto):
            # Variacao de velocidade (mais rapido em sequencias, mais lento em numeros)
            if char.isdigit():
                delay = random.uniform(base_delay_ms * 0.8, base_delay_ms * 1.5)
            elif char == " ":
                delay = random.uniform(base_delay_ms * 0.5, base_delay_ms * 1.0)
            elif char in ".-/":
                delay = random.uniform(base_delay_ms * 1.0, base_delay_ms * 2.0)
            else:
                delay = random.uniform(base_delay_ms * 0.6, base_delay_ms * 1.3)

            # Simula erro ocasional (3% de chance)
            if erros and random.random() < 0.03 and i < len(texto) - 1:
                # Digita caractere errado
                wrong_char = random.choice("abcdefghijklmnopqrstuvwxyz0123456789")
                await element.type(wrong_char, delay=delay / 1000)
                await asyncio.sleep(random.uniform(0.2, 0.5))  # Percebe o erro
                await element.press("Backspace")
                await asyncio.sleep(random.uniform(0.1, 0.25))

            await element.type(char, delay=delay / 1000)

            # Pausa ocasional (como se pensando)
            if random.random() < 0.02:
                await asyncio.sleep(random.uniform(0.5, 1.5))


# ==================== ELITE FINGERPRINT ====================

class EliteFingerprintManager:
    """
    Fingerprinting avancado com browserforge.
    Spoof de canvas, WebGL, audio context para parecer maquina real.
    """

    def __init__(self):
        self._forge = None
        self._last_fp = None

    def _get_forge(self):
        if self._forge is None:
            try:
                from browserforge.fingerprints import FingerprintGenerator
                self._forge = FingerprintGenerator(
                    browser=["chrome"],
                    os=["windows", "macos"],
                )
            except ImportError:
                logger.warning("browserforge nao disponivel")
        return self._forge

    def gerar(self) -> dict:
        """Gera fingerprint completo e realista"""
        forge = self._get_forge()
        if forge:
            try:
                fp = forge.generate()
                result = {
                    "user_agent": fp.navigator.userAgent,
                    "viewport": {"width": fp.screen.width, "height": fp.screen.height},
                    "screen": {
                        "width": fp.screen.width,
                        "height": fp.screen.height,
                        "availWidth": fp.screen.width,
                        "availHeight": fp.screen.height - random.choice([40, 48, 56]),
                        "colorDepth": getattr(fp.screen, "colorDepth", 24),
                        "pixelDepth": 24,
                    },
                    "locale": fp.navigator.language or "pt-BR",
                    "timezone_id": "America/Sao_Paulo",
                    "platform": fp.navigator.platform,
                    "hardware_concurrency": random.choice([4, 8, 12, 16]),
                    "device_memory": random.choice([4, 8, 16]),
                    "max_touch_points": 0,
                    "webgl_vendor": random.choice([
                        "Google Inc. (NVIDIA)",
                        "Google Inc. (Intel)",
                        "Google Inc. (AMD)",
                    ]),
                    "webgl_renderer": random.choice([
                        "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)",
                        "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)",
                        "ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)",
                        "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0)",
                    ]),
                }
                self._last_fp = result
                return result
            except Exception as e:
                logger.warning(f"Erro browserforge: {e}")

        # Fallback robusto
        return self._fallback_fingerprint()

    def _fallback_fingerprint(self) -> dict:
        """Fingerprint fallback sem browserforge"""
        uas = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        ]
        viewports = [(1920, 1080), (2560, 1440), (1536, 864), (1440, 900), (1366, 768)]
        w, h = random.choice(viewports)
        return {
            "user_agent": random.choice(uas),
            "viewport": {"width": w, "height": h},
            "screen": {"width": w, "height": h, "availWidth": w, "availHeight": h - 48,
                        "colorDepth": 24, "pixelDepth": 24},
            "locale": "pt-BR",
            "timezone_id": "America/Sao_Paulo",
            "platform": random.choice(["Win32", "MacIntel"]),
            "hardware_concurrency": random.choice([4, 8, 12]),
            "device_memory": random.choice([4, 8, 16]),
            "max_touch_points": 0,
            "webgl_vendor": "Google Inc. (NVIDIA)",
            "webgl_renderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)",
        }


# ==================== RESIDENTIAL PROXY POOL ====================

@dataclass
class ResidentialProxy:
    """Proxy residencial (Bright Data, Oxylabs, etc.)"""
    provider: str          # "brightdata", "oxylabs", "smartproxy"
    host: str
    port: int
    username: str
    password: str
    country: str = "br"
    session_id: Optional[str] = None
    _fail_count: int = 0

    @property
    def url(self) -> str:
        """URL com session sticky para manter mesmo IP"""
        user = self.username
        if self.session_id:
            user = f"{self.username}-session-{self.session_id}"
        return f"http://{user}:{self.password}@{self.host}:{self.port}"

    def to_playwright(self) -> dict:
        return {
            "server": f"http://{self.host}:{self.port}",
            "username": self.username + (f"-session-{self.session_id}" if self.session_id else ""),
            "password": self.password,
        }

    def nova_sessao(self):
        """Rotaciona IP gerando nova sessao"""
        self.session_id = f"iuria_{random.randint(100000, 999999)}"


class ResidentialProxyPool:
    """
    Pool de proxies residenciais brasileiros.
    Suporta Bright Data, Oxylabs, SmartProxy.
    Sticky sessions para manter IP durante uma consulta.
    """

    def __init__(self):
        self._proxies: list[ResidentialProxy] = []
        self._current = 0
        self._failed: set[str] = set()

    def add_brightdata(self, username: str, password: str, zone: str = "residential_br"):
        """Adiciona proxy Bright Data"""
        self._proxies.append(ResidentialProxy(
            provider="brightdata",
            host="brd.superproxy.io",
            port=22225,
            username=f"{username}-zone-{zone}-country-br",
            password=password,
            country="br",
        ))

    def add_oxylabs(self, username: str, password: str):
        """Adiciona proxy Oxylabs"""
        self._proxies.append(ResidentialProxy(
            provider="oxylabs",
            host="pr.oxylabs.io",
            port=7777,
            username=f"customer-{username}-cc-br",
            password=password,
            country="br",
        ))

    def add_smartproxy(self, username: str, password: str):
        """Adiciona proxy SmartProxy"""
        self._proxies.append(ResidentialProxy(
            provider="smartproxy",
            host="gate.smartproxy.com",
            port=7000,
            username=f"{username}-country-br",
            password=password,
            country="br",
        ))

    def get_next(self) -> Optional[ResidentialProxy]:
        """Retorna proximo proxy com nova sessao (novo IP)"""
        available = [p for p in self._proxies if p.url not in self._failed]
        if not available:
            self._failed.clear()
            available = self._proxies
        if not available:
            return None

        proxy = available[self._current % len(available)]
        self._current += 1
        proxy.nova_sessao()  # Novo IP a cada uso
        return proxy

    def mark_failed(self, proxy: ResidentialProxy):
        proxy._fail_count += 1
        if proxy._fail_count >= 3:
            self._failed.add(proxy.url)

    @property
    def count(self) -> int:
        return len(self._proxies)


# ==================== STEALTH PAGE SETUP ====================

STEALTH_SCRIPTS = """
// ===== ANTI-DETECTION STEALTH SCRIPT =====

// 1. Remove webdriver flag
Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
delete navigator.__proto__.webdriver;

// 2. Mock plugins (Chrome real tem plugins)
Object.defineProperty(navigator, 'plugins', {
    get: () => {
        const plugins = [
            {name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format'},
            {name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: ''},
            {name: 'Native Client', filename: 'internal-nacl-plugin', description: ''},
        ];
        plugins.length = 3;
        return plugins;
    },
});

// 3. Mock languages
Object.defineProperty(navigator, 'languages', {
    get: () => ['pt-BR', 'pt', 'en-US', 'en'],
});

// 4. Mock chrome object
window.chrome = {
    app: {isInstalled: false, InstallState: {INSTALLED: 'installed', NOT_INSTALLED: 'not_installed'}, RunningState: {CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running'}},
    runtime: {OnInstalledReason: {CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update'}, OnRestartRequiredReason: {APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic'}, PlatformArch: {ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64'}, PlatformNaclArch: {ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64'}, PlatformOs: {ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win'}, RequestUpdateCheckStatus: {NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available'}, connect: function(){}, sendMessage: function(){}},
    csi: function(){return {};},
    loadTimes: function(){return {};},
};

// 5. Mock permissions API
const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications' ?
        Promise.resolve({state: Notification.permission}) :
        originalQuery(parameters)
);

// 6. Canvas fingerprint noise
const originalToBlob = HTMLCanvasElement.prototype.toBlob;
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
    const ctx = this.getContext('2d');
    if (ctx) {
        const imageData = originalGetImageData.call(ctx, 0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = imageData.data[i] ^ (Math.random() < 0.01 ? 1 : 0);
        }
        ctx.putImageData(imageData, 0, 0);
    }
    return originalToBlob.call(this, callback, type, quality);
};

HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
    const ctx = this.getContext('2d');
    if (ctx) {
        const imageData = originalGetImageData.call(ctx, 0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = imageData.data[i] ^ (Math.random() < 0.01 ? 1 : 0);
        }
        ctx.putImageData(imageData, 0, 0);
    }
    return originalToDataURL.call(this, type, quality);
};

// 7. WebGL vendor/renderer spoof
const getParameterOrig = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(param) {
    if (param === 37445) return window.__WEBGL_VENDOR || 'Google Inc. (NVIDIA)';
    if (param === 37446) return window.__WEBGL_RENDERER || 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)';
    return getParameterOrig.call(this, param);
};

// 8. Hardware concurrency spoof
Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => window.__HW_CONCURRENCY || 8,
});

// 9. Device memory spoof
Object.defineProperty(navigator, 'deviceMemory', {
    get: () => window.__DEVICE_MEMORY || 8,
});

// 10. Connection info spoof
Object.defineProperty(navigator, 'connection', {
    get: () => ({
        effectiveType: '4g',
        rtt: 50,
        downlink: 10,
        saveData: false,
    }),
});

// 11. Remove automation-related variables
delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
delete window.__webdriver_evaluate;
delete window.__selenium_evaluate;
delete window.__fxdriver_evaluate;
delete window.__driver_evaluate;
delete window.__webdriver_unwrapped;
delete window.__selenium_unwrapped;
delete window.__fxdriver_unwrapped;
delete window.__driver_unwrapped;

// 12. Mock Notification
if (typeof Notification === 'undefined') {
    window.Notification = {permission: 'default'};
}

console.log = (function(orig) {
    return function() {
        // Filter out potential detection logs
        const args = Array.from(arguments);
        const str = args.join(' ');
        if (str.includes('webdriver') || str.includes('automation')) return;
        return orig.apply(console, arguments);
    };
})(console.log);
"""


class StealthPageManager:
    """Aplica todas as configuracoes stealth em uma pagina"""

    @staticmethod
    async def setup(page, fingerprint: dict):
        """Aplica fingerprint e scripts anti-deteccao"""
        # Injeta variaveis do fingerprint
        await page.add_init_script(f"""
            window.__WEBGL_VENDOR = '{fingerprint.get("webgl_vendor", "Google Inc. (NVIDIA)")}';
            window.__WEBGL_RENDERER = '{fingerprint.get("webgl_renderer", "ANGLE (NVIDIA)")}';
            window.__HW_CONCURRENCY = {fingerprint.get("hardware_concurrency", 8)};
            window.__DEVICE_MEMORY = {fingerprint.get("device_memory", 8)};
        """)

        # Injeta script stealth principal
        await page.add_init_script(STEALTH_SCRIPTS)

    @staticmethod
    async def random_behavior(page, duration_seconds: float = 3.0):
        """Executa comportamento aleatorio humano na pagina"""
        viewport = page.viewport_size or {"width": 1920, "height": 1080}
        end_time = time.time() + duration_seconds

        while time.time() < end_time:
            action = random.choice(["scroll", "mouse_move", "wait"])

            if action == "scroll":
                amount = random.randint(50, 300) * random.choice([-1, 1])
                await page.mouse.wheel(0, amount)
                await asyncio.sleep(random.uniform(0.3, 0.8))

            elif action == "mouse_move":
                x = random.randint(50, viewport["width"] - 50)
                y = random.randint(50, viewport["height"] - 50)
                await BezierMouseEmulator.mover_mouse(page, x, y, "rapida")
                await asyncio.sleep(random.uniform(0.1, 0.3))

            else:
                await asyncio.sleep(random.uniform(0.5, 1.5))


# ==================== DYNAMIC WAIT ENGINE ====================

class DynamicWaiter:
    """
    Waits inteligentes - nao usa time fixo, espera por condicoes
    com timeout e comportamento humano durante espera.
    """

    @staticmethod
    async def wait_for_content(
        page,
        selector: str,
        timeout_ms: int = 30000,
        human_behavior: bool = True,
    ) -> bool:
        """Espera conteudo aparecer com comportamento humano"""
        try:
            if human_behavior:
                # Faz coisas de humano enquanto espera
                task_wait = asyncio.create_task(
                    page.wait_for_selector(selector, timeout=timeout_ms)
                )
                while not task_wait.done():
                    await asyncio.sleep(random.uniform(0.5, 1.5))
                    if not task_wait.done():
                        # Scroll leve enquanto espera
                        try:
                            await page.mouse.wheel(0, random.randint(-50, 50))
                        except Exception:
                            pass
                await task_wait
            else:
                await page.wait_for_selector(selector, timeout=timeout_ms)
            return True
        except Exception:
            return False

    @staticmethod
    async def wait_for_navigation(page, timeout_ms: int = 30000):
        """Espera navegacao com timeout"""
        try:
            await page.wait_for_load_state("networkidle", timeout=timeout_ms)
            # Delay pos-carregamento (humano nao age instantaneamente)
            await asyncio.sleep(random.uniform(0.5, 1.5))
            return True
        except Exception:
            return False


# ==================== PATCHRIGHT BROWSER ====================

class EliteBrowser:
    """
    Browser manager que usa patchright (Playwright patched) quando disponivel.
    Fallback para playwright padrao.
    """

    def __init__(self, fingerprint_manager: Optional[EliteFingerprintManager] = None,
                 proxy_pool: Optional[ResidentialProxyPool] = None):
        self.fp_manager = fingerprint_manager or EliteFingerprintManager()
        self.proxy_pool = proxy_pool or ResidentialProxyPool()
        self._pw = None
        self._browser = None
        self._use_patchright = False

    async def launch(self, headless: bool = True) -> Any:
        """Lanca browser com maximo stealth"""
        # Tenta patchright primeiro
        try:
            from patchright.async_api import async_playwright
            self._pw = await async_playwright().start()
            self._use_patchright = True
            logger.info("Usando patchright (browser patched)")
        except ImportError:
            from playwright.async_api import async_playwright
            self._pw = await async_playwright().start()
            self._use_patchright = False
            logger.info("Usando playwright padrao (patchright nao disponivel)")

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

        self._browser = await self._pw.chromium.launch(
            headless=headless,
            args=launch_args,
        )
        return self._browser

    async def new_stealth_page(self) -> Tuple[Any, dict]:
        """Cria nova pagina com fingerprint completo e stealth"""
        if not self._browser:
            await self.launch()

        fp = self.fp_manager.gerar()

        context_opts = {
            "user_agent": fp["user_agent"],
            "viewport": fp["viewport"],
            "locale": fp["locale"],
            "timezone_id": fp["timezone_id"],
            "permissions": ["geolocation"],
            "geolocation": {"latitude": -22.9068, "longitude": -43.1729},
            "color_scheme": "light",
            "java_script_enabled": True,
            "has_touch": False,
            "is_mobile": False,
            "device_scale_factor": random.choice([1, 1.25, 1.5, 2]),
        }

        # Adiciona proxy residencial se disponivel
        proxy = self.proxy_pool.get_next()
        if proxy:
            context_opts["proxy"] = proxy.to_playwright()
            logger.info(f"Usando proxy {proxy.provider} (session {proxy.session_id})")

        context = await self._browser.new_context(**context_opts)
        page = await context.new_page()

        # Aplica stealth
        await StealthPageManager.setup(page, fp)

        return page, fp

    async def close(self):
        """Fecha tudo"""
        try:
            if self._browser:
                await self._browser.close()
            if self._pw:
                await self._pw.stop()
        except Exception:
            pass
        self._browser = None
        self._pw = None
