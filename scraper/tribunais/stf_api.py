"""
Scraper for STF (Supremo Tribunal Federal) using ScraperAPI
Uses residential proxies from Brazil for reliable access
"""
import re
import sys
import os
from typing import Optional, List
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import BaseScraper, ResultadoBusca, ProcessoInfo, Movimentacao
from scraper_api import ScraperAPIClient, is_scraper_api_available


class STFScraperAPI(BaseScraper):
    """Scraper for STF using ScraperAPI with Brazilian residential proxies"""
    
    def __init__(self):
        super().__init__()
        self.tribunal_nome = "Supremo Tribunal Federal"
        self.tribunal_sigla = "STF"
        self.base_url = "https://portal.stf.jus.br"
        self.client = ScraperAPIClient()
        
        self.classes_stf_map = {
            "AC": "AC", "ACO": "ACO", "ADC": "ADC", "ADI": "ADI", "ADO": "ADO",
            "ADPF": "ADPF", "AI": "AI", "AIMP": "AImp", "AO": "AO", "AOE": "AOE",
            "AP": "AP", "AR": "AR", "ARE": "ARE", "AS": "AS", "CC": "CC",
            "CM": "Cm", "EI": "EI", "EL": "EL", "EP": "EP", "EXT": "Ext",
            "HC": "HC", "HD": "HD", "IF": "IF", "INQ": "Inq", "MI": "MI",
            "MS": "MS", "PADM": "PADM", "PET": "Pet", "PPE": "PPE", "PSV": "PSV",
            "RC": "RC", "RCL": "Rcl", "RE": "RE", "RHC": "RHC", "RHD": "RHD",
            "RMI": "RMI", "RMS": "RMS", "RVC": "RvC", "SE": "SE",
            "SIRDR": "SIRDR", "SL": "SL", "SS": "SS", "STA": "STA", "STP": "STP", "TPA": "TPA"
        }
        self.classes_stf = list(self.classes_stf_map.keys())
    
    def _parse_stf_number(self, numero: str) -> tuple:
        """Parse STF process number to extract class and number"""
        numero_str = numero.strip().upper()
        
        for classe_upper in sorted(self.classes_stf, key=len, reverse=True):
            pattern = rf'^({classe_upper})\s*(\d+)$'
            match = re.match(pattern, numero_str, re.IGNORECASE)
            if match:
                classe_for_url = self.classes_stf_map.get(classe_upper, classe_upper)
                return classe_for_url, match.group(2)
        
        if numero_str.isdigit():
            return None, numero_str
        
        return None, None
    
    async def buscar_por_numero(self, numero: str) -> ResultadoBusca:
        """Search for a case by its number using ScraperAPI"""
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="numero",
            termo_busca=numero
        )
        
        if not self.client.enabled:
            resultado.erro = "ScraperAPI não configurado. Configure a variável SCRAPER_API_KEY."
            return resultado
        
        try:
            classe, num = self._parse_stf_number(numero)
            
            if classe and num:
                url = f"{self.base_url}/processos/listarProcessos.asp?classe={classe}&numeroProcesso={num}"
                
                soup = self.client.fetch_and_parse(url, render_js=True, premium=True)
                
                if soup:
                    processos = self._extrair_detalhes_soup(soup, classe, num, url)
                    resultado.processos = processos
                    
                    if not processos:
                        page_text = soup.get_text()
                        if 'não encontrado' in page_text.lower() or 'nenhum processo' in page_text.lower():
                            resultado.erro = f"Processo {numero} não encontrado no STF"
                        else:
                            processo = ProcessoInfo(
                                numero=f"{classe} {num}",
                                tribunal=self.tribunal_sigla,
                                url=url,
                                classe=classe,
                                assunto="Dados extraídos via ScraperAPI"
                            )
                            resultado.processos = [processo]
                else:
                    resultado.erro = "Não foi possível acessar o portal do STF"
            else:
                resultado.erro = f"Formato de número inválido. Use: CLASSE NUMERO (ex: ADI 1, HC 123456)"
                
        except Exception as e:
            resultado.erro = f"Erro ao consultar STF: {str(e)}"
        
        return resultado
    
    async def buscar_por_nome(self, nome: str) -> ResultadoBusca:
        """Search for cases by party name using ScraperAPI"""
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="nome",
            termo_busca=nome
        )
        
        if not self.client.enabled:
            resultado.erro = "ScraperAPI não configurado. Configure a variável SCRAPER_API_KEY."
            return resultado
        
        try:
            nome_encoded = quote(nome.strip())
            url = f"{self.base_url}/processos/pesquisar.asp?pesquisar=pesquisar&partes={nome_encoded}"
            
            soup = self.client.fetch_and_parse(url, render_js=True, premium=True)
            
            if soup:
                processos = self._extrair_lista_resultados_soup(soup)
                resultado.processos = processos
                
                if not processos:
                    page_text = soup.get_text()
                    if 'nenhum' in page_text.lower() or 'não encontrado' in page_text.lower():
                        resultado.erro = f"Nenhum processo encontrado para '{nome}' no STF"
                    else:
                        resultado.erro = "Não foi possível extrair resultados. Tente uma busca mais específica."
            else:
                resultado.erro = "Não foi possível acessar o portal do STF"
                
        except Exception as e:
            resultado.erro = f"Erro ao consultar STF: {str(e)}"
        
        return resultado
    
    def _extrair_detalhes_soup(self, soup, classe: str, numero: str, url: str) -> List[ProcessoInfo]:
        """Extract process details from BeautifulSoup parsed HTML"""
        processos = []
        
        try:
            page_text = soup.get_text()
            
            if '403' in page_text or 'Forbidden' in page_text:
                processo = ProcessoInfo(
                    numero=f"{classe} {numero}",
                    tribunal=self.tribunal_sigla,
                    url=url,
                    classe=classe,
                    assunto="Acesso bloqueado - tente novamente mais tarde"
                )
                processos.append(processo)
                return processos
            
            if 'não encontrado' in page_text.lower() or 'nenhum processo' in page_text.lower():
                return []
            
            processo = ProcessoInfo(
                numero=f"{classe} {numero}",
                tribunal=self.tribunal_sigla,
                url=url,
                classe=classe
            )
            
            numero_unico_match = re.search(r'NÚMERO ÚNICO:\s*([^\n]+)', page_text)
            if numero_unico_match:
                processo.numero_unico = numero_unico_match.group(1).strip()
            
            cnj_match = re.search(r'(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})', page_text)
            if cnj_match:
                processo.numero_unico = cnj_match.group(1)
            
            relator_el = soup.find(class_='processo-dados')
            if relator_el:
                texto = relator_el.get_text()
                relator_match = re.search(r'Relator\(a\):\s*(.+?)(?:\n|$)', texto)
                if relator_match:
                    processo.relator = relator_match.group(1).strip()
            
            origem_el = soup.find(id='descricao-procedencia')
            if origem_el:
                processo.origem = origem_el.get_text().strip()
            
            partes = []
            partes_els = soup.find_all(class_='nome-parte')
            for el in partes_els:
                nome = el.get_text().strip()
                if nome and len(nome) > 2 and nome not in partes:
                    partes.append(nome)
            processo.partes = partes[:15]
            
            assunto_div = soup.select_one('.informacoes__assunto .processo-detalhes')
            if assunto_div:
                processo.assunto = assunto_div.get_text().strip()
            
            movimentacoes = []
            andamentos = soup.find_all(class_='andamento-item')
            for and_el in andamentos[:20]:
                try:
                    data_el = and_el.find(class_='andamento-data')
                    nome_el = and_el.find(class_='andamento-nome')
                    
                    data = data_el.get_text().strip() if data_el else ""
                    descricao = nome_el.get_text().strip() if nome_el else ""
                    
                    if data and descricao:
                        detalhes_el = and_el.find(class_='andamento-descricao')
                        detalhes = detalhes_el.get_text().strip() if detalhes_el else None
                        
                        mov = Movimentacao(
                            data=data,
                            descricao=descricao,
                            detalhes=detalhes
                        )
                        movimentacoes.append(mov)
                except:
                    continue
            processo.movimentacoes = movimentacoes
            
            processos.append(processo)
            
        except Exception as e:
            print(f"Error extracting details: {e}", file=sys.stderr)
        
        return processos
    
    def _extrair_lista_resultados_soup(self, soup) -> List[ProcessoInfo]:
        """Extract list of processes from search results"""
        processos = []
        
        try:
            links = soup.find_all('a', href=re.compile(r'/processos/detalhe\.asp'))
            
            for link in links[:10]:
                try:
                    href = link.get('href', '')
                    text = link.get_text().strip()
                    
                    if href and text:
                        match = re.match(r'([A-Z]+)\s*(\d+)', text.upper())
                        if match:
                            classe = match.group(1)
                            numero = match.group(2)
                            
                            processo = ProcessoInfo(
                                numero=f"{classe} {numero}",
                                tribunal=self.tribunal_sigla,
                                url=f"{self.base_url}{href}" if not href.startswith('http') else href,
                                classe=classe
                            )
                            processos.append(processo)
                except:
                    continue
            
            if not processos:
                page_text = soup.get_text()
                for classe in self.classes_stf:
                    pattern = rf'\b({classe})\s*(\d{{1,7}})\b'
                    matches = re.findall(pattern, page_text.upper())
                    for classe_match, numero in matches[:5]:
                        processo = ProcessoInfo(
                            numero=f"{classe_match} {numero}",
                            tribunal=self.tribunal_sigla,
                            classe=classe_match
                        )
                        if not any(p.numero == processo.numero for p in processos):
                            processos.append(processo)
                            
        except Exception as e:
            print(f"Error extracting list: {e}", file=sys.stderr)
        
        return processos


async def test_scraper():
    """Test the ScraperAPI scraper"""
    if not is_scraper_api_available():
        print("ScraperAPI key not configured. Set SCRAPER_API_KEY environment variable.")
        return
    
    scraper = STFScraperAPI()
    print("Testing STF search via ScraperAPI: ADI 1")
    resultado = await scraper.buscar_por_numero("ADI 1")
    print(resultado.to_json())


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_scraper())
