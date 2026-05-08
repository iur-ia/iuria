"""
Scraper for STJ (Superior Tribunal de Justica) using Scrapling
Anti-detection: stealth Playwright, pt-BR locale, google referer, user-agent rotation
"""
import re
import sys
import os
import asyncio
import random
from typing import Optional, List
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import BaseScraper, ResultadoBusca, ProcessoInfo, Movimentacao

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]

CLASSES_STJ = [
    "AREsp", "REsp", "AgInt", "AgRg", "EAREsp", "EREsp", "EDecl", "EDv", "EAg",
    "HC", "RHC", "MS", "RMS", "CC", "IF", "MI", "MC", "PC", "Pet",
    "Rcl", "RO", "RPV", "SE", "SEC", "SL", "SS", "STA", "STP", "Ctr",
    "PSR", "HDE", "HD", "ExSusp"
]


class STJScrapling(BaseScraper):
    """Scraper for STJ using Scrapling with stealth Playwright"""

    def __init__(self):
        super().__init__()
        self.tribunal_nome = "Superior Tribunal de Justica"
        self.tribunal_sigla = "STJ"
        self.base_url = "https://processo.stj.jus.br"

    def _parse_stj_number(self, numero: str) -> tuple:
        """Parse STJ number: CLASSE NUMERO or CNJ"""
        numero_str = numero.strip().upper()

        for classe in sorted(CLASSES_STJ, key=len, reverse=True):
            pattern = rf'^({re.escape(classe.upper())})\s*(\d+)$'
            match = re.match(pattern, numero_str, re.IGNORECASE)
            if match:
                return classe, match.group(2)

        if re.match(r'^\d{7}-\d{2}\.\d{4}\.3\.\d{2}\.\d{4}$', numero_str.lower()):
            return "CNJ", numero_str.lower()

        return None, None

    def _fetch_with_scrapling(self, url: str):
        """Fetch using Scrapling DynamicFetcher with anti-detection"""
        from scrapling import Fetcher
        fetcher = Fetcher(verify=False)

        ua = random.choice(USER_AGENTS)
        wait = random.uniform(1.5, 3.0)


        page = fetcher.get(url)
        return page

    def _extrair_processo(self, page, numero: str, url: str) -> Optional[ProcessoInfo]:
        """Extract process from STJ page"""
        try:
            page_text = page.get_all_text(ignore_tags=("script", "style"))

            if 'não encontrado' in page_text.lower() or 'nenhum resultado' in page_text.lower():
                return None
            if '403' in page_text[:200] or 'Forbidden' in page_text[:200]:
                return ProcessoInfo(
                    numero=numero, tribunal=self.tribunal_sigla, url=url,
                    assunto="Acesso bloqueado - use o link para acessar diretamente o portal do STJ"
                )
            if len(page_text.strip()) < 100:
                return None

            processo = ProcessoInfo(
                numero=numero,
                numero_unico=numero,
                tribunal=self.tribunal_sigla,
                url=url
            )

            cnj_match = re.search(r'(\d{7}-\d{2}\.\d{4}\.3\.\d{2}\.\d{4})', page_text)
            if cnj_match:
                processo.numero_unico = cnj_match.group(1)

            for pat in [
                r'Relator(?:\(a\))?[:\s]+([A-Z][^\n,]+?)(?:\n|,|$)',
                r'Ministro(?:\(a\))?[:\s]+([A-Z][^\n,]+?)(?:\n|,|$)',
            ]:
                m = re.search(pat, page_text)
                if m:
                    processo.relator = m.group(1).strip()[:100]
                    break

            classe_el = page.css('.classe-processual, .identificacao-classe, h1').first
            if classe_el:
                processo.classe = classe_el.text.strip()[:100]

            assunto_el = page.css('.assunto-processual, .campo-assunto').first
            if assunto_el:
                processo.assunto = assunto_el.text.strip()[:300]
            if not processo.assunto:
                m = re.search(r'(?:Assunto|Matéria)[:\s]+(.+?)(?:\n|$)', page_text)
                if m:
                    processo.assunto = m.group(1).strip()[:300]

            partes = []
            for el in page.css('.parte-nome, .nome-parte, .parteProcessual'):
                t = el.text.strip()
                if t and len(t) > 2 and t not in partes:
                    partes.append(t)
                if len(partes) >= 10:
                    break
            processo.partes = partes

            movimentacoes = []
            for row in page.css('.andamento-item, tr.evento, .evento-processual'):
                try:
                    data_el = row.css('.data, .dataAndamento, td:first-child').first
                    desc_el = row.css('.descricao, .tituloAndamento, td:nth-child(2)').first
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
                    dm = data_re.match(line)
                    if dm and i + 1 < len(lines):
                        desc = lines[i + 1].strip()
                        if desc and len(desc) > 3:
                            movimentacoes.append(Movimentacao(data=line, descricao=desc))
                        i += 2
                    else:
                        i += 1

            processo.movimentacoes = movimentacoes
            return processo

        except Exception as e:
            print(f"Erro ao extrair STJ: {e}", file=sys.stderr)
            return None

    async def buscar_por_numero(self, numero: str) -> ResultadoBusca:
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="numero",
            termo_busca=numero
        )

        try:
            classe, num = self._parse_stj_number(numero)

            if classe == "CNJ":
                url = f"{self.base_url}/processo/pesquisa/?tipoPesquisa=tipoPesquisaNumeroRegistroEletronico&termo={quote(num)}"
            elif classe and num:
                url = f"{self.base_url}/processo/pesquisa/?tipoPesquisa=tipoPesquisaNumeroRegistro&termo={quote(num)}&classe={quote(classe)}"
            else:
                url = f"{self.base_url}/processo/pesquisa/?tipoPesquisa=tipoPesquisaNumeroRegistro&termo={quote(numero)}"

            loop = asyncio.get_event_loop()
            page = self._fetch_with_scrapling(url)

            if page:
                processo = self._extrair_processo(page, numero, page.url or url)
                if processo:
                    resultado.processos = [processo]
                else:
                    resultado.processos = [ProcessoInfo(
                        numero=numero, tribunal=self.tribunal_sigla, url=url,
                        assunto="Acesse o portal do STJ para ver os detalhes completos"
                    )]
            else:
                resultado.erro = "Nao foi possivel acessar o portal do STJ"

        except Exception as e:
            resultado.erro = f"Erro ao consultar STJ: {str(e)}"

        return resultado

    async def buscar_por_nome(self, nome: str) -> ResultadoBusca:
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="nome",
            termo_busca=nome
        )

        try:
            url = f"{self.base_url}/processo/pesquisa/?tipoPesquisa=tipoPesquisaNomeParteAdvo&termo={quote(nome)}"

            loop = asyncio.get_event_loop()
            page = self._fetch_with_scrapling(url)

            if page:
                processos = self._extrair_lista_resultados(page)
                resultado.processos = processos
                if not processos:
                    resultado.erro = f"Nenhum processo encontrado para '{nome}' no STJ"
            else:
                resultado.erro = "Nao foi possivel acessar o portal do STJ"

        except Exception as e:
            resultado.erro = f"Erro ao buscar por nome no STJ: {str(e)}"

        return resultado

    def _extrair_lista_resultados(self, page) -> List[ProcessoInfo]:
        processos = []
        try:
            for link in page.css('a[href*="processo/deta"], a[href*="processo/pesquisa"]'):
                href = link.attrib.get('href', '')
                text = link.text.strip()
                for classe in CLASSES_STJ:
                    m = re.match(rf'^{re.escape(classe)}\s*(\d+)$', text, re.IGNORECASE)
                    if m:
                        url = href if href.startswith('http') else f"{self.base_url}{href}"
                        p = ProcessoInfo(numero=text, tribunal=self.tribunal_sigla, url=url, classe=classe)
                        if not any(x.numero == p.numero for x in processos):
                            processos.append(p)
                        break
                if len(processos) >= 10:
                    break
        except Exception as e:
            print(f"Erro ao extrair lista STJ: {e}", file=sys.stderr)
        return processos
