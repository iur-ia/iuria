#!/usr/bin/env python3
"""
Real Web Scraper - iuria LexFutura
Implements actual HTTP-based scraping for Brazilian courts.

IMPORTANTE: Todo scraping de acompanhamento processual (andamentos, movimentacoes)
e feito DIRETAMENTE nos sites oficiais dos tribunais. JusBrasil NAO e utilizado
para acompanhamento processual - ele serve apenas para busca de jurisprudencia
(decisoes judiciais publicadas).

Estrategia de consulta (cascading fallback):
  1. MNI com certificado digital (via SOAP/mTLS) - acesso completo autenticado
  2. MNI publico (sem certificado) - consulta publica SOAP 
  3. Scraping HTTP direto no site do tribunal (requests + BeautifulSoup)
  4. Scraping browser (Playwright/Patchright com anti-deteccao) para sites com JS/CAPTCHA

Nunca se usa JusBrasil para movimentacoes/andamentos processuais.

Tribunais suportados diretamente:
  - STF (portal.stf.jus.br) via portal + API
  - STJ (processo.stj.jus.br) via pesquisa direta
  - TRF2 (eproc.trf2.jus.br) via eProc public
  - TJRJ PJE (tjrj.pje.jus.br) via consulta publica
  - TJRJ DCP (www3.tjrj.jus.br) via sistema legado
  - TJRJ eProc (eproc.tjrj.jus.br) via novo sistema
  - TJSP eSAJ (esaj.tjsp.jus.br) via consulta publica
  - TRF4 eProc (eproc.trf4.jus.br) via consulta publica
  - 89+ tribunais via PJe generico (consulta publica)
  - 55+ tribunais via MNI SOAP (com ou sem certificado)
"""

import asyncio
import json
import logging
import os
import re
import time
from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, List, Any
from urllib.parse import urljoin, urlencode, quote

import requests
from bs4 import BeautifulSoup
import urllib3

# Disable SSL warnings for government sites with cert issues
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger("iuria.real_scraper")

# ==================== COMMON ====================

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "DNT": "1",
}

TIMEOUT = 25


@dataclass
class ScrapingResult:
    """Standardized result from scraping"""
    tribunal: str
    numero: str
    classe: Optional[str] = None
    assunto: Optional[str] = None
    relator: Optional[str] = None
    orgao_julgador: Optional[str] = None
    data_ajuizamento: Optional[str] = None
    situacao: Optional[str] = None
    partes: List[Dict] = field(default_factory=list)
    movimentacoes: List[Dict] = field(default_factory=list)
    documentos: List[Dict] = field(default_factory=list)
    url: Optional[str] = None
    erro: Optional[str] = None
    fonte: str = "scraping"
    metodo: str = "http"
    tempo_ms: float = 0

    def to_dict(self) -> dict:
        return asdict(self)

    @property
    def sucesso(self) -> bool:
        return self.erro is None and (
            self.classe is not None or
            len(self.partes) > 0 or
            len(self.movimentacoes) > 0
        )


# ==================== STF SCRAPER ====================

class STFRealScraper:
    """
    Real scraper for STF (Supremo Tribunal Federal).
    Scraping direto em portal.stf.jus.br - sem JusBrasil.

    STF tambem usa Cloudflare (403). Estrategia:
    1. curl_cffi com TLS impersonation
    2. STF API publica (api.stf.jus.br)
    3. Patchright browser (fallback)
    """

    BASE_URL = "https://portal.stf.jus.br"
    SEARCH_URL = f"{BASE_URL}/processos/listarProcessos.asp"
    DETAIL_URL = f"{BASE_URL}/processos/detalhe.asp"
    API_URL = "https://api.stf.jus.br/v1"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.session.verify = False
        self._curl_session = None

    def _get_curl(self):
        if self._curl_session is None:
            try:
                from curl_cffi.requests import Session
                self._curl_session = Session(impersonate="chrome131")
            except ImportError:
                pass
        return self._curl_session

    def consultar_por_classe(self, classe: str, numero: str) -> ScrapingResult:
        """Search STF by class and number (e.g., ADI 7676)"""
        start = time.time()
        try:
            params = {"classe": classe, "numeroProcesso": numero}

            # Try curl_cffi first (TLS impersonation)
            curl = self._get_curl()
            resp = None
            if curl:
                try:
                    full_url = f"{self.SEARCH_URL}?classe={quote(classe)}&numeroProcesso={quote(numero)}"
                    resp = curl.get(full_url, timeout=TIMEOUT, allow_redirects=True, verify=False)
                    if resp.status_code == 200:
                        soup = BeautifulSoup(resp.text, "html.parser")
                        links = soup.find_all("a", href=re.compile(r"detalhe\.asp\?incidente="))
                        if links:
                            incidente = re.search(r"incidente=(\d+)", links[0]["href"])
                            if incidente:
                                return self.consultar_por_incidente(incidente.group(1))
                except Exception as e:
                    logger.warning(f"STF curl_cffi failed: {e}")

            # Fallback to requests
            resp = self.session.get(self.SEARCH_URL, params=params, timeout=TIMEOUT)

            if resp.status_code == 403:
                return self._try_stf_api(classe, numero)

            soup = BeautifulSoup(resp.text, "html.parser")
            links = soup.find_all("a", href=re.compile(r"detalhe\.asp\?incidente="))
            if links:
                incidente = re.search(r"incidente=(\d+)", links[0]["href"])
                if incidente:
                    return self.consultar_por_incidente(incidente.group(1))

            elapsed = (time.time() - start) * 1000
            return ScrapingResult(
                tribunal="STF", numero=f"{classe} {numero}",
                erro="Processo nao encontrado na busca do STF",
                tempo_ms=elapsed,
            )
        except Exception as e:
            elapsed = (time.time() - start) * 1000
            return ScrapingResult(
                tribunal="STF", numero=f"{classe} {numero}",
                erro=str(e), tempo_ms=elapsed,
            )

    def consultar_por_incidente(self, incidente: str) -> ScrapingResult:
        start = time.time()
        try:
            url = f"{self.DETAIL_URL}?incidente={incidente}"
            resp = self.session.get(url, timeout=TIMEOUT)
            elapsed = (time.time() - start) * 1000
            if resp.status_code == 403:
                return ScrapingResult(
                    tribunal="STF", numero=incidente,
                    erro="STF portal retornou 403 - necessita anti-deteccao (Playwright)",
                    metodo="blocked",
                )
            soup = BeautifulSoup(resp.text, "html.parser")
            return self._parse_stf_detail(soup, url, elapsed)
        except Exception as e:
            elapsed = (time.time() - start) * 1000
            return ScrapingResult(tribunal="STF", numero=incidente, erro=str(e), tempo_ms=elapsed)

    def _try_stf_api(self, classe: str, numero: str) -> ScrapingResult:
        start = time.time()
        try:
            url = f"{self.API_URL}/processo/{classe}/{numero}"
            resp = self.session.get(url, timeout=TIMEOUT)
            elapsed = (time.time() - start) * 1000
            if resp.status_code == 200:
                data = resp.json()
                return ScrapingResult(
                    tribunal="STF",
                    numero=data.get("numero", f"{classe} {numero}"),
                    classe=data.get("classe", classe),
                    assunto=data.get("assunto"),
                    relator=data.get("relator"),
                    url=f"{self.BASE_URL}/processos/detalhe.asp?incidente={data.get('incidente', '')}",
                    fonte="stf_api", metodo="api", tempo_ms=elapsed,
                )
            return ScrapingResult(
                tribunal="STF", numero=f"{classe} {numero}",
                erro=f"STF API retornou {resp.status_code}", tempo_ms=elapsed,
            )
        except Exception as e:
            elapsed = (time.time() - start) * 1000
            return ScrapingResult(tribunal="STF", numero=f"{classe} {numero}", erro=f"STF API: {e}", tempo_ms=elapsed)

    def _parse_stf_detail(self, soup: BeautifulSoup, url: str, elapsed: float) -> ScrapingResult:
        title = soup.find("title")
        title_text = title.text.strip() if title else ""
        classe_match = re.match(r"([\w\s]+?)\s*(\d[\d.]*)", title_text)
        classe = classe_match.group(1).strip() if classe_match else None
        numero = classe_match.group(2).replace(".", "") if classe_match else title_text

        relator = None
        for tag in soup.find_all(["span", "div", "p"]):
            text = tag.get_text(strip=True)
            if "Relator" in text:
                relator_match = re.search(r"MIN[.\s]+(.+?)(?:\s*$|\s*-)", text)
                if relator_match:
                    relator = relator_match.group(1).strip()
                    break

        partes = []
        reqte_tags = soup.find_all(text=re.compile(r"REQTE|RECTE|IMPTE|ADV"))
        for tag in reqte_tags:
            parent = tag.parent
            if parent:
                text = parent.get_text(strip=True)
                if 3 < len(text) < 500:
                    tipo = "requerente" if any(k in text for k in ["REQTE", "RECTE", "IMPTE"]) else "advogado"
                    partes.append({"tipo": tipo, "nome": text})

        movimentacoes = []
        for tag in soup.find_all(["div", "li", "tr"]):
            text = tag.get_text(strip=True)
            date_match = re.match(r"(\d{2}/\d{2}/\d{4})\s*(.*)", text)
            if date_match and len(text) < 1000:
                movimentacoes.append({"data": date_match.group(1), "descricao": date_match.group(2)[:500]})

        assunto = None
        for tag in soup.find_all(text=re.compile(r"Assunto")):
            parent = tag.parent
            if parent:
                next_sibling = parent.find_next_sibling()
                if next_sibling:
                    assunto = next_sibling.get_text(strip=True)[:300]
                    break

        return ScrapingResult(
            tribunal="STF",
            numero=f"{classe} {numero}" if classe else numero,
            classe=classe, assunto=assunto, relator=relator,
            partes=partes[:20], movimentacoes=movimentacoes[:50],
            url=url, fonte="scraping", metodo="http_portal", tempo_ms=elapsed,
        )


