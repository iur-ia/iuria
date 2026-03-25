"""
Motor de Extracao e Armazenamento de PDFs - iuria LexFutura
Layer 3: Extrai PDFs de MNI (Base64 XML) e scraping (download stream).

Componentes:
  - PDFExtractorMNI: decodifica Base64 do XML MNI
  - PDFDownloader: download via stream com popup handling (Playwright)
  - PDFParser: extrai texto de PDFs (pdfplumber + PyPDF2)
  - PDFStorage: armazena no filesystem local ou S3/Supabase

Fluxo:
  MNI XML -> Base64 decode -> PDF bytes -> Storage + Parse texto
  Scraping -> download button -> interceptar popup/blob -> PDF bytes -> Storage
"""
import asyncio
import base64
import hashlib
import io
import json
import logging
import os
import re
import tempfile
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

logger = logging.getLogger("iuria.pdf")


@dataclass
class PDFInfo:
    """Metadados de um PDF extraido"""
    id_documento: str
    processo: str
    tribunal: str
    tipo: str  # peticao, decisao, sentenca, acordao, etc.
    descricao: str
    data_documento: Optional[str] = None
    fonte: str = "mni"  # mni, scraping
    caminho_arquivo: Optional[str] = None
    url_storage: Optional[str] = None
    tamanho_bytes: int = 0
    hash_sha256: str = ""
    texto_extraido: Optional[str] = None
    num_paginas: int = 0
    mime_type: str = "application/pdf"


# ==================== MNI PDF EXTRACTOR ====================

class PDFExtractorMNI:
    """Extrai PDFs de respostas MNI (Base64 dentro de XML SOAP)"""

    @staticmethod
    def decode_base64(conteudo_b64: str) -> bytes:
        """Decodifica conteudo Base64 do MNI para bytes PDF"""
        # MNI pode ter quebras de linha no Base64
        clean_b64 = conteudo_b64.replace("\n", "").replace("\r", "").replace(" ", "")
        try:
            return base64.b64decode(clean_b64)
        except Exception as e:
            logger.error(f"Erro ao decodificar Base64: {e}")
            raise ValueError(f"Base64 invalido: {e}")

    @staticmethod
    def extract_from_response(mni_documentos: list[dict]) -> list[Tuple[str, bytes]]:
        """
        Extrai todos os PDFs de uma resposta MNI.

        Args:
            mni_documentos: lista de dicts com 'id', 'conteudo_base64', etc.

        Returns:
            Lista de tuplas (id_documento, pdf_bytes)
        """
        pdfs = []
        for doc in mni_documentos:
            conteudo = doc.get("conteudo_base64")
            if not conteudo:
                continue
            try:
                pdf_bytes = PDFExtractorMNI.decode_base64(conteudo)
                # Verifica magic bytes do PDF (%PDF)
                if pdf_bytes[:4] == b"%PDF":
                    pdfs.append((doc.get("id", "unknown"), pdf_bytes))
                else:
                    logger.warning(f"Documento {doc.get('id')} nao e PDF valido")
            except Exception as e:
                logger.error(f"Erro ao extrair PDF {doc.get('id')}: {e}")
        return pdfs


# ==================== SCRAPING PDF DOWNLOADER ====================

