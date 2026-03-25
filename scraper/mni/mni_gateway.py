"""
MNI Gateway Avancado - iuria LexFutura
Layer 1: Motor MNI com mTLS, fallback, identity proxy.

Fluxo de autenticacao:
  1. Certificado Digital A1 (.pfx) -> mTLS via OpenSSL -> zeep SOAP
  2. Fallback: consulta publica SOAP (sem certificado)
  3. Fallback: identity proxy (proxy que injeta certificado)

TLS 1.2+ enforced via ssl context.
"""
import asyncio
import base64
import hashlib
import json
import logging
import os
import ssl
import tempfile
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Any, Tuple

logger = logging.getLogger("iuria.mni.gateway")


@dataclass
class CertificadoA1:
    """Representacao de um certificado digital A1"""
    pfx_path: str
    senha: str
    titular: Optional[str] = None
    validade: Optional[str] = None
    tribunais_autorizados: list[str] = field(default_factory=list)
    _pem_cert: Optional[str] = None
    _pem_key: Optional[str] = None
    _temp_cert: Optional[str] = None
    _temp_key: Optional[str] = None

    def extrair_pem(self) -> Tuple[str, str]:
        """Extrai PEM cert e key de PFX usando cryptography (OpenSSL)"""
        if self._pem_cert and self._pem_key:
            return self._pem_cert, self._pem_key

        from cryptography.hazmat.primitives.serialization import (
            Encoding, PrivateFormat, NoEncryption,
        )
        from cryptography.hazmat.primitives.serialization.pkcs12 import (
            load_key_and_certificates,
        )
        from cryptography import x509

        with open(self.pfx_path, "rb") as f:
            pfx_data = f.read()

        private_key, cert, chain = load_key_and_certificates(
            pfx_data, self.senha.encode()
        )

        # Extrai metadados
        if cert:
            self.titular = cert.subject.rfc4514_string()
            self.validade = cert.not_valid_after_utc.isoformat()

        self._pem_cert = cert.public_bytes(Encoding.PEM).decode()
        self._pem_key = private_key.private_bytes(
            Encoding.PEM, PrivateFormat.TraditionalOpenSSL, NoEncryption()
        ).decode()

        # Adiciona certs da chain se existirem
        if chain:
            for ca_cert in chain:
                self._pem_cert += ca_cert.public_bytes(Encoding.PEM).decode()

        return self._pem_cert, self._pem_key

    def criar_arquivos_temp(self) -> Tuple[str, str]:
        """Cria arquivos temporarios PEM para uso com requests/zeep"""
        if self._temp_cert and self._temp_key:
            return self._temp_cert, self._temp_key

        cert_pem, key_pem = self.extrair_pem()

        cert_f = tempfile.NamedTemporaryFile(suffix=".pem", delete=False, mode="w")
        cert_f.write(cert_pem)
        cert_f.flush()
        cert_f.close()

        key_f = tempfile.NamedTemporaryFile(suffix=".key", delete=False, mode="w")
        key_f.write(key_pem)
        key_f.flush()
        key_f.close()

        self._temp_cert = cert_f.name
        self._temp_key = key_f.name
        return self._temp_cert, self._temp_key

    def limpar(self):
        """Remove arquivos temporarios"""
        for path in [self._temp_cert, self._temp_key]:
            if path:
                try:
                    os.unlink(path)
                except OSError:
                    pass
        self._temp_cert = None
        self._temp_key = None


@dataclass
class IdentityProxyConfig:
    """Proxy que injeta certificado digital (para ambientes restritos)"""
    proxy_url: str  # ex: https://proxy.iuria.com.br:8443
    cert_id: str    # ID do certificado no proxy
    api_key: str    # API key para autenticacao no proxy