# ==================== STJ SCRAPER ====================

class STJRealScraper:
    """
    Real scraper for STJ - scraping direto em processo.stj.jus.br.
    SEM JusBrasil. Se bloqueado (403 Cloudflare), delega para Patchright browser.

    IMPORTANTE: STJ usa Cloudflare WAF (cf-mitigated: challenge).
    curl_cffi com TLS impersonation pode conseguir bypassa-lo.
    Se falhar, usa Patchright (browser patched) com stealth scripts.
    """

    SEARCH_URL = "https://processo.stj.jus.br/processo/pesquisa/"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.session.verify = False
        self._curl_session = None

    def _get_curl(self):
        """Get curl_cffi session for TLS impersonation (Cloudflare bypass)"""
        if self._curl_session is None:
            try:
                from curl_cffi.requests import Session
                self._curl_session = Session(impersonate="chrome131")
            except ImportError:
                pass
        return self._curl_session

    def _try_scrapling_bypass(self, url: str) -> Optional[str]:
        """Try Scrapling StealthyFetcher for Cloudflare bypass"""
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

    def consultar(self, numero: str, tipo: str = "numero") -> ScrapingResult:
        start = time.time()
        try:
            params = {
                "aplicacao": "processos.ea",
                "tipoPesquisa": "tipoPesquisaGenerica",
                "termo": numero,
            }

            # Try curl_cffi first (TLS impersonation to bypass Cloudflare)
            curl = self._get_curl()
            resp = None
            if curl:
                try:
                    full_url = f"{self.SEARCH_URL}?{'&'.join(f'{k}={quote(str(v))}' for k, v in params.items())}"
                    resp = curl.get(full_url, timeout=TIMEOUT, allow_redirects=True, verify=False,
                                    headers={
                                        "Accept": "text/html,application/xhtml+xml",
                                        "Accept-Language": "pt-BR,pt;q=0.9",
                                        "Sec-Fetch-Dest": "document",
                                        "Sec-Fetch-Mode": "navigate",
                                    })
                    if resp.status_code == 200 and "Verificação" not in resp.text[:500]:
                        elapsed = (time.time() - start) * 1000
                        soup = BeautifulSoup(resp.text, "html.parser")
                        result = self._parse_stj_results(soup, numero, elapsed)
                        result.metodo = "curl_cffi_tls"
                        return result
                except Exception as e:
                    logger.warning(f"STJ curl_cffi failed: {e}")

            # Try Scrapling StealthyFetcher (headless browser with stealth)
            search_url = f"{self.SEARCH_URL}?{'&'.join(f'{k}={quote(str(v))}' for k, v in params.items())}"
            html = self._try_scrapling_bypass(search_url)
            if html:
                elapsed = (time.time() - start) * 1000
                soup = BeautifulSoup(html, "html.parser")
                result = self._parse_stj_results(soup, numero, elapsed)
                result.metodo = "scrapling_stealth"
                return result

            # Fallback to requests
            resp = self.session.get(self.SEARCH_URL, params=params, timeout=TIMEOUT)
            elapsed = (time.time() - start) * 1000

            if resp.status_code == 403 or "Verificação" in resp.text[:500]:
                return ScrapingResult(
                    tribunal="STJ", numero=numero,
                    erro="STJ Cloudflare WAF ativo (403/challenge) - sera tentado Patchright browser.",
                    metodo="blocked", tempo_ms=elapsed,
                )

            soup = BeautifulSoup(resp.text, "html.parser")
            return self._parse_stj_results(soup, numero, elapsed)
        except Exception as e:
            elapsed = (time.time() - start) * 1000
            return ScrapingResult(tribunal="STJ", numero=numero, erro=str(e), tempo_ms=elapsed)

    def _parse_stj_results(self, soup: BeautifulSoup, numero: str, elapsed: float) -> ScrapingResult:
        partes = []
        movimentacoes = []
        classe = relator = None

        for tag in soup.find_all(["div", "span", "td"]):
            text = tag.get_text(strip=True)
            if "Relator" in text and not relator:
                relator = text.replace("Relator(a):", "").replace("Relator:", "").strip()[:200]
            if "Classe" in text and not classe:
                classe = text.replace("Classe:", "").strip()[:200]

        # Parse movements from text
        page_text = soup.get_text()
        for line in page_text.split('\n'):
            match = re.match(r'\s*(\d{2}/\d{2}/\d{4})\s+(.+)', line.strip())
            if match:
                movimentacoes.append({"data": match.group(1), "descricao": match.group(2).strip()[:500]})

        return ScrapingResult(
            tribunal="STJ", numero=numero, classe=classe, relator=relator,
            partes=partes, movimentacoes=movimentacoes[:50],
            url=f"{self.SEARCH_URL}?tipoPesquisa=tipoPesquisaGenerica&termo={quote(numero)}",
            fonte="scraping", metodo="http_search", tempo_ms=elapsed,
        )


# ==================== TRF2 ePROC SCRAPER ====================

