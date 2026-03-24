"""
Cliente MNI (Modelo Nacional de Interoperabilidade) via SOAP/XML
Resolucao CNJ 185/2013 - Webservices para comunicacao entre tribunais.

Operacoes MNI:
  - consultarProcesso: Consulta dados do processo
  - consultarTeorComunicacao: Conteudo de comunicacoes/intimacoes
  - consultarMovimentacao: Andamentos processuais
  - consultarDocumento: Download de pecas processuais (PDFs)
  - listarPendencias: Lista comunicacoes pendentes

Autenticacao: Certificado Digital A1 (mTLS) ou usuario/senha

WSDL padrao: https://{dominio}/mni/servicos/?wsdl
"""
import asyncio
import base64
import json
import logging
import os
import sys
import tempfile
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Any
from xml.etree import ElementTree as ET

logger = logging.getLogger("iuria.mni")


@dataclass
class MNIConfig:
    """Configuracao para conexao MNI"""
    tribunal: str
    wsdl_url: str
    # Autenticacao por certificado A1
    cert_pfx_path: Optional[str] = None
    cert_password: Optional[str] = None
    # Autenticacao por usuario/senha
    username: Optional[str] = None
    password: Optional[str] = None
    # Configuracao
    timeout: int = 30
    max_retries: int = 3


@dataclass
class MNIProcesso:
    """Resultado de consultarProcesso via MNI"""
    numero: str
    tribunal: str
    classe: Optional[str] = None
    assunto: Optional[str] = None
    orgao_julgador: Optional[str] = None
    competencia: Optional[str] = None
    data_ajuizamento: Optional[str] = None
    valor_causa: Optional[float] = None
    situacao: Optional[str] = None
    nivel_sigilo: int = 0
    partes: list[dict] = field(default_factory=list)
    movimentacoes: list[dict] = field(default_factory=list)
    documentos: list[dict] = field(default_factory=list)
    raw_xml: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "numero": self.numero,
            "tribunal": self.tribunal,
            "classe": self.classe,
            "assunto": self.assunto,
            "orgao_julgador": self.orgao_julgador,
            "competencia": self.competencia,
            "data_ajuizamento": self.data_ajuizamento,
            "valor_causa": self.valor_causa,
            "situacao": self.situacao,
            "nivel_sigilo": self.nivel_sigilo,
            "partes": self.partes,
            "movimentacoes": self.movimentacoes,
            "documentos": self.documentos,
        }


@dataclass
class MNIDocumento:
    """Documento/peca processual obtida via MNI"""
    id_documento: str
    tipo: str  # peticao, decisao, sentenca, etc.
    descricao: str
    data: Optional[str] = None
    mime_type: str = "application/pdf"
    conteudo_base64: Optional[str] = None
    tamanho_bytes: int = 0
    hash_documento: Optional[str] = None


