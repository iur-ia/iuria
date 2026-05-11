"""
Scraper PJe - Processo Judicial Eletrônico (CNJ)
Cobre ~15 tribunais estaduais e alguns federais com um único scraper paramétrico

Tribunais PJe estaduais:
TJMG, TJPE, TJRS, TJPR, TJGO, TJMA, TJPI, TJRN, TJSE, TJTO, TJRO, TJMT, TJPA, TJAP, TJRR, TJPB, TJDFT, TJES
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

TRIBUNAIS_PJE = {
    "TJMG": {
        "nome": "Tribunal de Justiça de Minas Gerais",
        "base_url": "https://pje.tjmg.jus.br",
        "consulta_url": "https://pje.tjmg.jus.br/pje/ConsultaPublica/listView.seam",
        "portal_url": "https://pje.tjmg.jus.br/pje/ConsultaPublica/listView.seam",
    },
    "TJPE": {
        "nome": "Tribunal de Justiça de Pernambuco",
        "base_url": "https://pje.tjpe.jus.br",
        "consulta_url": "https://pje.tjpe.jus.br/pje/ConsultaPublica/listView.seam",
        "portal_url": "https://pje.tjpe.jus.br/pje/ConsultaPublica/listView.seam",
    },
    "TJRS": {
        "nome": "Tribunal de Justiça do Rio Grande do Sul",
        "base_url": "https://www.tjrs.jus.br",
        "consulta_url": "https://www.tjrs.jus.br/site/processos/index.html",
        "portal_url": "https://www.tjrs.jus.br/site/processos/index.html",
    },
    "TJPR": {
        "nome": "Tribunal de Justiça do Paraná",
        "base_url": "https://portal.tjpr.jus.br",
        "consulta_url": "https://portal.tjpr.jus.br/web/guest/processo-publico",
        "portal_url": "https://portal.tjpr.jus.br/web/guest/processo-publico",
    },
    "TJGO": {
        "nome": "Tribunal de Justiça de Goiás",
        "base_url": "https://projudi.tjgo.jus.br",
        "consulta_url": "https://projudi.tjgo.jus.br/BuscaProcesso",
        "portal_url": "https://projudi.tjgo.jus.br/BuscaProcesso",
    },
    "TJMA": {
        "nome": "Tribunal de Justiça do Maranhão",
        "base_url": "https://pje.tjma.jus.br",
        "consulta_url": "https://pje.tjma.jus.br/pje/ConsultaPublica/listView.seam",
        "portal_url": "https://pje.tjma.jus.br/pje/ConsultaPublica/listView.seam",
    },
    "TJPI": {
        "nome": "Tribunal de Justiça do Piauí",
        "base_url": "https://pje.tjpi.jus.br",
        "consulta_url": "https://pje.tjpi.jus.br/pje/ConsultaPublica/listView.seam",
        "portal_url": "https://pje.tjpi.jus.br/pje/ConsultaPublica/listView.seam",
    },
    "TJRN": {
        "nome": "Tribunal de Justiça do Rio Grande do Norte",
        "base_url": "https://pje.tjrn.jus.br",
        "consulta_url": "https://pje.tjrn.jus.br/pje/ConsultaPublica/listView.seam",
        "portal_url": "https://pje.tjrn.jus.br/pje/ConsultaPublica/listView.seam",
    },
    "TJSE": {
        "nome": "Tribunal de Justiça de Sergipe",
        "base_url": "https://pje.tjse.jus.br",
        "consulta_url": "https://pje.tjse.jus.br/pje/ConsultaPublica/listView.seam",
        "portal_url": "https://pje.tjse.jus.br/pje/ConsultaPublica/listView.seam",
    },
    "TJTO": {
        "nome": "Tribunal de Justiça do Tocantins",
        "base_url": "https://pje.tjto.jus.br",
        "consulta_url": "https://pje.tjto.jus.br/pje/ConsultaPublica/listView.seam",
        "portal_url": "https://pje.tjto.jus.br/pje/ConsultaPublica/listView.seam",
    },
    "TJRO": {
        "nome": "Tribunal de Justiça de Rondônia",
        "base_url": "https://projudi.tjro.jus.br",
        "consulta_url": "https://projudi.tjro.jus.br",
        "portal_url": "https://projudi.tjro.jus.br",
    },
    "TJMT": {
        "nome": "Tribunal de Justiça de Mato Grosso",
        "base_url": "https://pje.tjmt.jus.br",
        "consulta_url": "https://pje.tjmt.jus.br/pje/ConsultaPublica/listView.seam",
        "portal_url": "https://pje.tjmt.jus.br/pje/ConsultaPublica/listView.seam",
    },
    "TJPA": {
        "nome": "Tribunal de Justiça do Pará",
        "base_url": "https://pje.tjpa.jus.br",
        "consulta_url": "https://pje.tjpa.jus.br/pje/ConsultaPublica/listView.seam",
        "portal_url": "https://pje.tjpa.jus.br/pje/ConsultaPublica/listView.seam",
    },
    "TJPB": {
        "nome": "Tribunal de Justiça da Paraíba",
        "base_url": "https://pje.tjpb.jus.br",
        "consulta_url": "https://pje.tjpb.jus.br/pje/ConsultaPublica/listView.seam",
        "portal_url": "https://pje.tjpb.jus.br/pje/ConsultaPublica/listView.seam",
    },
    "TJAP": {
        "nome": "Tribunal de Justiça do Amapá",
        "base_url": "https://tucujuris.tjap.jus.br",
        "consulta_url": "https://tucujuris.tjap.jus.br/tucujuris/",
        "portal_url": "https://tucujuris.tjap.jus.br/tucujuris/",
    },
    "TJRR": {
        "nome": "Tribunal de Justiça de Roraima",
        "base_url": "https://webapp.tjrr.jus.br",
        "consulta_url": "https://webapp.tjrr.jus.br/eJud/",
        "portal_url": "https://webapp.tjrr.jus.br/eJud/",
    },
    "TJES": {
        "nome": "Tribunal de Justiça do Espírito Santo",
        "base_url": "https://sistemas.tjes.jus.br",
        "consulta_url": "https://sistemas.tjes.jus.br/ediario/",
        "portal_url": "https://sistemas.tjes.jus.br/ediario/",
    },
    "TJDFT": {
        "nome": "Tribunal de Justiça do Distrito Federal",
        "base_url": "https://www.tjdft.jus.br",
        "consulta_url": "https://www.tjdft.jus.br/servicos/processos/",
        "portal_url": "https://www.tjdft.jus.br/servicos/processos/",
    },
}

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]


class PJeScraper(BaseScraper):
    """Scraper paramétrico para todos os tribunais do sistema PJe"""
    
    def __init__(self, tribunal_sigla: str):
        super().__init__()
        
        sigla_upper = tribunal_sigla.upper()
        if sigla_upper not in TRIBUNAIS_PJE:
            raise ValueError(f"Tribunal {tribunal_sigla} não suportado. Disponíveis: {list(TRIBUNAIS_PJE.keys())}")
        
        config = TRIBUNAIS_PJE[sigla_upper]
        self.tribunal_sigla = sigla_upper
        self.tribunal_nome = config["nome"]
        self.config = config
        self.base_url = config["base_url"]
    
    def _fetch_with_scrapling(self, url: str, wait_selector: str = None):
        import requests
        import os
        import urllib3
        urllib3.disable_warnings()
        
        tinyfish_url = os.environ.get("TINYFISH_URL")
        tinyfish_key = os.environ.get("TINYFISH_KEY")
        
        if tinyfish_url and tinyfish_key:
            api_url = f"{tinyfish_url}?api_key={tinyfish_key}&url={requests.utils.quote(url)}"
            resp = requests.get(api_url, verify=False, timeout=60)
        else:
            resp = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, verify=False, timeout=30)

        from bs4 import BeautifulSoup
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        class MockPage:
            def __init__(self, text, soup, url):
                self.text = text
                self.soup = soup
                self.url = url
            def get_all_text(self, *a, **kw):
                return self.text
            def css(self, selector):
                class Item:
                    def __init__(self, el):
                        self.el = el
                        self.text = el.text.strip() if el else ""
                        self.attrib = el.attrs if el else {}
                    def css(self, sel):
                        found = self.el.select(sel)
                        return MockPage("", None, "")._make_sel(found)
                found = self.soup.select(selector)
                return self._make_sel(found)
            def _make_sel(self, found):
                class Selector:
                    def __init__(self, items):
                        self.items = items
                        self.first = items[0] if items else None
                    def __iter__(self):
                        return iter(self.items)
                return Selector([Item(x) for x in found])

        return MockPage(resp.text, soup, url)
    
    async def buscar_por_numero(self, numero: str) -> ResultadoBusca:
        """Busca processo por número no PJe"""
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="numero",
            termo_busca=numero
        )
        
        try:
            numero_limpo = re.sub(r'[^\d.-]', '', numero)
            url = self.config['consulta_url']
            
            loop = asyncio.get_event_loop()
            page = self._fetch_with_scrapling(url)
            
            if page:
                page_text = page.get_all_text(ignore_tags=("script", "style"))
                
                if len(page_text.strip()) > 100:
                    processo = self._extrair_processo_pje(page, numero, page.url)
                    
                    if processo:
                        resultado.processos = [processo]
                    else:
                        resultado.processos = [ProcessoInfo(
                            numero=numero,
                            tribunal=self.tribunal_sigla,
                            url=f"{url}?numeroProcesso={numero_limpo}",
                            assunto=f"Consulte no portal: {self.tribunal_nome}",
                            classe="Consulta PJe"
                        )]
                else:
                    resultado.erro = f"Página vazia ou bloqueada para {self.tribunal_nome}"
            else:
                resultado.erro = f"Não foi possível acessar o portal do {self.tribunal_nome}"
                
        except Exception as e:
            resultado.erro = f"Erro ao consultar {self.tribunal_nome}: {str(e)}"
        
        return resultado
    
    async def buscar_por_nome(self, nome: str) -> ResultadoBusca:
        """Busca processos por nome da parte no PJe"""
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="nome",
            termo_busca=nome
        )
        
        try:
            url = f"{self.config['consulta_url']}?nomeParte={quote(nome)}"
            
            loop = asyncio.get_event_loop()
            page = self._fetch_with_scrapling(url)
            
            if page:
                processos = self._extrair_lista_resultados(page)
                resultado.processos = processos
                
                if not processos:
                    resultado.erro = f"Nenhum processo encontrado para '{nome}' em {self.tribunal_nome}"
            else:
                resultado.erro = f"Não foi possível acessar o portal do {self.tribunal_nome}"
                
        except Exception as e:
            resultado.erro = f"Erro ao buscar por nome em {self.tribunal_nome}: {str(e)}"
        
        return resultado
    
    def _extrair_processo_pje(self, page, numero: str, url: str) -> Optional[ProcessoInfo]:
        """Extrai dados de processo de uma página PJe"""
        try:
            page_text = page.get_all_text(ignore_tags=("script", "style"))
            
            if 'processo não encontrado' in page_text.lower():
                return None
            
            processo = ProcessoInfo(
                numero=numero,
                numero_unico=numero,
                tribunal=self.tribunal_sigla,
                url=url
            )
            
            cnj_match = re.search(r'(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})', page_text)
            if cnj_match:
                processo.numero_unico = cnj_match.group(1)
            
            for selector in ['.processo-classe', '#classeProcesso', '.classe-processo']:
                el = page.css(selector).first
                if el:
                    processo.classe = el.text.strip()
                    break
            
            for selector in ['.processo-assunto', '#assuntoProcesso', '.assunto-processo']:
                el = page.css(selector).first
                if el:
                    processo.assunto = el.text.strip()
                    break
            
            if not processo.assunto:
                assunto_match = re.search(r'(?:Assunto|Classe)[:\s]+(.+?)(?:\n|$)', page_text)
                if assunto_match:
                    processo.assunto = assunto_match.group(1).strip()[:200]
            
            for selector in ['.relator', '#relatorProcesso', '.magistrado']:
                el = page.css(selector).first
                if el:
                    processo.relator = el.text.strip()
                    break
            
            partes = []
            for el in page.css('.parte-nome, .nome-parte, .parteNome'):
                text = el.text.strip()
                if text and len(text) > 2 and text not in partes:
                    partes.append(text)
                if len(partes) >= 10:
                    break
            processo.partes = partes
            
            movimentacoes = []
            for row in page.css('.timeline-item, .andamento-item, tr.movimento'):
                try:
                    data_el = row.css('.data, .dataAndamento, td:first-child').first
                    desc_el = row.css('.descricao, .descAndamento, td:nth-child(2)').first
                    
                    data = data_el.text.strip() if data_el else ""
                    descricao = desc_el.text.strip() if desc_el else ""
                    
                    if data or descricao:
                        movimentacoes.append(Movimentacao(data=data, descricao=descricao))
                    
                    if len(movimentacoes) >= 25:
                        break
                except:
                    continue
            
            processo.movimentacoes = movimentacoes
            
            return processo if (processo.classe or processo.assunto or processo.partes or processo.movimentacoes) else None
            
        except Exception as e:
            print(f"Erro ao extrair processo PJe: {e}", file=sys.stderr)
            return None
    
    def _extrair_lista_resultados(self, page) -> List[ProcessoInfo]:
        """Extrai lista de processos dos resultados de busca PJe"""
        processos = []
        
        try:
            for el in page.css('.processo-numero, a[href*="ConsultaPublica"]'):
                try:
                    text = el.text.strip()
                    href = el.attrib.get('href', '')
                    
                    cnj_match = re.search(r'(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})', text + href)
                    
                    if cnj_match:
                        numero = cnj_match.group(1)
                        url = href if href.startswith('http') else f"{self.base_url}{href}"
                        
                        processo = ProcessoInfo(
                            numero=numero,
                            tribunal=self.tribunal_sigla,
                            url=url
                        )
                        
                        if not any(p.numero == processo.numero for p in processos):
                            processos.append(processo)
                    
                    if len(processos) >= 10:
                        break
                except:
                    continue
                    
        except Exception as e:
            print(f"Erro ao extrair lista PJe: {e}", file=sys.stderr)
        
        return processos


def criar_scraper(tribunal_sigla: str) -> PJeScraper:
    """Factory function para criar scraper de um tribunal PJe"""
    return PJeScraper(tribunal_sigla)


def listar_tribunais() -> list:
    """Lista todos os tribunais suportados pelo PJe"""
    return [
        {"sigla": sigla, "nome": info["nome"]}
        for sigla, info in TRIBUNAIS_PJE.items()
    ]