class TRF2EprocScraper:
    """Scraping direto em eproc.trf2.jus.br"""

    BASE_URL = "https://eproc.trf2.jus.br/eproc/externo_controlador.php"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.session.verify = False

    def consultar(self, numero: str) -> ScrapingResult:
        start = time.time()
        try:
            data = {
                "acao": "processo_consulta_publica",
                "txtNumProcesso": numero.replace(".", "").replace("-", ""),
                "hdnInfracao": "0",
            }
            # eProc uses ISO-8859-1 and may have non-UTF8 redirect URLs
            try:
                from curl_cffi.requests import Session as CffiSession
                curl = CffiSession(impersonate="chrome131")
                resp = curl.post(self.BASE_URL, data=data, timeout=TIMEOUT,
                                 allow_redirects=True, verify=False)
                html_text = resp.content.decode('iso-8859-1', errors='replace')
            except (ImportError, Exception):
                resp = self.session.post(self.BASE_URL, data=data, timeout=TIMEOUT, allow_redirects=False)
                html_text = resp.content.decode('iso-8859-1', errors='replace')

            elapsed = (time.time() - start) * 1000
            if resp.status_code == 403:
                return ScrapingResult(tribunal="TRF2", numero=numero, erro="TRF2 eProc bloqueou", tempo_ms=elapsed)
            soup = BeautifulSoup(html_text, "html.parser")
            return self._parse_eproc_result(soup, numero, elapsed)
        except Exception as e:
            elapsed = (time.time() - start) * 1000
            return ScrapingResult(tribunal="TRF2", numero=numero, erro=str(e), tempo_ms=elapsed)

    def _parse_eproc_result(self, soup: BeautifulSoup, numero: str, elapsed: float) -> ScrapingResult:
        classe = assunto = relator = situacao = None
        partes = []
        movimentacoes = []

        for label_tag in soup.find_all(["td", "th", "label", "span"]):
            text = label_tag.get_text(strip=True)
            if "Classe" in text:
                val = label_tag.find_next_sibling()
                if val:
                    classe = val.get_text(strip=True)[:200]
            if "Assunto" in text:
                val = label_tag.find_next_sibling()
                if val:
                    assunto = val.get_text(strip=True)[:300]
            if "Relator" in text:
                val = label_tag.find_next_sibling()
                if val:
                    relator = val.get_text(strip=True)[:200]

        for row in soup.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) >= 2:
                tipo_text = cells[0].get_text(strip=True)
                nome_text = cells[1].get_text(strip=True)
                if any(p in tipo_text.upper() for p in ["AUTOR", "REU", "PARTE", "LITISCONSORTE"]):
                    partes.append({"tipo": tipo_text, "nome": nome_text[:200]})

        for row in soup.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) >= 2:
                date_text = cells[0].get_text(strip=True)
                if re.match(r"\d{2}/\d{2}/\d{4}", date_text):
                    desc = cells[1].get_text(strip=True) if len(cells) > 1 else ""
                    movimentacoes.append({"data": date_text, "descricao": desc[:500]})

        return ScrapingResult(
            tribunal="TRF2", numero=numero, classe=classe, assunto=assunto,
            relator=relator, situacao=situacao,
            partes=partes[:20], movimentacoes=movimentacoes[:50],
            url=f"{self.BASE_URL}?acao=processo_consulta_publica",
            fonte="scraping", metodo="eproc_http", tempo_ms=elapsed,
        )


# ==================== TJRJ PJE SCRAPER ====================

class TJRJPjeScraper:
    """Scraping direto em tjrj.pje.jus.br"""

    BASE_URL = "https://tjrj.pje.jus.br/pje/ConsultaPublica"
    API_URL = "https://tjrj.pje.jus.br/pje/api/v1/consulta"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.session.verify = False

    def consultar(self, numero: str) -> ScrapingResult:
        start = time.time()
        try:
            numero_limpo = numero.replace(".", "").replace("-", "").replace(" ", "")
            api_url = f"{self.API_URL}/processo/{numero_limpo}"
            resp = self.session.get(api_url, timeout=TIMEOUT)
            elapsed = (time.time() - start) * 1000
            if resp.status_code == 200:
                data = resp.json()
                return self._parse_pje_api(data, numero, elapsed)
            resp = self.session.get(f"{self.BASE_URL}/listView.seam", params={"numProcesso": numero}, timeout=TIMEOUT)
            elapsed = (time.time() - start) * 1000
            soup = BeautifulSoup(resp.text, "html.parser")
            return self._parse_pje_html(soup, numero, elapsed)
        except Exception as e:
            elapsed = (time.time() - start) * 1000
            return ScrapingResult(tribunal="TJRJ", numero=numero, erro=f"PJe: {e}", metodo="pje", tempo_ms=elapsed)

    def _parse_pje_api(self, data: dict, numero: str, elapsed: float) -> ScrapingResult:
        return ScrapingResult(
            tribunal="TJRJ", numero=data.get("numero", numero),
            classe=data.get("classe"), assunto=data.get("assunto"),
            orgao_julgador=data.get("orgaoJulgador"),
            partes=[{"tipo": p.get("tipo"), "nome": p.get("nome")} for p in data.get("partes", [])],
            movimentacoes=[{"data": m.get("data"), "descricao": m.get("descricao")} for m in data.get("movimentos", [])],
            url=f"{self.BASE_URL}/detalheProcesso.seam?numProcesso={numero}",
            fonte="pje_api", metodo="pje_api", tempo_ms=elapsed,
        )

    def _parse_pje_html(self, soup: BeautifulSoup, numero: str, elapsed: float) -> ScrapingResult:
        classe = assunto = None
        for tag in soup.find_all(["span", "div", "td"]):
            text = tag.get_text(strip=True)
            if "Classe" in text and not classe:
                classe = text.replace("Classe:", "").strip()[:200]
            if "Assunto" in text and not assunto:
                assunto = text.replace("Assunto:", "").strip()[:200]
        return ScrapingResult(
            tribunal="TJRJ", numero=numero, classe=classe, assunto=assunto,
            url=f"{self.BASE_URL}/listView.seam",
            fonte="scraping", metodo="pje_html", tempo_ms=elapsed,
        )


# ==================== TJRJ DCP SCRAPER ====================

class TJRJDcpScraper:
    """Scraping direto em www3.tjrj.jus.br (sistema legado)"""

    CONSULTA_URL = "https://www3.tjrj.jus.br/ejud/ConsultaProcesso.aspx"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.session.verify = False

    def consultar(self, numero: str) -> ScrapingResult:
        start = time.time()
        try:
            resp = self.session.get(self.CONSULTA_URL, timeout=TIMEOUT)
            elapsed = (time.time() - start) * 1000
            if resp.status_code != 200:
                return ScrapingResult(tribunal="TJRJ-DCP", numero=numero, erro=f"DCP retornou {resp.status_code}", tempo_ms=elapsed)
            soup = BeautifulSoup(resp.text, "html.parser")
            viewstate = soup.find("input", {"name": "__VIEWSTATE"})
            eventvalidation = soup.find("input", {"name": "__EVENTVALIDATION"})
            vs = viewstate["value"] if viewstate else ""
            ev = eventvalidation["value"] if eventvalidation else ""
            data = {"__VIEWSTATE": vs, "__EVENTVALIDATION": ev, "txtNumeroProcesso": numero, "btnPesquisar": "Pesquisar"}
            resp = self.session.post(self.CONSULTA_URL, data=data, timeout=TIMEOUT)
            elapsed = (time.time() - start) * 1000
            soup = BeautifulSoup(resp.text, "html.parser")
            return self._parse_dcp_result(soup, numero, elapsed)
        except Exception as e:
            elapsed = (time.time() - start) * 1000
            return ScrapingResult(tribunal="TJRJ-DCP", numero=numero, erro=f"DCP: {e}", tempo_ms=elapsed)

    def _parse_dcp_result(self, soup: BeautifulSoup, numero: str, elapsed: float) -> ScrapingResult:
        classe = assunto = None
        partes = []
        for row in soup.find_all("tr"):
            cells = row.find_all("td")
            if len(cells) >= 2:
                label = cells[0].get_text(strip=True)
                value = cells[1].get_text(strip=True)
                if "Classe" in label and not classe:
                    classe = value[:200]
                if "Assunto" in label and not assunto:
                    assunto = value[:300]
                if any(k in label for k in ["Autor", "Reu", "Requerente", "Requerido"]):
                    partes.append({"tipo": label, "nome": value[:200]})
        return ScrapingResult(
            tribunal="TJRJ-DCP", numero=numero, classe=classe, assunto=assunto,
            partes=partes[:20], url=self.CONSULTA_URL,
            fonte="scraping", metodo="dcp_http", tempo_ms=elapsed,
        )


# ==================== TJRJ ePROC SCRAPER ====================