class PDFDownloader:
    """
    Download de PDFs via scraping com Playwright.
    Lida com popups, blobs e downloads automaticos.
    """

    @staticmethod
    async def download_from_page(
        page,
        download_selector: str,
        timeout_ms: int = 30000,
    ) -> Optional[bytes]:
        """
        Clica em botao de download e captura o arquivo.
        Lida com popups e dialogs de download.
        """
        try:
            # Configura interceptacao de download
            async with page.expect_download(timeout=timeout_ms) as download_info:
                await page.click(download_selector)

            download = await download_info.value
            path = await download.path()
            if path:
                with open(path, "rb") as f:
                    return f.read()
        except Exception as e:
            logger.warning(f"Download direto falhou: {e}, tentando interceptar...")

        # Fallback: intercepta resposta com content-type PDF
        return await PDFDownloader._intercept_pdf_response(page, download_selector, timeout_ms)

    @staticmethod
    async def _intercept_pdf_response(
        page, click_selector: str, timeout_ms: int
    ) -> Optional[bytes]:
        """Intercepta response HTTP com content-type PDF"""
        pdf_data = None

        async def handle_response(response):
            nonlocal pdf_data
            ct = response.headers.get("content-type", "")
            if "application/pdf" in ct or "application/octet-stream" in ct:
                try:
                    body = await response.body()
                    if body and body[:4] == b"%PDF":
                        pdf_data = body
                except Exception:
                    pass

        page.on("response", handle_response)
        try:
            await page.click(click_selector)
            # Espera ate o PDF ser interceptado ou timeout
            start = asyncio.get_event_loop().time()
            while not pdf_data and (asyncio.get_event_loop().time() - start) * 1000 < timeout_ms:
                await asyncio.sleep(0.5)
        finally:
            page.remove_listener("response", handle_response)

        return pdf_data

    @staticmethod
    async def download_from_popup(
        page,
        click_selector: str,
        timeout_ms: int = 30000,
    ) -> Optional[bytes]:
        """
        Clica em link que abre popup com PDF e captura conteudo.
        Comum em sistemas como eSAJ e PROJUDI.
        """
        try:
            async with page.context.expect_page(timeout=timeout_ms) as popup_info:
                await page.click(click_selector)

            popup = await popup_info.value
            await popup.wait_for_load_state("networkidle", timeout=timeout_ms)

            # Verifica se o popup tem um PDF
            content_type = await popup.evaluate("document.contentType")
            if content_type and "pdf" in content_type.lower():
                # Captura via download
                url = popup.url
                await popup.close()

                # Download direto via request
                import httpx
                async with httpx.AsyncClient(follow_redirects=True) as client:
                    resp = await client.get(url, timeout=timeout_ms / 1000)
                    if resp.status_code == 200:
                        return resp.content

            await popup.close()
        except Exception as e:
            logger.warning(f"Download de popup falhou: {e}")

        return None

    @staticmethod
    async def download_from_url(url: str, cookies: Optional[dict] = None) -> Optional[bytes]:
        """Download direto de PDF por URL"""
        import httpx
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=60) as client:
                headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0"}
                resp = await client.get(url, headers=headers, cookies=cookies)
                if resp.status_code == 200 and resp.content[:4] == b"%PDF":
                    return resp.content
        except Exception as e:
            logger.error(f"Download URL falhou: {e}")
        return None


# ==================== PDF TEXT PARSER ====================

class PDFParser:
    """Extrai texto de PDFs usando pdfplumber (principal) e PyPDF2 (fallback)"""

    @staticmethod
    def extrair_texto(pdf_bytes: bytes) -> Tuple[str, int]:
        """
        Extrai texto completo de PDF.
        Returns: (texto, num_paginas)
        """
        # Tenta pdfplumber primeiro (melhor qualidade)
        try:
            return PDFParser._extrair_pdfplumber(pdf_bytes)
        except Exception as e:
            logger.warning(f"pdfplumber falhou: {e}, tentando PyPDF2...")

        # Fallback: PyPDF2
        try:
            return PDFParser._extrair_pypdf2(pdf_bytes)
        except Exception as e:
            logger.error(f"Ambos parsers falharam: {e}")
            return ("", 0)

    @staticmethod
    def _extrair_pdfplumber(pdf_bytes: bytes) -> Tuple[str, int]:
        """Extrai texto com pdfplumber"""
        import pdfplumber
        texto_total = []
        num_paginas = 0

        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            num_paginas = len(pdf.pages)
            for page in pdf.pages:
                texto = page.extract_text()
                if texto:
                    texto_total.append(texto)

        return "\n\n".join(texto_total), num_paginas

    @staticmethod
    def _extrair_pypdf2(pdf_bytes: bytes) -> Tuple[str, int]:
        """Extrai texto com PyPDF2"""
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(pdf_bytes))
        num_paginas = len(reader.pages)
        texto_total = []

        for page in reader.pages:
            texto = page.extract_text()
            if texto:
                texto_total.append(texto)

        return "\n\n".join(texto_total), num_paginas

    @staticmethod
    def extrair_metadados(pdf_bytes: bytes) -> dict:
        """Extrai metadados do PDF (autor, data criacao, etc.)"""
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(io.BytesIO(pdf_bytes))
            meta = reader.metadata
            if meta:
                return {
                    "titulo": meta.get("/Title", ""),
                    "autor": meta.get("/Author", ""),
                    "assunto": meta.get("/Subject", ""),
                    "criador": meta.get("/Creator", ""),
                    "produtor": meta.get("/Producer", ""),
                    "data_criacao": str(meta.get("/CreationDate", "")),
                }
        except Exception:
            pass
        return {}


# ==================== PDF STORAGE ====================

