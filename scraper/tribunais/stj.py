"""
Scraper for STJ - Superior Tribunal de Justica
https://www.stj.jus.br/
"""
import asyncio
import re
from playwright.async_api import async_playwright, Browser, Page
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import BaseScraper, ResultadoBusca, ProcessoInfo, Movimentacao


class STJScraper(BaseScraper):
    """Scraper for Superior Tribunal de Justica"""
    
    def __init__(self):
        super().__init__()
        self.tribunal_nome = "Superior Tribunal de Justica"
        self.tribunal_sigla = "STJ"
        self.base_url = "https://processo.stj.jus.br/processo"
        self.browser: Browser = None
        self.page: Page = None
        
        self.classes_stj = [
            "REsp", "HC", "RHC", "AgInt", "AREsp", "CC", "RMS", "AgRg",
            "EDcl", "Rcl", "RvCr", "SE", "SD", "MS", "Pet", "IF", "AR"
        ]
    
    async def _init_browser(self):
        """Initialize browser"""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        self.page = await self.browser.new_page()
        await self.page.set_viewport_size({"width": 1280, "height": 800})
    
    async def _close_browser(self):
        """Close browser"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
    
    def _parse_stj_number(self, numero: str) -> tuple:
        """Parse STJ process number"""
        numero = numero.strip().upper()
        
        for classe in self.classes_stj:
            pattern = rf'^{classe}\s*[:\-]?\s*(\d+)'
            match = re.match(pattern, numero, re.IGNORECASE)
            if match:
                return (classe, match.group(1))
        
        cnj_pattern = r'^(\d{7})-?(\d{2})\.?(\d{4})\.?3\.?00\.?(\d{4})$'
        cleaned = numero.replace(' ', '').replace('-', '').replace('.', '')
        match = re.match(cnj_pattern, cleaned)
        if match:
            return ("CNJ", numero)
        
        if re.match(r'^\d{5,}$', numero.replace(' ', '')):
            return ("REGISTRO", numero.replace(' ', ''))
        
        return (None, None)
    
    async def buscar_por_numero(self, numero: str) -> ResultadoBusca:
        """Search for a case by its number"""
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="numero",
            termo_busca=numero
        )
        
        try:
            await self._init_browser()
            
            tipo, num = self._parse_stj_number(numero)
            
            if tipo in self.classes_stj:
                url = f"{self.base_url}/pesquisa/?aplicacao=processos.ea&tipoPesquisa=tipoPesquisaNumeroUnico&classe={tipo}&numeroProcesso={num}"
            elif tipo == "REGISTRO" or tipo == "CNJ":
                url = f"{self.base_url}/pesquisa/?aplicacao=processos.ea&tipoPesquisa=tipoPesquisaNumeroRegistro&num_registro={num}"
            else:
                resultado.erro = f"Formato de numero invalido: {numero}. Use formato CLASSE NUMERO (ex: REsp 1234567) ou numero de registro."
                return resultado
            
            await self.page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(3)
            
            try:
                processo = await self._extrair_detalhes()
                if processo:
                    resultado.processos.append(processo)
            except Exception as e:
                resultado.erro = f"Erro ao extrair detalhes: {str(e)}"
                
        except Exception as e:
            resultado.erro = f"Erro ao consultar STJ: {str(e)}"
        finally:
            await self._close_browser()
        
        return resultado
    
    async def _extrair_detalhes(self) -> ProcessoInfo:
        """Extract process details from the page"""
        processo = ProcessoInfo(
            numero="",
            tribunal=self.tribunal_sigla
        )
        
        page_text = await self.page.evaluate('() => document.body.innerText')
        
        if 'nenhum processo' in page_text.lower() or 'nao encontrado' in page_text.lower():
            return None
        
        numero_el = await self.page.query_selector('.numero-processo, .numeroProcesso, h2.processo')
        if numero_el:
            processo.numero = (await numero_el.text_content()).strip()
        
        classe_el = await self.page.query_selector('.classe-processo, .classe')
        if classe_el:
            processo.classe = (await classe_el.text_content()).strip()
        
        relator_el = await self.page.query_selector('.relator, [class*="relator"]')
        if relator_el:
            processo.relator = (await relator_el.text_content()).strip()
        
        assunto_el = await self.page.query_selector('.assunto, [class*="assunto"]')
        if assunto_el:
            processo.assunto = (await assunto_el.text_content()).strip()
        
        partes_els = await self.page.query_selector_all('.parte, [class*="parte"]')
        for parte_el in partes_els:
            parte_text = await parte_el.text_content()
            if parte_text:
                processo.partes.append(parte_text.strip())
        
        movs_els = await self.page.query_selector_all('.andamento, .movimento, tr[class*="andamento"]')
        for mov_el in movs_els:
            try:
                data_el = await mov_el.query_selector('.data, td:first-child')
                desc_el = await mov_el.query_selector('.descricao, td:last-child')
                
                data = ""
                descricao = ""
                
                if data_el:
                    data = (await data_el.text_content()).strip()
                if desc_el:
                    descricao = (await desc_el.text_content()).strip()
                
                if data or descricao:
                    processo.movimentacoes.append(Movimentacao(
                        data=data,
                        descricao=descricao
                    ))
            except:
                continue
        
        processo.url = self.page.url
        
        if not processo.numero:
            return None
        
        return processo
    
    async def buscar_por_nome(self, nome: str) -> ResultadoBusca:
        """Search for cases by party name"""
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="nome",
            termo_busca=nome
        )
        
        try:
            await self._init_browser()
            
            from urllib.parse import quote
            nome_encoded = quote(nome.strip())
            
            url = f"{self.base_url}/pesquisa/?aplicacao=processos.ea&tipoPesquisa=tipoPesquisaNomeParte&nome_parte={nome_encoded}"
            
            await self.page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(3)
            
            processos = []
            
            links = await self.page.query_selector_all('a[href*="processo/pesquisa"], a[href*="detalhe"]')
            
            for link in links[:10]:
                try:
                    href = await link.get_attribute('href')
                    text = await link.text_content()
                    
                    if href and text:
                        text = text.strip()
                        for classe in self.classes_stj:
                            match = re.search(rf'({classe})\s*[:\-]?\s*(\d+)', text, re.IGNORECASE)
                            if match:
                                processo = ProcessoInfo(
                                    numero=f"{match.group(1)} {match.group(2)}",
                                    tribunal=self.tribunal_sigla,
                                    url=href if href.startswith('http') else f"https://processo.stj.jus.br{href}",
                                    classe=match.group(1)
                                )
                                if not any(p.numero == processo.numero for p in processos):
                                    processos.append(processo)
                                break
                except:
                    continue
            
            resultado.processos = processos
            
            if not processos:
                page_text = await self.page.evaluate('() => document.body.innerText')
                if 'nenhum' in page_text.lower() or 'nao encontrado' in page_text.lower():
                    resultado.erro = f"Nenhum processo encontrado para '{nome}' no STJ"
                else:
                    resultado.erro = "Nao foi possivel extrair resultados"
                
        except Exception as e:
            resultado.erro = f"Erro ao consultar STJ: {str(e)}"
        finally:
            await self._close_browser()
        
        return resultado
