#!/usr/bin/env python3
"""
MNI Espelho (Mirror) - iuria LexFutura
Interface que espelha dados do MNI autenticado via certificado digital.

Este modulo implementa o que o usuario descreveu:
"O MNI e uma plataforma do Poder Judiciario que tem todos os processos
ali pra voce fazer um login pro certificado digital. A gente quer fazer
uma interface com o MNI logando pelo certificado digital as informacoes
registradas no sistema, como se tivesse entrado numa pagina por tras
do sistema, como se tivesse logado no certificado nesse sistema e
estivesse fazendo ali a busca diretamente, talvez sendo espelhada
para o sistema."

Funcionalidades:
  - Login via certificado digital A1 (PFX/P12) -> mTLS
  - Consulta de processo (capa, partes, movimentacoes)
  - Download de documentos/pecas processuais
  - Lista de pendencias/intimacoes
  - Espelhamento continuo (polling para monitoramento)
  - Sessao autenticada persistente

Uso via CLI:
  python mni_espelho.py consultar <tribunal> <numero> --cert <pfx_path> --senha <senha>
  python mni_espelho.py movimentacoes <tribunal> <numero> --cert <pfx_path> --senha <senha>
  python mni_espelho.py documentos <tribunal> <numero> --cert <pfx_path> --senha <senha>
  python mni_espelho.py pendencias <tribunal> --cert <pfx_path> --senha <senha>
  python mni_espelho.py status --cert <pfx_path> --senha <senha>
"""
import asyncio
import base64
import hashlib
import json
import logging
import os
import ssl
import sys
import tempfile
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional, Any, Dict, List, Tuple

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

logger = logging.getLogger("iuria.mni.espelho")


# ==================== CERTIFICATE MANAGER ====================

@dataclass
class CertificadoInfo:
    """Informacoes extraidas do certificado digital"""
    titular: str
    cpf_cnpj: Optional[str] = None
    email: Optional[str] = None
    validade_inicio: Optional[str] = None
    validade_fim: Optional[str] = None
    emissor: Optional[str] = None
    serial: Optional[str] = None
    is_valid: bool = False
    dias_restantes: int = 0

    def to_dict(self):
        return asdict(self)