class PDFStorage:
    """
    Armazena PDFs no sistema de arquivos.
    Organizacao: uploads/pdfs/{tribunal}/{processo}/{documento}.pdf
    Suporte opcional para S3 e Supabase Storage.
    """

    def __init__(self, base_dir: str = "uploads/pdfs"):
        self.base_dir = base_dir
        os.makedirs(base_dir, exist_ok=True)
        self._s3_client = None
        self._s3_bucket = None
        self._supabase_client = None
        self._init_cloud_storage()

    def _init_cloud_storage(self):
        """Initialize cloud storage if configured"""
        # S3
        s3_bucket = os.environ.get("AWS_S3_BUCKET")
        if s3_bucket:
            try:
                import boto3
                self._s3_client = boto3.client(
                    "s3",
                    aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
                    aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
                    region_name=os.environ.get("AWS_REGION", "sa-east-1"),
                )
                self._s3_bucket = s3_bucket
                logger.info(f"S3 storage configurado: {s3_bucket}")
            except (ImportError, Exception) as e:
                logger.warning(f"S3 nao disponivel: {e}")

        # Supabase Storage
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_KEY")
        if supabase_url and supabase_key:
            try:
                import httpx
                self._supabase_client = {
                    "url": supabase_url,
                    "key": supabase_key,
                    "bucket": os.environ.get("SUPABASE_STORAGE_BUCKET", "pdfs"),
                }
                logger.info("Supabase storage configurado")
            except Exception as e:
                logger.warning(f"Supabase nao disponivel: {e}")

    def _get_path(self, tribunal: str, processo: str, id_documento: str) -> str:
        """Gera caminho para armazenamento"""
        # Sanitiza nomes
        safe_tribunal = re.sub(r"[^a-zA-Z0-9_-]", "", tribunal)
        safe_processo = re.sub(r"[^a-zA-Z0-9_-]", "", processo.replace(".", "").replace("-", "_"))
        safe_id = re.sub(r"[^a-zA-Z0-9_-]", "", id_documento)

        dir_path = os.path.join(self.base_dir, safe_tribunal, safe_processo)
        os.makedirs(dir_path, exist_ok=True)
        return os.path.join(dir_path, f"{safe_id}.pdf")

    def salvar(self, pdf_bytes: bytes, info: PDFInfo) -> str:
        """Salva PDF localmente e opcionalmente em cloud storage"""
        path = self._get_path(info.tribunal, info.processo, info.id_documento)
        with open(path, "wb") as f:
            f.write(pdf_bytes)

        info.caminho_arquivo = path
        info.tamanho_bytes = len(pdf_bytes)
        info.hash_sha256 = hashlib.sha256(pdf_bytes).hexdigest()

        logger.info(f"PDF salvo: {path} ({info.tamanho_bytes} bytes)")

        # Upload to S3 if configured
        if self._s3_client and self._s3_bucket:
            try:
                s3_key = f"pdfs/{info.tribunal}/{info.processo}/{info.id_documento}.pdf"
                self._s3_client.put_object(
                    Bucket=self._s3_bucket,
                    Key=s3_key,
                    Body=pdf_bytes,
                    ContentType="application/pdf",
                    Metadata={
                        "tribunal": info.tribunal,
                        "processo": info.processo,
                        "tipo": info.tipo,
                        "hash_sha256": info.hash_sha256,
                    },
                )
                info.url_storage = f"s3://{self._s3_bucket}/{s3_key}"
                logger.info(f"PDF uploaded to S3: {s3_key}")
            except Exception as e:
                logger.warning(f"S3 upload failed: {e}")

        # Upload to Supabase if configured
        if self._supabase_client:
            try:
                import httpx
                bucket = self._supabase_client["bucket"]
                file_path = f"{info.tribunal}/{info.processo}/{info.id_documento}.pdf"
                url = f"{self._supabase_client['url']}/storage/v1/object/{bucket}/{file_path}"
                headers = {
                    "apikey": self._supabase_client["key"],
                    "Authorization": f"Bearer {self._supabase_client['key']}",
                    "Content-Type": "application/pdf",
                }
                with httpx.Client() as client:
                    resp = client.post(url, content=pdf_bytes, headers=headers)
                    if resp.status_code in (200, 201):
                        public_url = f"{self._supabase_client['url']}/storage/v1/object/public/{bucket}/{file_path}"
                        info.url_storage = public_url
                        logger.info(f"PDF uploaded to Supabase: {file_path}")
                    else:
                        logger.warning(f"Supabase upload failed: {resp.status_code}")
            except Exception as e:
                logger.warning(f"Supabase upload failed: {e}")

        return path

    def buscar(self, tribunal: str, processo: str, id_documento: str) -> Optional[bytes]:
        """Busca PDF armazenado"""
        path = self._get_path(tribunal, processo, id_documento)
        if os.path.exists(path):
            with open(path, "rb") as f:
                return f.read()
        return None

    def listar(self, tribunal: Optional[str] = None, processo: Optional[str] = None) -> list[dict]:
        """Lista PDFs armazenados"""
        resultados = []
        search_dir = self.base_dir
        if tribunal:
            search_dir = os.path.join(search_dir, tribunal)
            if processo:
                search_dir = os.path.join(search_dir, processo.replace(".", "").replace("-", "_"))

        if not os.path.exists(search_dir):
            return resultados

        for root, dirs, files in os.walk(search_dir):
            for f in files:
                if f.endswith(".pdf"):
                    full_path = os.path.join(root, f)
                    stat = os.stat(full_path)
                    resultados.append({
                        "caminho": full_path,
                        "nome": f,
                        "tamanho": stat.st_size,
                        "modificado": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    })
        return resultados