class TJRJEprocScraper:
    """Scraping direto em eproc.tjrj.jus.br (novo sistema, Oct 2025)"""

    BASE_URL = "https://eproc.tjrj.jus.br/eproc/externo_controlador.php"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.session.verify = False

    def consultar(self, numero: str) -> ScrapingResult:
        start = time.time()
        try:
            data = {"acao": "processo_consulta_publica", "txtNumProcesso": numero.replace(".", "").replace("-", "")}
            resp = self.session.post(self.BASE_URL, data=data, timeout=TIMEOUT, allow_redirects=True)
            elapsed = (time.time() - start) * 1000
            if resp.status_code != 200:
                return ScrapingResult(tribunal="TJRJ-EPROC", numero=numero, erro=f"eProc retornou {resp.status_code}", tempo_ms=elapsed)
            soup = BeautifulSoup(resp.text, "html.parser")
            classe = assunto = None
            for tag in soup.find_all(["td", "span", "div"]):
                text = tag.get_text(strip=True)
                if "Classe" in text and not classe:
                    classe = text.replace("Classe:", "").strip()[:200]
                if "Assunto" in text and not assunto:
                    assunto = text.replace("Assunto:", "").strip()[:300]
            return ScrapingResult(
                tribunal="TJRJ-EPROC", numero=numero, classe=classe, assunto=assunto,
                url=self.BASE_URL, fonte="scraping", metodo="eproc_http", tempo_ms=elapsed,
            )
        except Exception as e:
            elapsed = (time.time() - start) * 1000
            return ScrapingResult(tribunal="TJRJ-EPROC", numero=numero, erro=f"eProc: {e}", tempo_ms=elapsed)


# ==================== GENERIC PJE SCRAPER ====================

class GenericPJeScraper:
    """Generic scraper for any PJe-based tribunal - scraping direto.

    PJe URLs vary by tribunal:
    - /consultapublica/ConsultaPublica/listView.seam (TRF1, TRF3)
    - /pje/ConsultaPublica/listView.seam (TJMG, TJBA, etc.)
    - /consultaprocessual/ (TST, TRTs)
    - /consultapublica/ (redirect to form)

    Uses curl_cffi for TLS impersonation when available.
    """

    # Known PJe URL patterns per tribunal
    PJE_URL_MAP = {
        "TJDFT": "https://pje.tjdft.jus.br/pje/ConsultaPublica/listView.seam",
        "TJGO": "https://pje.tjgo.jus.br/pje/ConsultaPublica/listView.seam",
        "TJMA": "https://pje.tjma.jus.br/pje/ConsultaPublica/listView.seam",
        "TJMG": "https://pje.tjmg.jus.br/pje/ConsultaPublica/listView.seam",
        "TJBA": "https://pje.tjba.jus.br/pje/ConsultaPublica/listView.seam",
        "TJPE": "https://pje.tjpe.jus.br/pje/ConsultaPublica/listView.seam",
        "TJCE": "https://pje.tjce.jus.br/pje/ConsultaPublica/listView.seam",
        "TJAL": "https://pje.tjal.jus.br/pje/ConsultaPublica/listView.seam",
        "TJRN": "https://pje.tjrn.jus.br/pje/ConsultaPublica/listView.seam",
        "TJPB": "https://pje.tjpb.jus.br/pje/ConsultaPublica/listView.seam",
        "TJSE": "https://pje.tjse.jus.br/pje/ConsultaPublica/listView.seam",
        "TJPI": "https://pje.tjpi.jus.br/pje/ConsultaPublica/listView.seam",
        "TJES": "https://pje.tjes.jus.br/pje/ConsultaPublica/listView.seam",
        "TJMT": "https://pje.tjmt.jus.br/pje/ConsultaPublica/listView.seam",
        "TJAP": "https://pje.tjap.jus.br/pje/ConsultaPublica/listView.seam",
        "TJRO": "https://pje.tjro.jus.br/pje/ConsultaPublica/listView.seam",
        "TJAC": "https://pje.tjac.jus.br/pje/ConsultaPublica/listView.seam",
        "TJRR": "https://pje.tjrr.jus.br/pje/ConsultaPublica/listView.seam",
        "TJTO": "https://pje.tjto.jus.br/pje/ConsultaPublica/listView.seam",
        "TJPA": "https://pje.tjpa.jus.br/pje/ConsultaPublica/listView.seam",
        "TJRJ": "https://tjrj.pje.jus.br/pje/ConsultaPublica/listView.seam",
        "TJAM": "https://pje.tjam.jus.br/pje/ConsultaPublica/listView.seam",
        "TJPR": "https://pje.tjpr.jus.br/pje/ConsultaPublica/listView.seam",
        "TJRS": "https://pje.tjrs.jus.br/pje/ConsultaPublica/listView.seam",
        "TJSC": "https://pje.tjsc.jus.br/pje/ConsultaPublica/listView.seam",
        "TJSP": "https://pje.tjsp.jus.br/pje/ConsultaPublica/listView.seam",
    }

    def __init__(self, tribunal: str, url_base: str):
        self.tribunal = tribunal
        # Use known URL if available, otherwise use provided
        self.url_base = self.PJE_URL_MAP.get(tribunal, url_base)
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.session.verify = False
        self._curl = None

    def _get_curl(self):
        if self._curl is None:
            try:
                from curl_cffi.requests import Session
                self._curl = Session(impersonate="chrome131")
            except ImportError:
                pass
        return self._curl

    def consultar(self, numero: str) -> ScrapingResult:
        start = time.time()
        try:
            url = self.url_base
            params = {}
            if "listView.seam" in url:
                params = {"conversationId": "", "numeroProcesso": numero}
            elif "consultaprocessual" in url or "consultapublica" in url:
                params = {"numProcesso": numero}
            else:
                params = {"numProcesso": numero}

            # Try curl_cffi first
            resp = None
            curl = self._get_curl()
            if curl:
                try:
                    full_url = url + "?" + "&".join(f"{k}={quote(v)}" for k, v in params.items()) if params else url
                    resp = curl.get(full_url, timeout=TIMEOUT, allow_redirects=True, verify=False)
                    if resp.status_code == 200 and len(resp.text) > 500:
                        elapsed = (time.time() - start) * 1000
                        soup = BeautifulSoup(resp.text, "html.parser")
                        return self._parse_pje(soup, numero, elapsed, "curl_cffi_pje")
                except Exception:
                    pass

            # Fallback to requests
            resp = self.session.get(url, params=params, timeout=TIMEOUT)
            elapsed = (time.time() - start) * 1000
            if resp.status_code not in (200, 301, 302):
                return ScrapingResult(
                    tribunal=self.tribunal, numero=numero,
                    erro=f"PJe retornou {resp.status_code} - usar browser scraper (Patchright)",
                    metodo="blocked" if resp.status_code in (403, 429) else "http",
                    tempo_ms=elapsed,
                )
            soup = BeautifulSoup(resp.text, "html.parser")
            return self._parse_pje(soup, numero, elapsed, "pje_http")

        except Exception as e:
            elapsed = (time.time() - start) * 1000
            return ScrapingResult(tribunal=self.tribunal, numero=numero, erro=str(e), tempo_ms=elapsed)

    def _parse_pje(self, soup: BeautifulSoup, numero: str, elapsed: float, metodo: str) -> ScrapingResult:
        classe = assunto = relator = None

        # Try specific PJe selectors first
        for tag_id, attr in [("classeJudicial", "classe"), ("assuntoPrincipal", "assunto")]:
            el = soup.find(id=re.compile(tag_id, re.I))
            if el:
                if attr == "classe":
                    classe = el.get_text(strip=True)[:200]
                elif attr == "assunto":
                    assunto = el.get_text(strip=True)[:300]

        # Fallback: text-based extraction
        for tag in soup.find_all(["span", "div", "td", "label"]):
            text = tag.get_text(strip=True)
            if "Classe" in text and not classe:
                val = text.split(":")[-1].strip() if ":" in text else ""
                if val:
                    classe = val[:200]
            if "Assunto" in text and not assunto:
                val = text.split(":")[-1].strip() if ":" in text else ""
                if val:
                    assunto = val[:300]
            if "Relator" in text or "Magistrado" in text or "Juiz" in text:
                if not relator:
                    val = text.split(":")[-1].strip() if ":" in text else ""
                    if val:
                        relator = val[:200]

        # Extract movements
        movimentacoes = []
        page_text = soup.get_text()
        for line in page_text.split('\n'):
            match = re.match(r'\s*(\d{2}/\d{2}/\d{4})\s+(.+)', line.strip())
            if match:
                movimentacoes.append({"data": match.group(1), "descricao": match.group(2).strip()[:500]})

        return ScrapingResult(
            tribunal=self.tribunal, numero=numero, classe=classe, assunto=assunto,
            relator=relator, movimentacoes=movimentacoes[:50],
            url=self.url_base, fonte="scraping", metodo=metodo, tempo_ms=elapsed,
        )


