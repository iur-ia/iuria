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
        
        # STF process classes
        self.classes_stf = [
            "AC", "ACO", "ADC", "ADI", "ADO", "ADPF", "AI", "AImp", "AO", "AOE",
            "AP", "AR", "ARE", "AS", "CC", "Cm", "EI", "EL", "EP", "Ext",
            "HC", "HD", "IF", "Inq", "MI", "MS", "PADM", "Pet", "PPE", "PSV",
            "RC", "Rcl", "RE", "RHC", "RHD", "RMI", "RMS", "RvC", "SE",
            "SIRDR", "SL", "SS", "STA", "STP", "TPA"
        ]
    
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
        Examples: 'ADI 1', 'HC 123456', 'ARE 1234567'
        Returns: (classe, numero) or (None, None)
        """
        numero = numero.strip().upper()
        
        # Pattern: CLASS NUMBER (with or without space)
        for classe in sorted(self.classes_stf, key=len, reverse=True):
            pattern = rf'^({classe})\s*(\d+)$'
            match = re.match(pattern, numero, re.IGNORECASE)
            if match:
                return match.group(1).upper(), match.group(2)
        
        # If just a number, return None for class
        if numero.isdigit():
            return None, numero
        
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
        Search for cases by party name
        Uses the search interface
        """
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="nome",
            termo_busca=nome
        )
        
        try:
            await self._init_browser()
            
            # Use search URL with party parameter
            # Note: STF may not have a direct URL for party search
            url = f"{self.base_url}/processos/"
            await self.page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(2)
            
            # Handle cookie consent
            try:
                cookie_btn = await self.page.query_selector('button:has-text("Estou ciente")')
                if cookie_btn:
                    await cookie_btn.click()
                    await asyncio.sleep(1)
            except:
                pass
            
            # Look for the party search input and fill it
            # The portal has a dynamic form, so we need to interact with it
            try:
                # Find and click on "Por Parte" radio/option
                parte_options = await self.page.query_selector_all('input[type="radio"], a, button, span')
                for option in parte_options:
                    try:
                        text = await option.text_content()
                        if text and 'parte' in text.lower():
                            await option.click()
                            await asyncio.sleep(1)
                            break
                    except:
                        continue
                
                # Find the input for party name and fill it
                inputs = await self.page.query_selector_all('input[type="text"]')
                for inp in inputs:
                    try:
                        placeholder = await inp.get_attribute('placeholder')
                        if placeholder and ('parte' in placeholder.lower() or 'nome' in placeholder.lower()):
                            await inp.fill(nome)
                            await asyncio.sleep(0.5)
                            await inp.press('Enter')
                            break
                    except:
                        continue
                
                await asyncio.sleep(3)
                
                # Extract results
                processos = await self._extrair_lista_resultados()
                resultado.processos = processos
                
                if not processos:
                    resultado.erro = "Busca por nome requer interação com o portal. Use busca por número para resultados mais precisos."
                
            except Exception as e:
                resultado.erro = f"Erro na busca por nome: {str(e)}. A busca por nome no STF requer interação manual."
            
        except Exception as e:
            resultado.erro = f"Erro ao consultar STF: {str(e)}"
        finally:
            await self._close_browser()
        
        return resultado
    
    async def _extrair_detalhes_pagina(self, classe: str, numero: str) -> List[ProcessoInfo]:
        """Extract process details from the current page"""
        processos = []
        
        try:
            # Get page content
            content = await self.page.content()
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
            
            # Extract relator
            relator_patterns = [
                r'Relator[a-z\(\)]*[:\s]+Min\.\s*([^<\n]+)',
                r'Relator[:\s]+([^<\n]+)',
                r'RELATOR[:\s]+([^<\n]+)'
            ]
            for pattern in relator_patterns:
                match = re.search(pattern, content, re.IGNORECASE)
                if match:
                    processo.relator = match.group(1).strip()[:100]
                    break
            
            # Extract parties (partes)
            partes = []
            partes_patterns = [
                r'REQTE\.?\s*[:\s]*([^<\n]+)',
                r'REQDO\.?\s*[:\s]*([^<\n]+)',
                r'Requerente[:\s]+([^<\n]+)',
                r'Requerido[:\s]+([^<\n]+)',
                r'IMPTE\.?\s*[:\s]*([^<\n]+)',
                r'IMPDO\.?\s*[:\s]*([^<\n]+)',
                r'Impetrante[:\s]+([^<\n]+)',
                r'Impetrado[:\s]+([^<\n]+)',
                r'PACTE\.?\s*[:\s]*([^<\n]+)',
                r'Paciente[:\s]+([^<\n]+)'
            ]
            for pattern in partes_patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                for match in matches[:5]:
                    parte = match.strip()[:150]
                    if parte and len(parte) > 2 and parte not in partes:
                        partes.append(parte)
            processo.partes = partes[:10]
            
            # Extract subject/assunto
            assunto_patterns = [
                r'Assunto[:\s]+([^<\n]+)',
                r'ASSUNTO[:\s]+([^<\n]+)'
            ]
            for pattern in assunto_patterns:
                match = re.search(pattern, content, re.IGNORECASE)
                if match:
                    processo.assunto = match.group(1).strip()[:200]
                    break
            
            # Extract origin
            origem_patterns = [
                r'Origem[:\s]+([^<\n]+)',
                r'ORIGEM[:\s]+([^<\n]+)',
                r'Procedência[:\s]+([^<\n]+)'
            ]
            for pattern in origem_patterns:
                match = re.search(pattern, content, re.IGNORECASE)
                if match:
                    processo.origem = match.group(1).strip()[:150]
                    break
            
            # Extract movements/andamentos
            movimentacoes = []
            # Look for dates followed by descriptions
            mov_pattern = r'(\d{2}/\d{2}/\d{4})[:\s-]+([^<\n]+)'
            matches = re.findall(mov_pattern, content)
            for match in matches[:20]:
                data, descricao = match
                if len(descricao.strip()) > 5:
                    mov = Movimentacao(
                        data=data,
                        descricao=descricao.strip()[:300]
                    )
                    movimentacoes.append(mov)
            processo.movimentacoes = movimentacoes
            
            processos.append(processo)
            
        except Exception as e:
            print(f"Error extracting details: {e}")
        
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
