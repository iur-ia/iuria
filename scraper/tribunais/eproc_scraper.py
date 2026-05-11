import requests
import os
import re
import urllib3
import sys
from typing import Optional
from bs4 import BeautifulSoup
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import BaseScraper, ResultadoBusca, ProcessoInfo, Movimentacao

urllib3.disable_warnings()

class EProcScraper(BaseScraper):
    def __init__(self, tribunal_sigla: str):
        super().__init__()
        self.tribunal_sigla = tribunal_sigla.upper()
        # Mapear URLs base do eProc por tribunal
        self.urls = {
            "TRF2": "https://eproc.trf2.jus.br/eproc",
            "TRF4": "https://eproc.trf4.jus.br/eproc2trf4",
            "TJRJ": "https://eproc.tjrj.jus.br/eproc",
            "TJTO": "https://eproc1.tjto.jus.br/eprocV2_prod_1grau"
        }
        self.base_url = self.urls.get(self.tribunal_sigla, f"https://eproc.{self.tribunal_sigla.lower()}.jus.br/eproc")

    async def buscar_por_numero(self, numero: str) -> ResultadoBusca:
        resultado = ResultadoBusca(tribunal=self.tribunal_sigla, tipo_busca="numero", termo_busca=numero)
        try:
            url_consulta = f"{self.base_url}/controlador.php?acao=consulta_processual_resultado&numero_processo={numero}"

            tinyfish_url = os.environ.get("TINYFISH_URL")
            tinyfish_key = os.environ.get("TINYFISH_KEY")

            if tinyfish_url and tinyfish_key:
                api_url = f"{tinyfish_url}?api_key={tinyfish_key}&url={requests.utils.quote(url_consulta)}&js_render=true"
                resp = requests.get(api_url, verify=False, timeout=60)
            else:
                resp = requests.get(url_consulta, headers={'User-Agent': 'Mozilla/5.0'}, verify=False, timeout=30)

            soup = BeautifulSoup(resp.content.decode('iso-8859-1', errors='replace'), 'html.parser')
            page_text = soup.get_text()

            if 'nenhum registro' in page_text.lower() or 'não encontrado' in page_text.lower():
                resultado.erro = "Processo não encontrado"
                return resultado

            processo = ProcessoInfo(
                numero=numero,
                tribunal=self.tribunal_sigla,
                url=url_consulta
            )

            # eProc basic extractions
            c = re.search(r'Classe:?\s*([^\n]+)', page_text, re.IGNORECASE)
            if c: processo.classe = c.group(1).strip()

            a = re.search(r'Assunto:?\s*([^\n]+)', page_text, re.IGNORECASE)
            if a: processo.assunto = a.group(1).strip()

            p = []
            for m in re.finditer(r'(Autor|Reu|Apelante|Apelado|Requerente)[:\s]+([^\n]+)', page_text, re.IGNORECASE):
                nome = m.group(2).strip()
                if nome not in p: p.append(nome)
            processo.partes = p

            resultado.processos = [processo]

        except Exception as e:
            import traceback
            resultado.erro = str(e)
            print(traceback.format_exc())

        return resultado

    async def buscar_por_nome(self, nome: str) -> ResultadoBusca:
        return ResultadoBusca(tribunal=self.tribunal_sigla, tipo_busca="nome", termo_busca=nome, erro="Busca nominal no eProc requer login/captcha.")
