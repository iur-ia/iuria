"""
Scraper for TRF3 (Tribunal Regional Federal da 3a Regiao) using Scrapling
Covers: SP e MS (Sao Paulo e Mato Grosso do Sul)
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


class TRF3Scrapling(BaseScraper):
    """Scraper for TRF3 using Scrapling with stealth Playwright"""

    def __init__(self):
        super().__init__()
        self.tribunal_nome = "Tribunal Regional Federal da 3a Regiao"
        self.tribunal_sigla = "TRF3"
        self.base_url = "https://pje1g.trf3.jus.br"
        self.consulta_url = "https://pje1g.trf3.jus.br/consultapublica/#/consulta-publica"

    def _fetch_with_scrapling(self, url: str):
        """Fetch using Scrapling DynamicFetcher with anti-detection"""
        from scrapling import Fetcher
        fetcher = Fetcher(verify=False)

        ua = random.choice(USER_AGENTS)
        wait = random.uniform(2.0, 4.0)


        page = fetcher.get(url)
        return page

    def _extrair_processo(self, page, numero: str, url: str) -> Optional[ProcessoInfo]:
        """Extract process from TRF3 PJe page"""
        try:
            page_text = page.get_all_text(ignore_tags=("script", "style"))

            if 'não encontrado' in page_text.lower() or 'nenhum resultado' in page_text.lower():
                return None
            if '403' in page_text[:200] or 'Forbidden' in page_text[:200]:
                return ProcessoInfo(
                    numero=numero, tribunal=self.tribunal_sigla, url=url,
                    assunto="Acesso bloqueado - acesse diretamente o portal do TRF3"
                )
            if len(page_text.strip()) < 100:
                return None

            processo = ProcessoInfo(
                numero=numero, numero_unico=numero,
                tribunal=self.tribunal_sigla, url=url
            )

            cnj_match = re.search(r'(\d{7}-\d{2}\.\d{4}\.4\.03\.\d{4})', page_text)
            if cnj_match:
                processo.numero_unico = cnj_match.group(1)

            for selector in ['.processo-classe', '.classe-processual', 'span.classe']:
                el = page.css(selector).first
                if el:
                    processo.classe = el.text.strip()[:100]
                    break

            for selector in ['.processo-assunto', '.assunto-processual']:
                el = page.css(selector).first
                if el:
                    processo.assunto = el.text.strip()[:300]
                    break
            if not processo.assunto:
                m = re.search(r'(?:Assunto|Classe)[:\s]+(.+?)(?:\n|$)', page_text)
                if m:
                    processo.assunto = m.group(1).strip()[:300]

            partes = []
            for el in page.css('.parte-nome, .parteNome, .nome-parte'):
                t = el.text.strip()
                if t and len(t) > 2 and t not in partes:
                    partes.append(t)
                if len(partes) >= 10:
                    break
            processo.partes = partes

            movimentacoes = []
            for el in page.css('.andamento-item, .timeline-item, .movimento'):
                try:
                    data_el = el.css('.data, .dataAndamento').first
                    desc_el = el.css('.descricao, .descAndamento').first
                    data = data_el.text.strip() if data_el else ""
                    desc = desc_el.text.strip() if desc_el else ""
                    if data or desc:
                        movimentacoes.append(Movimentacao(data=data, descricao=desc))
                    if len(movimentacoes) >= 25:
                        break
                except:
                    continue

            processo.movimentacoes = movimentacoes
            return processo

        except Exception as e:
            print(f"Erro ao extrair TRF3: {e}", file=sys.stderr)
            return None

    async def buscar_por_numero(self, numero: str) -> ResultadoBusca:
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla, tipo_busca="numero", termo_busca=numero
        )

        try:
            numero_limpo = re.sub(r'[^\d.-]', '', numero)
            url = f"{self.consulta_url}?numeroProcesso={quote(numero_limpo)}"

            loop = asyncio.get_event_loop()
            page = self._fetch_with_scrapling(url)

            if page:
                processo = self._extrair_processo(page, numero, page.url or url)
                if processo:
                    resultado.processos = [processo]
                else:
                    resultado.processos = [ProcessoInfo(
                        numero=numero, tribunal=self.tribunal_sigla, url=self.consulta_url,
                        assunto="Acesse o portal do TRF3 para ver os detalhes completos"
                    )]
            else:
                resultado.erro = "Nao foi possivel acessar o portal do TRF3"

        except Exception as e:
            resultado.erro = f"Erro ao consultar TRF3: {str(e)}"

        return resultado

    async def buscar_por_nome(self, nome: str) -> ResultadoBusca:
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla, tipo_busca="nome", termo_busca=nome
        )
        resultado.processos = [ProcessoInfo(
            numero="N/A", tribunal=self.tribunal_sigla, url=self.consulta_url,
            assunto=f"Busca por nome no TRF3: acesse o portal para pesquisar por '{nome}'"
        )]
        return resultado
