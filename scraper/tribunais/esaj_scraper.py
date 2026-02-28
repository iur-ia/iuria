"""
Scraper eSAJ - Sistema de Automação do Judiciário (Softplan)
Cobre 8+ tribunais estaduais com um único scraper paramétrico:
TJSP, TJBA, TJCE, TJAC, TJAL, TJAM, TJSC, TJMS, TJAL

Portais:
- TJSP: https://esaj.tjsp.jus.br/
- TJBA: https://esaj.tjba.jus.br/
- TJCE: https://esaj.tjce.jus.br/
- TJAC: https://esaj.tjac.jus.br/
- TJSC: https://esaj.tjsc.jus.br/
- TJMS: https://esaj.tjms.jus.br/
- TJAL: https://www2.tjal.jus.br/
- TJAM: https://consultasaj.tjam.jus.br/
"""
import re
import sys
import os
import asyncio
import time
import random
from typing import Optional, List
from urllib.parse import quote, urlencode

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import BaseScraper, ResultadoBusca, ProcessoInfo, Movimentacao

TRIBUNAIS_ESAJ = {
    "TJSP": {
        "nome": "Tribunal de Justiça de São Paulo",
        "base_url": "https://esaj.tjsp.jus.br",
        "consulta_1g": "https://esaj.tjsp.jus.br/cpopg/show.do",
        "consulta_2g": "https://esaj.tjsp.jus.br/cposg/show.do",
        "busca_nome": "https://esaj.tjsp.jus.br/cpopg/search.do",
    },
    "TJBA": {
        "nome": "Tribunal de Justiça da Bahia",
        "base_url": "https://esaj.tjba.jus.br",
        "consulta_1g": "https://esaj.tjba.jus.br/cpopg/show.do",
        "consulta_2g": "https://esaj.tjba.jus.br/cposg/show.do",
        "busca_nome": "https://esaj.tjba.jus.br/cpopg/search.do",
    },
    "TJCE": {
        "nome": "Tribunal de Justiça do Ceará",
        "base_url": "https://esaj.tjce.jus.br",
        "consulta_1g": "https://esaj.tjce.jus.br/cpopg/show.do",
        "consulta_2g": "https://esaj.tjce.jus.br/cposg/show.do",
        "busca_nome": "https://esaj.tjce.jus.br/cpopg/search.do",
    },
    "TJSC": {
        "nome": "Tribunal de Justiça de Santa Catarina",
        "base_url": "https://esaj.tjsc.jus.br",
        "consulta_1g": "https://esaj.tjsc.jus.br/cpopg/show.do",
        "consulta_2g": "https://esaj.tjsc.jus.br/cposg/show.do",
        "busca_nome": "https://esaj.tjsc.jus.br/cpopg/search.do",
    },
    "TJMS": {
        "nome": "Tribunal de Justiça de Mato Grosso do Sul",
        "base_url": "https://esaj.tjms.jus.br",
        "consulta_1g": "https://esaj.tjms.jus.br/cpopg5/show.do",
        "consulta_2g": "https://esaj.tjms.jus.br/cposg5/show.do",
        "busca_nome": "https://esaj.tjms.jus.br/cpopg5/search.do",
    },
    "TJAC": {
        "nome": "Tribunal de Justiça do Acre",
        "base_url": "https://esaj.tjac.jus.br",
        "consulta_1g": "https://esaj.tjac.jus.br/cpopg/show.do",
        "consulta_2g": "https://esaj.tjac.jus.br/cposg/show.do",
        "busca_nome": "https://esaj.tjac.jus.br/cpopg/search.do",
    },
    "TJAL": {
        "nome": "Tribunal de Justiça de Alagoas",
        "base_url": "https://www2.tjal.jus.br",
        "consulta_1g": "https://www2.tjal.jus.br/cpopg/show.do",
        "consulta_2g": "https://www2.tjal.jus.br/cposg/show.do",
        "busca_nome": "https://www2.tjal.jus.br/cpopg/search.do",
    },
    "TJAM": {
        "nome": "Tribunal de Justiça do Amazonas",
        "base_url": "https://consultasaj.tjam.jus.br",
        "consulta_1g": "https://consultasaj.tjam.jus.br/cpopg/show.do",
        "consulta_2g": "https://consultasaj.tjam.jus.br/cposg/show.do",
        "busca_nome": "https://consultasaj.tjam.jus.br/cpopg/search.do",
    },
}

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]


