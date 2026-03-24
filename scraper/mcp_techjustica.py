"""
MCP Techjustica Client - iuria LexFutura
Integrates with MCP Techjustica remote server for all Brazilian courts.

MCP Techjustica provides:
- Process consultation across all Brazilian courts (STF, STJ, TRFs, TJs, TRTs)
- Case progress/movement tracking
- Document/piece download
- Party search
- Unified API for 92+ tribunais

Authentication: API Key via X-API-Key header or Bearer token.
Protocol: JSON-RPC 2.0 over HTTP/SSE (MCP standard)
Transport: Streamable HTTP (Node.js 18+)
"""

import asyncio
import json
import logging
import os
import time
import hashlib
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Optional, Any, Dict, List
from urllib.parse import urljoin

logger = logging.getLogger("iuria.mcp_techjustica")

# Default MCP Techjustica endpoint
DEFAULT_MCP_URL = os.environ.get(
    "MCP_TECHJUSTICA_URL",
    "https://mcp.techjustica.com.br/v1"
)

MCP_API_KEY = os.environ.get(
    "MCP_TECHJUSTICA_API_KEY",
    "mcp_33327fa443b949069f8e9f7baa442784"
)


@dataclass
class MCPToolCall:
    """Represents an MCP tool invocation"""
    method: str
    params: Dict[str, Any] = field(default_factory=dict)
    id: int = 0


@dataclass
class MCPProcessoResult:
    """Standardized process result from MCP"""
    numero: str
    tribunal: str
    classe: Optional[str] = None
    assunto: Optional[str] = None
    orgao_julgador: Optional[str] = None
    relator: Optional[str] = None
    data_ajuizamento: Optional[str] = None
    valor_causa: Optional[float] = None
    situacao: Optional[str] = None
    partes: List[Dict] = field(default_factory=list)
    movimentacoes: List[Dict] = field(default_factory=list)
    documentos: List[Dict] = field(default_factory=list)
    url: Optional[str] = None
    fonte: str = "mcp_techjustica"
    metodo: str = "mcp"

    def to_dict(self) -> dict:
        return asdict(self)


