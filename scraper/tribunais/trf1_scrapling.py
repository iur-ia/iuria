"""
Scraper for TRF1 (Tribunal Regional Federal da 1a Regiao) using Scrapling
Covers: AM, BA, CE, DF, GO, MA, MG, MT, PA, PI, RO, RR, TO, AC, AP
Anti-detection: stealth Playwright, pt-BR locale, google referer, user-agent rotation
"""
import re
import sys
import os
import asyncio
import random
from typing import Optional, List
from urllib.parse import quote, urlencode

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import BaseScraper, ResultadoBusca, ProcessoInfo, Movimentacao

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]


class TRF1Scrapling(BaseScraper):
    """Scraper for TRF1 using Scrapling with stealth Playwright"""

    def __init__(self):
        super().__init__()
        self.tribunal_nome = "Tribunal Regional Federal da 1a Regiao"
        self.tribunal_sigla = "TRF1"
        self.base_url = "https://processual.trf1.jus.br"
        self.consulta_url = "https://processual.trf1.jus.br/consultaProcessual/processo.php"

    def _fetch_with_scrapling(self, url: str):
        """Fetch using Scrapling DynamicFetcher with anti-detection"""
        from scrapling import DynamicFetcher

        ua = random.choice(USER_AGENTS)
        wait = random.uniform(1.5, 3.5)

        fetcher = DynamicFetcher()
        page = fetcher.fetch(
            url,
            headless=True,
            network_idle=True,
            timeout=35000,
            disable_resources=True,
            google_search=True,
            useragent=ua,
            locale="pt-BR",
            extra_headers={
                "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Referer": "https://www.google.com.br/",
            },
            wait=wait,
        )
        return page

    def _extrair_processo(self, page, numero: str, url: str) -> Optional[ProcessoInfo]:
        """Extract process from TRF1 page"""
        try:
            page_text = page.get_all_text(ignore_tags=("script", "style"))

            if 'processo não encontrado' in page_text.lower() or 'nenhum' in page_text.lower()[:500]:
                return None
            if '403' in page_text[:200] or 'Forbidden' in page_text[:200]:
                return ProcessoInfo(
                    numero=numero, tribunal=self.tribunal_sigla, url=url,
                    assunto="Acesso bloqueado - acesse diretamente o portal do TRF1"
                )
            if len(page_text.strip()) < 100:
                return None

            processo = ProcessoInfo(
                numero=numero, numero_unico=numero,
                tribunal=self.tribunal_sigla, url=url
            )

            cnj_match = re.search(r'(\d{7}-\d{2}\.\d{4}\.4\.01\.\d{4})', page_text)
            if cnj_match:
                processo.numero_unico = cnj_match.group(1)

            for selector in ['.tipo-acao', '.classe', '#classeProcesso']:
                el = page.css(selector).first
                if el:
                    processo.classe = el.text.strip()[:100]
                    break

            for selector in ['.assunto', '#assuntoProcesso']:
                el = page.css(selector).first
                if el:
                    processo.assunto = el.text.strip()[:300]
                    break
            if not processo.assunto:
                m = re.search(r'(?:Assunto|Materia)[:\s]+(.+?)(?:\n|$)', page_text)
                if m:
                    processo.assunto = m.group(1).strip()[:300]

            for pat in [r'(?:Juiz|Magistrad|Desembargador)[^\n]*:[^\n]*\n?\s*([A-Z][^\n]+?)(?:\n|$)']:
                m = re.search(pat, page_text)
                if m:
                    processo.relator = m.group(1).strip()[:100]
                    break

            partes = []
            for el in page.css('.parte, .nome-parte, td.parte'):
                t = el.text.strip()
                if t and len(t) > 2 and t not in partes:
                    partes.append(t)
                if len(partes) >= 10:
                    break
            processo.partes = partes

            movimentacoes = []
            for row in page.css('tr.andamento, tr.movimento, .evento'):
                try:
                    data_el = row.css('td:first-child, .data').first
                    desc_el = row.css('td:nth-child(2), .descricao').first
                    data = data_el.text.strip() if data_el else ""
                    desc = desc_el.text.strip() if desc_el else ""
                    if re.match(r'\d{2}/\d{2}/\d{4}', data) and desc:
                        movimentacoes.append(Movimentacao(data=data, descricao=desc))
                    if len(movimentacoes) >= 25:
                        break
                except:
                    continue

            if not movimentacoes:
                data_re = re.compile(r'\b(\d{2}/\d{2}/\d{4})\b')
                lines = page_text.split('\n')
                i = 0
                while i < len(lines) and len(movimentacoes) < 20:
                    line = lines[i].strip()
                    dm = data_re.search(line)
                    if dm and i + 1 < len(lines):
                        desc = lines[i + 1].strip()
                        if desc and len(desc) > 5:
                            movimentacoes.append(Movimentacao(data=dm.group(1), descricao=desc))
                        i += 2
                    else:
                        i += 1

            processo.movimentacoes = movimentacoes
            return processo

        except Exception as e:
            print(f"Erro ao extrair TRF1: {e}", file=sys.stderr)
            return None

    async def buscar_por_numero(self, numero: str) -> ResultadoBusca:
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla, tipo_busca="numero", termo_busca=numero
        )

        try:
            numero_limpo = re.sub(r'[^\d.-]', '', numero)
            url = f"{self.consulta_url}?proc={quote(numero_limpo)}"

            loop = asyncio.get_event_loop()
            page = await loop.run_in_executor(None, self._fetch_with_scrapling, url)

            if page:
                processo = self._extrair_processo(page, numero, page.url or url)
                if processo:
                    resultado.processos = [processo]
                else:
                    resultado.processos = [ProcessoInfo(
                        numero=numero, tribunal=self.tribunal_sigla, url=self.consulta_url,
                        assunto="Acesse o portal do TRF1 para ver os detalhes completos"
                    )]
            else:
                resultado.erro = "Nao foi possivel acessar o portal do TRF1"

        except Exception as e:
            resultado.erro = f"Erro ao consultar TRF1: {str(e)}"

        return resultado

    async def buscar_por_nome(self, nome: str) -> ResultadoBusca:
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla, tipo_busca="nome", termo_busca=nome
        )
        resultado.processos = [ProcessoInfo(
            numero="N/A", tribunal=self.tribunal_sigla, url=self.consulta_url,
            assunto=f"Busca por nome no TRF1: acesse o portal para pesquisar por '{nome}'"
        )]
        return resultado