# ==================== TJSP eSAJ SCRAPER ====================

class TJSPEsajScraper:
    """Scraping direto em esaj.tjsp.jus.br - sem JusBrasil."""

    BASE_URL_1G = "https://esaj.tjsp.jus.br/cpopg/open.do"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.session.verify = False

    def consultar(self, numero: str) -> ScrapingResult:
        start = time.time()
        try:
            numero_limpo = re.sub(r'[^\d]', '', numero)
            nd_ano = numero_limpo[:15] if len(numero_limpo) >= 15 else numero_limpo
            foro = numero_limpo[15:] if len(numero_limpo) > 15 else ""
            params = {
                "conversationId": "",
                "dadosConsulta.localPesquisa.cdLocal": "-1",
                "cbPesquisa": "NUMPROC",
                "dadosConsulta.tipoNuProcesso": "UNIFICADO",
                "numeroDigitoAnoUnificado": nd_ano,
                "foroNumeroUnificado": foro,
                "dadosConsulta.valorConsultaNuUnificado": numero,
            }
            resp = self.session.get(self.BASE_URL_1G, params=params, timeout=TIMEOUT)
            elapsed = (time.time() - start) * 1000
            if resp.status_code != 200:
                return ScrapingResult(tribunal="TJSP", numero=numero, erro=f"eSAJ retornou {resp.status_code}", tempo_ms=elapsed)
            soup = BeautifulSoup(resp.text, "html.parser")
            return self._parse_esaj(soup, numero, elapsed)
        except Exception as e:
            elapsed = (time.time() - start) * 1000
            return ScrapingResult(tribunal="TJSP", numero=numero, erro=f"eSAJ: {e}", tempo_ms=elapsed)

    def _parse_esaj(self, soup: BeautifulSoup, numero: str, elapsed: float) -> ScrapingResult:
        classe = assunto = relator = None
        partes = []
        movimentacoes = []

        el = soup.find(id="classeProcesso")
        if el:
            classe = el.get_text(strip=True)[:200]
        el = soup.find(id="assuntoProcesso")
        if el:
            assunto = el.get_text(strip=True)[:300]
        el = soup.find(id="juizProcesso")
        if el:
            relator = el.get_text(strip=True)[:200]

        partes_table = soup.find(id="tablePartesPrincipais")
        if partes_table:
            for row in partes_table.find_all("tr"):
                cells = row.find_all("td")
                if len(cells) >= 2:
                    tipo = cells[0].get_text(strip=True).rstrip(":")
                    nome = cells[1].get_text(strip=True)
                    if nome:
                        partes.append({"tipo": tipo, "nome": nome[:200]})

        for table_id in ["tabelaTodasMovimentacoes", "tabelaUltimasMovimentacoes"]:
            mov_table = soup.find(id=table_id)
            if mov_table:
                for row in mov_table.find_all("tr"):
                    data_cell = row.find(class_="dataMovimentacao") or row.find("td")
                    desc_cell = row.find(class_="descricaoMovimentacao")
                    if data_cell and desc_cell:
                        data = data_cell.get_text(strip=True)
                        desc = desc_cell.get_text(strip=True)
                        if re.match(r'\d{2}/\d{2}/\d{4}', data) and desc:
                            movimentacoes.append({"data": data, "descricao": desc[:500]})

        return ScrapingResult(
            tribunal="TJSP", numero=numero, classe=classe, assunto=assunto, relator=relator,
            partes=partes[:20], movimentacoes=movimentacoes[:50],
            url=self.BASE_URL_1G, fonte="scraping", metodo="esaj_http", tempo_ms=elapsed,
        )


# ==================== TRF4 ePROC v2 SCRAPER ====================

class TRF4EprocScraper:
    """Scraping direto em eproc.trf4.jus.br"""

    BASE_URL = "https://eproc.trf4.jus.br/eproc2trf4/controlador.php"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.session.verify = False

    def consultar(self, numero: str) -> ScrapingResult:
        start = time.time()
        try:
            numero_limpo = numero.replace(".", "").replace("-", "")
            data = {"acao": "processo_consulta_publica", "txtNumProcesso": numero_limpo}

            # TRF4 eProc uses ISO-8859-1 and has redirect URLs with accented chars.
            # requests library can't handle non-UTF8 redirect Location headers.
            # Use allow_redirects=False and handle redirects manually, or use curl_cffi.
            try:
                from curl_cffi.requests import Session as CffiSession
                curl = CffiSession(impersonate="chrome131")
                resp = curl.post(self.BASE_URL, data=data, timeout=TIMEOUT,
                                 allow_redirects=True, verify=False)
                html_text = resp.content.decode('iso-8859-1', errors='replace')
            except (ImportError, Exception) as e:
                # Fallback: requests without redirect following
                resp = self.session.post(self.BASE_URL, data=data, timeout=TIMEOUT, allow_redirects=False)
                if resp.status_code in (301, 302, 303, 307):
                    location = resp.headers.get('Location', '')
                    if location:
                        try:
                            resp = self.session.get(location, timeout=TIMEOUT)
                        except Exception:
                            resp = self.session.post(self.BASE_URL, data=data, timeout=TIMEOUT, allow_redirects=False)
                html_text = resp.content.decode('iso-8859-1', errors='replace')

            elapsed = (time.time() - start) * 1000
            if resp.status_code not in (200, 301, 302):
                return ScrapingResult(tribunal="TRF4", numero=numero, erro=f"eProc retornou {resp.status_code}", tempo_ms=elapsed)
            soup = BeautifulSoup(html_text, "html.parser")
            classe = assunto = relator = None
            movimentacoes = []
            for tag in soup.find_all(["td", "th", "label", "span"]):
                text = tag.get_text(strip=True)
                if "Classe" in text and not classe:
                    val = tag.find_next_sibling()
                    if val:
                        classe = val.get_text(strip=True)[:200]
                if "Assunto" in text and not assunto:
                    val = tag.find_next_sibling()
                    if val:
                        assunto = val.get_text(strip=True)[:300]
                if "Relator" in text and not relator:
                    val = tag.find_next_sibling()
                    if val:
                        relator = val.get_text(strip=True)[:200]
            for row in soup.find_all("tr"):
                cells = row.find_all("td")
                if len(cells) >= 2:
                    date_text = cells[0].get_text(strip=True)
                    if re.match(r"\d{2}/\d{2}/\d{4}", date_text):
                        desc = cells[1].get_text(strip=True)
                        movimentacoes.append({"data": date_text, "descricao": desc[:500]})
            return ScrapingResult(
                tribunal="TRF4", numero=numero, classe=classe, assunto=assunto, relator=relator,
                movimentacoes=movimentacoes[:50], url=self.BASE_URL,
                fonte="scraping", metodo="eproc_v2_http", tempo_ms=elapsed,
            )
        except Exception as e:
            elapsed = (time.time() - start) * 1000
            return ScrapingResult(tribunal="TRF4", numero=numero, erro=str(e), tempo_ms=elapsed)


# ==================== MNI DIRECT INTEGRATION ====================