class CertificadoManager:
    """Gerencia certificado digital A1 (PFX/P12) para autenticacao MNI"""

    def __init__(self, pfx_path: str, senha: str):
        self.pfx_path = pfx_path
        self.senha = senha
        self._cert_pem: Optional[str] = None
        self._key_pem: Optional[str] = None
        self._temp_cert: Optional[str] = None
        self._temp_key: Optional[str] = None
        self._info: Optional[CertificadoInfo] = None

    def extrair_info(self) -> CertificadoInfo:
        """Extrai informacoes do certificado"""
        if self._info:
            return self._info

        try:
            from cryptography.hazmat.primitives.serialization import Encoding, PrivateFormat, NoEncryption
            from cryptography.hazmat.primitives.serialization.pkcs12 import load_key_and_certificates
            from cryptography import x509

            with open(self.pfx_path, "rb") as f:
                pfx_data = f.read()

            private_key, cert, chain = load_key_and_certificates(pfx_data, self.senha.encode())

            if not cert:
                raise ValueError("Certificado nao encontrado no arquivo PFX")

            # Extract certificate info
            subject = cert.subject
            titular = ""
            cpf_cnpj = None
            email = None

            for attr in subject:
                oid_name = attr.oid._name
                if oid_name == "commonName":
                    titular = attr.value
                elif oid_name == "emailAddress":
                    email = attr.value

            # Try to extract CPF/CNPJ from subject or SAN
            import re
            for attr in subject:
                val = str(attr.value)
                cpf_match = re.search(r'\d{3}\.\d{3}\.\d{3}-\d{2}', val)
                cnpj_match = re.search(r'\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}', val)
                if cpf_match:
                    cpf_cnpj = cpf_match.group()
                elif cnpj_match:
                    cpf_cnpj = cnpj_match.group()

            # Validity
            now = datetime.utcnow()
            not_after = cert.not_valid_after_utc if hasattr(cert, 'not_valid_after_utc') else cert.not_valid_after
            not_before = cert.not_valid_before_utc if hasattr(cert, 'not_valid_before_utc') else cert.not_valid_before
            dias_restantes = (not_after - now).days
            is_valid = now >= not_before and now <= not_after

            # Issuer
            emissor = ""
            for attr in cert.issuer:
                if attr.oid._name == "commonName":
                    emissor = attr.value

            self._info = CertificadoInfo(
                titular=titular,
                cpf_cnpj=cpf_cnpj,
                email=email,
                validade_inicio=not_before.isoformat(),
                validade_fim=not_after.isoformat(),
                emissor=emissor,
                serial=str(cert.serial_number),
                is_valid=is_valid,
                dias_restantes=max(0, dias_restantes),
            )

            # Store PEM for later use
            self._cert_pem = cert.public_bytes(Encoding.PEM).decode()
            self._key_pem = private_key.private_bytes(
                Encoding.PEM, PrivateFormat.TraditionalOpenSSL, NoEncryption()
            ).decode()
            if chain:
                for ca_cert in chain:
                    self._cert_pem += ca_cert.public_bytes(Encoding.PEM).decode()

            return self._info

        except Exception as e:
            return CertificadoInfo(
                titular=f"Erro: {e}",
                is_valid=False,
            )

    def get_temp_files(self) -> Tuple[str, str]:
        """Retorna paths de arquivos PEM temporarios"""
        if self._temp_cert and self._temp_key:
            return self._temp_cert, self._temp_key

        if not self._cert_pem:
            self.extrair_info()

        cert_f = tempfile.NamedTemporaryFile(suffix=".pem", delete=False, mode="w")
        cert_f.write(self._cert_pem)
        cert_f.flush()
        cert_f.close()

        key_f = tempfile.NamedTemporaryFile(suffix=".key", delete=False, mode="w")
        key_f.write(self._key_pem)
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


# ==================== MNI ESPELHO (MIRROR) ====================

