"""
Scraper for STJ (Superior Tribunal de Justica) using ScraperAPI
Uses Brazilian residential proxies for reliable access
"""
import re
import sys
import os
from typing import Optional, List
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import BaseScraper, ResultadoBusca, ProcessoInfo, Movimentacao
from scraper_api import ScraperAPIClient, is_scraper_api_available

CLASSES_STJ = [
    "AREsp", "REsp", "AgInt", "AgRg", "EAREsp", "EREsp", "EDcl", "EDv", "EAg",
    "HC", "RHC", "MS", "RMS", "CC", "IF", "MI", "MC", "PC", "Pet",
    "Rcl", "RO", "RPV", "SE", "SEC", "SL", "SS", "STA", "STP",
    "PSR", "HDE", "HD", "ExSusp"
]


class STJScraperAPI(BaseScraper):
    """Scraper for STJ using ScraperAPI with Brazilian residential proxies"""

    def __init__(self):
        super().__init__()
        self.tribunal_nome = "Superior Tribunal de Justica"
        self.tribunal_sigla = "STJ"
        self.base_url = "https://processo.stj.jus.br"
        self.client = ScraperAPIClient()

    def _parse_stj_number(self, numero: str) -> tuple:
        numero_str = numero.strip().upper()
        for classe in sorted(CLASSES_STJ, key=len, reverse=True):
            pattern = rf'^({re.escape(classe.upper())})\s*(\d+)$'
            match = re.match(pattern, numero_str, re.IGNORECASE)
            if match:
                return classe, match.group(2)
        if re.match(r'^\d{7}-\d{2}\.\d{4}\.3\.\d{2}\.\d{4}$', numero_str):
            return "CNJ", numero_str
        return None, None

    async def buscar_por_numero(self, numero: str) -> ResultadoBusca:
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="numero",
            termo_busca=numero
        )

        try:
            classe, num = self._parse_stj_number(numero)

            if classe == "CNJ":
                url = f"{self.base_url}/processo/pesquisa/?tipoPesquisa=tipoPesquisaNumeroUnico&termo={quote(numero)}&totalRegistrosPorPagina=5"
            elif classe and num:
                url = f"{self.base_url}/processo/pesquisa/?tipoPesquisa=tipoPesquisaNumeroRegistro&termo={quote(numero)}&totalRegistrosPorPagina=5"
            else:
                url = f"{self.base_url}/processo/pesquisa/?tipoPesquisa=tipoPesquisaNumeroRegistro&termo={quote(numero)}&totalRegistrosPorPagina=5"

            html = self.client.fetch_html(url, render_js=True, premium=True)
            if not html:
                resultado.erro = "ScraperAPI nao retornou conteudo para STJ"
                return resultado

            processos = self._extrair_processos(html, numero)
            resultado.processos = processos
            resultado.total_encontrados = len(processos)
            if not processos:
                resultado.erro = f"Processo {numero} nao encontrado no STJ via ScraperAPI"

        except Exception as e:
            resultado.erro = f"Erro ao buscar STJ via ScraperAPI: {e}"
            print(f"STJScraperAPI error: {e}", file=sys.stderr)

        return resultado

    def _extrair_processos(self, html: str, numero_buscado: str) -> List[ProcessoInfo]:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, 'html.parser')
        processos = []

        try:
            rows = soup.select('table tr, .processo-item, [class*="processo"]')

            page_text = soup.get_text()

            for classe in CLASSES_STJ:
                pattern = rf'\b({re.escape(classe)})\s*(\d{{1,7}})\b'
                matches = re.findall(pattern, page_text, re.IGNORECASE)
                for classe_match, num in matches[:3]:
                    processo_num = f"{classe_match.upper()} {num}"
                    if not any(p.numero == processo_num for p in processos):
                        processo = ProcessoInfo(
                            numero=processo_num,
                            tribunal=self.tribunal_sigla,
                            classe=classe_match.upper(),
                            url=f"{self.base_url}/processo/pesquisa/?tipoPesquisa=tipoPesquisaNumeroRegistro&termo={quote(processo_num)}"
                        )
                        partes_match = re.search(r'(?:Recorrente|Autor|Requerente|Impetrante)[:\s]+([^\n\r]+)', page_text, re.IGNORECASE)
                        if partes_match:
                            processo.partes = [partes_match.group(1).strip()]
                        processos.append(processo)

        except Exception as e:
            print(f"STJScraperAPI extract error: {e}", file=sys.stderr)

        return processos

    async def buscar_por_nome(self, nome: str) -> ResultadoBusca:
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="nome",
            termo_busca=nome
        )
        resultado.erro = "Busca por nome nao suportada via ScraperAPI para STJ"
        return resultado


if __name__ == "__main__":
    import asyncio
    if not is_scraper_api_available():
        print("SCRAPER_API_KEY nao configurada")
        sys.exit(1)
    scraper = STJScraperAPI()
    r = asyncio.run(scraper.buscar_por_numero("REsp 1234567"))
    import json
    print(json.dumps(r.to_dict(), ensure_ascii=False, indent=2))