class MNIDirectScraper:
    """
    Integra com o MNI (Modelo Nacional de Interoperabilidade) diretamente.
    Acessa o webservice SOAP do tribunal com ou sem certificado digital.
    
    Esta e a fonte MAIS CONFIAVEL para acompanhamento processual pois
    usa o protocolo padronizado do CNJ (Resolucao 185/2013).
    
    Com certificado A1: acesso completo (documentos, sigilosos, pendencias)
    Sem certificado: apenas consulta publica SOAP
    """

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

    def __init__(self, cert_pfx_path: Optional[str] = None, cert_password: Optional[str] = None):
        self.cert_pfx_path = cert_pfx_path or os.environ.get("MNI_CERT_PFX_PATH")
        self.cert_password = cert_password or os.environ.get("MNI_CERT_PASSWORD")

    def tribunal_suporta_mni(self, tribunal: str) -> bool:
        return tribunal.upper() in self.MNI_ENDPOINTS

    def consultar(self, tribunal: str, numero: str) -> ScrapingResult:
        start = time.time()
        tribunal = tribunal.upper()
        if tribunal not in self.MNI_ENDPOINTS:
            return ScrapingResult(
                tribunal=tribunal, numero=numero,
                erro=f"Tribunal {tribunal} nao possui endpoint MNI",
                tempo_ms=(time.time() - start) * 1000,
            )
        try:
            import zeep
            from zeep.transports import Transport
            import requests as req_lib

            session = req_lib.Session()
            session.verify = True
            session.timeout = TIMEOUT

            metodo = "mni_publico"
            if self.cert_pfx_path and self.cert_password:
                try:
                    cert_pem, key_pem = self._extract_pem(self.cert_pfx_path, self.cert_password)
                    import tempfile
                    cert_f = tempfile.NamedTemporaryFile(suffix=".pem", delete=False, mode="w")
                    cert_f.write(cert_pem); cert_f.flush(); cert_f.close()
                    key_f = tempfile.NamedTemporaryFile(suffix=".key", delete=False, mode="w")
                    key_f.write(key_pem); key_f.flush(); key_f.close()
                    session.cert = (cert_f.name, key_f.name)
                    metodo = "mni_mtls"
                except Exception as e:
                    logger.warning(f"Certificado falhou, usando publico: {e}")

            transport = Transport(session=session, timeout=TIMEOUT)
            client = zeep.Client(wsdl=self.MNI_ENDPOINTS[tribunal], transport=transport)
            numero_limpo = numero.replace(".", "").replace("-", "").replace(" ", "")
            response = client.service.consultarProcesso(
                idConsultante="iuria-lexfutura", senhaConsultante="",
                numeroProcesso=numero_limpo, movimentos=True,
                incluirCabecalho=True, incluirDocumentos=False,
            )
            elapsed = (time.time() - start) * 1000
            return self._parse_mni_response(response, tribunal, numero, elapsed, metodo)
        except ImportError:
            return ScrapingResult(tribunal=tribunal, numero=numero, erro="zeep nao instalado", tempo_ms=(time.time() - start) * 1000)
        except Exception as e:
            return ScrapingResult(tribunal=tribunal, numero=numero, erro=f"MNI SOAP: {e}", metodo="mni", tempo_ms=(time.time() - start) * 1000)

    def _parse_mni_response(self, response, tribunal, numero, elapsed, metodo):
        processo = getattr(response, "processo", response)
        classe = self._safe_get(processo, "classeProcessual", "descricao")
        assunto = self._safe_get(processo, "assuntoProcessual", "descricao")
        orgao = self._safe_get(processo, "orgaoJulgador", "descricao")
        situacao = str(getattr(processo, "situacao", "") or "")
        data_aj = str(getattr(processo, "dataAjuizamento", "") or "")

        partes = []
        for polo in (getattr(processo, "polo", []) or []):
            tipo_polo = getattr(polo, "polo", "")
            for parte in (getattr(polo, "parte", []) or []):
                pessoa = getattr(parte, "pessoa", None)
                if pessoa:
                    partes.append({"tipo": tipo_polo, "nome": getattr(pessoa, "nome", "")})

        movimentacoes = []
        for mov in (getattr(processo, "movimento", []) or []):
            movimentacoes.append({"data": str(getattr(mov, "dataHora", "")), "descricao": getattr(mov, "descricao", "")})

        documentos = []
        for doc in (getattr(processo, "documento", []) or []):
            documentos.append({"id": str(getattr(doc, "idDocumento", "")), "tipo": getattr(doc, "tipoDocumento", ""), "descricao": getattr(doc, "descricao", "")})

        return ScrapingResult(
            tribunal=tribunal, numero=numero, classe=classe, assunto=assunto,
            orgao_julgador=orgao, situacao=situacao, data_ajuizamento=data_aj,
            partes=partes[:30], movimentacoes=movimentacoes[:100], documentos=documentos[:50],
            url=self.MNI_ENDPOINTS.get(tribunal, ""), fonte="mni", metodo=metodo, tempo_ms=elapsed,
        )

    @staticmethod
    def _extract_pem(pfx_path, password):
        from cryptography.hazmat.primitives.serialization import Encoding, PrivateFormat, NoEncryption
        from cryptography.hazmat.primitives.serialization.pkcs12 import load_key_and_certificates
        with open(pfx_path, "rb") as f:
            pfx_data = f.read()
        private_key, cert, chain = load_key_and_certificates(pfx_data, password.encode())
        cert_pem = cert.public_bytes(Encoding.PEM).decode()
        key_pem = private_key.private_bytes(Encoding.PEM, PrivateFormat.TraditionalOpenSSL, NoEncryption()).decode()
        if chain:
            for ca in chain:
                cert_pem += ca.public_bytes(Encoding.PEM).decode()
        return cert_pem, key_pem

    @staticmethod
    def _safe_get(obj, *attrs):
        current = obj
        for attr in attrs:
            if current is None:
                return None
            current = getattr(current, attr, None)
        return str(current) if current else None


# ==================== JUSBRASIL - APENAS JURISPRUDENCIA ====================

class JusBrasilJurisprudencia:
    """
    ATENCAO: Esta classe serve EXCLUSIVAMENTE para busca de jurisprudencia
    (decisoes judiciais, acordaos, ementas publicadas).
    
    NAO deve ser usada para acompanhamento processual (andamentos/movimentacoes).
    Para acompanhamento, usar scrapers diretos dos tribunais ou MNI.
    """

    BASE_URL = "https://www.jusbrasil.com.br"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.session.verify = False

    def buscar_jurisprudencia(self, tribunal_slug: str, termo: str) -> ScrapingResult:
        """Busca JURISPRUDENCIA (decisoes publicadas). NAO usar para andamentos."""
        start = time.time()
        try:
            url = f"{self.BASE_URL}/jurisprudencia/busca"
            params = {"q": f"{termo} {tribunal_slug}"}
            resp = self.session.get(url, params=params, timeout=TIMEOUT, allow_redirects=True)
            elapsed = (time.time() - start) * 1000
            if resp.status_code != 200:
                return ScrapingResult(
                    tribunal=tribunal_slug, numero=termo,
                    erro=f"JusBrasil jurisprudencia retornou {resp.status_code}",
                    fonte="jusbrasil_jurisprudencia", tempo_ms=elapsed,
                )
            soup = BeautifulSoup(resp.text, "html.parser")
            classe = None
            for tag in soup.find_all(["h2", "h3", "a"]):
                text = tag.get_text(strip=True)
                if any(kw in text for kw in ["Ementa", "Acordao", "Decisao"]):
                    classe = text[:200]
                    break
            return ScrapingResult(
                tribunal=tribunal_slug.upper(), numero=termo, classe=classe,
                url=f"{url}?q={quote(termo)}",
                fonte="jusbrasil_jurisprudencia", metodo="jusbrasil_jurisprudencia",
                tempo_ms=elapsed,
            )
        except Exception as e:
            elapsed = (time.time() - start) * 1000
            return ScrapingResult(
                tribunal=tribunal_slug, numero=termo,
                erro=f"JusBrasil jurisprudencia: {e}",
                fonte="jusbrasil_jurisprudencia", tempo_ms=elapsed,
            )


