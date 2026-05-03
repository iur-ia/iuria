"""
Scraper TJRJ com Playwright de interação real.
Estratégia: abrir o portal Angular, digitar o número, clicar em Consultar,
aguardar os resultados renderizarem, extrair dados estruturados.

Anti-detecção reforçada:
- User-agent Firefox realista em vez de Chromium padrão
- Viewport e screen realistas (1366x768, comum no Brasil)
- Locale pt-BR, timezone America/Sao_Paulo
- --disable-blink-features=AutomationControlled
- Página navegada com referer do Google
"""
import re
import sys
import os
import asyncio
import json
from typing import Optional, List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import BaseScraper, ResultadoBusca, ProcessoInfo, Movimentacao

PORTAL_URL = "https://www3.tjrj.jus.br/consultaprocessual/"
CONSULTA_URL = "https://www3.tjrj.jus.br/consultaprocessual/#/consultapublica"

FIREFOX_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0"
CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"


class TJRJPlaywright(BaseScraper):
    """
    Scraper TJRJ com automação completa de browser (Playwright).
    Interage com o portal Angular: digita o número, clica Consultar,
    aguarda renderização e extrai dados.
    """

    def __init__(self):
        super().__init__()
        self.tribunal_nome = "Tribunal de Justiça do Rio de Janeiro"
        self.tribunal_sigla = "TJRJ"
        self.base_url = "https://www3.tjrj.jus.br"

    def _get_portal_url(self, numero: str) -> str:
        numero_limpo = re.sub(r'[.\-]', '', numero.strip())
        return f"{self.base_url}/consultaprocessual/#/consultapublica?numProcesso={numero_limpo}"

    def _scrape_sync(self, numero: str) -> dict:
        """Executa a automação Playwright de forma síncrona (para uso em executor)"""
        import subprocess
        import tempfile

        script = f"""
import asyncio
import json
import sys
import random

FIREFOX_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0"
CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

VIEWPORTS = [
    {{"width": 1366, "height": 768}},
    {{"width": 1440, "height": 900}},
    {{"width": 1920, "height": 1080}},
    {{"width": 1280, "height": 800}},
]

async def scrape():
    try:
        try:
            from rebrowser_playwright.async_api import async_playwright
        except ImportError:
            from playwright.async_api import async_playwright
        numero = {json.dumps(numero)}
        numero_limpo = numero.replace('-','').replace('.','').strip()
        portal_url = "https://www3.tjrj.jus.br/consultaprocessual/"
        viewport = random.choice(VIEWPORTS)

        async with async_playwright() as p:
            browser = await p.firefox.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                ],
                firefox_user_prefs={{
                    "dom.webdriver.enabled": False,
                    "useAutomationExtension": False,
                    "privacy.trackingprotection.enabled": False,
                }},
            )
            context = await browser.new_context(
                locale='pt-BR',
                timezone_id='America/Sao_Paulo',
                user_agent=FIREFOX_UA,
                viewport=viewport,
                screen={{"width": viewport["width"], "height": viewport["height"]}},
                extra_http_headers={{
                    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
                    "Referer": "https://www.google.com.br/",
                }},
            )

            page = await context.new_page()

            # Ocultar webdriver
            await page.add_init_script(\"\"\"
                Object.defineProperty(navigator, 'webdriver', {{get: () => undefined}});
                Object.defineProperty(navigator, 'languages', {{get: () => ['pt-BR', 'pt', 'en-US', 'en']}});
                window.chrome = {{runtime: {{}}}};
            \"\"\")

            await page.goto(portal_url, wait_until='networkidle', timeout=45000)
            await asyncio.sleep(random.uniform(1.0, 2.5))

            campo = None
            seletores_campo = [
                'input[placeholder*="número"]',
                'input[placeholder*="Número"]',
                'input[placeholder*="processo"]',
                'input[placeholder*="Processo"]',
                'input[name*="numProcesso"]',
                'input[id*="numProcesso"]',
                'input[type="text"]',
                'input[formcontrolname*="numero"]',
                'input[formcontrolname*="processo"]',
            ]
            for sel in seletores_campo:
                try:
                    campo = await page.wait_for_selector(sel, timeout=8000, state='visible')
                    if campo:
                        break
                except:
                    continue

            resultado = {{'erro': None, 'processos': []}}

            if not campo:
                resultado['erro'] = 'Campo de busca nao encontrado no portal TJRJ'
                resultado['portal_url'] = f"https://www3.tjrj.jus.br/consultaprocessual/#/consultapublica?numProcesso={{numero_limpo}}"
                print(json.dumps(resultado))
                await browser.close()
                return

            await campo.fill("")  # ElementHandle: fill("") limpa o campo
            await asyncio.sleep(random.uniform(0.2, 0.5))

            for char in numero:
                await campo.type(char, delay=random.randint(50, 150))

            await asyncio.sleep(random.uniform(0.3, 0.8))

            btn_seletores = [
                'button[type="submit"]',
                'button:has-text("Consultar")',
                'button:has-text("Pesquisar")',
                'button:has-text("Buscar")',
                'input[type="submit"]',
            ]
            btn = None
            for sel in btn_seletores:
                try:
                    btn = await page.query_selector(sel)
                    if btn:
                        break
                except:
                    continue

            if btn:
                await btn.click()
            else:
                await campo.press('Enter')

            resultado_seletores = [
                'app-processo-cabecalho',
                'app-resultado-consulta',
                '.processo-numero',
                'table.processos',
                '[class*="processo"][class*="numero"]',
                'app-lista-processos',
                '.resultado-consulta',
                'mat-card',
            ]
            for sel in resultado_seletores:
                try:
                    await page.wait_for_selector(sel, timeout=15000, state='visible')
                    break
                except:
                    continue

            try:
                await page.wait_for_load_state('networkidle', timeout=8000)
            except:
                pass

            await asyncio.sleep(random.uniform(1.5, 2.5))

            dados_js = await page.evaluate(\"\"\"
                () => {{
                    const allText = document.body.innerText;
                    const cnj_regex = /\\\\d{{7}}-\\\\d{{2}}\\\\.\\\\d{{4}}\\\\.\\\\d\\\\.\\\\d{{2}}\\\\.\\\\d{{4}}/g;
                    const numeros = [...allText.matchAll(cnj_regex)].map(m => m[0]);

                    const andamentos = [];
                    const rows = document.querySelectorAll('tr, [class*="andamento"], [class*="movimentacao"]');
                    rows.forEach(row => {{
                        const text = row.innerText || '';
                        const dateMatch = text.match(/\\\\d{{2}}\\\\/\\\\d{{2}}\\\\/\\\\d{{4}}/);
                        if (dateMatch && text.length > 15) {{
                            andamentos.push(text.trim());
                        }}
                    }});

                    const partes = [];
                    document.querySelectorAll('[class*="parte"], [class*="polo"]').forEach(el => {{
                        const t = el.innerText.trim();
                        if (t && t.length > 3 && t.length < 200) partes.push(t);
                    }});

                    return {{
                        numeros: [...new Set(numeros)],
                        andamentos: andamentos.slice(0, 30),
                        partes: [...new Set(partes)].slice(0, 15),
                        page_text: allText.substring(0, 8000),
                        url: window.location.href,
                    }};
                }}
            \"\"\")

            page_text = dados_js.get('page_text', '')
            numeros_cnj = dados_js.get('numeros', [])
            andamentos_raw = dados_js.get('andamentos', [])
            partes_js = dados_js.get('partes', [])

            nao_encontrado = any(t in page_text.lower() for t in [
                'não encontrado', 'nenhum processo', 'processo não localizado',
                '0 processo', 'nenhum resultado'
            ])

            if nao_encontrado and not numeros_cnj:
                resultado['erro'] = f'Processo {{numero}} não encontrado no portal TJRJ'
                resultado['portal_url'] = "https://www3.tjrj.jus.br/consultaprocessual/#/consultapublica"
                print(json.dumps(resultado))
                await browser.close()
                return

            num_display = numeros_cnj[0] if numeros_cnj else numero
            num_limpo_display = num_display.replace('-','').replace('.','')
            portal_processo_url = f"https://www3.tjrj.jus.br/consultaprocessual/#/consultapublica?numProcesso={{num_limpo_display}}"

            processo = {{
                'numero': num_display,
                'numero_unico': num_display,
                'tribunal': 'TJRJ',
                'url': portal_processo_url,
                'classe': None,
                'assunto': None,
                'relator': None,
                'origem': None,
                'comarca': None,
                'valor_causa': None,
                'data_distribuicao': None,
                'partes': partes_js,
                'movimentacoes': [],
            }}

            import re as re_mod

            classe_m = re_mod.search(r'(?:Classe[:\\\\s]+|class[eE]\\\\s*:\\\\s*)([A-ZÇÃÕa-záéíóúãõçÃõàâêî][^\\\\n\\\\r|]{{3,80}})', page_text)
            if classe_m:
                processo['classe'] = classe_m.group(1).strip()[:100]

            assunto_m = re_mod.search(r'(?:Assunto[:\\\\s]+)([^\\\\n\\\\r|]{{3,150}})', page_text)
            if assunto_m:
                processo['assunto'] = assunto_m.group(1).strip()[:200]

            juiz_m = re_mod.search(r'(?:Juiz|Juíza|Relator|Magistrad)[^:]*:[^\\\\n]*\\\\n?\\\\s*([A-Z][^\\\\n]{{5,80}})', page_text)
            if juiz_m:
                processo['relator'] = juiz_m.group(1).strip()[:100]

            comarca_m = re_mod.search(r'[Cc]omarca[:\\\\s]+([^\\\\n|]{{3,80}})', page_text)
            if comarca_m:
                processo['comarca'] = comarca_m.group(1).strip()

            valor_m = re_mod.search(r'[Vv]alor[^:]*:[^\\\\n]*R\\\\$\\\\s*([\\\\d.,]+)', page_text)
            if valor_m:
                processo['valor_causa'] = valor_m.group(1).strip()

            dist_m = re_mod.search(r'[Dd]istribuição[:\\\\s]+(\\\\d{{2}}/\\\\d{{2}}/\\\\d{{4}})', page_text)
            if dist_m:
                processo['data_distribuicao'] = dist_m.group(1)

            movs = []
            date_re = re_mod.compile(r'(\\\\d{{2}}/\\\\d{{2}}/\\\\d{{4}})')
            for andamento in andamentos_raw:
                date_m = date_re.search(andamento)
                if date_m:
                    data = date_m.group(1)
                    desc = andamento.replace(data, '').strip()[:200]
                    if len(desc) > 5:
                        movs.append({{'data': data, 'descricao': desc, 'detalhes': None}})
            processo['movimentacoes'] = movs[:30]

            resultado['processos'] = [processo]
            print(json.dumps(resultado, ensure_ascii=False))
            await browser.close()

    except Exception as e:
        import traceback
        print(json.dumps({{'erro': str(e), 'processos': []}}))

asyncio.run(scrape())
"""

        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
            f.write(script)
            tmp_path = f.name

        try:
            proc = subprocess.run(
                [sys.executable, tmp_path],
                capture_output=True,
                text=True,
                timeout=90,
                encoding='utf-8'
            )
            # Extract only the last non-blank line to guard against incidental
            # stdout noise from Playwright/libs that would break json.loads().
            lines = [l for l in proc.stdout.splitlines() if l.strip()]
            if lines:
                return json.loads(lines[-1])
            stderr = proc.stderr.strip()
            return {'erro': f'Playwright nao retornou output: {stderr[:300]}', 'processos': []}
        except subprocess.TimeoutExpired:
            return {'erro': 'Timeout ao acessar portal TJRJ (90s)', 'processos': []}
        except json.JSONDecodeError as e:
            return {'erro': f'Resposta invalida do scraper: {str(e)}', 'processos': []}
        except Exception as e:
            return {'erro': str(e), 'processos': []}
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

    async def buscar_por_numero(self, numero: str) -> ResultadoBusca:
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="numero",
            termo_busca=numero
        )

        try:
            loop = asyncio.get_event_loop()
            dados = await loop.run_in_executor(None, self._scrape_sync, numero)

            if dados.get('erro') and not dados.get('processos'):
                resultado.erro = dados['erro']
                resultado.portal_url = dados.get('portal_url', self._get_portal_url(numero))
                return resultado

            processos_raw = dados.get('processos', [])
            for p in processos_raw:
                processo = ProcessoInfo(
                    numero=p.get('numero', numero),
                    numero_unico=p.get('numero_unico', numero),
                    tribunal=self.tribunal_sigla,
                    url=p.get('url', self._get_portal_url(numero)),
                    classe=p.get('classe'),
                    assunto=p.get('assunto'),
                    relator=p.get('relator'),
                    origem=p.get('origem'),
                    partes=p.get('partes', []),
                )
                processo.comarca = p.get('comarca')
                processo.valor_causa = p.get('valor_causa')
                processo.data_distribuicao = p.get('data_distribuicao')

                movs_raw = p.get('movimentacoes', [])
                processo.movimentacoes = [
                    Movimentacao(
                        data=m.get('data', ''),
                        descricao=m.get('descricao', ''),
                        detalhes=m.get('detalhes')
                    ) for m in movs_raw if m.get('data') or m.get('descricao')
                ]

                campos = sum(1 for f in [
                    processo.classe, processo.assunto, processo.relator,
                    processo.comarca, processo.valor_causa, processo.data_distribuicao,
                ] if f)
                campos += min(len(processo.partes), 5) + min(len(processo.movimentacoes), 10)
                print(
                    f"[tjrj] fonte=Playwright tribunal=TJRJ "
                    f"campos={campos} movs={len(processo.movimentacoes)} "
                    f"partes={len(processo.partes)}",
                    file=sys.stderr
                )

                resultado.processos.append(processo)

            resultado.total_encontrados = len(resultado.processos)

            if not resultado.processos:
                resultado.erro = f"Processo {numero} nao encontrado no portal TJRJ"
                resultado.portal_url = self._get_portal_url(numero)

        except Exception as e:
            resultado.erro = f"Erro ao consultar TJRJ via Playwright: {str(e)}"
            resultado.portal_url = self._get_portal_url(numero)
            print(f"TJRJPlaywright error: {e}", file=sys.stderr)

        return resultado

    async def buscar_por_nome(self, nome: str) -> ResultadoBusca:
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="nome",
            termo_busca=nome
        )
        resultado.erro = "Busca por nome via Playwright nao implementada para TJRJ"
        resultado.portal_url = f"{self.base_url}/consultaprocessual/#/consultapublica"
        return resultado
