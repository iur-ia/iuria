"""
Scraper for STF (Supremo Tribunal Federal)
Portal: https://portal.stf.jus.br/processos/
Uses direct URLs for more reliable scraping
"""
import asyncio
import re
from typing import Optional, List
from playwright.async_api import async_playwright, Page, Browser
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import BaseScraper, ResultadoBusca, ProcessoInfo, Movimentacao


class STFScraper(BaseScraper):
    """Scraper for STF - Supremo Tribunal Federal"""
    
    def __init__(self):
        super().__init__()
        self.tribunal_nome = "Supremo Tribunal Federal"
        self.tribunal_sigla = "STF"
        self.base_url = "https://portal.stf.jus.br"
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self._playwright = None
        
        # STF process classes - mapping from uppercase to proper case for URL
        # The STF portal is case-sensitive, so we need proper capitalization
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
    
    async def _init_browser(self):
        """Initialize Playwright browser"""
        if self._playwright is None:
            self._playwright = await async_playwright().start()
        if self.browser is None:
            self.browser = await self._playwright.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            )
        if self.page is None:
            context = await self.browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            self.page = await context.new_page()
            await self.page.set_viewport_size({"width": 1280, "height": 720})
    
    async def _close_browser(self):
        """Close browser"""
        try:
            if self.page:
                await self.page.close()
                self.page = None
            if self.browser:
                await self.browser.close()
                self.browser = None
            if self._playwright:
                await self._playwright.stop()
                self._playwright = None
        except:
            pass
    
    def _parse_stf_number(self, numero: str) -> tuple:
        """
        Parse STF process number to extract class and number
        Examples: 'ADI 1', 'HC 123456', 'ARE 1234567', 'PET 13350'
        Returns: (classe_for_url, numero) or (None, None)
        The classe returned is in proper case for the STF portal URL
        """
        numero_str = numero.strip().upper()
        
        # Pattern: CLASS NUMBER (with or without space)
        for classe_upper in sorted(self.classes_stf, key=len, reverse=True):
            pattern = rf'^({classe_upper})\s*(\d+)$'
            match = re.match(pattern, numero_str, re.IGNORECASE)
            if match:
                # Return the proper case for URL using the mapping
                classe_for_url = self.classes_stf_map.get(classe_upper, classe_upper)
                return classe_for_url, match.group(2)
        
        # If just a number, return None for class
        if numero_str.isdigit():
            return None, numero_str
        
        return None, None
    
    async def buscar_por_numero(self, numero: str) -> ResultadoBusca:
        """
        Search for a case by its number
        Supports formats:
        - STF format: ADI 1, HC 123456, ARE 1234567
        """
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="numero",
            termo_busca=numero
        )
        
        try:
            await self._init_browser()
            
            # Parse the number to get class and number
            classe, num = self._parse_stf_number(numero)
            
            if classe and num:
                # Use direct URL format for STF process lookup
                # Format: https://portal.stf.jus.br/processos/listarProcessos.asp?classe=ADI&numeroProcesso=1
                url = f"{self.base_url}/processos/listarProcessos.asp?classe={classe}&numeroProcesso={num}"
                
                await self.page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await asyncio.sleep(2)
                
                # Try to handle cookie consent
                try:
                    cookie_btn = await self.page.query_selector('button:has-text("Estou ciente"), button:has-text("Aceitar")')
                    if cookie_btn:
                        await cookie_btn.click()
                        await asyncio.sleep(1)
                except:
                    pass
                
                # Extract process info
                processos = await self._extrair_detalhes_pagina(classe, num)
                resultado.processos = processos
            else:
                resultado.erro = f"Formato de número inválido. Use o formato: CLASSE NUMERO (ex: ADI 1, HC 123456)"
            
        except Exception as e:
            resultado.erro = f"Erro ao consultar STF: {str(e)}"
        finally:
            await self._close_browser()
        
        return resultado
    
    async def buscar_por_nome(self, nome: str) -> ResultadoBusca:
        """
        Search for cases by party name using STF advanced search
        Uses the pesquisa.asp endpoint with party parameter
        """
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="nome",
            termo_busca=nome
        )
        
        try:
            await self._init_browser()
            
            # Use STF advanced search URL with party name parameter
            # The STF portal has a search page that accepts party name
            from urllib.parse import quote
            nome_encoded = quote(nome.strip())
            
            # STF search URL format for party search
            url = f"{self.base_url}/processos/pesquisar.asp?pesquisar=pesquisar&partes={nome_encoded}"
            
            await self.page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(3)
            
            # Handle cookie consent
            try:
                cookie_btn = await self.page.query_selector('button:has-text("Estou ciente")')
                if cookie_btn:
                    await cookie_btn.click()
                    await asyncio.sleep(1)
            except:
                pass
            
            try:
                # Look for result links
                processos = []
                
                # Find all process links in the results
                links = await self.page.query_selector_all('a[href*="/processos/detalhe.asp"]')
                
                for link in links[:10]:  # Limit to first 10 results
                    try:
                        href = await link.get_attribute('href')
                        text = await link.text_content()
                        
                        if href and text:
                            text = text.strip()
                            # Extract class and number from link text
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
                
                # If no links found, try alternate approach - look for table rows
                if not processos:
                    rows = await self.page.query_selector_all('table tr, .resultado-processo, .processo-item')
                    for row in rows[:10]:
                        try:
                            text = await row.text_content()
                            if text:
                                # Look for process patterns like "ADI 1234"
                                matches = re.findall(r'\b([A-Z]{2,5})\s*(\d{1,7})\b', text.upper())
                                for classe, numero in matches:
                                    if classe in self.classes_stf:
                                        processo = ProcessoInfo(
                                            numero=f"{classe} {numero}",
                                            tribunal=self.tribunal_sigla,
                                            classe=classe
                                        )
                                        # Check if not already added
                                        if not any(p.numero == processo.numero for p in processos):
                                            processos.append(processo)
                        except:
                            continue
                
                resultado.processos = processos
                
                if not processos:
                    # Check if the page indicates no results
                    page_text = await self.page.evaluate('() => document.body.innerText')
                    if 'nenhum' in page_text.lower() or 'não encontrado' in page_text.lower():
                        resultado.erro = f"Nenhum processo encontrado para '{nome}' no STF"
                    else:
                        resultado.erro = "Nao foi possivel extrair resultados. Tente uma busca mais especifica."
                
            except Exception as e:
                resultado.erro = f"Erro na busca por nome: {str(e)}"
            
        except Exception as e:
            resultado.erro = f"Erro ao consultar STF: {str(e)}"
        finally:
            await self._close_browser()
        
        return resultado
    
    async def _extrair_detalhes_pagina(self, classe: str, numero: str) -> List[ProcessoInfo]:
        """Extract process details from the current page using proper selectors"""
        processos = []
        
        try:
            page_text = await self.page.evaluate('() => document.body.innerText')
            
            # Check if we found a process
            if 'não encontrado' in page_text.lower() or 'nenhum processo' in page_text.lower():
                return []
            
            # Create base process info
            processo = ProcessoInfo(
                numero=f"{classe} {numero}",
                tribunal=self.tribunal_sigla,
                url=self.page.url,
                classe=classe
            )
            
            # Extract numero unico
            try:
                numero_unico_el = await self.page.query_selector('#descricao-classe')
                if numero_unico_el:
                    texto = await numero_unico_el.text_content()
                    # Look for NÚMERO ÚNICO pattern
                    match = re.search(r'NÚMERO ÚNICO:\s*([^\n]+)', page_text)
                    if match:
                        processo.numero_unico = match.group(1).strip()
            except:
                pass
            
            # Extract relator using selector
            try:
                dados_els = await self.page.query_selector_all('.processo-dados')
                for el in dados_els:
                    text = await el.text_content()
                    if text and 'Relator(a):' in text and 'último incidente' not in text:
                        # Extract just the name after "Relator(a):"
                        match = re.search(r'Relator\(a\):\s*(.+)', text)
                        if match:
                            processo.relator = match.group(1).strip()
                        break
            except:
                pass
            
            # Extract origem using selector
            try:
                origem_el = await self.page.query_selector('#descricao-procedencia')
                if origem_el:
                    processo.origem = (await origem_el.text_content()).strip()
            except:
                pass
            
            # Extract partes using proper selectors
            partes = []
            try:
                # First try the detailed partes section
                partes_els = await self.page.query_selector_all('.nome-parte')
                for el in partes_els:
                    nome = await el.text_content()
                    if nome:
                        nome = nome.strip()
                        if nome and len(nome) > 2 and nome not in partes:
                            partes.append(nome)
                
                # Also get the role (REQTE, REQDO, etc.)
                if not partes:
                    # Try alternate selectors
                    partes_rows = await self.page.query_selector_all('.processo-partes.col-md-8')
                    for el in partes_rows:
                        nome = await el.text_content()
                        if nome:
                            nome = nome.strip()
                            if nome and len(nome) > 2 and nome not in partes:
                                partes.append(nome)
            except:
                pass
            processo.partes = partes[:15]
            
            # Extract assunto
            try:
                assunto_div = await self.page.query_selector('.informacoes__assunto .processo-detalhes')
                if assunto_div:
                    processo.assunto = (await assunto_div.text_content()).strip()
            except:
                pass
            
            # Extract andamentos/movimentacoes
            movimentacoes = []
            try:
                andamentos = await self.page.query_selector_all('.andamento-item')
                for and_el in andamentos[:20]:
                    try:
                        data_el = await and_el.query_selector('.andamento-data')
                        nome_el = await and_el.query_selector('.andamento-nome')
                        
                        data = ""
                        descricao = ""
                        
                        if data_el:
                            data = (await data_el.text_content()).strip()
                        if nome_el:
                            descricao = (await nome_el.text_content()).strip()
                        
                        if data and descricao:
                            # Get additional details if available
                            detalhes_el = await and_el.query_selector('.andamento-descricao')
                            detalhes = None
                            if detalhes_el:
                                detalhes = (await detalhes_el.text_content()).strip()
                            
                            mov = Movimentacao(
                                data=data,
                                descricao=descricao,
                                detalhes=detalhes
                            )
                            movimentacoes.append(mov)
                    except:
                        continue
            except:
                pass
            processo.movimentacoes = movimentacoes
            
            processos.append(processo)
            
        except Exception as e:
            print(f"Error extracting details: {e}", file=sys.stderr)
        
        return processos
    
    async def _extrair_lista_resultados(self) -> List[ProcessoInfo]:
        """Extract list of processes from search results"""
        processos = []
        
        try:
            content = await self.page.content()
            
            # Look for STF process patterns
            patterns = [
                r'(ADI|HC|RE|ARE|MI|MS|RCL|ACO|IF|Pet|Ext|AP|Inq|Rcl|SS|SL|STA|STP|ADPF|ADC|ADO|RHC)\s*[\d]+',
            ]
            
            found = set()
            for pattern in patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                for match in matches:
                    # Get the full number with class
                    full_pattern = rf'({match}\s*\d+)'
                    full_matches = re.findall(full_pattern, content, re.IGNORECASE)
                    for fm in full_matches:
                        found.add(fm.upper())
            
            for numero in list(found)[:20]:
                processo = ProcessoInfo(
                    numero=numero,
                    tribunal=self.tribunal_sigla,
                    url=self.page.url
                )
                processos.append(processo)
                
        except Exception as e:
            print(f"Error extracting list: {e}")
        
        return processos


async def main():
    """Test the scraper"""
    scraper = STFScraper()
    
    print("Testing search by number: ADI 1")
    resultado = await scraper.buscar_por_numero("ADI 1")
    print(resultado.to_json())


if __name__ == "__main__":
    asyncio.run(main())