# ==================== UNIFIED SCRAPER ====================

class UnifiedRealScraper:
    """
    Interface unificada para scraping de qualquer tribunal brasileiro.

    ESTRATEGIA (cascading fallback - SEM JusBrasil para andamentos):
    1. MNI SOAP com certificado digital (acesso completo autenticado)
    2. MNI SOAP publico (sem certificado - consulta basica)
    3. Scraping HTTP com TLS impersonation (curl_cffi - bypassa fingerprint)
    4. Scraping browser com Patchright/Playwright (anti-deteccao + comportamento humano)
    5. Scraping browser via sistemas/ (STJ, PJe, eSAJ, eProc avancados)
    6. (Nunca JusBrasil para acompanhamento processual)

    JusBrasil so e usado para JURISPRUDENCIA (decisoes publicadas),
    NUNCA para acompanhamento processual.

    Ferramentas instaladas:
    - curl_cffi: TLS/JA3 fingerprint impersonation (bypassa TLS checks)
    - Patchright: Chromium patched sem flags de automacao
    - Playwright: Browser automation com stealth scripts
    - Scrapling: Anti-bot bypass (Cloudflare, etc.)
    - browserforge: Fingerprint generation realista
    - Selenium + undetected-chromedriver: Fallback para sites dificeis
    - Scrapy: Framework de scraping (pipelines)
    - BeautifulSoup + requests: HTTP simples
    - zeep: SOAP/MNI client
    """

    # Tribunais que usam Cloudflare e precisam de browser com wait
    CLOUDFLARE_TRIBUNALS = {"STJ", "STF"}

    # Tribunais que precisam de JavaScript (PJe, CAPTCHA)
    JS_REQUIRED_TRIBUNALS = {"TJRJ", "TJMG", "TJBA", "TJPE", "TJCE", "TJGO", "TJMA"}

    def __init__(self, cert_pfx_path: str = None, cert_password: str = None):
        self.stf = STFRealScraper()
        self.stj = STJRealScraper()
        self.trf2 = TRF2EprocScraper()
        self.trf4 = TRF4EprocScraper()
        self.tjsp = TJSPEsajScraper()
        self.tjrj_pje = TJRJPjeScraper()
        self.tjrj_dcp = TJRJDcpScraper()
        self.tjrj_eproc = TJRJEprocScraper()
        self.mni = MNIDirectScraper(cert_pfx_path, cert_password)
        self.jurisprudencia = JusBrasilJurisprudencia()  # APENAS jurisprudencia
        self._pje_cache: Dict[str, GenericPJeScraper] = {}
        self._curl_cffi = None

    def _get_curl_session(self):
        """Get curl_cffi session with TLS impersonation"""
        if self._curl_cffi is None:
            try:
                from curl_cffi.requests import Session
                import random
                targets = ["chrome131", "chrome130", "chrome124", "chrome120"]
                self._curl_cffi = Session(impersonate=random.choice(targets))
            except ImportError:
                logger.warning("curl_cffi not available, falling back to requests")
        return self._curl_cffi

    def _curl_fetch(self, url: str, method: str = "GET", data: dict = None,
                    timeout: int = 25) -> Optional[requests.Response]:
        """Fetch with curl_cffi TLS impersonation, fall back to requests"""
        session = self._get_curl_session()
        headers = dict(HEADERS)
        headers["Sec-Fetch-Dest"] = "document"
        headers["Sec-Fetch-Mode"] = "navigate"
        headers["Sec-Fetch-Site"] = "none"
        headers["Sec-Fetch-User"] = "?1"
        headers["Upgrade-Insecure-Requests"] = "1"

        try:
            if session:
                if method.upper() == "POST" and data:
                    return session.post(url, data=data, headers=headers,
                                        timeout=timeout, allow_redirects=True, verify=False)
                return session.get(url, headers=headers, timeout=timeout,
                                   allow_redirects=True, verify=False)
        except Exception as e:
            logger.warning(f"curl_cffi failed: {e}")

        # Fallback to requests
        s = requests.Session()
        s.headers.update(HEADERS)
        s.verify = False
        if method.upper() == "POST" and data:
            return s.post(url, data=data, timeout=timeout, allow_redirects=True)
        return s.get(url, timeout=timeout, allow_redirects=True)

    def _try_browser_scraper(self, tribunal: str, numero: str) -> Optional[ScrapingResult]:
        """
        Try Playwright/Patchright browser scraper via sistemas/ modules.
        These have full anti-detection, human emulation, and CAPTCHA handling.
        Returns None if not available or failed.
        """
        try:
            import asyncio

            # Get or create event loop
            try:
                loop = asyncio.get_event_loop()
                if loop.is_closed():
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

            if tribunal == "STJ":
                from sistemas.stj_scraper import get_stj_scraper
                scraper = get_stj_scraper()
                resultado = loop.run_until_complete(scraper.consultar(numero))
                if resultado and resultado.processos:
                    proc = resultado.processos[0]
                    return ScrapingResult(
                        tribunal="STJ", numero=proc.numero,
                        classe=proc.classe, assunto=proc.assunto, relator=proc.relator,
                        partes=[p if isinstance(p, dict) else {"nome": p} for p in proc.partes],
                        movimentacoes=[{"data": m.data, "descricao": m.descricao}
                                       for m in proc.movimentacoes],
                        url=proc.url, fonte="scraping", metodo="patchright_stj",
                    )

            elif tribunal in ("TJSP", "TJSC", "TJMS", "TJCE", "TJAM", "TJBA"):
                from sistemas.esaj_scraper import ESAJ_TRIBUNAIS, criar_esaj_scraper
                key = tribunal
                if key in ESAJ_TRIBUNAIS:
                    t, url, grau = ESAJ_TRIBUNAIS[key]
                    scraper = criar_esaj_scraper(t, url, grau)
                    resultado = loop.run_until_complete(scraper.consultar(numero))
                    if resultado and resultado.processos:
                        proc = resultado.processos[0]
                        return ScrapingResult(
                            tribunal=tribunal, numero=proc.numero,
                            classe=proc.classe, assunto=proc.assunto, relator=proc.relator,
                            partes=[p if isinstance(p, dict) else {"nome": p} for p in proc.partes],
                            movimentacoes=[{"data": m.data, "descricao": m.descricao}
                                           for m in proc.movimentacoes],
                            url=proc.url, fonte="scraping", metodo="patchright_esaj",
                        )

            elif tribunal in ("TRF2", "TRF4", "TJPR", "TJSC", "TJRS"):
                from sistemas.eproc_scraper import EPROC_TRIBUNAIS, get_eproc_scraper
                key = tribunal
                if key in EPROC_TRIBUNAIS:
                    scraper = get_eproc_scraper(key)
                    resultado = loop.run_until_complete(scraper.consultar(numero))
                    if resultado and resultado.processos:
                        proc = resultado.processos[0]
                        return ScrapingResult(
                            tribunal=tribunal, numero=proc.numero,
                            classe=proc.classe, assunto=proc.assunto, relator=proc.relator,
                            url=proc.url, fonte="scraping", metodo="patchright_eproc",
                        )

            else:
                # Generic PJe browser scraper
                url_base = f"https://pje.{tribunal.lower()}.jus.br/pje/ConsultaPublica/listView.seam"
                if tribunal.startswith("TRT"):
                    url_base = f"https://pje.{tribunal.lower()}.jus.br/consultaprocessual/"
                elif tribunal.startswith("TRF"):
                    url_base = f"https://pje1g.{tribunal.lower()}.jus.br/consultapublica/ConsultaPublica/listView.seam"

                from sistemas.pje_scraper import get_pje_scraper
                scraper = get_pje_scraper(tribunal, url_base)
                resultado = asyncio.get_event_loop().run_until_complete(scraper.consultar(numero))
                if resultado and resultado.processos:
                    proc = resultado.processos[0]
                    return ScrapingResult(
                        tribunal=tribunal, numero=proc.numero,
                        classe=proc.classe, assunto=proc.assunto, relator=proc.relator,
                        url=proc.url, fonte="scraping", metodo="patchright_pje",
                    )

        except Exception as e:
            logger.warning(f"Browser scraper failed for {tribunal}: {e}")

        return None

    def consultar(self, tribunal: str, numero: str, tipo: str = "numero") -> ScrapingResult:
        """
        Consulta processo usando fontes DIRETAS dos tribunais.
        Sem JusBrasil para andamentos.

        Cascata de estrategias:
        1. MNI SOAP (mais confiavel, padrao CNJ)
        2. curl_cffi HTTP (TLS impersonation, rapido)
        3. Patchright browser (anti-deteccao completa, para sites com Cloudflare/CAPTCHA)
        """
        tribunal = tribunal.upper().strip()

        # Strategy 1: MNI SOAP (fonte mais confiavel - direta do tribunal)
        if self.mni.tribunal_suporta_mni(tribunal):
            mni_result = self.mni.consultar(tribunal, numero)
            if mni_result.sucesso:
                logger.info(f"MNI sucesso para {tribunal}: {numero}")
                return mni_result
            logger.info(f"MNI falhou para {tribunal}, tentando scraping direto...")

        # Strategy 2: Scraping HTTP/curl_cffi direto no site do tribunal
        result = self._try_direct_scraper(tribunal, numero, tipo)

        # Strategy 3: Se HTTP falhou ou foi bloqueado, tenta browser (Patchright)
        if not result.sucesso or result.metodo == "blocked":
            logger.info(f"HTTP scraping falhou para {tribunal}, tentando browser Patchright...")
            browser_result = self._try_browser_scraper(tribunal, numero)
            if browser_result and browser_result.sucesso:
                return browser_result
            # Se browser tambem falhou, retorna o melhor resultado que temos
            if browser_result:
                logger.info(f"Browser scraper tambem falhou para {tribunal}: {browser_result.erro}")

        # SEM fallback para JusBrasil - retorna resultado direto
        return result

    def _try_direct_scraper(self, tribunal: str, numero: str, tipo: str) -> ScrapingResult:
        """Scraping HTTP direto no site oficial do tribunal usando curl_cffi + requests"""

        if tribunal == "STF":
            match = re.match(r"([A-Z]+)\s+(\d+)", numero)
            if match:
                return self.stf.consultar_por_classe(match.group(1), match.group(2))
            return self.stf.consultar_por_classe("", numero)

        elif tribunal == "STJ":
            return self.stj.consultar(numero)

        elif tribunal == "TRF2":
            return self.trf2.consultar(numero)

        elif tribunal == "TRF4":
            return self.trf4.consultar(numero)

        elif tribunal == "TJSP":
            return self.tjsp.consultar(numero)

        elif tribunal == "TJRJ":
            result = self.tjrj_pje.consultar(numero)
            if result.sucesso:
                return result
            result_eproc = self.tjrj_eproc.consultar(numero)
            if result_eproc.sucesso:
                return result_eproc
            return self.tjrj_dcp.consultar(numero)

        elif tribunal.startswith("TRF"):
            trf_num = tribunal.replace("TRF", "")
            if trf_num == "2":
                return self.trf2.consultar(numero)
            elif trf_num == "4":
                return self.trf4.consultar(numero)
            else:
                url = f"https://pje1g.{tribunal.lower()}.jus.br/consultapublica/"
                return self._get_pje_scraper(tribunal, url).consultar(numero)

        elif tribunal.startswith("TJ"):
            esaj_map = {
                "TJSC": "https://esaj.tjsc.jus.br/cpopg/open.do",
                "TJMS": "https://esaj.tjms.jus.br/cpopg5/open.do",
                "TJCE": "https://esaj.tjce.jus.br/cpopg/open.do",
                "TJAM": "https://consultasaj.tjam.jus.br/cpopg/open.do",
                "TJBA": "https://esaj.tjba.jus.br/cpopg/open.do",
            }
            if tribunal in esaj_map:
                scraper = TJSPEsajScraper()
                result = scraper.consultar(numero)
                result.tribunal = tribunal
                return result
            url = f"https://pje.{tribunal.lower()}.jus.br/consultapublica/"
            return self._get_pje_scraper(tribunal, url).consultar(numero)

        elif tribunal.startswith("TRT"):
            url = f"https://pje.{tribunal.lower()}.jus.br/consultaprocessual/"
            return self._get_pje_scraper(tribunal, url).consultar(numero)

        elif tribunal.startswith("TRE"):
            url = f"https://pje.{tribunal.lower()}.jus.br/consultapublica/"
            return self._get_pje_scraper(tribunal, url).consultar(numero)

        elif tribunal in ("TST", "TSE", "STM"):
            url = f"https://pje.{tribunal.lower()}.jus.br/consultaprocessual/"
            return self._get_pje_scraper(tribunal, url).consultar(numero)

        else:
            return ScrapingResult(
                tribunal=tribunal, numero=numero,
                erro=f"Tribunal {tribunal} nao suportado para scraping direto. "
                     f"Use MNI com certificado digital para acesso completo.",
            )

    def _get_pje_scraper(self, tribunal: str, url: str) -> GenericPJeScraper:
        if tribunal not in self._pje_cache:
            self._pje_cache[tribunal] = GenericPJeScraper(tribunal, url)
        return self._pje_cache[tribunal]


