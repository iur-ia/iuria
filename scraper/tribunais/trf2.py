"""
Scraper for TRF2 - Tribunal Regional Federal da 2a Regiao
https://www10.trf2.jus.br/
"""
import asyncio
import re
from playwright.async_api import async_playwright, Browser, Page
from ..base_scraper import BaseScraper, ResultadoBusca, ProcessoInfo, Movimentacao


class TRF2Scraper(BaseScraper):
    """Scraper for Tribunal Regional Federal da 2a Regiao (RJ/ES)"""
    
    def __init__(self):
        super().__init__()
        self.tribunal_nome = "Tribunal Regional Federal da 2a Regiao"
        self.tribunal_sigla = "TRF2"
        self.base_url = "https://www10.trf2.jus.br/consultas"
        self.browser: Browser = None
        self.page: Page = None
    
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
    
    def _parse_cnj_number(self, numero: str) -> dict:
        """Parse CNJ format number"""
        numero = numero.replace(' ', '').replace('-', '').replace('.', '')
        
        cnj_pattern = r'^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$'
        match = re.match(cnj_pattern, numero)
        
        if match:
            return {
                'sequencial': match.group(1),
                'digito': match.group(2),
                'ano': match.group(3),
                'justica': match.group(4),
                'tribunal': match.group(5),
                'origem': match.group(6),
                'formatado': f"{match.group(1)}-{match.group(2)}.{match.group(3)}.{match.group(4)}.{match.group(5)}.{match.group(6)}"
            }
        return None
    
    async def buscar_por_numero(self, numero: str) -> ResultadoBusca:
        """Search for a case by its number"""
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="numero",
            termo_busca=numero
        )
        
        try:
            await self._init_browser()
            
            parsed = self._parse_cnj_number(numero)
            
            if parsed:
                url = f"{self.base_url}/processo-consulta?numproc={parsed['formatado']}"
            else:
                numero_limpo = re.sub(r'[^\d]', '', numero)
                url = f"{self.base_url}/processo-consulta?numproc={numero_limpo}"
            
            await self.page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(3)
            
            try:
                processo = await self._extrair_detalhes()
                if processo:
                    resultado.processos.append(processo)
            except Exception as e:
                resultado.erro = f"Erro ao extrair detalhes: {str(e)}"
                
        except Exception as e:
            resultado.erro = f"Erro ao consultar TRF2: {str(e)}"
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
        
        numero_el = await self.page.query_selector('.numero-processo, [class*="numero"], h2')
        if numero_el:
            processo.numero = (await numero_el.text_content()).strip()
        
        classe_el = await self.page.query_selector('.classe, [class*="classe"]')
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
        
        movs_els = await self.page.query_selector_all('.andamento, .movimento, tr.linha-andamento')
        for mov_el in movs_els:
            try:
                data_el = await mov_el.query_selector('.data, td:first-child')
                desc_el = await mov_el.query_selector('.descricao, td:nth-child(2)')
                
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
            
            url = f"{self.base_url}/processo-consulta?tipoPesquisa=parte&nomeParte={nome_encoded}"
            
            await self.page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(3)
            
            processos = []
            
            rows = await self.page.query_selector_all('table tr, .resultado-item, .processo-item')
            
            for row in rows[:10]:
                try:
                    text = await row.text_content()
                    if text:
                        cnj_match = re.search(r'(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})', text)
                        if cnj_match:
                            numero_formatado = f"{cnj_match.group(1)}-{cnj_match.group(2)}.{cnj_match.group(3)}.{cnj_match.group(4)}.{cnj_match.group(5)}.{cnj_match.group(6)}"
                            processo = ProcessoInfo(
                                numero=numero_formatado,
                                tribunal=self.tribunal_sigla
                            )
                            if not any(p.numero == processo.numero for p in processos):
                                processos.append(processo)
                except:
                    continue
            
            resultado.processos = processos
            
            if not processos:
                page_text = await self.page.evaluate('() => document.body.innerText')
                if 'nenhum' in page_text.lower() or 'nao encontrado' in page_text.lower():
                    resultado.erro = f"Nenhum processo encontrado para '{nome}' no TRF2"
                else:
                    resultado.erro = "Nao foi possivel extrair resultados"
                
        except Exception as e:
            resultado.erro = f"Erro ao consultar TRF2: {str(e)}"
        finally:
            await self._close_browser()
        
        return resultado
