"""
Scraper for STF (Supremo Tribunal Federal) using Scrapling
Scrapling is a more intelligent scraping library with stealth Playwright support
Uses DynamicFetcher (Playwright-based) with anti-detection features
"""
import re
import sys
import os
import asyncio
from typing import Optional, List
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import BaseScraper, ResultadoBusca, ProcessoInfo, Movimentacao


class STFScrapling(BaseScraper):
    """Scraper for STF using Scrapling with Playwright stealth features"""
    
    def __init__(self):
        super().__init__()
        self.tribunal_nome = "Supremo Tribunal Federal"
        self.tribunal_sigla = "STF"
        self.base_url = "https://portal.stf.jus.br"
        
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
    
    def _fetch_with_scrapling(self, url: str):
        """Fetch a page using Scrapling DynamicFetcher (Playwright-based with stealth)"""
        from scrapling import Fetcher
        fetcher = Fetcher()
        
        

        page = fetcher.get(url, proxy=None, proxies=None, impersonate='chrome120', timeout=30000, verify=False)
        return page
    
    def _extrair_detalhes_page(self, page, classe: str, numero: str, url: str) -> List[ProcessoInfo]:
        """Extract process details from Scrapling page object"""
        processos = []
        
        try:
            page_text = page.get_all_text(ignore_tags=("script", "style"))
            
            block_signals = [
                "403", "forbidden", "acesso bloqueado", "blocked", "captcha",
                "acesso negado", "access denied", "rate limit", "tente novamente mais tarde",
                "cloudflare", "ray id",
            ]
            page_lower = page_text.lower()
            if any(s in page_lower for s in block_signals):
                return []
            
            if 'não encontrado' in page_text.lower() or 'nenhum processo' in page_text.lower():
                return []
            
            processo = ProcessoInfo(
                numero=f"{classe} {numero}",
                tribunal=self.tribunal_sigla,
                url=url,
                classe=classe
            )
            
            cnj_match = re.search(r'(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})', page_text)
            if cnj_match:
                processo.numero_unico = cnj_match.group(1)
            else:
                numero_unico_match = re.search(r'NÚMERO ÚNICO:\s*([^\n]+)', page_text)
                if numero_unico_match:
                    processo.numero_unico = numero_unico_match.group(1).strip()
            
            relator_el = page.css('.processo-dados').first
            if relator_el:
                texto = relator_el.text
                relator_match = re.search(r'Relator\(a\):\s*(.+?)(?:\n|$)', texto)
                if relator_match:
                    processo.relator = relator_match.group(1).strip()
            
            if not processo.relator:
                relator_match = re.search(r'Relator\(a\):\s*(.+?)(?:\n|$)', page_text)
                if relator_match:
                    processo.relator = relator_match.group(1).strip()
            
            origem_el = page.css('#descricao-procedencia').first
            if origem_el:
                processo.origem = origem_el.text.strip()
            
            partes = []
            for el in page.css('.nome-parte'):
                nome = el.text.strip()
                if nome and len(nome) > 2 and nome not in partes:
                    partes.append(nome)
            processo.partes = partes[:15]
            
            assunto_div = page.css('.informacoes__assunto .processo-detalhes').first
            if assunto_div:
                processo.assunto = assunto_div.text.strip()
            
            movimentacoes = []
            for and_el in page.css('.andamento-item'):
                try:
                    data_el = and_el.css('.andamento-data').first
                    nome_el = and_el.css('.andamento-nome').first
                    
                    data = data_el.text.strip() if data_el else ""
                    descricao = nome_el.text.strip() if nome_el else ""
                    
                    if data and descricao:
                        detalhes_el = and_el.css('.andamento-descricao').first
                        detalhes = detalhes_el.text.strip() if detalhes_el else None
                        
                        movimentacoes.append(Movimentacao(
                            data=data,
                            descricao=descricao,
                            detalhes=detalhes
                        ))
                    
                    if len(movimentacoes) >= 20:
                        break
                except:
                    continue
            
            processo.movimentacoes = movimentacoes
            processos.append(processo)
            
        except Exception as e:
            print(f"Error extracting STF details: {e}", file=sys.stderr)
        
        return processos
    
    async def buscar_por_numero(self, numero: str) -> ResultadoBusca:
        """Search for a case by its number using Scrapling"""
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="numero",
            termo_busca=numero
        )
        
        try:
            classe, num = self._parse_stf_number(numero)
            
            if classe and num:
                url = f"{self.base_url}/processos/listarProcessos.asp?classe={classe}&numeroProcesso={num}"
                
                loop = asyncio.get_event_loop()
                page = self._fetch_with_scrapling(url)
                
                if page:
                    processos = self._extrair_detalhes_page(page, classe, num, url)
                    resultado.processos = processos
                    
                    if not processos:
                        page_text = page.get_all_text(ignore_tags=("script", "style"))
                        if 'não encontrado' in page_text.lower() or 'nenhum processo' in page_text.lower():
                            resultado.erro = f"Processo {numero} não encontrado no STF"
                        else:
                            resultado.processos = [ProcessoInfo(
                                numero=f"{classe} {num}",
                                tribunal=self.tribunal_sigla,
                                url=url,
                                classe=classe,
                                assunto="Acesse o portal para ver os detalhes completos"
                            )]
                else:
                    resultado.erro = "Não foi possível acessar o portal do STF"
            else:
                resultado.erro = "Formato de número inválido. Use: CLASSE NUMERO (ex: ADI 1, HC 123456)"
                
        except Exception as e:
            resultado.erro = f"Erro ao consultar STF: {str(e)}"
        
        return resultado
    
    async def buscar_por_nome(self, nome: str) -> ResultadoBusca:
        """Search for cases by party name using Scrapling"""
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="nome",
            termo_busca=nome
        )
        
        try:
            nome_encoded = quote(nome.strip())
            url = f"{self.base_url}/processos/pesquisar.asp?pesquisar=pesquisar&partes={nome_encoded}"
            
            loop = asyncio.get_event_loop()
            page = self._fetch_with_scrapling(url)
            
            if page:
                processos = self._extrair_lista_resultados_page(page)
                resultado.processos = processos
                
                if not processos:
                    page_text = page.get_all_text(ignore_tags=("script", "style"))
                    if 'nenhum' in page_text.lower() or 'não encontrado' in page_text.lower():
                        resultado.erro = f"Nenhum processo encontrado para '{nome}' no STF"
                    else:
                        resultado.erro = "Não foi possível extrair resultados. Tente uma busca mais específica."
            else:
                resultado.erro = "Não foi possível acessar o portal do STF"
                
        except Exception as e:
            resultado.erro = f"Erro ao consultar STF: {str(e)}"
        
        return resultado
    
    def _extrair_lista_resultados_page(self, page) -> List[ProcessoInfo]:
        """Extract list of processes from search results"""
        processos = []
        
        try:
            for link in page.css('a[href*="/processos/detalhe.asp"]'):
                try:
                    href = link.attrib.get('href', '')
                    text = link.text.strip()
                    
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
                    
                    if len(processos) >= 10:
                        break
                except:
                    continue
            
            if not processos:
                page_text = page.get_all_text(ignore_tags=("script", "style"))
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
            print(f"Error extracting STF list: {e}", file=sys.stderr)
        
        return processos


async def test_scraper():
    """Test the Scrapling-based STF scraper"""
    scraper = STFScrapling()
    print("Testing STF search via Scrapling: ADI 1")
    resultado = await scraper.buscar_por_numero("ADI 1")
    print(resultado.to_json())


if __name__ == "__main__":
    asyncio.run(test_scraper())
