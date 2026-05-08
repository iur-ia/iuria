"""
Scraper for TJRJ (Tribunal de Justica do Rio de Janeiro) using Scrapling
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


class TJRJScrapling(BaseScraper):
    """Scraper for TJRJ using Scrapling with stealth Playwright"""

    def __init__(self):
        super().__init__()
        self.tribunal_nome = "Tribunal de Justica do Rio de Janeiro"
        self.tribunal_sigla = "TJRJ"
        self.base_url = "https://www3.tjrj.jus.br"
        self.api_url = "https://www3.tjrj.jus.br/consultaprocessual/api/processos"

    def _fetch_with_scrapling(self, url: str):
        """Fetch using Scrapling DynamicFetcher with anti-detection"""
        from scrapling import Fetcher
        fetcher = Fetcher(verify=False)

        ua = random.choice(USER_AGENTS)
        wait = random.uniform(2.0, 4.0)


        page = fetcher.get(url)
        return page

    def _fetch_api(self, url: str):
        """Fetch TJRJ JSON API directly"""
        import requests
        headers = {
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "pt-BR,pt;q=0.9",
            "Referer": "https://www3.tjrj.jus.br/consultaprocessual/",
            "User-Agent": random.choice(USER_AGENTS),
        }
        resp = requests.get(url, headers=headers, timeout=20)
        if resp.status_code == 200:
            return resp.json()
        return None

    def _extrair_processo(self, page, numero: str, url: str) -> Optional[ProcessoInfo]:
        """Extract process from TJRJ Angular SPA page"""
        try:
            page_text = page.get_all_text(ignore_tags=("script", "style"))

            if '403' in page_text[:200] or 'Forbidden' in page_text[:200]:
                return ProcessoInfo(
                    numero=numero, tribunal=self.tribunal_sigla, url=url,
                    assunto="Acesso bloqueado - acesse diretamente o portal do TJRJ"
                )

            if 'processo não encontrado' in page_text.lower():
                return None

            if len(page_text.strip()) < 100:
                return None

            processo = ProcessoInfo(
                numero=numero,
                numero_unico=numero,
                tribunal=self.tribunal_sigla,
                url=url
            )

            cnj_match = re.search(r'(\d{7}-\d{2}\.\d{4}\.8\.19\.\d{4})', page_text)
            if cnj_match:
                processo.numero_unico = cnj_match.group(1)

            for selector in ['app-processo-classe', '.processo-classe', '.classe-processual']:
                el = page.css(selector).first
                if el:
                    processo.classe = el.text.strip()[:100]
                    break

            for selector in ['app-processo-assunto', '.processo-assunto', '.assunto']:
                el = page.css(selector).first
                if el:
                    processo.assunto = el.text.strip()[:300]
                    break

            if not processo.assunto:
                m = re.search(r'(?:Assunto|Classe)[:\s]+(.+?)(?:\n|$)', page_text)
                if m:
                    processo.assunto = m.group(1).strip()[:300]

            for pat in [r'(?:Magistrad|Juiz|Juíza)[^\n]*:[^\n]*\n?\s*([A-Z][^\n]+?)(?:\n|$)']:
                m = re.search(pat, page_text)
                if m:
                    processo.relator = m.group(1).strip()[:100]
                    break

            partes = []
            for el in page.css('.parte-nome, app-parte .nome, .nome-parte'):
                t = el.text.strip()
                if t and len(t) > 2 and t not in partes:
                    partes.append(t)
                if len(partes) >= 10:
                    break
            processo.partes = partes

            movimentacoes = []
            for el in page.css('app-andamento, .andamento-item, .movimento-item'):
                try:
                    data_el = el.css('.data, .andamento-data').first
                    desc_el = el.css('.descricao, .andamento-descricao, .nome').first
                    data = data_el.text.strip() if data_el else ""
                    desc = desc_el.text.strip() if desc_el else ""
                    if data or desc:
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
                        if desc and len(desc) > 3:
                            movimentacoes.append(Movimentacao(data=dm.group(1), descricao=desc))
                        i += 2
                    else:
                        i += 1

            processo.movimentacoes = movimentacoes
            return processo

        except Exception as e:
            print(f"Erro ao extrair TJRJ: {e}", file=sys.stderr)
            return None

    async def buscar_por_numero(self, numero: str) -> ResultadoBusca:
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="numero",
            termo_busca=numero
        )

        try:
            numero_limpo = numero.strip()
            cnj_match = re.match(r'^(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})$', numero_limpo)

            if cnj_match:
                url = f"{self.base_url}/consultaprocessual/#/consultapublica?numProcesso={quote(numero_limpo)}"
            else:
                numero_digits = re.sub(r'[^\d]', '', numero_limpo)
                url = f"{self.base_url}/consultaprocessual/#/consultapublica?numProcesso={numero_digits}"

            loop = asyncio.get_event_loop()
            page = self._fetch_with_scrapling(url)

            if page:
                processo = self._extrair_processo(page, numero, page.url or url)
                if processo:
                    resultado.processos = [processo]
                else:
                    resultado.processos = [ProcessoInfo(
                        numero=numero, tribunal=self.tribunal_sigla,
                        url=f"{self.base_url}/consultaprocessual/#/consultapublica",
                        assunto="Acesse o portal do TJRJ para ver os detalhes completos"
                    )]
            else:
                resultado.erro = "Nao foi possivel acessar o portal do TJRJ"

        except Exception as e:
            resultado.erro = f"Erro ao consultar TJRJ: {str(e)}"

        return resultado

    async def buscar_por_nome(self, nome: str) -> ResultadoBusca:
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="nome",
            termo_busca=nome
        )

        try:
            url = f"{self.base_url}/consultaprocessual/#/consultapublica?nomeParte={quote(nome)}"

            loop = asyncio.get_event_loop()
            page = self._fetch_with_scrapling(url)

            if page:
                processos = self._extrair_lista_resultados(page)
                resultado.processos = processos
                if not processos:
                    resultado.erro = f"Nenhum processo encontrado para '{nome}' no TJRJ"
            else:
                resultado.erro = "Nao foi possivel acessar o portal do TJRJ"

        except Exception as e:
            resultado.erro = f"Erro ao buscar por nome no TJRJ: {str(e)}"

        return resultado

    def _extrair_lista_resultados(self, page) -> List[ProcessoInfo]:
        processos = []
        try:
            page_text = page.get_all_text(ignore_tags=("script", "style"))
            for match in re.finditer(r'(\d{7}-\d{2}\.\d{4}\.8\.19\.\d{4})', page_text):
                numero = match.group(1)
                url = f"{self.base_url}/consultaprocessual/#/consultapublica?numProcesso={numero}"
                p = ProcessoInfo(numero=numero, tribunal=self.tribunal_sigla, url=url)
                if not any(x.numero == p.numero for x in processos):
                    processos.append(p)
                if len(processos) >= 10:
                    break
        except Exception as e:
            print(f"Erro ao extrair lista TJRJ: {e}", file=sys.stderr)
        return processos