class MNIClient:
    """
    Cliente SOAP para Modelo Nacional de Interoperabilidade.
    Suporta autenticacao por certificado A1 ou usuario/senha.
    Usa zeep para comunicacao SOAP.
    """

    def __init__(self, config: MNIConfig):
        self.config = config
        self._client = None
        self._cert_file = None
        self.logger = logging.getLogger(f"iuria.mni.{config.tribunal}")

    async def _get_client(self):
        """Inicializa cliente SOAP zeep com autenticacao"""
        if self._client is not None:
            return self._client

        try:
            from zeep import Client
            from zeep.transports import Transport
            from zeep.wsse.username import UsernameToken
            import requests
        except ImportError:
            raise ImportError("zeep nao instalado. Execute: pip install zeep")

        session = requests.Session()
        session.verify = True
        session.timeout = self.config.timeout

        # Autenticacao por certificado A1
        if self.config.cert_pfx_path and self.config.cert_password:
            try:
                cert_pem, key_pem = self._extract_pem_from_pfx(
                    self.config.cert_pfx_path,
                    self.config.cert_password,
                )
                # Cria arquivos temporarios para cert e key
                self._cert_file = tempfile.NamedTemporaryFile(
                    suffix=".pem", delete=False, mode="w"
                )
                self._cert_file.write(cert_pem)
                self._cert_file.flush()

                key_file = tempfile.NamedTemporaryFile(
                    suffix=".key", delete=False, mode="w"
                )
                key_file.write(key_pem)
                key_file.flush()

                session.cert = (self._cert_file.name, key_file.name)
                self.logger.info(f"Certificado A1 carregado para {self.config.tribunal}")
            except Exception as e:
                self.logger.error(f"Erro ao carregar certificado: {e}")
                raise

        transport = Transport(session=session, timeout=self.config.timeout)

        # Autenticacao por usuario/senha (WSSE)
        wsse = None
        if self.config.username and self.config.password:
            wsse = UsernameToken(self.config.username, self.config.password)

        try:
            self._client = Client(
                wsdl=self.config.wsdl_url,
                transport=transport,
                wsse=wsse,
            )
            self.logger.info(f"Cliente MNI conectado: {self.config.wsdl_url}")
        except Exception as e:
            self.logger.error(f"Erro ao conectar MNI {self.config.tribunal}: {e}")
            raise

        return self._client

    @staticmethod
    def _extract_pem_from_pfx(pfx_path: str, password: str) -> tuple[str, str]:
        """Extrai certificado e chave PEM de arquivo PFX (PKCS#12)"""
        from cryptography.hazmat.primitives.serialization import (
            Encoding,
            PrivateFormat,
            NoEncryption,
        )
        from cryptography.hazmat.primitives.serialization.pkcs12 import (
            load_key_and_certificates,
        )

        with open(pfx_path, "rb") as f:
            pfx_data = f.read()

        private_key, cert, additional_certs = load_key_and_certificates(
            pfx_data, password.encode()
        )

        # Serializa certificado
        cert_pem = cert.public_bytes(Encoding.PEM).decode()

        # Serializa chave privada
        key_pem = private_key.private_bytes(
            Encoding.PEM, PrivateFormat.TraditionalOpenSSL, NoEncryption()
        ).decode()

        return cert_pem, key_pem

    # ==================== OPERACOES MNI ====================

    async def consultar_processo(self, numero_processo: str, incluir_documentos: bool = False) -> MNIProcesso:
        """
        Operacao consultarProcesso do MNI.
        Retorna dados completos do processo incluindo partes, movimentacoes e documentos.
        """
        client = await self._get_client()
        numero_limpo = numero_processo.replace(".", "").replace("-", "").replace(" ", "")

        self.logger.info(f"MNI consultarProcesso: {numero_processo} em {self.config.tribunal}")

        try:
            # Chamada SOAP
            response = client.service.consultarProcesso(
                idConsultante="iuria-lexfutura",
                senhaConsultante=self.config.password or "",
                numeroProcesso=numero_limpo,
                movimentos=True,
                incluirCabecalho=True,
                incluirDocumentos=incluir_documentos,
            )

            resultado = MNIProcesso(
                numero=numero_processo,
                tribunal=self.config.tribunal,
            )

            if hasattr(response, "sucesso") and not response.sucesso:
                self.logger.warning(f"MNI retornou erro: {getattr(response, 'mensagem', 'desconhecido')}")
                return resultado

            # Extrai dados do processo
            processo = getattr(response, "processo", response)

            resultado.classe = self._safe_get(processo, "classeProcessual", "descricao")
            resultado.assunto = self._safe_get(processo, "assuntoProcessual", "descricao")
            resultado.orgao_julgador = self._safe_get(processo, "orgaoJulgador", "descricao")
            resultado.competencia = self._safe_get(processo, "competencia", "descricao")
            resultado.data_ajuizamento = str(getattr(processo, "dataAjuizamento", ""))
            resultado.valor_causa = float(getattr(processo, "valorCausa", 0) or 0)
            resultado.situacao = str(getattr(processo, "situacao", ""))
            resultado.nivel_sigilo = int(getattr(processo, "nivelSigilo", 0) or 0)

            # Partes
            polos = getattr(processo, "polo", []) or []
            for polo in polos:
                tipo_polo = getattr(polo, "polo", "")  # AT (ativo), PA (passivo)
                partes = getattr(polo, "parte", []) or []
                for parte in partes:
                    pessoa = getattr(parte, "pessoa", None)
                    if pessoa:
                        resultado.partes.append({
                            "polo": tipo_polo,
                            "nome": getattr(pessoa, "nome", ""),
                            "documento": getattr(pessoa, "numeroDocumentoPrincipal", ""),
                            "tipo_pessoa": getattr(pessoa, "tipoPessoa", ""),
                        })

            # Movimentacoes
            movimentacoes = getattr(processo, "movimento", []) or []
            for mov in movimentacoes:
                resultado.movimentacoes.append({
                    "data": str(getattr(mov, "dataHora", "")),
                    "descricao": getattr(mov, "descricao", ""),
                    "tipo": getattr(mov, "tipoMovimento", ""),
                    "complemento": str(getattr(mov, "complemento", "") or ""),
                })

            # Documentos
            documentos = getattr(processo, "documento", []) or []
            for doc in documentos:
                resultado.documentos.append({
                    "id": str(getattr(doc, "idDocumento", "")),
                    "tipo": getattr(doc, "tipoDocumento", ""),
                    "descricao": getattr(doc, "descricao", ""),
                    "data": str(getattr(doc, "dataHora", "")),
                    "mime_type": getattr(doc, "mimetype", "application/pdf"),
                })

            self.logger.info(
                f"MNI sucesso: {numero_processo} - {len(resultado.movimentacoes)} movs, "
                f"{len(resultado.partes)} partes, {len(resultado.documentos)} docs"
            )
            return resultado

        except Exception as e:
            self.logger.error(f"Erro MNI consultarProcesso: {e}")
            raise

    async def consultar_movimentacoes(self, numero_processo: str) -> list[dict]:
        """Consulta apenas movimentacoes de um processo"""
        resultado = await self.consultar_processo(numero_processo)
        return resultado.movimentacoes

    async def baixar_documento(self, id_documento: str, numero_processo: str) -> Optional[MNIDocumento]:
        """
        Baixa conteudo de um documento/peca processual via MNI.
        Retorna o documento com conteudo em base64.
        """
        client = await self._get_client()
        numero_limpo = numero_processo.replace(".", "").replace("-", "").replace(" ", "")

        self.logger.info(f"MNI baixarDocumento: doc={id_documento}, processo={numero_processo}")

        try:
            response = client.service.consultarProcesso(
                idConsultante="iuria-lexfutura",
                senhaConsultante=self.config.password or "",
                numeroProcesso=numero_limpo,
                incluirDocumentos=True,
                movimentos=False,
                documento=id_documento,
            )

            processo = getattr(response, "processo", response)
            documentos = getattr(processo, "documento", []) or []

            for doc in documentos:
                if str(getattr(doc, "idDocumento", "")) == id_documento:
                    conteudo = getattr(doc, "conteudo", None)
                    if conteudo:
                        return MNIDocumento(
                            id_documento=id_documento,
                            tipo=getattr(doc, "tipoDocumento", ""),
                            descricao=getattr(doc, "descricao", ""),
                            data=str(getattr(doc, "dataHora", "")),
                            mime_type=getattr(doc, "mimetype", "application/pdf"),
                            conteudo_base64=base64.b64encode(conteudo).decode() if isinstance(conteudo, bytes) else str(conteudo),
                            tamanho_bytes=len(conteudo) if isinstance(conteudo, bytes) else 0,
                            hash_documento=getattr(doc, "hash", None),
                        )

            return None

        except Exception as e:
            self.logger.error(f"Erro ao baixar documento: {e}")
            raise

    async def listar_pendencias(self) -> list[dict]:
        """Lista comunicacoes/intimacoes pendentes (requer certificado)"""
        client = await self._get_client()

        try:
            response = client.service.consultarAvisosPendentes(
                idConsultante="iuria-lexfutura",
                senhaConsultante=self.config.password or "",
            )

            pendencias = []
            avisos = getattr(response, "aviso", []) or []
            for aviso in avisos:
                pendencias.append({
                    "id": str(getattr(aviso, "idAviso", "")),
                    "tipo": getattr(aviso, "tipoAviso", ""),
                    "processo": getattr(aviso, "numeroProcesso", ""),
                    "data_disponibilizacao": str(getattr(aviso, "dataDisponibilizacao", "")),
                    "descricao": getattr(aviso, "teor", ""),
                })

            return pendencias

        except Exception as e:
            self.logger.error(f"Erro ao listar pendencias: {e}")
            return []

    # ==================== UTILITARIOS ====================

    @staticmethod
    def _safe_get(obj: Any, *attrs: str) -> Optional[str]:
        """Navega atributos aninhados de forma segura"""
        current = obj
        for attr in attrs:
            if current is None:
                return None
            current = getattr(current, attr, None)
        return str(current) if current else None

    def close(self):
        """Limpa recursos temporarios"""
        if self._cert_file:
            try:
                os.unlink(self._cert_file.name)
            except Exception:
                pass
        self._client = None