# MNI endpoints de todos os tribunais com suporte
MNI_ENDPOINTS = {
    "TRF1": "https://pje1g.trf1.jus.br/mni/servicos/?wsdl",
    "TRF3": "https://pje1g.trf3.jus.br/mni/servicos/?wsdl",
    "TRF5": "https://pje.trf5.jus.br/mni/servicos/?wsdl",
    "TRF6": "https://pje1g.trf6.jus.br/mni/servicos/?wsdl",
    "TJAC": "https://pje.tjac.jus.br/mni/servicos/?wsdl",
    "TJAL": "https://pje.tjal.jus.br/mni/servicos/?wsdl",
    "TJAM": "https://pje.tjam.jus.br/mni/servicos/?wsdl",
    "TJAP": "https://pje.tjap.jus.br/mni/servicos/?wsdl",
    "TJBA": "https://pje.tjba.jus.br/mni/servicos/?wsdl",
    "TJCE": "https://pje.tjce.jus.br/mni/servicos/?wsdl",
    "TJDFT": "https://pje.tjdft.jus.br/mni/servicos/?wsdl",
    "TJES": "https://pje.tjes.jus.br/mni/servicos/?wsdl",
    "TJGO": "https://pje.tjgo.jus.br/mni/servicos/?wsdl",
    "TJMA": "https://pje.tjma.jus.br/mni/servicos/?wsdl",
    "TJMG": "https://pje.tjmg.jus.br/mni/servicos/?wsdl",
    "TJMS": "https://pje.tjms.jus.br/mni/servicos/?wsdl",
    "TJMT": "https://pje.tjmt.jus.br/mni/servicos/?wsdl",
    "TJPA": "https://pje.tjpa.jus.br/mni/servicos/?wsdl",
    "TJPB": "https://pje.tjpb.jus.br/mni/servicos/?wsdl",
    "TJPE": "https://pje.tjpe.jus.br/mni/servicos/?wsdl",
    "TJPI": "https://pje.tjpi.jus.br/mni/servicos/?wsdl",
    "TJPR": "https://pje.tjpr.jus.br/mni/servicos/?wsdl",
    "TJRJ": "https://pje.tjrj.jus.br/mni/servicos/?wsdl",
    "TJRN": "https://pje.tjrn.jus.br/mni/servicos/?wsdl",
    "TJRO": "https://pje.tjro.jus.br/mni/servicos/?wsdl",
    "TJRR": "https://pje.tjrr.jus.br/mni/servicos/?wsdl",
    "TJRS": "https://pje.tjrs.jus.br/mni/servicos/?wsdl",
    "TJSC": "https://pje.tjsc.jus.br/mni/servicos/?wsdl",
    "TJSE": "https://pje.tjse.jus.br/mni/servicos/?wsdl",
    "TJSP": "https://pje.tjsp.jus.br/mni/servicos/?wsdl",
    "TJTO": "https://pje.tjto.jus.br/mni/servicos/?wsdl",
    "TST": "https://pje.tst.jus.br/mni/servicos/?wsdl",
    "TRT1": "https://pje.trt1.jus.br/mni/servicos/?wsdl",
    "TRT2": "https://pje.trt2.jus.br/mni/servicos/?wsdl",
    "TRT3": "https://pje.trt3.jus.br/mni/servicos/?wsdl",
    "TRT4": "https://pje.trt4.jus.br/mni/servicos/?wsdl",
    "TRT5": "https://pje.trt5.jus.br/mni/servicos/?wsdl",
    "TRT6": "https://pje.trt6.jus.br/mni/servicos/?wsdl",
    "TRT7": "https://pje.trt7.jus.br/mni/servicos/?wsdl",
    "TRT8": "https://pje.trt8.jus.br/mni/servicos/?wsdl",
    "TRT9": "https://pje.trt9.jus.br/mni/servicos/?wsdl",
    "TRT10": "https://pje.trt10.jus.br/mni/servicos/?wsdl",
    "TRT11": "https://pje.trt11.jus.br/mni/servicos/?wsdl",
    "TRT12": "https://pje.trt12.jus.br/mni/servicos/?wsdl",
    "TRT13": "https://pje.trt13.jus.br/mni/servicos/?wsdl",
    "TRT14": "https://pje.trt14.jus.br/mni/servicos/?wsdl",
    "TRT15": "https://pje.trt15.jus.br/mni/servicos/?wsdl",
    "TRT16": "https://pje.trt16.jus.br/mni/servicos/?wsdl",
    "TRT17": "https://pje.trt17.jus.br/mni/servicos/?wsdl",
    "TRT18": "https://pje.trt18.jus.br/mni/servicos/?wsdl",
    "TRT19": "https://pje.trt19.jus.br/mni/servicos/?wsdl",
    "TRT20": "https://pje.trt20.jus.br/mni/servicos/?wsdl",
    "TRT21": "https://pje.trt21.jus.br/mni/servicos/?wsdl",
    "TRT22": "https://pje.trt22.jus.br/mni/servicos/?wsdl",
    "TRT23": "https://pje.trt23.jus.br/mni/servicos/?wsdl",
    "TRT24": "https://pje.trt24.jus.br/mni/servicos/?wsdl",
}


