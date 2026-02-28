"""
Scraper for TRF2 (Tribunal Regional Federal da 2a Regiao) using ScraperAPI
Covers: RJ e ES - Uses Brazilian residential proxies
"""
import re
import sys
import os
from typing import Optional, List
from urllib.parse import quote, urlencode

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import BaseScraper, ResultadoBusca, ProcessoInfo, Movimentacao
from scraper_api import ScraperAPIClient, is_scraper_api_available


class TRF2ScraperAPI(BaseScraper):
    """Scraper for TRF2 using ScraperAPI with Brazilian residential proxies"""

    def __init__(self):
        super().__init__()
        self.tribunal_nome = "Tribunal Regional Federal da 2a Regiao"
        self.tribunal_sigla = "TRF2"
        self.base_url = "https://eproc.jfrj.jus.br"
        self.consulta_url = "https://eproc.jfrj.jus.br/eproc2trf2/externo_controlador.php"
        self.client = ScraperAPIClient()

    def _build_search_url(self, numero: str) -> str:
        numero_clean = re.sub(r'[.\-]', '', numero.strip())
        params = urlencode({
            'acao': 'processo_selecionar',
            'num_processo': numero_clean,
            'Envia': 'Localizar',
            'tipo_numprocesso': 'UNIFICADO',
        })
        return f"{self.consulta_url}?{params}"

    async def buscar_por_numero(self, numero: str) -> ResultadoBusca:
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="numero",
            termo_busca=numero
        )

        try:
            url = self._build_search_url(numero)
            html = self.client.fetch_html(url, render_js=True, premium=True)

            if not html:
                resultado.erro = "ScraperAPI nao retornou conteudo para TRF2"
                return resultado

            processos = self._extrair_processos(html, numero)
            resultado.processos = processos
            resultado.total_encontrados = len(processos)
            if not processos:
                resultado.erro = f"Processo {numero} nao encontrado no TRF2"

        except Exception as e:
            resultado.erro = f"Erro ao buscar TRF2 via ScraperAPI: {e}"
            print(f"TRF2ScraperAPI error: {e}", file=sys.stderr)

        return resultado

    def _extrair_processos(self, html: str, numero_buscado: str) -> List[ProcessoInfo]:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, 'html.parser')
        processos = []

        try:
            page_text = soup.get_text(separator=' ')

            cnj_pattern = r'\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}'
            numeros_cnj = re.findall(cnj_pattern, page_text)

            if numeros_cnj:
                num = numeros_cnj[0]
                processo = ProcessoInfo(
                    numero=num,
                    numero_unico=num,
                    tribunal=self.tribunal_sigla,
                )

                classe_match = re.search(r'Classe:\s*([^\n\r]+)', page_text, re.IGNORECASE)
                if classe_match:
                    processo.classe = classe_match.group(1).strip()

                assunto_match = re.search(r'Assunto:\s*([^\n\r]+)', page_text, re.IGNORECASE)
                if assunto_match:
                    processo.assunto = assunto_match.group(1).strip()

                relator_match = re.search(r'(?:Relator|Juiz):\s*([^\n\r]+)', page_text, re.IGNORECASE)
                if relator_match:
                    processo.relator = relator_match.group(1).strip()

                partes = []
                for tipo in ['Autor', 'Reu', 'Apelante', 'Apelado', 'Recorrente', 'Recorrido']:
                    m = re.search(rf'{tipo}:\s*([^\n\r]+)', page_text, re.IGNORECASE)
                    if m:
                        partes.append(f"{tipo}: {m.group(1).strip()}")
                processo.partes = partes[:5]

                movimentos = []
                mov_section = re.findall(r'(\d{2}/\d{2}/\d{4})\s+([^\n\r]{10,200})', page_text)
                for data, desc in mov_section[:20]:
                    movimentos.append(Movimentacao(data=data, descricao=desc.strip()))
                processo.movimentacoes = movimentos

                processos.append(processo)
            else:
                if numero_buscado:
                    processo = ProcessoInfo(
                        numero=numero_buscado,
                        tribunal=self.tribunal_sigla,
                        url=self._build_search_url(numero_buscado)
                    )
                    processos.append(processo)

        except Exception as e:
            print(f"TRF2ScraperAPI extract error: {e}", file=sys.stderr)

        return processos

    async def buscar_por_nome(self, nome: str) -> ResultadoBusca:
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="nome",
            termo_busca=nome
        )
        resultado.erro = "Busca por nome nao suportada via ScraperAPI para TRF2"
        return resultado


if __name__ == "__main__":
    import asyncio
    if not is_scraper_api_available():
        print("SCRAPER_API_KEY nao configurada")
        sys.exit(1)
    scraper = TRF2ScraperAPI()
    r = asyncio.run(scraper.buscar_por_numero("0000001-23.2024.4.02.5101"))
    import json
    print(json.dumps(r.to_dict(), ensure_ascii=False, indent=2))