class MCPTechjusticaClient:
    """
    Client for MCP Techjustica remote server.
    
    Uses JSON-RPC 2.0 protocol over HTTP.
    Supports all 92+ Brazilian courts via unified API.
    
    Usage:
        client = MCPTechjusticaClient(api_key="mcp_...")
        result = await client.consultar_processo("STF", "ADI 1")
        movements = await client.consultar_movimentacoes("TJSP", "1234567-89.2024.8.26.0100")
        doc = await client.baixar_documento("TJSP", "1234567-89.2024.8.26.0100", "doc_id")
    """

    # Mapping of all supported tribunais with their MCP tool names
    TRIBUNAIS_SUPORTADOS = {
        # Superiores
        "STF": {"tool": "consultar_stf", "sistema": "stf_portal", "nome": "Supremo Tribunal Federal"},
        "STJ": {"tool": "consultar_stj", "sistema": "stj_portal", "nome": "Superior Tribunal de Justica"},
        "TST": {"tool": "consultar_tst", "sistema": "pje", "nome": "Tribunal Superior do Trabalho"},
        "TSE": {"tool": "consultar_tse", "sistema": "pje", "nome": "Tribunal Superior Eleitoral"},
        "STM": {"tool": "consultar_stm", "sistema": "stm_portal", "nome": "Superior Tribunal Militar"},
        # TRFs
        **{f"TRF{i}": {
            "tool": f"consultar_trf{i}",
            "sistema": "pje" if i not in [2, 4] else "eproc",
            "nome": f"TRF {i}a Regiao"
        } for i in range(1, 7)},
        # TJs
        **{f"TJ{uf}": {
            "tool": f"consultar_tj{uf.lower()}",
            "sistema": "pje",
            "nome": f"TJ {uf}"
        } for uf in [
            "AC", "AL", "AM", "AP", "BA", "CE", "DFT", "ES", "GO",
            "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR",
            "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"
        ]},
        # TRTs (1-24)
        **{f"TRT{i}": {
            "tool": f"consultar_trt{i}",
            "sistema": "pje",
            "nome": f"TRT {i}a Regiao"
        } for i in range(1, 25)},
    }

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: int = 30,
        max_retries: int = 3,
    ):
        self.api_key = api_key or MCP_API_KEY
        self.base_url = base_url or DEFAULT_MCP_URL
        self.timeout = timeout
        self.max_retries = max_retries
        self._request_id = 0
        self._session = None
        self._cache: Dict[str, Any] = {}
        self._cache_ttl = 300  # 5 minutes
        self._metrics = {
            "total_requests": 0,
            "successful": 0,
            "failed": 0,
            "cached_hits": 0,
            "avg_response_ms": 0.0,
            "total_response_ms": 0.0,
        }
        logger.info(f"MCPTechjusticaClient initialized: {self.base_url}")

    def _next_id(self) -> int:
        self._request_id += 1
        return self._request_id

    def _cache_key(self, method: str, params: dict) -> str:
        """Generate cache key for deduplication"""
        data = json.dumps({"method": method, "params": params}, sort_keys=True)
        return hashlib.md5(data.encode()).hexdigest()

    def _check_cache(self, key: str) -> Optional[Any]:
        """Check if result is in cache and not expired"""
        if key in self._cache:
            entry = self._cache[key]
            if time.time() - entry["timestamp"] < self._cache_ttl:
                self._metrics["cached_hits"] += 1
                return entry["data"]
            else:
                del self._cache[key]
        return None

    def _set_cache(self, key: str, data: Any):
        """Store result in cache"""
        self._cache[key] = {"data": data, "timestamp": time.time()}
        # Evict old entries if cache is too large
        if len(self._cache) > 1000:
            oldest = min(self._cache.keys(), key=lambda k: self._cache[k]["timestamp"])
            del self._cache[oldest]

    async def _get_session(self):
        """Get or create aiohttp session"""
        if self._session is None or self._session.closed:
            try:
                import aiohttp
                self._session = aiohttp.ClientSession(
                    headers={
                        "Content-Type": "application/json",
                        "X-API-Key": self.api_key,
                        "Authorization": f"Bearer {self.api_key}",
                        "User-Agent": "iuria-lexfutura/3.0 MCPClient/1.0",
                        "Accept": "application/json",
                    },
                    timeout=aiohttp.ClientTimeout(total=self.timeout),
                )
            except ImportError:
                # Fallback: use httpx or urllib
                self._session = None
                logger.warning("aiohttp not available, using fallback HTTP client")
        return self._session

    async def _rpc_call(
        self,
        method: str,
        params: Optional[Dict[str, Any]] = None,
        use_cache: bool = True,
    ) -> Any:
        """
        Execute JSON-RPC 2.0 call to MCP server.
        
        The MCP protocol uses:
        - POST /messages for tool invocations
        - SSE for streaming responses
        - JSON-RPC 2.0 envelope
        """
        params = params or {}
        
        # Check cache
        if use_cache:
            cache_key = self._cache_key(method, params)
            cached = self._check_cache(cache_key)
            if cached is not None:
                logger.debug(f"Cache hit for {method}")
                return cached

        self._metrics["total_requests"] += 1
        start = time.time()

        # Build JSON-RPC request
        rpc_request = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "tools/call",
            "params": {
                "name": method,
                "arguments": params,
            },
        }

        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                session = await self._get_session()
                
                if session:
                    # Use aiohttp
                    url = f"{self.base_url}/messages"
                    async with session.post(url, json=rpc_request) as resp:
                        elapsed = (time.time() - start) * 1000
                        self._metrics["total_response_ms"] += elapsed
                        
                        if resp.status == 200:
                            data = await resp.json()
                            result = self._parse_rpc_response(data)
                            self._metrics["successful"] += 1
                            self._metrics["avg_response_ms"] = (
                                self._metrics["total_response_ms"] / self._metrics["successful"]
                            )
                            
                            if use_cache:
                                self._set_cache(cache_key, result)
                            
                            return result
                        
                        elif resp.status == 401:
                            raise PermissionError(f"API key invalida ou expirada (HTTP {resp.status})")
                        
                        elif resp.status == 429:
                            retry_after = int(resp.headers.get("Retry-After", "5"))
                            logger.warning(f"Rate limited, waiting {retry_after}s...")
                            await asyncio.sleep(retry_after)
                            continue
                        
                        elif resp.status >= 500:
                            error_text = await resp.text()
                            raise ConnectionError(f"Server error {resp.status}: {error_text[:200]}")
                        
                        else:
                            error_text = await resp.text()
                            raise Exception(f"HTTP {resp.status}: {error_text[:200]}")
                else:
                    # Fallback: use urllib (synchronous)
                    result = await self._fallback_http_call(rpc_request)
                    elapsed = (time.time() - start) * 1000
                    self._metrics["total_response_ms"] += elapsed
                    self._metrics["successful"] += 1
                    
                    if use_cache:
                        self._set_cache(cache_key, result)
                    
                    return result

            except (PermissionError, ValueError) as e:
                self._metrics["failed"] += 1
                raise  # Don't retry auth errors

            except Exception as e:
                last_error = e
                logger.warning(f"MCP call attempt {attempt}/{self.max_retries} failed: {e}")
                if attempt < self.max_retries:
                    await asyncio.sleep(2 ** attempt)

        self._metrics["failed"] += 1
        raise ConnectionError(
            f"MCP Techjustica: {method} failed after {self.max_retries} attempts: {last_error}"
        )

    async def _fallback_http_call(self, rpc_request: dict) -> Any:
        """Fallback HTTP client using urllib"""
        import urllib.request
        import urllib.error

        url = f"{self.base_url}/messages"
        data = json.dumps(rpc_request).encode("utf-8")
        
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Content-Type": "application/json",
                "X-API-Key": self.api_key,
                "Authorization": f"Bearer {self.api_key}",
                "User-Agent": "iuria-lexfutura/3.0 MCPClient/1.0",
                "Accept": "application/json",
            },
            method="POST",
        )
        
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                response_data = json.loads(resp.read().decode("utf-8"))
                return self._parse_rpc_response(response_data)
        except urllib.error.HTTPError as e:
            if e.code == 401:
                raise PermissionError("API key invalida")
            raise ConnectionError(f"HTTP {e.code}: {e.read().decode()[:200]}")

    def _parse_rpc_response(self, data: Any) -> Any:
        """Parse JSON-RPC 2.0 response"""
        if isinstance(data, dict):
            if "error" in data:
                error = data["error"]
                code = error.get("code", -1)
                message = error.get("message", "Unknown error")
                raise Exception(f"MCP RPC Error ({code}): {message}")
            
            if "result" in data:
                result = data["result"]
                # MCP tool results are wrapped in content array
                if isinstance(result, dict) and "content" in result:
                    contents = result["content"]
                    if isinstance(contents, list) and len(contents) > 0:
                        first = contents[0]
                        if isinstance(first, dict) and first.get("type") == "text":
                            try:
                                return json.loads(first["text"])
                            except (json.JSONDecodeError, KeyError):
                                return first.get("text", first)
                        return first
                return result
        return data

    # ==================== PUBLIC API ====================

    async def consultar_processo(
        self,
        tribunal: str,
        numero_processo: str,
        tipo_busca: str = "numero",
        incluir_movimentos: bool = True,
        incluir_documentos: bool = False,
    ) -> MCPProcessoResult:
        """
        Consult a process in any Brazilian court via MCP Techjustica.
        
        Args:
            tribunal: Court code (STF, STJ, TRF1, TJSP, TRT1, etc.)
            numero_processo: Process number (CNJ format or tribunal-specific)
            tipo_busca: Search type ('numero', 'nome', 'oab', 'cnpj')
            incluir_movimentos: Include case movements
            incluir_documentos: Include document list
            
        Returns:
            MCPProcessoResult with all available data
        """
        tribunal = tribunal.upper().replace("TJDFT", "TJDFT").strip()
        
        # Determine the MCP tool to use
        tool_info = self.TRIBUNAIS_SUPORTADOS.get(tribunal)
        if not tool_info:
            # Try generic consultation
            tool_name = "consultar_processo"
        else:
            tool_name = tool_info["tool"]

        params = {
            "tribunal": tribunal,
            "numero_processo": numero_processo,
            "tipo_busca": tipo_busca,
            "incluir_movimentos": incluir_movimentos,
            "incluir_documentos": incluir_documentos,
        }

        try:
            data = await self._rpc_call(tool_name, params)
            return self._parse_processo_result(data, tribunal, numero_processo)
        except Exception as e:
            logger.error(f"MCP consultar_processo failed: {e}")
            # Return empty result with error
            result = MCPProcessoResult(numero=numero_processo, tribunal=tribunal)
            result.movimentacoes = []
            return result

    async def consultar_movimentacoes(
        self,
        tribunal: str,
        numero_processo: str,
        limite: int = 50,
    ) -> List[Dict]:
        """Get case movements/progress"""
        params = {
            "tribunal": tribunal.upper(),
            "numero_processo": numero_processo,
            "limite": limite,
        }

        try:
            data = await self._rpc_call("consultar_movimentacoes", params)
            if isinstance(data, dict):
                return data.get("movimentacoes", [])
            if isinstance(data, list):
                return data
            return []
        except Exception as e:
            logger.error(f"MCP consultar_movimentacoes failed: {e}")
            return []

    async def baixar_documento(
        self,
        tribunal: str,
        numero_processo: str,
        id_documento: str,
    ) -> Optional[Dict]:
        """Download a document/piece from a case"""
        params = {
            "tribunal": tribunal.upper(),
            "numero_processo": numero_processo,
            "id_documento": id_documento,
        }

        try:
            data = await self._rpc_call("baixar_documento", params, use_cache=False)
            return data
        except Exception as e:
            logger.error(f"MCP baixar_documento failed: {e}")
            return None

    async def buscar_por_parte(
        self,
        tribunal: str,
        nome_parte: str,
        tipo_parte: str = "qualquer",
        limite: int = 20,
    ) -> List[MCPProcessoResult]:
        """Search cases by party name"""
        params = {
            "tribunal": tribunal.upper(),
            "nome_parte": nome_parte,
            "tipo_parte": tipo_parte,
            "limite": limite,
        }

        try:
            data = await self._rpc_call("buscar_por_parte", params)
            results = []
            processos = data.get("processos", []) if isinstance(data, dict) else []
            for proc in processos:
                results.append(self._parse_processo_result(proc, tribunal, proc.get("numero", "")))
            return results
        except Exception as e:
            logger.error(f"MCP buscar_por_parte failed: {e}")
            return []

    async def buscar_por_oab(
        self,
        numero_oab: str,
        estado_oab: str,
        tribunal: Optional[str] = None,
    ) -> List[MCPProcessoResult]:
        """Search cases by OAB number"""
        params = {
            "numero_oab": numero_oab,
            "estado_oab": estado_oab,
        }
        if tribunal:
            params["tribunal"] = tribunal.upper()

        try:
            data = await self._rpc_call("buscar_por_oab", params)
            results = []
            processos = data.get("processos", []) if isinstance(data, dict) else []
            for proc in processos:
                results.append(self._parse_processo_result(
                    proc, proc.get("tribunal", tribunal or ""), proc.get("numero", "")
                ))
            return results
        except Exception as e:
            logger.error(f"MCP buscar_por_oab failed: {e}")
            return []

    async def listar_tribunais(self) -> Dict:
        """List all supported courts and their status"""
        try:
            data = await self._rpc_call("listar_tribunais", {})
            return data
        except Exception:
            # Return local knowledge
            return {
                "total": len(self.TRIBUNAIS_SUPORTADOS),
                "tribunais": {
                    sigla: info["nome"]
                    for sigla, info in self.TRIBUNAIS_SUPORTADOS.items()
                },
            }

    async def verificar_status(self) -> Dict:
        """Health check - verify MCP server status"""
        try:
            data = await self._rpc_call("verificar_status", {}, use_cache=False)
            return {"status": "online", "data": data}
        except Exception as e:
            return {"status": "offline", "error": str(e)}

    def get_metrics(self) -> Dict:
        """Return client metrics"""
        return {
            **self._metrics,
            "cache_size": len(self._cache),
            "cache_ttl_seconds": self._cache_ttl,
            "tribunais_suportados": len(self.TRIBUNAIS_SUPORTADOS),
        }

    # ==================== PARSERS ====================

    def _parse_processo_result(self, data: Any, tribunal: str, numero: str) -> MCPProcessoResult:
        """Parse MCP response into standardized result"""
        if not data or not isinstance(data, dict):
            return MCPProcessoResult(numero=numero, tribunal=tribunal)

        return MCPProcessoResult(
            numero=data.get("numero", numero),
            tribunal=data.get("tribunal", tribunal),
            classe=data.get("classe"),
            assunto=data.get("assunto"),
            orgao_julgador=data.get("orgao_julgador"),
            relator=data.get("relator"),
            data_ajuizamento=data.get("data_ajuizamento"),
            valor_causa=data.get("valor_causa"),
            situacao=data.get("situacao"),
            partes=data.get("partes", []),
            movimentacoes=data.get("movimentacoes", []),
            documentos=data.get("documentos", []),
            url=data.get("url"),
            fonte="mcp_techjustica",
            metodo="mcp",
        )

    # ==================== LIFECYCLE ====================

    async def close(self):
        """Close HTTP session"""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()


