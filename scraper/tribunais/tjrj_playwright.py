"""
Scraper TJRJ com Playwright de interação real
Estratégia: abrir o portal Angular, digitar o número, clicar em Consultar,
aguardar os resultados renderizarem, extrair dados estruturados.

Isso contorna o bloqueio da API interna (que exige token de sessão Angular)
pois o próprio browser obtém o token ao carregar o portal.
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

async def scrape():
    try:
        from playwright.async_api import async_playwright
        numero = {json.dumps(numero)}
        numero_limpo = numero.replace('-','').replace('.','').strip()
        portal_url = f"https://www3.tjrj.jus.br/consultaprocessual/"

        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--lang=pt-BR',
                ]
            )
            context = await browser.new_context(
                locale='pt-BR',
                timezone_id='America/Sao_Paulo',
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                viewport={{'width': 1280, 'height': 800}},
            )
            page = await context.new_page()

            # Navegar para o portal
            await page.goto(portal_url, wait_until='networkidle', timeout=45000)

            # Aguardar o Angular inicializar (campo de busca aparecer)
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
                # Tentar extrair dados do HTML atual
                content = await page.content()
                resultado['erro'] = 'Campo de busca nao encontrado no portal TJRJ'
                resultado['portal_url'] = f"https://www3.tjrj.jus.br/consultaprocessual/#/consultapublica?numProcesso={{numero_limpo}}"
                print(json.dumps(resultado))
                await browser.close()
                return

            # Digitar o número do processo
            await campo.clear()
            await campo.fill(numero)
            await asyncio.sleep(0.5)

            # Pressionar Enter ou clicar no botão de busca
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

            # Aguardar resultados (Angular faz requisição autenticada)
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
            encontrou_resultado = False
            for sel in resultado_seletores:
                try:
                    await page.wait_for_selector(sel, timeout=12000, state='visible')
                    encontrou_resultado = True
                    break
                except:
                    continue

            if not encontrou_resultado:
                # Aguardar network idle e tentar extrair
                try:
                    await page.wait_for_load_state('networkidle', timeout=8000)
                except:
                    pass

            await asyncio.sleep(2)

            # Extrair dados via JavaScript (acessa dados do Angular)
            dados_js = await page.evaluate("""
                () => {{
                    // Tentar pegar dados do store Angular ou variáveis globais
                    const allText = document.body.innerText;
                    const cnj_regex = /\\d{{7}}-\\d{{2}}\\.\\d{{4}}\\.\\d\\.\\d{{2}}\\.\\d{{4}}/g;
                    const numeros = [...allText.matchAll(cnj_regex)].map(m => m[0]);

                    // Extrair andamentos da tabela se existir
                    const andamentos = [];
                    const rows = document.querySelectorAll('tr, [class*="andamento"], [class*="movimentacao"]');
                    rows.forEach(row => {{
                        const text = row.innerText || '';
                        const dateMatch = text.match(/\\d{{2}}\\/\\d{{2}}\\/\\d{{4}}/);
                        if (dateMatch && text.length > 15) {{
                            andamentos.push(text.trim());
                        }}
                    }});

                    return {{
                        numeros: [...new Set(numeros)],
                        andamentos: andamentos.slice(0, 30),
                        page_text: allText.substring(0, 5000),
                        url: window.location.href,
                    }};
                }}
            """)

            # Extrair HTML completo para parse
            content = await page.content()
            page_text = dados_js.get('page_text', '')
            numeros_cnj = dados_js.get('numeros', [])
            andamentos_raw = dados_js.get('andamentos', [])

            # Verificar se encontrou processo ou retornou "não encontrado"
            nao_encontrado = any(t in page_text.lower() for t in [
                'não encontrado', 'nenhum processo', 'processo não localizado',
                '0 processo', 'nenhum resultado'
            ])

            if nao_encontrado and not numeros_cnj:
                resultado['erro'] = f'Processo {{numero}} não encontrado no portal TJRJ'
                resultado['portal_url'] = f"https://www3.tjrj.jus.br/consultaprocessual/#/consultapublica"
                print(json.dumps(resultado))
                await browser.close()
                return

            # Montar objeto processo
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
                'partes': [],
                'movimentacoes': [],
            }}

            # Extrair classe
            import re as re_mod
            classe_m = re_mod.search(r'(?:Classe[:\\s]+|class[eE]\\s*:\\s*)([A-ZÇÃÕa-záéíóúãõçÃõàâêî][^\\n\\r|]{{3,80}})', page_text)
            if classe_m:
                processo['classe'] = classe_m.group(1).strip()[:100]

            # Extrair assunto
            assunto_m = re_mod.search(r'(?:Assunto[:\\s]+)([^\\n\\r|]{{3,150}})', page_text)
            if assunto_m:
                processo['assunto'] = assunto_m.group(1).strip()[:200]

            # Extrair relator/juiz
            juiz_m = re_mod.search(r'(?:Juiz|Juíza|Relator|Magistrad)[^:]*:[^\\n]*\\n?\\s*([A-Z][^\\n]{{5,80}})', page_text)
            if juiz_m:
                processo['relator'] = juiz_m.group(1).strip()[:100]

            # Processar andamentos extraídos pelo JS
            movs = []
            date_re = re_mod.compile(r'(\\d{{2}}/\\d{{2}}/\\d{{4}})')
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
            output = proc.stdout.strip()
            if output:
                return json.loads(output)
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
            except:
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
                movs_raw = p.get('movimentacoes', [])
                processo.movimentacoes = [
                    Movimentacao(
                        data=m.get('data', ''),
                        descricao=m.get('descricao', ''),
                        detalhes=m.get('detalhes')
                    ) for m in movs_raw if m.get('data') or m.get('descricao')
                ]
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
