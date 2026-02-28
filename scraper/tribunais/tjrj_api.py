"""
Scraper for TJRJ (Tribunal de Justica do Rio de Janeiro) using ScraperAPI
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


class TJRJScraperAPI(BaseScraper):
    """Scraper for TJRJ using ScraperAPI with Brazilian residential proxies"""

    def __init__(self):
        super().__init__()
        self.tribunal_nome = "Tribunal de Justica do Rio de Janeiro"
        self.tribunal_sigla = "TJRJ"
        self.base_url = "https://www3.tjrj.jus.br"
        self.api_url = "https://www3.tjrj.jus.br/consultaprocessual/api/processos"
        self.client = ScraperAPIClient()

    async def buscar_por_numero(self, numero: str) -> ResultadoBusca:
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="numero",
            termo_busca=numero
        )

        try:
            numero_limpo = re.sub(r'[.\-/]', '', numero.strip())
            numero_digits = re.sub(r'\D', '', numero_limpo)

            api_url = f"{self.api_url}/porNumero/{numero_limpo}"
            html = self.client.fetch_html(api_url, render_js=False, premium=True)

            if not html:
                consulta_url = f"{self.base_url}/consultaprocessual/#/consultapublica?numProcesso={quote(numero_limpo)}"
                html = self.client.fetch_html(consulta_url, render_js=True, premium=True)

            if not html:
                resultado.erro = "ScraperAPI nao retornou conteudo para TJRJ"
                return resultado

            processos = self._extrair_processos(html, numero)
            resultado.processos = processos
            resultado.total_encontrados = len(processos)
            if not processos:
                resultado.erro = f"Processo {numero} nao encontrado no TJRJ via ScraperAPI"

        except Exception as e:
            resultado.erro = f"Erro ao buscar TJRJ via ScraperAPI: {e}"
            print(f"TJRJScraperAPI error: {e}", file=sys.stderr)

        return resultado

    def _extrair_processos(self, html: str, numero_buscado: str) -> List[ProcessoInfo]:
        import json as json_mod
        from bs4 import BeautifulSoup
        processos = []

        try:
            try:
                data = json_mod.loads(html)
                if isinstance(data, dict) and ('processos' in data or 'numero' in data or 'classe' in data):
                    if 'processos' in data:
                        items = data['processos']
                    else:
                        items = [data]

                    for item in items[:5]:
                        processo = ProcessoInfo(
                            numero=item.get('numero', numero_buscado),
                            numero_unico=item.get('numero', numero_buscado),
                            tribunal=self.tribunal_sigla,
                        )
                        processo.classe = item.get('classe', {}).get('nome') if isinstance(item.get('classe'), dict) else item.get('classe')
                        processo.assunto = item.get('assunto', {}).get('nome') if isinstance(item.get('assunto'), dict) else item.get('assunto')
                        processo.relator = item.get('relator') or item.get('juiz')
                        processo.origem = item.get('orgaoJulgador', {}).get('nome') if isinstance(item.get('orgaoJulgador'), dict) else item.get('orgaoJulgador')

                        partes_raw = item.get('partes', [])
                        processo.partes = [f"{p.get('polo', '')}: {p.get('nome', '')}" for p in partes_raw[:5] if p.get('nome')]

                        movs_raw = item.get('movimentos', item.get('andamentos', []))
                        movs = []
                        for m in movs_raw[:30]:
                            data_mov = m.get('dataHora', m.get('data', ''))[:10] if m.get('dataHora', m.get('data', '')) else ''
                            desc = m.get('descricao', m.get('nome', ''))
                            if data_mov and desc:
                                movs.append(Movimentacao(data=data_mov, descricao=desc))
                        processo.movimentacoes = movs
                        processos.append(processo)
                    return processos
            except (json_mod.JSONDecodeError, ValueError):
                pass

            soup = BeautifulSoup(html, 'html.parser')
            page_text = soup.get_text(separator=' ')

            cnj_pattern = r'\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}'
            numeros_cnj = re.findall(cnj_pattern, page_text)

            target_num = numeros_cnj[0] if numeros_cnj else numero_buscado
            target_num_clean = re.sub(r'[.\-]', '', target_num)
            processo = ProcessoInfo(
                numero=target_num,
                numero_unico=target_num,
                tribunal=self.tribunal_sigla,
                url=f"{self.base_url}/consultaprocessual/#/consultapublica?numProcesso={target_num_clean}"
            )

            classe_match = re.search(r'Classe:\s*([^\n\r|]{3,80})', page_text, re.IGNORECASE)
            if classe_match:
                processo.classe = classe_match.group(1).strip()

            assunto_match = re.search(r'Assunto:\s*([^\n\r|]{3,80})', page_text, re.IGNORECASE)
            if assunto_match:
                processo.assunto = assunto_match.group(1).strip()

            partes = []
            for tipo in ['Autor', 'Reu', 'Apelante', 'Apelado', 'Requerente', 'Requerido']:
                m = re.search(rf'{tipo}:\s*([^\n\r|]{{3,80}})', page_text, re.IGNORECASE)
                if m:
                    partes.append(f"{tipo}: {m.group(1).strip()}")
            processo.partes = partes[:5]

            mov_section = re.findall(r'(\d{2}/\d{2}/\d{4})\s+([^\n\r]{10,200})', page_text)
            movimentos = [Movimentacao(data=d, descricao=desc.strip()) for d, desc in mov_section[:20]]
            processo.movimentacoes = movimentos

            processos.append(processo)

        except Exception as e:
            print(f"TJRJScraperAPI extract error: {e}", file=sys.stderr)

        return processos

    async def buscar_por_nome(self, nome: str) -> ResultadoBusca:
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="nome",
            termo_busca=nome
        )
        try:
            url = f"{self.base_url}/consultaprocessual/api/processos/porNome/{quote(nome)}"
            html = self.client.fetch_html(url, render_js=False, premium=True)
            if html:
                processos = self._extrair_processos(html, "")
                resultado.processos = processos
                resultado.total_encontrados = len(processos)
            else:
                resultado.erro = "Nenhum resultado encontrado"
        except Exception as e:
            resultado.erro = f"Erro ao buscar por nome no TJRJ: {e}"
        return resultado


if __name__ == "__main__":
    import asyncio
    if not is_scraper_api_available():
        print("SCRAPER_API_KEY nao configurada")
        sys.exit(1)
    scraper = TJRJScraperAPI()
    r = asyncio.run(scraper.buscar_por_numero("0001234-56.2024.8.19.0001"))
    import json
    print(json.dumps(r.to_dict(), ensure_ascii=False, indent=2))
