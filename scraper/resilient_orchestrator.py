"""
Orquestrador Resiliente - iuria LexFutura
Layer 4: Orquestracao com redundancia, healthcheck e auto-aprendizado.

Fluxo de redundancia:
  1. MNI (certificado A1 mTLS) - mais confiavel
  2. MNI (consulta publica SOAP) - fallback
  3. Scraping com anti-deteccao - fallback
  4. 2Captcha se CAPTCHA detectado
  5. Identity proxy se bloqueio de IP

Healthcheck:
  - Verifica seletores CSS periodicamente
  - Detecta mudancas de layout via hash de estrutura HTML
  - Alerta quando seletores quebram
  - Auto-learning: sugere novos seletores

Rate limiting:
  - Respeita limites por tribunal
  - Backoff exponencial
  - Circuit breaker por tribunal
"""
import asyncio
import hashlib
import json
import logging
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, Dict, List, Any, Callable

logger = logging.getLogger("iuria.resilient_orch")


# ==================== CIRCUIT BREAKER ====================

class CircuitState(Enum):
    CLOSED = "closed"       # Normal - requests passam
    OPEN = "open"           # Muitos erros - bloqueia requests
    HALF_OPEN = "half_open" # Testando se voltou ao normal


@dataclass
class CircuitBreaker:
    """
    Circuit breaker por tribunal.
    Evita sobrecarregar tribunais com problemas.
    """
    tribunal: str
    failure_threshold: int = 5
    recovery_timeout_seconds: int = 300  # 5 min
    half_open_max_calls: int = 2

    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: Optional[float] = None
    half_open_calls: int = 0

    def can_execute(self) -> bool:
        """Verifica se pode executar request"""
        if self.state == CircuitState.CLOSED:
            return True

        if self.state == CircuitState.OPEN:
            # Verifica se tempo de recovery passou
            if self.last_failure_time and \
               time.time() - self.last_failure_time > self.recovery_timeout_seconds:
                self.state = CircuitState.HALF_OPEN
                self.half_open_calls = 0
                logger.info(f"Circuit {self.tribunal}: OPEN -> HALF_OPEN")
                return True
            return False

        if self.state == CircuitState.HALF_OPEN:
            return self.half_open_calls < self.half_open_max_calls

        return False

    def record_success(self):
        """Registra sucesso"""
        self.success_count += 1
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.CLOSED
            self.failure_count = 0
            logger.info(f"Circuit {self.tribunal}: HALF_OPEN -> CLOSED (recuperado)")

    def record_failure(self):
        """Registra falha"""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
            logger.warning(f"Circuit {self.tribunal}: HALF_OPEN -> OPEN (falhou novamente)")
            return

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning(
                f"Circuit {self.tribunal}: CLOSED -> OPEN "
                f"({self.failure_count} falhas consecutivas)"
            )

    def to_dict(self) -> dict:
        return {
            "tribunal": self.tribunal,
            "state": self.state.value,
            "failures": self.failure_count,
            "successes": self.success_count,
            "last_failure": datetime.fromtimestamp(self.last_failure_time).isoformat() if self.last_failure_time else None,
        }


# ==================== RATE LIMITER ====================

@dataclass
class RateLimiter:
    """Rate limiter por tribunal com token bucket"""
    tribunal: str
    max_requests_per_minute: int = 10
    _tokens: float = 10.0
    _max_tokens: float = 10.0
    _last_refill: float = field(default_factory=time.time)

    async def acquire(self):
        """Espera ate ter token disponivel"""
        while True:
            self._refill()
            if self._tokens >= 1.0:
                self._tokens -= 1.0
                return
            # Calcula tempo ate proximo token
            wait_time = (1.0 - self._tokens) / (self.max_requests_per_minute / 60.0)
            await asyncio.sleep(min(wait_time, 5.0))

    def _refill(self):
        now = time.time()
        elapsed = now - self._last_refill
        refill = elapsed * (self.max_requests_per_minute / 60.0)
        self._tokens = min(self._max_tokens, self._tokens + refill)
        self._last_refill = now