class TLSSessionFactory:
    """Cria sessoes HTTP com TLS 1.2+ e certificado mTLS"""

    @staticmethod
    def criar_ssl_context(cert_path: Optional[str] = None, key_path: Optional[str] = None) -> ssl.SSLContext:
        """Cria SSLContext com TLS 1.2+ minimo"""
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        ctx.check_hostname = True
        ctx.verify_mode = ssl.CERT_REQUIRED
        ctx.load_default_certs()

        if cert_path and key_path:
            ctx.load_cert_chain(certfile=cert_path, keyfile=key_path)
            logger.info("mTLS: certificado carregado no SSLContext")

        return ctx

    @staticmethod
    def criar_requests_session(
        certificado: Optional[CertificadoA1] = None,
        timeout: int = 30,
    ):
        """Cria requests.Session com mTLS e TLS 1.2+"""
        import requests
        from requests.adapters import HTTPAdapter

        session = requests.Session()
        session.timeout = timeout

        # Enforce TLS 1.2+
        class TLS12Adapter(HTTPAdapter):
            def init_poolmanager(self, *args, **kwargs):
                ctx = TLSSessionFactory.criar_ssl_context()
                if certificado:
                    cert_path, key_path = certificado.criar_arquivos_temp()
                    ctx.load_cert_chain(certfile=cert_path, keyfile=key_path)
                kwargs["ssl_context"] = ctx
                return super().init_poolmanager(*args, **kwargs)

        adapter = TLS12Adapter()
        session.mount("https://", adapter)

        # Tambem seta cert tuple para compatibilidade direta
        if certificado:
            cert_path, key_path = certificado.criar_arquivos_temp()
            session.cert = (cert_path, key_path)

        return session