class ESAJScraper(BaseScraper):
    """Scraper paramétrico para todos os tribunais do sistema eSAJ"""
    
    def __init__(self, tribunal_sigla: str):
        super().__init__()
        
        sigla_upper = tribunal_sigla.upper()
        if sigla_upper not in TRIBUNAIS_ESAJ:
            raise ValueError(f"Tribunal {tribunal_sigla} não suportado. Disponíveis: {list(TRIBUNAIS_ESAJ.keys())}")
        
        config = TRIBUNAIS_ESAJ[sigla_upper]
        self.tribunal_sigla = sigla_upper
        self.tribunal_nome = config["nome"]
        self.config = config
        self.base_url = config["base_url"]
    
    def _fetch_with_scrapling(self, url: str, wait: float = None):
        """Fetch usando Scrapling DynamicFetcher com técnicas anti-detecção"""
        from scrapling import DynamicFetcher
        
        if wait is None:
            wait = random.uniform(1.5, 3.0)
        
        ua = random.choice(USER_AGENTS)
        
        fetcher = DynamicFetcher()
        page = fetcher.fetch(
            url,
            headless=True,
            network_idle=True,
            timeout=30000,
            disable_resources=True,
            google_search=True,
            useragent=ua,
            locale="pt-BR",
            extra_headers={
                "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            wait=wait,
        )
        return page
    
    def _extrair_processo_esaj(self, page, numero: str, url: str) -> Optional[ProcessoInfo]:
        """Extrai dados de processo de uma página eSAJ"""
        try:
            page_text = page.get_all_text(ignore_tags=("script", "style"))
            
            if 'não encontrado' in page_text.lower() or 'nenhum processo' in page_text.lower():
                return None
            
            if len(page_text.strip()) < 100:
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
            
            classe_el = page.css('.unj-tag, .classeProcesso, #classeProcesso').first
            if classe_el:
                processo.classe = classe_el.text.strip()
            
            assunto_el = page.css('.assuntoDescricao, #assuntoDescricao').first
            if assunto_el:
                processo.assunto = assunto_el.text.strip()
            
            if not processo.assunto:
                assunto_match = re.search(r'Assunto[:\s]+(.+?)(?:\n|$)', page_text)
                if assunto_match:
                    processo.assunto = assunto_match.group(1).strip()[:200]
            
            juiz_el = page.css('#juizPrincipal, .juiz, .nomeRelator').first
            if juiz_el:
                processo.relator = juiz_el.text.strip()
            
            if not processo.relator:
                juiz_match = re.search(r'(?:Juiz|Juíza|Relator)[:\s]+(.+?)(?:\n|$)', page_text)
                if juiz_match:
                    processo.relator = juiz_match.group(1).strip()[:100]
            
            vara_el = page.css('#varaProcesso, .varaProcesso').first
            if vara_el:
                processo.origem = vara_el.text.strip()
            
            partes = []
            partes_table = page.css('.fundoClaro, .fundoEscuro')
            for row in partes_table:
                text = row.text.strip()
                if text and len(text) > 3 and not text.startswith('Advogado') and len(partes) < 10:
                    partes.append(text)
            
            if not partes:
                for el in page.css('.txtTabelaResumo'):
                    text = el.text.strip()
                    if text and len(text) > 3:
                        partes.append(text)
                        if len(partes) >= 10:
                            break
            
            processo.partes = partes[:10]
            
            movimentacoes = []
            for row in page.css('tr.containerMovimentacao, tr[class*="movimentacao"]'):
                try:
                    data_el = row.css('.dataMovimentacao, td:first-child').first
                    desc_el = row.css('.descricaoMovimentacao, td.descricaoMovimentacao').first
                    
                    data = data_el.text.strip() if data_el else ""
                    descricao = desc_el.text.strip() if desc_el else ""
                    
                    if data and descricao:
                        movimentacoes.append(Movimentacao(
                            data=data,
                            descricao=descricao
                        ))
                    
                    if len(movimentacoes) >= 30:
                        break
                except:
                    continue
            
            if not movimentacoes:
                data_pattern = re.compile(r'(\d{2}/\d{2}/\d{4})')
                lines = page_text.split('\n')
                i = 0
                while i < len(lines) and len(movimentacoes) < 20:
                    line = lines[i].strip()
                    if data_pattern.match(line) and i + 1 < len(lines):
                        data = line
                        descricao = lines[i + 1].strip()
                        if descricao and len(descricao) > 3:
                            movimentacoes.append(Movimentacao(data=data, descricao=descricao))
                        i += 2
                    else:
                        i += 1
            
            processo.movimentacoes = movimentacoes
            
            return processo
            
        except Exception as e:
            print(f"Erro ao extrair processo eSAJ: {e}", file=sys.stderr)
            return None
    
    async def buscar_por_numero(self, numero: str) -> ResultadoBusca:
        """Busca processo por número no eSAJ"""
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="numero",
            termo_busca=numero
        )
        
        try:
            numero_limpo = re.sub(r'[^\d.-]', '', numero)
            
            params = urlencode({
                "processo.codigo": "",
                "processo.foro": "0",
                "processo.numero": numero_limpo,
                "uuidCaptcha": "",
                "pbEnviar": "Pesquisar"
            })
            
            url = f"{self.config['consulta_1g']}?{params}"
            
            loop = asyncio.get_event_loop()
            page = await loop.run_in_executor(None, self._fetch_with_scrapling, url)
            
            if page:
                processo = self._extrair_processo_esaj(page, numero, page.url)
                
                if processo:
                    resultado.processos = [processo]
                else:
                    url_portal = f"{self.config['consulta_1g']}?processo.numero={numero_limpo}"
                    resultado.processos = [ProcessoInfo(
                        numero=numero,
                        tribunal=self.tribunal_sigla,
                        url=url_portal,
                        assunto=f"Acesse o portal {self.tribunal_nome} para ver os detalhes"
                    )]
            else:
                resultado.erro = f"Não foi possível acessar o portal do {self.tribunal_nome}"
                
        except Exception as e:
            resultado.erro = f"Erro ao consultar {self.tribunal_nome}: {str(e)}"
        
        return resultado
    
    async def buscar_por_nome(self, nome: str) -> ResultadoBusca:
        """Busca processos por nome da parte no eSAJ"""
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="nome",
            termo_busca=nome
        )
        
        try:
            params = urlencode({
                "dadosConsulta.tipoPesquisa": "NMPARTE",
                "dadosConsulta.valorConsultaNM": nome,
                "pbEnviar": "Pesquisar"
            })
            
            url = f"{self.config['busca_nome']}?{params}"
            
            loop = asyncio.get_event_loop()
            page = await loop.run_in_executor(None, self._fetch_with_scrapling, url)
            
            if page:
                processos = self._extrair_lista_resultados(page)
                resultado.processos = processos
                
                if not processos:
                    page_text = page.get_all_text(ignore_tags=("script", "style"))
                    if 'nenhum' in page_text.lower() or 'não encontrado' in page_text.lower():
                        resultado.erro = f"Nenhum processo encontrado para '{nome}'"
                    else:
                        resultado.erro = "Não foi possível extrair resultados"
            else:
                resultado.erro = f"Não foi possível acessar o portal do {self.tribunal_nome}"
                
        except Exception as e:
            resultado.erro = f"Erro ao buscar por nome em {self.tribunal_nome}: {str(e)}"
        
        return resultado
    
    def _extrair_lista_resultados(self, page) -> List[ProcessoInfo]:
        """Extrai lista de processos dos resultados de busca eSAJ"""
        processos = []
        
        try:
            for link in page.css('a[href*="cpopg"], a[href*="cposg"]'):
                try:
                    href = link.attrib.get('href', '')
                    text = link.text.strip()
                    
                    if href and (re.search(r'\d{7}', text) or 'processo' in href.lower()):
                        cnj_match = re.search(r'(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})', text + href)
                        numero = cnj_match.group(1) if cnj_match else text
                        
                        if numero and len(numero) > 3:
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
            print(f"Erro ao extrair lista eSAJ: {e}", file=sys.stderr)
        
        return processos


def criar_scraper(tribunal_sigla: str) -> ESAJScraper:
    """Factory function para criar scraper de um tribunal eSAJ"""
    return ESAJScraper(tribunal_sigla)


def listar_tribunais() -> list:
    """Lista todos os tribunais suportados pelo eSAJ"""
    return [
        {"sigla": sigla, "nome": info["nome"]}
        for sigla, info in TRIBUNAIS_ESAJ.items()
    ]