# ==================== INTEGRATED PIPELINE ====================

class PDFPipeline:
    """
    Pipeline integrado: extrai -> parse -> armazena.
    Usado pelo orquestrador para processar documentos automaticamente.
    """

    def __init__(self, storage_dir: str = "uploads/pdfs"):
        self.extractor_mni = PDFExtractorMNI()
        self.downloader = PDFDownloader()
        self.parser = PDFParser()
        self.storage = PDFStorage(storage_dir)

    async def processar_mni(
        self,
        documentos_mni: list[dict],
        processo: str,
        tribunal: str,
    ) -> list[PDFInfo]:
        """Processa documentos de resposta MNI"""
        resultados = []

        for doc in documentos_mni:
            conteudo = doc.get("conteudo_base64")
            if not conteudo:
                continue

            try:
                pdf_bytes = self.extractor_mni.decode_base64(conteudo)

                info = PDFInfo(
                    id_documento=doc.get("id", f"mni_{len(resultados)}"),
                    processo=processo,
                    tribunal=tribunal,
                    tipo=doc.get("tipo", "desconhecido"),
                    descricao=doc.get("descricao", ""),
                    data_documento=doc.get("data"),
                    fonte="mni",
                )

                # Salva
                self.storage.salvar(pdf_bytes, info)

                # Extrai texto
                texto, num_paginas = self.parser.extrair_texto(pdf_bytes)
                info.texto_extraido = texto[:5000]  # Limita para armazenamento
                info.num_paginas = num_paginas

                resultados.append(info)
                logger.info(f"MNI PDF processado: {info.id_documento} ({num_paginas} pgs)")

            except Exception as e:
                logger.error(f"Erro ao processar documento MNI {doc.get('id')}: {e}")

        return resultados

    async def processar_download(
        self,
        page,
        download_selector: str,
        processo: str,
        tribunal: str,
        tipo: str = "desconhecido",
        descricao: str = "",
    ) -> Optional[PDFInfo]:
        """Processa download de PDF via scraping"""
        try:
            pdf_bytes = await self.downloader.download_from_page(page, download_selector)
            if not pdf_bytes:
                pdf_bytes = await self.downloader.download_from_popup(page, download_selector)

            if not pdf_bytes:
                return None

            info = PDFInfo(
                id_documento=hashlib.md5(pdf_bytes[:1000]).hexdigest()[:12],
                processo=processo,
                tribunal=tribunal,
                tipo=tipo,
                descricao=descricao,
                fonte="scraping",
            )

            self.storage.salvar(pdf_bytes, info)
            texto, num_paginas = self.parser.extrair_texto(pdf_bytes)
            info.texto_extraido = texto[:5000]
            info.num_paginas = num_paginas

            return info

        except Exception as e:
            logger.error(f"Erro ao processar download: {e}")
            return None

    async def processar_url(
        self,
        url: str,
        processo: str,
        tribunal: str,
        tipo: str = "desconhecido",
        descricao: str = "",
    ) -> Optional[PDFInfo]:
        """Processa download de PDF por URL direta"""
        try:
            pdf_bytes = await self.downloader.download_from_url(url)
            if not pdf_bytes:
                return None

            info = PDFInfo(
                id_documento=hashlib.md5(pdf_bytes[:1000]).hexdigest()[:12],
                processo=processo,
                tribunal=tribunal,
                tipo=tipo,
                descricao=descricao,
                fonte="url",
                url_storage=url,
            )

            self.storage.salvar(pdf_bytes, info)
            texto, num_paginas = self.parser.extrair_texto(pdf_bytes)
            info.texto_extraido = texto[:5000]
            info.num_paginas = num_paginas

            return info

        except Exception as e:
            logger.error(f"Erro ao processar URL: {e}")
            return None