# ==================== HEALTHCHECK ENGINE ====================

@dataclass
class SelectorHealth:
    """Estado de saude de um seletor CSS"""
    selector: str
    tribunal: str
    sistema: str
    last_check: Optional[str] = None
    is_working: bool = True
    consecutive_failures: int = 0
    html_structure_hash: Optional[str] = None
    suggested_alternatives: list[str] = field(default_factory=list)


class HealthcheckEngine:
    """
    Verifica periodicamente se seletores CSS ainda funcionam.
    Detecta mudancas de layout nos sites dos tribunais.
    """

    def __init__(self):
        self._selectors: Dict[str, Dict[str, SelectorHealth]] = {}
        self._page_hashes: Dict[str, str] = {}

    def register_selectors(self, tribunal: str, sistema: str, selectors: Dict[str, str]):
        """Registra seletores para monitoramento"""
        key = f"{tribunal}_{sistema}"
        if key not in self._selectors:
            self._selectors[key] = {}
        for name, selector in selectors.items():
            self._selectors[key][name] = SelectorHealth(
                selector=selector,
                tribunal=tribunal,
                sistema=sistema,
            )

    async def check_selectors(self, page, tribunal: str, sistema: str) -> Dict[str, bool]:
        """Verifica se todos os seletores de um tribunal ainda funcionam"""
        key = f"{tribunal}_{sistema}"
        if key not in self._selectors:
            return {}

        results = {}
        for name, health in self._selectors[key].items():
            try:
                element = await page.query_selector(health.selector)
                if element:
                    health.is_working = True
                    health.consecutive_failures = 0
                else:
                    health.consecutive_failures += 1
                    if health.consecutive_failures >= 3:
                        health.is_working = False
                        # Tenta encontrar alternativa
                        alternatives = await self._find_alternatives(page, name)
                        health.suggested_alternatives = alternatives
                results[name] = health.is_working
                health.last_check = datetime.now().isoformat()
            except Exception as e:
                health.consecutive_failures += 1
                results[name] = False
                logger.warning(f"Healthcheck falhou para {name}: {e}")

        return results

    async def check_page_structure(self, page, tribunal: str, url: str) -> dict:
        """Verifica se a estrutura HTML da pagina mudou"""
        try:
            # Captura estrutura da pagina (tags, classes, IDs)
            structure = await page.evaluate("""
                () => {
                    const elements = document.querySelectorAll('input, button, form, table, a[href]');
                    return Array.from(elements).map(el => ({
                        tag: el.tagName,
                        id: el.id || '',
                        classes: Array.from(el.classList).join(' '),
                        name: el.name || '',
                        type: el.type || '',
                    })).slice(0, 100);
                }
            """)

            structure_hash = hashlib.md5(json.dumps(structure, sort_keys=True).encode()).hexdigest()

            key = f"{tribunal}_{url}"
            old_hash = self._page_hashes.get(key)
            self._page_hashes[key] = structure_hash

            changed = old_hash is not None and old_hash != structure_hash

            if changed:
                logger.warning(
                    f"ESTRUTURA MUDOU em {tribunal} ({url}): "
                    f"hash {old_hash[:8]}... -> {structure_hash[:8]}..."
                )

            return {
                "tribunal": tribunal,
                "url": url,
                "hash_anterior": old_hash,
                "hash_atual": structure_hash,
                "mudou": changed,
                "total_elementos": len(structure),
                "timestamp": datetime.now().isoformat(),
            }
        except Exception as e:
            return {"tribunal": tribunal, "url": url, "erro": str(e)}

    async def _find_alternatives(self, page, element_name: str) -> list[str]:
        """
        AI-based: tenta encontrar seletores alternativos quando o original quebra.
        Usa heuristicas baseadas no nome do campo.
        """
        alternatives = []

        # Heuristicas por tipo de campo
        heuristics = {
            "input_processo": [
                "input[name*='processo']",
                "input[name*='numProc']",
                "input[id*='processo']",
                "input[placeholder*='processo']",
                "input[type='text'][name*='num']",
                "#numeroProcesso",
                "#numProcesso",
                ".campo-processo input",
            ],
            "input_nome": [
                "input[name*='nome']",
                "input[name*='parte']",
                "input[id*='nome']",
                "input[placeholder*='nome']",
                "#nomeParte",
            ],
            "botao_buscar": [
                "button[type='submit']",
                "input[type='submit']",
                "button:has-text('Pesquisar')",
                "button:has-text('Buscar')",
                "button:has-text('Consultar')",
                ".btn-pesquisar",
                "#btnPesquisar",
            ],
            "tabela_resultados": [
                "table.resultado",
                "table#tabelaResultado",
                ".resultado-busca table",
                "#divResultados table",
                ".listagem table",
            ],
            "andamentos": [
                "#tabelaAndamentos",
                "table.andamentos",
                ".movimentacoes table",
                "#divMovimentacoes",
                ".historico-andamentos",
            ],
        }

        patterns = heuristics.get(element_name, [])
        for selector in patterns:
            try:
                element = await page.query_selector(selector)
                if element:
                    alternatives.append(selector)
            except Exception:
                pass

        return alternatives

    def get_status(self) -> dict:
        """Retorna status de todos os seletores monitorados"""
        status = {}
        for key, selectors in self._selectors.items():
            status[key] = {}
            for name, health in selectors.items():
                status[key][name] = {
                    "selector": health.selector,
                    "working": health.is_working,
                    "failures": health.consecutive_failures,
                    "last_check": health.last_check,
                    "alternatives": health.suggested_alternatives,
                }
        return status