class MNIGateway:
    """
    Gateway MNI avancado com fallback em cascata:
    1. mTLS com certificado A1 -> SOAP zeep
    2. Consulta publica SOAP (sem certificado)
    3. Identity proxy (proxy com certificado injetado)

    Todas as conexoes usam TLS 1.2+.
    """

    def __init__(
        self,
        tribunal: str,
        wsdl_url: str,
        certificado: Optional[CertificadoA1] = None,
        identity_proxy: Optional[IdentityProxyConfig] = None,
        timeout: int = 30,
        max_retries: int = 3,
    ):
        self.tribunal = tribunal
        self.wsdl_url = wsdl_url
        self.certificado = certificado
        self.identity_proxy = identity_proxy
        self.timeout = timeout
        self.max_retries = max_retries
        self._clients = {}  # Cache por metodo
        self.logger = logging.getLogger(f"iuria.mni.gw.{tribunal}")

    # ==================== CLIENT FACTORY ====================

    async def _get_client_mtls(self):
        """Cria zeep client com mTLS (certificado A1)"""
        if "mtls" in self._clients:
            return self._clients["mtls"]

        if not self.certificado:
            raise ValueError("Certificado A1 nao configurado")

        from zeep import Client
        from zeep.transports import Transport

        session = TLSSessionFactory.criar_requests_session(
            certificado=self.certificado, timeout=self.timeout
        )
        transport = Transport(session=session, timeout=self.timeout)

        client = Client(wsdl=self.wsdl_url, transport=transport)
        self._clients["mtls"] = client
        self.logger.info(f"mTLS client criado para {self.tribunal}")
        return client

    async def _get_client_publico(self):
        """Cria zeep client para consulta publica (sem certificado)"""
        if "publico" in self._clients:
            return self._clients["publico"]

        from zeep import Client
        from zeep.transports import Transport
        import requests

        session = requests.Session()
        session.verify = True
        session.timeout = self.timeout
        transport = Transport(session=session, timeout=self.timeout)

        client = Client(wsdl=self.wsdl_url, transport=transport)
        self._clients["publico"] = client
        self.logger.info(f"Public SOAP client criado para {self.tribunal}")
        return client

    async def _get_client_proxy(self):
        """Cria zeep client via identity proxy"""
        if "proxy" in self._clients:
            return self._clients["proxy"]

        if not self.identity_proxy:
            raise ValueError("Identity proxy nao configurado")

        from zeep import Client
        from zeep.transports import Transport
        import requests

        session = requests.Session()
        session.verify = True
        session.timeout = self.timeout
        session.proxies = {
            "https": self.identity_proxy.proxy_url,
            "http": self.identity_proxy.proxy_url,
        }
        session.headers.update({
            "X-Cert-Id": self.identity_proxy.cert_id,
            "X-Api-Key": self.identity_proxy.api_key,
        })

        transport = Transport(session=session, timeout=self.timeout)
        client = Client(wsdl=self.wsdl_url, transport=transport)
        self._clients["proxy"] = client
        self.logger.info(f"Identity proxy client criado para {self.tribunal}")
        return client

    # ==================== CASCADING FALLBACK ====================

    async def _execute_with_fallback(self, operation: str, **params) -> Any:
        """
        Executa operacao MNI com cascata de fallback:
        mTLS -> publico -> identity_proxy
        """
        metodos = []
        if self.certificado:
            metodos.append(("mtls", self._get_client_mtls))
        metodos.append(("publico", self._get_client_publico))
        if self.identity_proxy:
            metodos.append(("proxy", self._get_client_proxy))

        last_error = None
        for metodo_nome, get_client_fn in metodos:
            for attempt in range(self.max_retries):
                try:
                    client = await get_client_fn()
                    service_method = getattr(client.service, operation)
                    response = service_method(**params)
                    self.logger.info(
                        f"[{metodo_nome}] {operation} sucesso em {self.tribunal} "
                        f"(tentativa {attempt + 1})"
                    )
                    return response, metodo_nome
                except Exception as e:
                    last_error = e
                    self.logger.warning(
                        f"[{metodo_nome}] {operation} falhou (tentativa {attempt + 1}): {e}"
                    )
                    # Remove client do cache para forcar reconexao
                    self._clients.pop(metodo_nome, None)
                    if attempt < self.max_retries - 1:
                        await asyncio.sleep(2 ** attempt)

            self.logger.warning(f"[{metodo_nome}] Esgotou tentativas, tentando proximo metodo...")

        raise ConnectionError(
            f"Todas as estrategias falharam para {self.tribunal}/{operation}: {last_error}"
        )

    # ==================== OPERACOES MNI ====================

    async def consultar_processo(
        self,
        numero_processo: str,
        incluir_documentos: bool = False,
        incluir_movimentos: bool = True,
    ) -> dict:
        """consultarProcesso com cascading fallback"""
        numero = numero_processo.replace(".", "").replace("-", "").replace(" ", "")

        params = {
            "idConsultante": "iuria-lexfutura",
            "senhaConsultante": "",
            "numeroProcesso": numero,
            "movimentos": incluir_movimentos,
            "incluirCabecalho": True,
            "incluirDocumentos": incluir_documentos,
        }

        response, metodo = await self._execute_with_fallback("consultarProcesso", **params)

        # Parse response
        resultado = self._parse_processo_response(response, numero_processo)
        resultado["metodo_autenticacao"] = metodo
        return resultado

    async def consultar_movimentacoes(self, numero_processo: str) -> list[dict]:
        """Retorna apenas movimentacoes"""
        result = await self.consultar_processo(numero_processo, incluir_movimentos=True)
        return result.get("movimentacoes", [])

    async def baixar_documento(self, id_documento: str, numero_processo: str) -> Optional[dict]:
        """Baixa documento PDF via MNI com fallback"""
        numero = numero_processo.replace(".", "").replace("-", "").replace(" ", "")

        params = {
            "idConsultante": "iuria-lexfutura",
            "senhaConsultante": "",
            "numeroProcesso": numero,
            "incluirDocumentos": True,
            "movimentos": False,
            "documento": id_documento,
        }

        response, metodo = await self._execute_with_fallback("consultarProcesso", **params)
        processo = getattr(response, "processo", response)
        documentos = getattr(processo, "documento", []) or []

        for doc in documentos:
            if str(getattr(doc, "idDocumento", "")) == id_documento:
                conteudo = getattr(doc, "conteudo", None)
                if conteudo:
                    conteudo_b64 = (
                        base64.b64encode(conteudo).decode()
                        if isinstance(conteudo, bytes)
                        else str(conteudo)
                    )
                    return {
                        "id_documento": id_documento,
                        "tipo": getattr(doc, "tipoDocumento", ""),
                        "descricao": getattr(doc, "descricao", ""),
                        "mime_type": getattr(doc, "mimetype", "application/pdf"),
                        "conteudo_base64": conteudo_b64,
                        "tamanho_bytes": len(conteudo) if isinstance(conteudo, bytes) else 0,
                        "hash_sha256": hashlib.sha256(
                            conteudo if isinstance(conteudo, bytes) else conteudo.encode()
                        ).hexdigest(),
                        "metodo": metodo,
                    }
        return None

    async def listar_pendencias(self) -> list[dict]:
        """Lista avisos pendentes (requer certificado)"""
        try:
            response, metodo = await self._execute_with_fallback(
                "consultarAvisosPendentes",
                idConsultante="iuria-lexfutura",
                senhaConsultante="",
            )
            avisos = getattr(response, "aviso", []) or []
            return [
                {
                    "id": str(getattr(a, "idAviso", "")),
                    "tipo": getattr(a, "tipoAviso", ""),
                    "processo": getattr(a, "numeroProcesso", ""),
                    "data": str(getattr(a, "dataDisponibilizacao", "")),
                    "teor": getattr(a, "teor", ""),
                    "metodo": metodo,
                }
                for a in avisos
            ]
        except Exception as e:
            self.logger.error(f"Erro ao listar pendencias: {e}")
            return []

    # ==================== PARSER ====================

    def _parse_processo_response(self, response: Any, numero_original: str) -> dict:
        """Parse robusto da resposta MNI"""
        resultado = {
            "numero": numero_original,
            "tribunal": self.tribunal,
            "classe": None,
            "assunto": None,
            "orgao_julgador": None,
            "competencia": None,
            "data_ajuizamento": None,
            "valor_causa": 0.0,
            "situacao": None,
            "nivel_sigilo": 0,
            "partes": [],
            "movimentacoes": [],
            "documentos": [],
        }

        if hasattr(response, "sucesso") and not response.sucesso:
            resultado["erro"] = getattr(response, "mensagem", "Erro desconhecido")
            return resultado

        processo = getattr(response, "processo", response)

        resultado["classe"] = self._safe_nav(processo, "classeProcessual", "descricao")
        resultado["assunto"] = self._safe_nav(processo, "assuntoProcessual", "descricao")
        resultado["orgao_julgador"] = self._safe_nav(processo, "orgaoJulgador", "descricao")
        resultado["competencia"] = self._safe_nav(processo, "competencia", "descricao")
        resultado["data_ajuizamento"] = str(getattr(processo, "dataAjuizamento", "") or "")
        resultado["valor_causa"] = float(getattr(processo, "valorCausa", 0) or 0)
        resultado["situacao"] = str(getattr(processo, "situacao", "") or "")
        resultado["nivel_sigilo"] = int(getattr(processo, "nivelSigilo", 0) or 0)

        # Partes
        for polo in (getattr(processo, "polo", []) or []):
            tipo_polo = getattr(polo, "polo", "")
            for parte in (getattr(polo, "parte", []) or []):
                pessoa = getattr(parte, "pessoa", None)
                if pessoa:
                    resultado["partes"].append({
                        "polo": tipo_polo,
                        "nome": getattr(pessoa, "nome", ""),
                        "documento": getattr(pessoa, "numeroDocumentoPrincipal", ""),
                        "tipo_pessoa": getattr(pessoa, "tipoPessoa", ""),
                    })

        # Movimentacoes
        for mov in (getattr(processo, "movimento", []) or []):
            resultado["movimentacoes"].append({
                "data": str(getattr(mov, "dataHora", "")),
                "descricao": getattr(mov, "descricao", ""),
                "tipo": getattr(mov, "tipoMovimento", ""),
                "complemento": str(getattr(mov, "complemento", "") or ""),
                "codigo_cnj": str(getattr(mov, "codigoNacional", "") or ""),
            })

        # Documentos
        for doc in (getattr(processo, "documento", []) or []):
            resultado["documentos"].append({
                "id": str(getattr(doc, "idDocumento", "")),
                "tipo": getattr(doc, "tipoDocumento", ""),
                "descricao": getattr(doc, "descricao", ""),
                "data": str(getattr(doc, "dataHora", "")),
                "mime_type": getattr(doc, "mimetype", "application/pdf"),
                "hash": getattr(doc, "hash", None),
            })

        return resultado

    @staticmethod
    def _safe_nav(obj: Any, *attrs: str) -> Optional[str]:
        current = obj
        for attr in attrs:
            if current is None:
                return None
            current = getattr(current, attr, None)
        return str(current) if current else None

    def fechar(self):
        """Limpa recursos"""
        self._clients.clear()
        if self.certificado:
            self.certificado.limpar()


# ==================== FACTORY ====================

try:
    from .mni_client import MNI_ENDPOINTS
except ImportError:
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from mni_client import MNI_ENDPOINTS


def criar_mni_gateway(
    tribunal: str,
    pfx_path: Optional[str] = None,
    pfx_senha: Optional[str] = None,
    proxy_url: Optional[str] = None,
    proxy_cert_id: Optional[str] = None,
    proxy_api_key: Optional[str] = None,
) -> MNIGateway:
    """Factory para MNIGateway com configuracao simplificada"""
    if tribunal not in MNI_ENDPOINTS:
        raise ValueError(f"Tribunal MNI nao configurado: {tribunal}")

    cert = None
    if pfx_path and pfx_senha:
        cert = CertificadoA1(pfx_path=pfx_path, senha=pfx_senha)

    proxy = None
    if proxy_url and proxy_cert_id and proxy_api_key:
        proxy = IdentityProxyConfig(
            proxy_url=proxy_url,
            cert_id=proxy_cert_id,
            api_key=proxy_api_key,
        )

    return MNIGateway(
        tribunal=tribunal,
        wsdl_url=MNI_ENDPOINTS[tribunal],
        certificado=cert,
        identity_proxy=proxy,
    )
