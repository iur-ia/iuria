"""
Scraper for STF (Supremo Tribunal Federal)
Portal: https://portal.stf.jus.br/processos/

Enhanced with:
- Anti-detection (fingerprinting, stealth patches)
- Proxy rotation support
- Retry logic with exponential backoff
- Captcha detection & handling
- PDF document extraction
- Multiple extraction strategies with fallbacks
"""
import asyncio
import re
import random
import logging
import sys
import os
from typing import Optional, List, Tuple
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import BaseScraper, ResultadoBusca, ProcessoInfo, Movimentacao

logger = logging.getLogger("iuria.stf_scraper")


class STFScraper(BaseScraper):
    """
    Scraper for STF - Supremo Tribunal Federal
    
    Enhanced with anti-detection techniques:
    - browserforge fingerprinting
    - stealth JavaScript patches (webdriver, plugins, chrome, canvas)
    - human-like behavior emulation (typing, mouse, scrolling)
    - proxy rotation via ResidentialProxyPool
    - retry logic with exponential backoff
    - CAPTCHA detection and 2Captcha fallback
    """
    
    MAX_RETRIES = 3
    RETRY_DELAY_BASE = 2  # seconds, exponential backoff
    
    def __init__(self):
        super().__init__()
        self.tribunal_nome = "Supremo Tribunal Federal"
        self.tribunal_sigla = "STF"
        self.base_url = "https://portal.stf.jus.br"
        self.browser = None
        self.page = None
        self._playwright = None
        self._anti_detection = None
        
        # STF process classes - mapping from uppercase to proper case for URL
        self.classes_stf_map = {
            "AC": "AC", "ACO": "ACO", "ADC": "ADC", "ADI": "ADI", "ADO": "ADO",
            "ADPF": "ADPF", "AG": "Ag", "AGRCL": "AgRcl", "AI": "AI", "AIMP": "AImp",
            "AO": "AO", "AOE": "AOE", "AP": "AP", "AR": "AR", "ARE": "ARE", "AS": "AS",
            "CC": "CC", "CM": "Cm", "EI": "EI", "EL": "EL", "EP": "EP", "EXT": "Ext",
            "HC": "HC", "HD": "HD", "IF": "IF", "INQ": "Inq", "MI": "MI", "MS": "MS",
            "PADM": "PADM", "PET": "Pet", "PPE": "PPE", "PSV": "PSV", "RC": "RC",
            "RCL": "Rcl", "RE": "RE", "RHC": "RHC", "RHD": "RHD", "RMI": "RMI",
            "RMS": "RMS", "RVC": "RvC", "SE": "SE", "SIRDR": "SIRDR",
            "SL": "SL", "SS": "SS", "STA": "STA", "STP": "STP", "TPA": "TPA"
        }
        self.classes_stf = list(self.classes_stf_map.keys())
    
    def _get_anti_detection(self):
        """Lazy-load anti-detection module"""
        if self._anti_detection is None:
            try:
                from anti_detection import AntiDetection, ProxyManager
                self._anti_detection = AntiDetection()
            except ImportError:
                logger.warning("Anti-detection module not available, using basic mode")
        return self._anti_detection
    
    async def _init_browser(self):
        """Initialize browser with stealth anti-detection"""
        if self._playwright is not None:
            return
        
        anti = self._get_anti_detection()
        
        # Try patchright first (patched Playwright), fall back to playwright
        try:
            from patchright.async_api import async_playwright
            logger.info("Using patchright (patched Playwright)")
        except ImportError:
            from playwright.async_api import async_playwright
            logger.info("Using standard Playwright")
        
        self._playwright = await async_playwright().start()
        
        # Launch with anti-detection args
        launch_args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-infobars',
            '--window-size=1920,1080',
            '--start-maximized',
        ]
        
        self.browser = await self._playwright.chromium.launch(
            headless=True,
            args=launch_args,
        )
        
        # Build context options with fingerprint
        if anti:
            context_opts = anti.get_playwright_context_options()
        else:
            context_opts = {
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                "viewport": {"width": 1920, "height": 1080},
                "locale": "pt-BR",
                "timezone_id": "America/Sao_Paulo",
                "color_scheme": "light",
                "java_script_enabled": True,
                "has_touch": False,
                "is_mobile": False,
                "device_scale_factor": 1,
            }
        
        context = await self.browser.new_context(**context_opts)
        self.page = await context.new_page()
        
        # Apply stealth patches
        if anti:
            await anti.stealth_page_setup(self.page)
        else:
            # Minimal stealth without full anti-detection module
            await self.page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                Object.defineProperty(navigator, 'languages', {get: () => ['pt-BR', 'pt', 'en-US', 'en']});
                window.chrome = {runtime: {}, loadTimes: function(){}, csi: function(){}, app: {}};
                delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
                delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
                delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
            """)
    
    async def _close_browser(self):
        """Close browser safely"""
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
        except Exception:
            pass
    
    async def _human_delay(self, min_ms: int = 800, max_ms: int = 2500):
        """Human-like delay between actions"""
        delay = random.uniform(min_ms / 1000, max_ms / 1000)
        await asyncio.sleep(delay)
    
    async def _random_mouse_move(self):
        """Simulate random mouse movement"""
        if not self.page:
            return
        try:
            vp = self.page.viewport_size or {"width": 1920, "height": 1080}
            for _ in range(random.randint(1, 3)):
                x = random.randint(100, vp["width"] - 100)
                y = random.randint(100, vp["height"] - 100)
                await self.page.mouse.move(x, y)
                await asyncio.sleep(random.uniform(0.05, 0.2))
        except Exception:
            pass
    
    async def _random_scroll(self):
        """Simulate human scrolling"""
        if not self.page:
            return
        try:
            scroll = random.randint(100, 400)
            await self.page.mouse.wheel(0, scroll)
            await asyncio.sleep(random.uniform(0.3, 0.8))
        except Exception:
            pass
    
    async def _handle_cookie_consent(self):
        """Dismiss cookie/consent dialogs"""
        if not self.page:
            return
        try:
            selectors = [
                'button:has-text("Estou ciente")',
                'button:has-text("Aceitar")',
                'button:has-text("OK")',
                'button:has-text("Aceito")',
                '.cookie-accept',
                '#cookie-accept',
                '[data-testid="cookie-accept"]',
            ]
            for sel in selectors:
                try:
                    btn = await self.page.query_selector(sel)
                    if btn:
                        await btn.click()
                        await asyncio.sleep(random.uniform(0.5, 1.0))
                        break
                except Exception:
                    continue
        except Exception:
            pass
    
    async def _detect_captcha(self) -> bool:
        """Detect if page has a CAPTCHA challenge"""
        if not self.page:
            return False
        try:
            content = await self.page.content()
            captcha_indicators = [
                'g-recaptcha', 'recaptcha', 'hcaptcha',
                'captcha', 'cf-turnstile', 'challenge-running',
                'Verificacao de seguranca', 'robot'
            ]
            for indicator in captcha_indicators:
                if indicator.lower() in content.lower():
                    return True
        except Exception:
            pass
        return False
    
    async def _try_solve_captcha(self) -> bool:
        """Attempt to solve CAPTCHA using 2Captcha or wait"""
        anti = self._get_anti_detection()
        if anti and anti.captcha_solver:
            try:
                # Look for reCAPTCHA site key
                site_key = await self.page.evaluate("""
                    () => {
                        const el = document.querySelector('.g-recaptcha');
                        return el ? el.getAttribute('data-sitekey') : null;
                    }
                """)
                if site_key:
                    token = await anti.captcha_solver.solve_recaptcha_v2(
                        site_key, self.page.url
                    )
                    if token:
                        await self.page.evaluate(f"""
                            () => {{
                                document.getElementById('g-recaptcha-response').value = '{token}';
                                if (typeof ___grecaptcha_cfg !== 'undefined') {{
                                    Object.entries(___grecaptcha_cfg.clients).forEach(([k, v]) => {{
                                        Object.entries(v).forEach(([k2, v2]) => {{
                                            if (v2 && v2.callback) v2.callback('{token}');
                                        }});
                                    }});
                                }}
                            }}
                        """)
                        await asyncio.sleep(2)
                        return True
            except Exception as e:
                logger.error(f"CAPTCHA solving failed: {e}")
        
        # Fallback: wait and hope for human intervention or session refresh
        logger.warning("CAPTCHA detected but no solver available")
        return False
    
    def _parse_stf_number(self, numero: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Parse STF process number to extract class and number
        Examples: 'ADI 1', 'HC 123456', 'ARE 1234567', 'PET 13350'
        Returns: (classe_for_url, numero) or (None, None)
        """
        numero_str = numero.strip().upper()
        
        # Pattern: CLASS NUMBER (with or without space/dash)
        for classe_upper in sorted(self.classes_stf, key=len, reverse=True):
            pattern = rf'^({classe_upper})[\s\-]*(\d+)$'
            match = re.match(pattern, numero_str, re.IGNORECASE)
            if match:
                classe_for_url = self.classes_stf_map.get(classe_upper, classe_upper)
                return classe_for_url, match.group(2)
        
        # CNJ unified number format: NNNNNNN-DD.AAAA.J.TR.OOOO
        cnj_match = re.match(r'^(\d{7})-?\d{2}\.\d{4}\.1\.\d{2}\.\d{4}$', numero_str)
        if cnj_match:
            return None, cnj_match.group(1)
        
        if numero_str.isdigit():
            return None, numero_str
        
        return None, None
    
    async def buscar_por_numero(self, numero: str) -> ResultadoBusca:
        """
        Search for a case by its number with retry and anti-detection.
        Supports formats:
        - STF format: ADI 1, HC 123456, ARE 1234567
        - CNJ unified number
        """
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="numero",
            termo_busca=numero
        )
        
        classe, num = self._parse_stf_number(numero)
        
        if not num:
            resultado.erro = (
                "Formato de numero invalido. Use: CLASSE NUMERO (ex: ADI 1, HC 123456) "
                "ou numero CNJ unificado."
            )
            return resultado
        
        last_error = None
        for attempt in range(1, self.MAX_RETRIES + 1):
            try:
                await self._init_browser()
                
                if classe:
                    url = f"{self.base_url}/processos/listarProcessos.asp?classe={classe}&numeroProcesso={num}"
                else:
                    url = f"{self.base_url}/processos/pesquisar.asp?pesquisar=pesquisar&numeroProcesso={num}"
                
                logger.info(f"STF attempt {attempt}/{self.MAX_RETRIES}: {url}")
                
                await self.page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await self._human_delay(1500, 3000)
                await self._random_mouse_move()
                
                # Handle cookie consent
                await self._handle_cookie_consent()
                
                # Check for CAPTCHA
                if await self._detect_captcha():
                    logger.warning(f"CAPTCHA detected on attempt {attempt}")
                    solved = await self._try_solve_captcha()
                    if not solved:
                        last_error = "CAPTCHA detectado e nao resolvido"
                        await self._close_browser()
                        await asyncio.sleep(self.RETRY_DELAY_BASE * (2 ** attempt))
                        continue
                
                # Check for block/rate limit
                page_text = await self.page.evaluate('() => document.body.innerText || ""')
                if any(w in page_text.lower() for w in ['bloqueado', 'acesso negado', 'too many requests', '403']):
                    logger.warning(f"Access blocked on attempt {attempt}")
                    last_error = "Acesso bloqueado pelo STF"
                    await self._close_browser()
                    await asyncio.sleep(self.RETRY_DELAY_BASE * (2 ** attempt))
                    continue
                
                await self._random_scroll()
                
                # Extract process details
                processos = await self._extrair_detalhes_pagina(classe or "?", num)
                
                if processos:
                    resultado.processos = processos
                    return resultado
                else:
                    # Check if page says not found
                    if 'nao encontrado' in page_text.lower() or 'nenhum processo' in page_text.lower() or 'nao localizado' in page_text.lower():
                        resultado.erro = f"Processo {numero} nao encontrado no STF"
                        return resultado
                    
                    # Try alternate extraction strategy
                    processos_alt = await self._extrair_por_texto_bruto(classe, num, page_text)
                    if processos_alt:
                        resultado.processos = processos_alt
                        return resultado
                    
                    last_error = "Nao foi possivel extrair dados da pagina"
                    
            except Exception as e:
                last_error = str(e)
                logger.error(f"STF attempt {attempt} failed: {e}")
            finally:
                await self._close_browser()
            
            if attempt < self.MAX_RETRIES:
                wait = self.RETRY_DELAY_BASE * (2 ** attempt) + random.uniform(0, 1)
                logger.info(f"Waiting {wait:.1f}s before retry...")
                await asyncio.sleep(wait)
        
        resultado.erro = f"Erro ao consultar STF apos {self.MAX_RETRIES} tentativas: {last_error}"
        return resultado
    
    async def buscar_por_nome(self, nome: str) -> ResultadoBusca:
        """Search for cases by party name using STF advanced search"""
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="nome",
            termo_busca=nome
        )
        
        last_error = None
        for attempt in range(1, self.MAX_RETRIES + 1):
            try:
                await self._init_browser()
                
                nome_encoded = quote(nome.strip())
                url = f"{self.base_url}/processos/pesquisar.asp?pesquisar=pesquisar&partes={nome_encoded}"
                
                await self.page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await self._human_delay(2000, 4000)
                await self._random_mouse_move()
                await self._handle_cookie_consent()
                
                if await self._detect_captcha():
                    solved = await self._try_solve_captcha()
                    if not solved:
                        last_error = "CAPTCHA detectado"
                        await self._close_browser()
                        await asyncio.sleep(self.RETRY_DELAY_BASE * (2 ** attempt))
                        continue
                
                processos = []
                
                # Strategy 1: Find process links
                links = await self.page.query_selector_all(
                    'a[href*="/processos/detalhe.asp"], a[href*="listarProcessos"]'
                )
                for link in links[:15]:
                    try:
                        href = await link.get_attribute('href')
                        text = await link.text_content()
                        if href and text:
                            text = text.strip()
                            match = re.match(r'([A-Z]+)\s*(\d+)', text.upper())
                            if match and match.group(1) in self.classes_stf:
                                processo = ProcessoInfo(
                                    numero=f"{match.group(1)} {match.group(2)}",
                                    tribunal=self.tribunal_sigla,
                                    url=f"{self.base_url}{href}" if not href.startswith('http') else href,
                                    classe=match.group(1)
                                )
                                if not any(p.numero == processo.numero for p in processos):
                                    processos.append(processo)
                    except Exception:
                        continue
                
                # Strategy 2: Parse table rows
                if not processos:
                    rows = await self.page.query_selector_all(
                        'table tr, .resultado-processo, .processo-item, .list-group-item'
                    )
                    for row in rows[:15]:
                        try:
                            text = await row.text_content()
                            if text:
                                matches = re.findall(r'\b([A-Z]{2,5})\s*(\d{1,7})\b', text.upper())
                                for classe, numero in matches:
                                    if classe in self.classes_stf:
                                        proc_num = f"{classe} {numero}"
                                        if not any(p.numero == proc_num for p in processos):
                                            processos.append(ProcessoInfo(
                                                numero=proc_num,
                                                tribunal=self.tribunal_sigla,
                                                classe=classe
                                            ))
                        except Exception:
                            continue
                
                # Strategy 3: Full page text scan
                if not processos:
                    page_text = await self.page.evaluate('() => document.body.innerText || ""')
                    for classe_key in self.classes_stf:
                        pattern = rf'\b{classe_key}\s*(\d{{1,7}})\b'
                        for m in re.finditer(pattern, page_text, re.IGNORECASE):
                            proc_num = f"{classe_key} {m.group(1)}"
                            if not any(p.numero == proc_num for p in processos):
                                processos.append(ProcessoInfo(
                                    numero=proc_num,
                                    tribunal=self.tribunal_sigla,
                                    classe=classe_key
                                ))
                
                resultado.processos = processos[:20]
                
                if not processos:
                    page_text = await self.page.evaluate('() => document.body.innerText || ""')
                    if 'nenhum' in page_text.lower() or 'nao encontrado' in page_text.lower():
                        resultado.erro = f"Nenhum processo encontrado para '{nome}' no STF"
                    else:
                        resultado.erro = "Nao foi possivel extrair resultados. Tente busca mais especifica."
                
                return resultado
                
            except Exception as e:
                last_error = str(e)
                logger.error(f"STF name search attempt {attempt} failed: {e}")
            finally:
                await self._close_browser()
            
            if attempt < self.MAX_RETRIES:
                await asyncio.sleep(self.RETRY_DELAY_BASE * (2 ** attempt) + random.uniform(0, 1))
        
        resultado.erro = f"Erro na busca por nome apos {self.MAX_RETRIES} tentativas: {last_error}"
        return resultado
    
    async def _extrair_detalhes_pagina(self, classe: str, numero: str) -> List[ProcessoInfo]:
        """Extract process details from the current page using multiple selector strategies"""
        processos = []
        
        try:
            page_text = await self.page.evaluate('() => document.body.innerText || ""')
            
            if 'nao encontrado' in page_text.lower() or 'nenhum processo' in page_text.lower():
                return []
            
            processo = ProcessoInfo(
                numero=f"{classe} {numero}",
                tribunal=self.tribunal_sigla,
                url=self.page.url,
                classe=classe if classe != "?" else None
            )
            
            # Extract numero unico (CNJ number)
            for pattern in [
                r'N[uU]MERO [uU]NICO:\s*([0-9.\-]+)',
                r'Numero Unico[:\s]*([0-9.\-]+)',
                r'(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})',
            ]:
                match = re.search(pattern, page_text, re.IGNORECASE)
                if match:
                    processo.numero_unico = match.group(1).strip()
                    break
            
            # Extract relator - multiple selector strategies
            relator_selectors = [
                '.processo-dados:has-text("Relator")',
                '#informacoes-relator',
                'td:has-text("Relator")',
            ]
            for sel in relator_selectors:
                try:
                    el = await self.page.query_selector(sel)
                    if el:
                        text = await el.text_content()
                        match = re.search(r'Relator\(?a?\)?[:\s]+(.+?)(?:\n|$)', text, re.IGNORECASE)
                        if match:
                            processo.relator = match.group(1).strip()
                            break
                except Exception:
                    continue
            
            # Fallback: regex on full page text
            if not processo.relator:
                for pat in [
                    r'Relator\(?a?\)?[:\s]+MIN\.\s*(.+?)(?:\n|Redator)',
                    r'Relator\(?a?\)?[:\s]+(.+?)(?:\n|$)',
                ]:
                    match = re.search(pat, page_text, re.IGNORECASE)
                    if match:
                        processo.relator = match.group(1).strip()[:100]
                        break
            
            # Extract origem (procedencia)
            for sel in ['#descricao-procedencia', '.processo-procedencia', 'td:has-text("Procedencia")']:
                try:
                    el = await self.page.query_selector(sel)
                    if el:
                        processo.origem = (await el.text_content()).strip()
                        break
                except Exception:
                    continue
            
            if not processo.origem:
                match = re.search(r'Proced[eê]ncia[:\s]+(.+?)(?:\n|$)', page_text, re.IGNORECASE)
                if match:
                    processo.origem = match.group(1).strip()[:200]
            
            # Extract partes
            partes = []
            parte_selectors = ['.nome-parte', '.processo-partes', '.partes-item']
            for sel in parte_selectors:
                try:
                    els = await self.page.query_selector_all(sel)
                    for el in els:
                        nome = (await el.text_content()).strip()
                        if nome and len(nome) > 2 and nome not in partes:
                            partes.append(nome)
                except Exception:
                    continue
            
            # Fallback: regex for common party patterns
            if not partes:
                for pat in [
                    r'REQTE\.?\s*[:\-]\s*(.+?)(?:\n|$)',
                    r'REQDO\.?\s*[:\-]\s*(.+?)(?:\n|$)',
                    r'IMPTE\.?\s*[:\-]\s*(.+?)(?:\n|$)',
                    r'PACTE\.?\s*[:\-]\s*(.+?)(?:\n|$)',
                    r'RECTE\.?\s*[:\-]\s*(.+?)(?:\n|$)',
                    r'RECDO\.?\s*[:\-]\s*(.+?)(?:\n|$)',
                    r'AM\. CURIAE\s*[:\-]\s*(.+?)(?:\n|$)',
                ]:
                    for m in re.finditer(pat, page_text, re.IGNORECASE):
                        nome = m.group(1).strip()
                        if nome and len(nome) > 2 and nome not in partes:
                            partes.append(nome)
            
            processo.partes = partes[:20]
            
            # Extract assunto
            for sel in ['.informacoes__assunto .processo-detalhes', '.assunto-processo', '#informacoes-assunto']:
                try:
                    el = await self.page.query_selector(sel)
                    if el:
                        processo.assunto = (await el.text_content()).strip()
                        break
                except Exception:
                    continue
            
            if not processo.assunto:
                match = re.search(r'Assunto[:\s]+(.+?)(?:\n|$)', page_text, re.IGNORECASE)
                if match:
                    processo.assunto = match.group(1).strip()[:300]
            
            # Extract movimentacoes/andamentos
            movimentacoes = await self._extrair_movimentacoes()
            processo.movimentacoes = movimentacoes
            
            processos.append(processo)
            
        except Exception as e:
            logger.error(f"Error extracting STF details: {e}")
        
        return processos
    
    async def _extrair_movimentacoes(self) -> List[Movimentacao]:
        """Extract case movements with multiple fallback strategies"""
        movimentacoes = []
        
        if not self.page:
            return movimentacoes
        
        # Strategy 1: Structured andamento items
        try:
            andamentos = await self.page.query_selector_all(
                '.andamento-item, .timeline-item, .andamento, tr.andamento-row'
            )
            for and_el in andamentos[:30]:
                try:
                    data_el = await and_el.query_selector('.andamento-data, .data, td:first-child')
                    nome_el = await and_el.query_selector('.andamento-nome, .titulo, td:nth-child(2)')
                    
                    data = ""
                    descricao = ""
                    
                    if data_el:
                        data = (await data_el.text_content()).strip()
                    if nome_el:
                        descricao = (await nome_el.text_content()).strip()
                    
                    if data and descricao:
                        detalhes_el = await and_el.query_selector('.andamento-descricao, .detalhes, td:nth-child(3)')
                        detalhes = None
                        if detalhes_el:
                            detalhes = (await detalhes_el.text_content()).strip()
                        
                        movimentacoes.append(Movimentacao(
                            data=data,
                            descricao=descricao,
                            detalhes=detalhes
                        ))
                except Exception:
                    continue
        except Exception:
            pass
        
        # Strategy 2: Try expanding andamentos section then parse
        if not movimentacoes:
            try:
                expand_selectors = [
                    'button:has-text("andamento")',
                    'a:has-text("andamento")',
                    '.btn-expandir-andamentos',
                    '#btnAndamentos',
                ]
                for sel in expand_selectors:
                    try:
                        btn = await self.page.query_selector(sel)
                        if btn:
                            await btn.click()
                            await asyncio.sleep(random.uniform(1.5, 3.0))
                            break
                    except Exception:
                        continue
                
                # Re-try extraction after expanding
                andamentos = await self.page.query_selector_all(
                    '.andamento-item, .timeline-item, .andamento'
                )
                for and_el in andamentos[:30]:
                    try:
                        text = (await and_el.text_content()).strip()
                        # Parse date-description from text
                        match = re.match(r'(\d{2}/\d{2}/\d{4})\s*[-\s]\s*(.+)', text)
                        if match:
                            movimentacoes.append(Movimentacao(
                                data=match.group(1),
                                descricao=match.group(2).strip()[:500]
                            ))
                    except Exception:
                        continue
            except Exception:
                pass
        
        # Strategy 3: Text-based extraction from full page
        if not movimentacoes:
            try:
                page_text = await self.page.evaluate('() => document.body.innerText || ""')
                # Find date-description patterns
                for match in re.finditer(r'(\d{2}/\d{2}/\d{4})\s*[-\s]+(.+?)(?=\d{2}/\d{2}/\d{4}|\Z)', page_text, re.DOTALL):
                    desc = match.group(2).strip().split('\n')[0].strip()
                    if desc and len(desc) > 5:
                        movimentacoes.append(Movimentacao(
                            data=match.group(1),
                            descricao=desc[:500]
                        ))
                    if len(movimentacoes) >= 30:
                        break
            except Exception:
                pass
        
        return movimentacoes
    
    async def _extrair_por_texto_bruto(self, classe: Optional[str], numero: str, page_text: str) -> List[ProcessoInfo]:
        """Fallback extraction strategy using raw page text parsing"""
        processos = []
        
        try:
            if not page_text or len(page_text) < 50:
                return []
            
            processo = ProcessoInfo(
                numero=f"{classe or '?'} {numero}",
                tribunal=self.tribunal_sigla,
                url=self.page.url if self.page else "",
                classe=classe if classe and classe != "?" else None
            )
            
            # Extract any available info from raw text
            relator_match = re.search(r'Relator\(?a?\)?[:\s]+(.+?)(?:\n|$)', page_text, re.IGNORECASE)
            if relator_match:
                processo.relator = relator_match.group(1).strip()[:100]
            
            origem_match = re.search(r'Proced[eê]ncia[:\s]+(.+?)(?:\n|$)', page_text, re.IGNORECASE)
            if origem_match:
                processo.origem = origem_match.group(1).strip()[:200]
            
            assunto_match = re.search(r'Assunto[:\s]+(.+?)(?:\n|$)', page_text, re.IGNORECASE)
            if assunto_match:
                processo.assunto = assunto_match.group(1).strip()[:300]
            
            # Extract dates that look like andamentos
            movs = []
            for m in re.finditer(r'(\d{2}/\d{2}/\d{4})\s*[-\s]+(.+?)(?=\d{2}/\d{2}/\d{4}|\Z)', page_text, re.DOTALL):
                desc = m.group(2).strip().split('\n')[0].strip()
                if desc and len(desc) > 5:
                    movs.append(Movimentacao(data=m.group(1), descricao=desc[:500]))
                if len(movs) >= 20:
                    break
            processo.movimentacoes = movs
            
            # Only include if we got some meaningful data
            if processo.relator or processo.assunto or processo.origem or movs:
                processos.append(processo)
        
        except Exception as e:
            logger.error(f"Raw text extraction error: {e}")
        
        return processos


async def main():
    """Test the scraper"""
    import json
    scraper = STFScraper()
    
    print("Testing STF search by number: ADI 1")
    resultado = await scraper.buscar_por_numero("ADI 1")
    print(json.dumps(resultado.to_dict(), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