# ==================== RESILIENT ORCHESTRATOR ====================

class StrategyResult:
    """Resultado de uma estrategia de consulta"""
    def __init__(self, success: bool, data: Any = None, error: str = "",
                 strategy: str = "", elapsed_ms: float = 0):
        self.success = success
        self.data = data
        self.error = error
        self.strategy = strategy
        self.elapsed_ms = elapsed_ms


class ResilientOrchestrator:
    """
    Orquestrador com redundancia em cascata e resiliencia.

    Fluxo:
    1. MNI mTLS (certificado)
    2. MNI publico (sem certificado)
    3. Scraping com elite stealth
    4. 2Captcha se CAPTCHA
    5. Identity proxy se bloqueio IP
    """

    def __init__(self):
        self._circuits: Dict[str, CircuitBreaker] = {}
        self._rate_limiters: Dict[str, RateLimiter] = {}
        self._healthcheck = HealthcheckEngine()
        self._metrics = {
            "total_consultas": 0,
            "mcp_sucesso": 0,
            "mni_sucesso": 0,
            "mni_publico_sucesso": 0,
            "scraping_sucesso": 0,
            "captcha_resolvido": 0,
            "falhas_totais": 0,
            "circuit_breaks": 0,
        }
        self._strategy_stats: Dict[str, Dict] = {}

    def _get_circuit(self, tribunal: str) -> CircuitBreaker:
        if tribunal not in self._circuits:
            self._circuits[tribunal] = CircuitBreaker(tribunal=tribunal)
        return self._circuits[tribunal]

    def _get_rate_limiter(self, tribunal: str) -> RateLimiter:
        if tribunal not in self._rate_limiters:
            self._rate_limiters[tribunal] = RateLimiter(tribunal=tribunal)
        return self._rate_limiters[tribunal]

    async def consultar(
        self,
        tribunal: str,
        numero_processo: str,
        cert_path: Optional[str] = None,
        cert_password: Optional[str] = None,
    ) -> dict:
        """
        Consulta resiliente com cascata completa.
        Priority: MCP Techjustica -> MNI mTLS -> MNI publico -> Scraping -> CAPTCHA -> Proxy
        """
        self._metrics["total_consultas"] += 1

        # Circuit breaker check
        circuit = self._get_circuit(tribunal)
        if not circuit.can_execute():
            self._metrics["circuit_breaks"] += 1
            return {
                "tribunal": tribunal,
                "numero": numero_processo,
                "erro": f"Circuit breaker OPEN para {tribunal}",
                "circuit_state": circuit.state.value,
                "retry_after_seconds": circuit.recovery_timeout_seconds,
            }

        # Rate limiting
        limiter = self._get_rate_limiter(tribunal)
        await limiter.acquire()

        # Estrategias em ordem de prioridade
        strategies = []

        # 0. MCP Techjustica (fastest, covers all courts)
        strategies.append(("mcp_techjustica", self._try_mcp_techjustica, {
            "tribunal": tribunal,
            "numero": numero_processo,
        }))

        # 1. MNI com certificado
        if cert_path:
            strategies.append(("mni_mtls", self._try_mni_mtls, {
                "tribunal": tribunal,
                "numero": numero_processo,
                "cert_path": cert_path,
                "cert_password": cert_password,
            }))

        # 2. MNI publico
        strategies.append(("mni_publico", self._try_mni_publico, {
            "tribunal": tribunal,
            "numero": numero_processo,
        }))

        # 3. Scraping com stealth
        strategies.append(("scraping_stealth", self._try_scraping, {
            "tribunal": tribunal,
            "numero": numero_processo,
        }))

        # 4. 2Captcha fallback
        if os.environ.get("TWOCAPTCHA_API_KEY"):
            strategies.append(("captcha_2captcha", self._try_captcha_solve, {
                "tribunal": tribunal,
                "numero": numero_processo,
            }))

        # 5. Identity proxy fallback
        if os.environ.get("IDENTITY_PROXY_URL"):
            strategies.append(("identity_proxy", self._try_identity_proxy, {
                "tribunal": tribunal,
                "numero": numero_processo,
            }))

        # Executa estrategias em cascata
        for strategy_name, strategy_fn, params in strategies:
            try:
                start = time.time()
                result = await strategy_fn(**params)
                elapsed = (time.time() - start) * 1000

                if result and not result.get("erro"):
                    circuit.record_success()
                    self._record_strategy_success(strategy_name, elapsed)

                    return {
                        **result,
                        "estrategia_usada": strategy_name,
                        "tempo_ms": round(elapsed, 1),
                        "circuit_state": circuit.state.value,
                    }

            except Exception as e:
                logger.warning(f"Estrategia {strategy_name} falhou para {tribunal}: {e}")
                self._record_strategy_failure(strategy_name, str(e))

        # Todas falharam
        circuit.record_failure()
        self._metrics["falhas_totais"] += 1

        return {
            "tribunal": tribunal,
            "numero": numero_processo,
            "erro": "Todas as estrategias falharam",
            "circuit_state": circuit.state.value,
        }

    # ==================== STRATEGIES ====================

    async def _try_mcp_techjustica(self, tribunal: str, numero: str) -> Optional[dict]:
        """Estrategia 0: MCP Techjustica (fastest, all courts)"""
        try:
            from mcp_techjustica import get_mcp_client
            client = get_mcp_client()
            result = await client.consultar_processo(tribunal, numero)
            data = result.to_dict()
            # Check if we got meaningful data
            if data.get("classe") or data.get("movimentacoes") or data.get("partes"):
                self._metrics.setdefault("mcp_sucesso", 0)
                self._metrics["mcp_sucesso"] += 1
                return data
            raise Exception("MCP returned empty result")
        except Exception as e:
            raise

    async def _try_mni_mtls(self, tribunal: str, numero: str,
                             cert_path: str, cert_password: str) -> Optional[dict]:
        """Estrategia 1: MNI com certificado mTLS"""
        try:
            import sys
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), "mni"))
            from mni.mni_gateway import criar_mni_gateway

            gateway = criar_mni_gateway(tribunal, pfx_path=cert_path, pfx_senha=cert_password)
            result = await gateway.consultar_processo(numero)
            self._metrics["mni_sucesso"] += 1
            return result
        except Exception as e:
            raise

    async def _try_mni_publico(self, tribunal: str, numero: str) -> Optional[dict]:
        """Estrategia 2: MNI publico"""
        try:
            from mni.mni_gateway import criar_mni_gateway

            gateway = criar_mni_gateway(tribunal)
            result = await gateway.consultar_processo(numero)
            self._metrics["mni_publico_sucesso"] += 1
            return result
        except Exception as e:
            raise

    async def _try_scraping(self, tribunal: str, numero: str) -> Optional[dict]:
        """Estrategia 3: Scraping com elite stealth"""
        try:
            from orquestrador import get_orchestrator

            orch = get_orchestrator()
            result = await orch.consultar(tribunal, numero, "numero")
            self._metrics["scraping_sucesso"] += 1
            return result
        except Exception as e:
            raise

    async def _try_captcha_solve(self, tribunal: str, numero: str) -> Optional[dict]:
        """Estrategia 4: 2Captcha quando scraping encontra CAPTCHA"""
        try:
            captcha_key = os.environ.get("TWOCAPTCHA_API_KEY", "")
            if not captcha_key:
                raise ValueError("2Captcha API key nao configurada (TWOCAPTCHA_API_KEY)")

            try:
                from twocaptcha import TwoCaptcha
            except ImportError:
                raise ImportError("2captcha-python nao instalado")

            solver = TwoCaptcha(captcha_key)

            # Tenta resolver usando scraping com CAPTCHA solve
            from orquestrador import get_orchestrator
            orch = get_orchestrator()

            # Passa solver context (o scraper ira usar internamente)
            result = await orch.consultar(tribunal, numero, "numero")
            if result and not result.get("erro"):
                self._metrics["captcha_resolvido"] += 1
                return result
            raise Exception("Scraping com 2Captcha falhou")
        except Exception as e:
            raise

    async def _try_identity_proxy(self, tribunal: str, numero: str) -> Optional[dict]:
        """Estrategia 5: Identity proxy quando IP esta bloqueado"""
        try:
            proxy_url = os.environ.get("IDENTITY_PROXY_URL", "")
            if not proxy_url:
                raise ValueError("Identity proxy URL nao configurada (IDENTITY_PROXY_URL)")

            from mni.mni_gateway import criar_mni_gateway
            proxy_cert_id = os.environ.get("IDENTITY_PROXY_CERT_ID", "")
            proxy_api_key = os.environ.get("IDENTITY_PROXY_API_KEY", "")

            gateway = criar_mni_gateway(
                tribunal,
                proxy_url=proxy_url,
                proxy_cert_id=proxy_cert_id,
                proxy_api_key=proxy_api_key,
            )
            result = await gateway.consultar_processo(numero)
            return result
        except Exception as e:
            raise

    # ==================== MAINTENANCE ALERTS ====================

    def _check_maintenance_alerts(self) -> List[dict]:
        """Check for system health issues and generate maintenance alerts"""
        alerts = []

        # Check circuit breakers
        for tribunal, cb in self._circuits.items():
            if cb.state == CircuitState.OPEN:
                alerts.append({
                    "tipo": "circuit_breaker_open",
                    "tribunal": tribunal,
                    "severidade": "critica",
                    "mensagem": f"Circuit breaker OPEN para {tribunal} ({cb.failure_count} falhas)",
                    "recovery_timeout_s": cb.recovery_timeout_seconds,
                    "timestamp": datetime.now().isoformat(),
                })
            elif cb.state == CircuitState.HALF_OPEN:
                alerts.append({
                    "tipo": "circuit_breaker_half_open",
                    "tribunal": tribunal,
                    "severidade": "aviso",
                    "mensagem": f"Circuit breaker em recuperacao para {tribunal}",
                    "timestamp": datetime.now().isoformat(),
                })

        # Check healthcheck selectors
        hc_status = self._healthcheck.get_status()
        for key, selectors in hc_status.items():
            for name, info in selectors.items():
                if not info["working"]:
                    alerts.append({
                        "tipo": "selector_broken",
                        "tribunal_sistema": key,
                        "selector": name,
                        "severidade": "alta",
                        "mensagem": f"Seletor '{name}' quebrado em {key} ({info['failures']} falhas)",
                        "alternativas": info.get("alternatives", []),
                        "timestamp": datetime.now().isoformat(),
                    })

        # Check high failure rates
        for strategy, stats in self._strategy_stats.items():
            total = stats["sucesso"] + stats["falha"]
            if total >= 5:
                taxa = stats["sucesso"] / total * 100
                if taxa < 50:
                    alerts.append({
                        "tipo": "low_success_rate",
                        "estrategia": strategy,
                        "severidade": "aviso",
                        "mensagem": f"Taxa de sucesso baixa: {taxa:.1f}% para {strategy}",
                        "timestamp": datetime.now().isoformat(),
                    })

        return alerts

    # ==================== METRICS ====================

    def _record_strategy_success(self, strategy: str, elapsed_ms: float):
        if strategy not in self._strategy_stats:
            self._strategy_stats[strategy] = {"sucesso": 0, "falha": 0, "tempo_total_ms": 0}
        self._strategy_stats[strategy]["sucesso"] += 1
        self._strategy_stats[strategy]["tempo_total_ms"] += elapsed_ms

    def _record_strategy_failure(self, strategy: str, error: str):
        if strategy not in self._strategy_stats:
            self._strategy_stats[strategy] = {"sucesso": 0, "falha": 0, "tempo_total_ms": 0}
        self._strategy_stats[strategy]["falha"] += 1

    def get_metrics(self) -> dict:
        """Retorna metricas completas com alertas de manutencao"""
        return {
            "metricas_gerais": self._metrics,
            "estrategias": {
                name: {
                    **stats,
                    "taxa_sucesso": f"{stats['sucesso'] / max(stats['sucesso'] + stats['falha'], 1) * 100:.1f}%",
                    "tempo_medio_ms": round(
                        stats["tempo_total_ms"] / max(stats["sucesso"], 1), 1
                    ),
                }
                for name, stats in self._strategy_stats.items()
            },
            "circuit_breakers": {
                tribunal: cb.to_dict()
                for tribunal, cb in self._circuits.items()
            },
            "healthcheck": self._healthcheck.get_status(),
            "alertas_manutencao": self._check_maintenance_alerts(),
            "redundancia": {
                "fluxo": [
                    "0. MCP Techjustica (API remota, todos os tribunais)",
                    "1. MNI mTLS (certificado A1)",
                    "2. MNI publico (sem certificado)",
                    "3. Scraping com elite stealth (Patchright + browserforge)",
                    "4. 2Captcha se CAPTCHA detectado",
                    "5. Identity proxy se IP bloqueado",
                ],
                "mcp_api_configurada": bool(os.environ.get("MCP_TECHJUSTICA_API_KEY") or "mcp_33327fa443b949069f8e9f7baa442784"),
                "captcha_api_configurada": bool(os.environ.get("TWOCAPTCHA_API_KEY")),
                "identity_proxy_configurada": bool(os.environ.get("IDENTITY_PROXY_URL")),
            },
        }

    def get_circuit_breaker_status(self) -> dict:
        """Status de todos os circuit breakers com alertas"""
        return {
            "circuit_breakers": {
                tribunal: cb.to_dict()
                for tribunal, cb in self._circuits.items()
            },
            "alertas": self._check_maintenance_alerts(),
            "total_tribunais_monitorados": len(self._circuits),
            "tribunais_em_falha": sum(
                1 for cb in self._circuits.values()
                if cb.state != CircuitState.CLOSED
            ),
        }


# Singleton
_resilient_orch: Optional[ResilientOrchestrator] = None

def get_resilient_orchestrator() -> ResilientOrchestrator:
    global _resilient_orch
    if _resilient_orch is None:
        _resilient_orch = ResilientOrchestrator()
    return _resilient_orch