# ==================== SINGLETON ====================

_unified_scraper: Optional[UnifiedRealScraper] = None

def get_unified_scraper(
    cert_pfx_path: str = None,
    cert_password: str = None,
) -> UnifiedRealScraper:
    global _unified_scraper
    if _unified_scraper is None:
        _unified_scraper = UnifiedRealScraper(
            cert_pfx_path=cert_pfx_path or os.environ.get("MNI_CERT_PFX_PATH"),
            cert_password=cert_password or os.environ.get("MNI_CERT_PASSWORD"),
        )
    return _unified_scraper


# ==================== CLI ====================

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print(json.dumps({
            "uso": "python real_scraper.py <tribunal> <numero> [tipo]",
            "nota": "Todos os andamentos sao obtidos DIRETAMENTE dos sites dos tribunais. "
                    "JusBrasil NAO e usado para acompanhamento processual.",
            "estrategia": [
                "1. MNI SOAP com certificado digital (55+ tribunais)",
                "2. Scraping HTTP direto no site do tribunal",
                "3. Scraping browser (Playwright) para sites com JS/CAPTCHA",
            ],
            "exemplos": [
                "python real_scraper.py STF 'ADI 7676'",
                "python real_scraper.py STJ 'REsp 2189763'",
                "python real_scraper.py TRF2 '5001234-56.2024.4.02.5101'",
                "python real_scraper.py TJRJ '0072018-74.2024.8.19.0001'",
                "python real_scraper.py TJSP '1234567-89.2024.8.26.0100'",
            ],
        }, ensure_ascii=False, indent=2))
        sys.exit(1)

    tribunal = sys.argv[1].upper()
    numero = sys.argv[2]
    tipo = sys.argv[3] if len(sys.argv) > 3 else "numero"

    scraper = get_unified_scraper()
    result = scraper.consultar(tribunal, numero, tipo)

    output = {
        "tribunal": result.tribunal,
        "tipo_busca": tipo,
        "termo_busca": numero,
        "processos": [{
            "numero": result.numero,
            "tribunal": result.tribunal,
            "classe": result.classe,
            "assunto": result.assunto,
            "relator": result.relator,
            "orgao_julgador": result.orgao_julgador,
            "data_ajuizamento": result.data_ajuizamento,
            "situacao": result.situacao,
            "partes": result.partes,
            "movimentacoes": result.movimentacoes,
            "documentos": result.documentos,
            "url": result.url,
        }] if result.sucesso else [],
        "total_encontrados": 1 if result.sucesso else 0,
        "fonte": result.fonte,
        "metodo": result.metodo,
        "tempo_ms": result.tempo_ms,
        "erro": result.erro,
    }

    print(json.dumps(output, ensure_ascii=False, indent=2))