# ==================== FACTORY ====================

# URLs MNI conhecidas dos principais tribunais com PJe
MNI_ENDPOINTS = {
    # Justica Federal
    "TRF1_1G": "https://pje1g.trf1.jus.br/mni/servicos/?wsdl",
    "TRF1_2G": "https://pje2g.trf1.jus.br/mni/servicos/?wsdl",
    "TRF3_1G": "https://pje1g.trf3.jus.br/mni/servicos/?wsdl",
    "TRF3_2G": "https://pje2g.trf3.jus.br/mni/servicos/?wsdl",
    "TRF5":    "https://pje.trf5.jus.br/mni/servicos/?wsdl",
    "TRF6":    "https://pje1g.trf6.jus.br/mni/servicos/?wsdl",
    # Justica Estadual (PJe com MNI)
    "TJAC":    "https://pje.tjac.jus.br/mni/servicos/?wsdl",
    "TJAL":    "https://pje.tjal.jus.br/mni/servicos/?wsdl",
    "TJAM":    "https://pje.tjam.jus.br/mni/servicos/?wsdl",
    "TJAP":    "https://pje.tjap.jus.br/mni/servicos/?wsdl",
    "TJBA":    "https://pje.tjba.jus.br/mni/servicos/?wsdl",
    "TJCE":    "https://pje.tjce.jus.br/mni/servicos/?wsdl",
    "TJDFT":   "https://pje.tjdft.jus.br/mni/servicos/?wsdl",
    "TJES":    "https://pje.tjes.jus.br/mni/servicos/?wsdl",
    "TJGO":    "https://pje.tjgo.jus.br/mni/servicos/?wsdl",
    "TJMA":    "https://pje.tjma.jus.br/mni/servicos/?wsdl",
    "TJMG":    "https://pje.tjmg.jus.br/mni/servicos/?wsdl",
    "TJMS":    "https://pje.tjms.jus.br/mni/servicos/?wsdl",
    "TJMT":    "https://pje.tjmt.jus.br/mni/servicos/?wsdl",
    "TJPA":    "https://pje.tjpa.jus.br/mni/servicos/?wsdl",
    "TJPB":    "https://pje.tjpb.jus.br/mni/servicos/?wsdl",
    "TJPE":    "https://pje.tjpe.jus.br/mni/servicos/?wsdl",
    "TJPI":    "https://pje.tjpi.jus.br/mni/servicos/?wsdl",
    "TJPR":    "https://pje.tjpr.jus.br/mni/servicos/?wsdl",
    "TJRJ":    "https://pje.tjrj.jus.br/mni/servicos/?wsdl",
    "TJRN":    "https://pje.tjrn.jus.br/mni/servicos/?wsdl",
    "TJRO":    "https://pje.tjro.jus.br/mni/servicos/?wsdl",
    "TJRR":    "https://pje.tjrr.jus.br/mni/servicos/?wsdl",
    "TJRS":    "https://pje.tjrs.jus.br/mni/servicos/?wsdl",
    "TJSC":    "https://pje.tjsc.jus.br/mni/servicos/?wsdl",
    "TJSE":    "https://pje.tjse.jus.br/mni/servicos/?wsdl",
    "TJSP":    "https://pje.tjsp.jus.br/mni/servicos/?wsdl",
    "TJTO":    "https://pje.tjto.jus.br/mni/servicos/?wsdl",
    # Justica do Trabalho
    "TST":     "https://pje.tst.jus.br/mni/servicos/?wsdl",
    "TRT1":    "https://pje.trt1.jus.br/mni/servicos/?wsdl",
    "TRT2":    "https://pje.trt2.jus.br/mni/servicos/?wsdl",
    "TRT3":    "https://pje.trt3.jus.br/mni/servicos/?wsdl",
    "TRT4":    "https://pje.trt4.jus.br/mni/servicos/?wsdl",
    "TRT5":    "https://pje.trt5.jus.br/mni/servicos/?wsdl",
    "TRT6":    "https://pje.trt6.jus.br/mni/servicos/?wsdl",
    "TRT7":    "https://pje.trt7.jus.br/mni/servicos/?wsdl",
    "TRT8":    "https://pje.trt8.jus.br/mni/servicos/?wsdl",
    "TRT9":    "https://pje.trt9.jus.br/mni/servicos/?wsdl",
    "TRT10":   "https://pje.trt10.jus.br/mni/servicos/?wsdl",
    "TRT11":   "https://pje.trt11.jus.br/mni/servicos/?wsdl",
    "TRT12":   "https://pje.trt12.jus.br/mni/servicos/?wsdl",
    "TRT13":   "https://pje.trt13.jus.br/mni/servicos/?wsdl",
    "TRT14":   "https://pje.trt14.jus.br/mni/servicos/?wsdl",
    "TRT15":   "https://pje.trt15.jus.br/mni/servicos/?wsdl",
    "TRT16":   "https://pje.trt16.jus.br/mni/servicos/?wsdl",
    "TRT17":   "https://pje.trt17.jus.br/mni/servicos/?wsdl",
    "TRT18":   "https://pje.trt18.jus.br/mni/servicos/?wsdl",
    "TRT19":   "https://pje.trt19.jus.br/mni/servicos/?wsdl",
    "TRT20":   "https://pje.trt20.jus.br/mni/servicos/?wsdl",
    "TRT21":   "https://pje.trt21.jus.br/mni/servicos/?wsdl",
    "TRT22":   "https://pje.trt22.jus.br/mni/servicos/?wsdl",
    "TRT23":   "https://pje.trt23.jus.br/mni/servicos/?wsdl",
    "TRT24":   "https://pje.trt24.jus.br/mni/servicos/?wsdl",
}


def get_mni_client(
    tribunal: str,
    cert_path: Optional[str] = None,
    cert_password: Optional[str] = None,
    username: Optional[str] = None,
    password: Optional[str] = None,
) -> MNIClient:
    """Cria cliente MNI para um tribunal"""
    if tribunal not in MNI_ENDPOINTS:
        raise ValueError(
            f"Tribunal MNI nao configurado: {tribunal}. "
            f"Disponiveis: {len(MNI_ENDPOINTS)} endpoints"
        )

    config = MNIConfig(
        tribunal=tribunal,
        wsdl_url=MNI_ENDPOINTS[tribunal],
        cert_pfx_path=cert_path,
        cert_password=cert_password,
        username=username,
        password=password,
    )
    return MNIClient(config)


def listar_tribunais_mni() -> list[str]:
    """Lista tribunais com MNI disponivel"""
    return sorted(MNI_ENDPOINTS.keys())


# CLI
if __name__ == "__main__":
    print(json.dumps({
        "total_endpoints": len(MNI_ENDPOINTS),
        "tribunais": listar_tribunais_mni(),
    }, indent=2))