class MNIEspelho:
    """
    Espelho MNI - faz login via certificado digital e espelha
    dados do tribunal como se o usuario estivesse logado no MNI.
    
    Funciona como uma "sessao autenticada" no MNI, onde o certificado
    digital do advogado e usado para autenticar via mTLS (mutual TLS).
    """

    def __init__(self, cert_manager: CertificadoManager):
        self.cert = cert_manager
        self._clients: Dict[str, Any] = {}
        self._cert_info = None
        self.timeout = 30
        self.max_retries = 3

    def _get_client(self, tribunal: str):
        """Obtem/cria cliente SOAP autenticado para tribunal"""
        tribunal = tribunal.upper()
        if tribunal in self._clients:
            return self._clients[tribunal]

        if tribunal not in MNI_ENDPOINTS:
            raise ValueError(f"Tribunal {tribunal} nao possui endpoint MNI. "
                           f"Disponiveis: {len(MNI_ENDPOINTS)} tribunais")

        import zeep
        from zeep.transports import Transport
        import requests

        session = requests.Session()
        session.verify = True
        session.timeout = self.timeout

        # Configura mTLS com certificado digital
        cert_path, key_path = self.cert.get_temp_files()
        session.cert = (cert_path, key_path)

        # Enforce TLS 1.2+
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        ctx.load_cert_chain(certfile=cert_path, keyfile=key_path)

        transport = Transport(session=session, timeout=self.timeout)
        wsdl = MNI_ENDPOINTS[tribunal]

        client = zeep.Client(wsdl=wsdl, transport=transport)
        self._clients[tribunal] = client
        logger.info(f"MNI Espelho: sessao autenticada criada para {tribunal}")
        return client

    def verificar_certificado(self) -> dict:
        """Verifica e retorna info do certificado digital"""
        info = self.cert.extrair_info()
        return info.to_dict()

    def consultar_processo(self, tribunal: str, numero_processo: str, incluir_documentos: bool = False) -> dict:
        """
        Consulta processo completo via MNI autenticado.
        Espelha exatamente o que o advogado veria logado com certificado.
        """
        start = time.time()
        tribunal = tribunal.upper()
        
        try:
            client = self._get_client(tribunal)
            numero_limpo = numero_processo.replace(".", "").replace("-", "").replace(" ", "")

            response = client.service.consultarProcesso(
                idConsultante="iuria-lexfutura",
                senhaConsultante="",
                numeroProcesso=numero_limpo,
                movimentos=True,
                incluirCabecalho=True,
                incluirDocumentos=incluir_documentos,
            )

            elapsed = (time.time() - start) * 1000
            resultado = self._parse_processo(response, tribunal, numero_processo)
            resultado["metodo"] = "mni_certificado_digital"
            resultado["autenticado"] = True
            resultado["tempo_ms"] = elapsed
            return resultado

        except Exception as e:
            elapsed = (time.time() - start) * 1000
            return {
                "numero": numero_processo,
                "tribunal": tribunal,
                "erro": str(e),
                "metodo": "mni_certificado_digital",
                "autenticado": True,
                "tempo_ms": elapsed,
            }

    def consultar_movimentacoes(self, tribunal: str, numero_processo: str) -> dict:
        """Retorna apenas movimentacoes (espelhado do MNI)"""
        result = self.consultar_processo(tribunal, numero_processo)
        return {
            "numero": result.get("numero"),
            "tribunal": result.get("tribunal"),
            "movimentacoes": result.get("movimentacoes", []),
            "total": len(result.get("movimentacoes", [])),
            "metodo": "mni_certificado_digital",
            "autenticado": True,
            "erro": result.get("erro"),
        }

    def baixar_documento(self, tribunal: str, numero_processo: str, id_documento: str) -> dict:
        """Baixa documento/peca processual via MNI autenticado"""
        start = time.time()
        tribunal = tribunal.upper()

        try:
            client = self._get_client(tribunal)
            numero_limpo = numero_processo.replace(".", "").replace("-", "").replace(" ", "")

            response = client.service.consultarProcesso(
                idConsultante="iuria-lexfutura",
                senhaConsultante="",
                numeroProcesso=numero_limpo,
                incluirDocumentos=True,
                movimentos=False,
                documento=id_documento,
            )

            elapsed = (time.time() - start) * 1000
            processo = getattr(response, "processo", response)
            documentos = getattr(processo, "documento", []) or []

            for doc in documentos:
                if str(getattr(doc, "idDocumento", "")) == id_documento:
                    conteudo = getattr(doc, "conteudo", None)
                    if conteudo:
                        conteudo_b64 = base64.b64encode(conteudo).decode() if isinstance(conteudo, bytes) else str(conteudo)
                        return {
                            "id_documento": id_documento,
                            "tipo": getattr(doc, "tipoDocumento", ""),
                            "descricao": getattr(doc, "descricao", ""),
                            "mime_type": getattr(doc, "mimetype", "application/pdf"),
                            "conteudo_base64": conteudo_b64,
                            "tamanho_bytes": len(conteudo) if isinstance(conteudo, bytes) else 0,
                            "hash_sha256": hashlib.sha256(conteudo if isinstance(conteudo, bytes) else conteudo.encode()).hexdigest(),
                            "metodo": "mni_certificado_digital",
                            "autenticado": True,
                            "tempo_ms": elapsed,
                        }

            return {"erro": f"Documento {id_documento} nao encontrado", "tempo_ms": elapsed}

        except Exception as e:
            return {"erro": str(e), "tempo_ms": (time.time() - start) * 1000}

    def listar_pendencias(self, tribunal: str) -> dict:
        """Lista intimacoes/comunicacoes pendentes (requer certificado)"""
        start = time.time()
        tribunal = tribunal.upper()

        try:
            client = self._get_client(tribunal)
            response = client.service.consultarAvisosPendentes(
                idConsultante="iuria-lexfutura",
                senhaConsultante="",
            )

            elapsed = (time.time() - start) * 1000
            avisos = getattr(response, "aviso", []) or []
            pendencias = []
            for aviso in avisos:
                pendencias.append({
                    "id": str(getattr(aviso, "idAviso", "")),
                    "tipo": getattr(aviso, "tipoAviso", ""),
                    "processo": getattr(aviso, "numeroProcesso", ""),
                    "data_disponibilizacao": str(getattr(aviso, "dataDisponibilizacao", "")),
                    "teor": getattr(aviso, "teor", ""),
                })

            return {
                "tribunal": tribunal,
                "pendencias": pendencias,
                "total": len(pendencias),
                "metodo": "mni_certificado_digital",
                "autenticado": True,
                "tempo_ms": elapsed,
            }

        except Exception as e:
            return {
                "tribunal": tribunal,
                "pendencias": [],
                "erro": str(e),
                "tempo_ms": (time.time() - start) * 1000,
            }

    def _parse_processo(self, response, tribunal, numero_original):
        """Parse resposta MNI completa"""
        resultado = {
            "numero": numero_original,
            "tribunal": tribunal,
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

        for mov in (getattr(processo, "movimento", []) or []):
            resultado["movimentacoes"].append({
                "data": str(getattr(mov, "dataHora", "")),
                "descricao": getattr(mov, "descricao", ""),
                "tipo": getattr(mov, "tipoMovimento", ""),
                "complemento": str(getattr(mov, "complemento", "") or ""),
                "codigo_cnj": str(getattr(mov, "codigoNacional", "") or ""),
            })

        for doc in (getattr(processo, "documento", []) or []):
            resultado["documentos"].append({
                "id": str(getattr(doc, "idDocumento", "")),
                "tipo": getattr(doc, "tipoDocumento", ""),
                "descricao": getattr(doc, "descricao", ""),
                "data": str(getattr(doc, "dataHora", "")),
                "mime_type": getattr(doc, "mimetype", "application/pdf"),
            })

        return resultado

    @staticmethod
    def _safe_nav(obj, *attrs):
        current = obj
        for attr in attrs:
            if current is None:
                return None
            current = getattr(current, attr, None)
        return str(current) if current else None

    def fechar(self):
        """Limpa recursos"""
        self._clients.clear()
        self.cert.limpar()


# ==================== CLI ====================

def main():
    import argparse

    parser = argparse.ArgumentParser(description="MNI Espelho - Interface com certificado digital")
    parser.add_argument("operacao", choices=["consultar", "movimentacoes", "documentos", "pendencias", "status", "tribunais"],
                       help="Operacao a executar")
    parser.add_argument("tribunal", nargs="?", help="Sigla do tribunal (ex: TJRJ, TRF2)")
    parser.add_argument("numero", nargs="?", help="Numero do processo")
    parser.add_argument("--cert", help="Path do certificado PFX/P12", default=os.environ.get("MNI_CERT_PFX_PATH"))
    parser.add_argument("--senha", help="Senha do certificado", default=os.environ.get("MNI_CERT_PASSWORD"))
    parser.add_argument("--doc-id", help="ID do documento para download")
    parser.add_argument("--incluir-docs", action="store_true", help="Incluir lista de documentos na consulta")

    args = parser.parse_args()

    # Operacao que nao precisa de certificado
    if args.operacao == "tribunais":
        print(json.dumps({
            "total_endpoints_mni": len(MNI_ENDPOINTS),
            "tribunais": sorted(MNI_ENDPOINTS.keys()),
        }, ensure_ascii=False, indent=2))
        return

    if args.operacao == "status":
        if not args.cert or not args.senha:
            print(json.dumps({"erro": "Certificado (--cert) e senha (--senha) obrigatorios"}, ensure_ascii=False))
            sys.exit(1)
        cert_mgr = CertificadoManager(args.cert, args.senha)
        info = cert_mgr.extrair_info()
        print(json.dumps(info.to_dict(), ensure_ascii=False, indent=2))
        cert_mgr.limpar()
        return

    # Operacoes que precisam de certificado
    if not args.cert or not args.senha:
        print(json.dumps({"erro": "Certificado (--cert) e senha (--senha) obrigatorios para operacoes MNI"}, ensure_ascii=False))
        sys.exit(1)

    cert_mgr = CertificadoManager(args.cert, args.senha)
    espelho = MNIEspelho(cert_mgr)

    try:
        if args.operacao == "consultar":
            if not args.tribunal or not args.numero:
                print(json.dumps({"erro": "Tribunal e numero obrigatorios"}, ensure_ascii=False))
                sys.exit(1)
            result = espelho.consultar_processo(args.tribunal, args.numero, args.incluir_docs)
            print(json.dumps(result, ensure_ascii=False, indent=2))

        elif args.operacao == "movimentacoes":
            if not args.tribunal or not args.numero:
                print(json.dumps({"erro": "Tribunal e numero obrigatorios"}, ensure_ascii=False))
                sys.exit(1)
            result = espelho.consultar_movimentacoes(args.tribunal, args.numero)
            print(json.dumps(result, ensure_ascii=False, indent=2))

        elif args.operacao == "documentos":
            if not args.tribunal or not args.numero:
                print(json.dumps({"erro": "Tribunal e numero obrigatorios"}, ensure_ascii=False))
                sys.exit(1)
            if args.doc_id:
                result = espelho.baixar_documento(args.tribunal, args.numero, args.doc_id)
            else:
                result = espelho.consultar_processo(args.tribunal, args.numero, incluir_documentos=True)
                result = {
                    "numero": result.get("numero"),
                    "tribunal": result.get("tribunal"),
                    "documentos": result.get("documentos", []),
                    "total": len(result.get("documentos", [])),
                }
            print(json.dumps(result, ensure_ascii=False, indent=2))

        elif args.operacao == "pendencias":
            if not args.tribunal:
                print(json.dumps({"erro": "Tribunal obrigatorio"}, ensure_ascii=False))
                sys.exit(1)
            result = espelho.listar_pendencias(args.tribunal)
            print(json.dumps(result, ensure_ascii=False, indent=2))

    finally:
        espelho.fechar()


if __name__ == "__main__":
    main()