# ==================== SINGLETON & FACTORY ====================

_client: Optional[MCPTechjusticaClient] = None


def get_mcp_client(
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
) -> MCPTechjusticaClient:
    """Get or create singleton MCP Techjustica client"""
    global _client
    if _client is None:
        _client = MCPTechjusticaClient(api_key=api_key, base_url=base_url)
    return _client


# ==================== CLI ====================

async def main():
    """CLI for testing MCP Techjustica integration"""
    import sys

    if len(sys.argv) < 2:
        print(json.dumps({
            "uso": "python mcp_techjustica.py <comando> [args]",
            "comandos": {
                "status": "Verificar status do servidor MCP",
                "listar": "Listar tribunais suportados",
                "consultar": "<tribunal> <numero> - Consultar processo",
                "movimentos": "<tribunal> <numero> - Consultar movimentacoes",
                "buscar": "<tribunal> <nome> - Buscar por nome de parte",
                "metricas": "Ver metricas do cliente",
            },
            "api_key": f"{MCP_API_KEY[:12]}...{MCP_API_KEY[-4:]}",
            "url": DEFAULT_MCP_URL,
        }, ensure_ascii=False, indent=2))
        return

    cmd = sys.argv[1]
    client = get_mcp_client()

    try:
        if cmd == "status":
            result = await client.verificar_status()
        elif cmd == "listar":
            result = await client.listar_tribunais()
        elif cmd == "consultar" and len(sys.argv) >= 4:
            tribunal = sys.argv[2].upper()
            numero = sys.argv[3]
            proc = await client.consultar_processo(tribunal, numero)
            result = proc.to_dict()
        elif cmd == "movimentos" and len(sys.argv) >= 4:
            tribunal = sys.argv[2].upper()
            numero = sys.argv[3]
            result = await client.consultar_movimentacoes(tribunal, numero)
        elif cmd == "buscar" and len(sys.argv) >= 4:
            tribunal = sys.argv[2].upper()
            nome = " ".join(sys.argv[3:])
            procs = await client.buscar_por_parte(tribunal, nome)
            result = [p.to_dict() for p in procs]
        elif cmd == "metricas":
            result = client.get_metrics()
        else:
            result = {"erro": "Comando invalido ou argumentos insuficientes"}

        print(json.dumps(result, ensure_ascii=False, indent=2))

    except Exception as e:
        print(json.dumps({"erro": str(e)}, ensure_ascii=False))
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
