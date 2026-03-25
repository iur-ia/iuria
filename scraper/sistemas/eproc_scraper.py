"""
Scraper para sistema eProc / eProc v2
Tribunais: TRF2, TRF4, TJPR, TJSC, TJRS

eProc usa formularios de consulta publica via PHP.
Estrutura: externo_controlador.php?acao=processo_consulta_publica
"""
import asyncio
import re
import sys
import os
from typing import Optional
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import ProcessoInfo, Movimentacao, ResultadoBusca
from sistemas.base_sistema import SistemaScraperBase, ScraperConfig


class EProcScraper(SistemaScraperBase):
    """
    Bot para sistema eProc/eProc v2.
    Cobre: TRF2, TRF4, TJPR, TJSC, TJRS.
    """

    async def consultar_processo(self, numero: str) -> Optional[ProcessoInfo]:
        """Consulta processo por numero no eProc"""
        await self._init_browser()

        numero_limpo = re.sub(r'[^\d]', '', numero)
        base = self.config.url_consulta

        # eProc consulta publica - navega para a pagina e preenche formulario
        self.logger.info(f"Consultando eProc {self.config.tribunal}: {numero}")
        await self._page.goto(base, wait_until="domcontentloaded", timeout=self.config.timeout_seconds * 1000)
        await self._human_delay(1500, 3000)

        # Preenche campo de numero
        input_selectors = [
            "input[name='txtNumProcesso']",
            "input[name='num_processo']",
            "input#txtNumProcesso",
            "input[type='text'][name*='processo']",
        ]
        filled = False
        for sel in input_selectors:
            try:
                el = await self._page.query_selector(sel)
                if el:
                    await self._human_type(sel, numero_limpo)
                    filled = True
                    break
            except Exception:
                continue

        if not filled:
            # Tenta URL direta se disponivel
            direct_url = f"{base}?acao=processo_consulta_publica&num_processo={numero_limpo}"
            await self._page.goto(direct_url, wait_until="domcontentloaded", timeout=30000)
            await self._human_delay(1500, 3000)
        else:
            # Submete formulario
            try:
                btn_selectors = [
                    "input[type='submit']",
                    "button[type='submit']",
                    "input[value='Pesquisar']",
                    "button:has-text('Pesquisar')",
                    "button:has-text('Consultar')",
                ]
                for sel in btn_selectors:
                    try:
                        btn = await self._page.query_selector(sel)
                        if btn:
                            await self._human_click(sel)
                            break
                    except Exception:
                        continue
                await self._human_delay(2000, 4000)
            except Exception:
                pass

        # Verifica CAPTCHA
        if await self._check_captcha():
            solved = await self._solve_captcha()
            if not solved:
                raise Exception("CAPTCHA nao resolvido no eProc")
            await self._human_delay()

        page_text = await self._page.evaluate("() => document.body.innerText")
        if "não encontrado" in page_text.lower() or "nenhum processo" in page_text.lower():
            return None

        processo = ProcessoInfo(
            numero=numero,
            tribunal=self.config.tribunal,
            url=self._page.url,
        )

        # Extrai dados - eProc usa tabelas para dados do processo
        try:
            # Classe processual
            for pattern in [r'Classe:\s*(.+?)(?:\n|$)', r'Classe Processual:\s*(.+?)(?:\n|$)']:
                match = re.search(pattern, page_text)
                if match:
                    processo.classe = match.group(1).strip()
                    break

            # Assunto
            match = re.search(r'Assunto[s]?:\s*(.+?)(?:\n|$)', page_text)
            if match:
                processo.assunto = match.group(1).strip()

            # Juiz/Relator
            for pattern in [r'Juiz:\s*(.+?)(?:\n|$)', r'Relator[a]?:\s*(.+?)(?:\n|$)', r'Magistrado:\s*(.+?)(?:\n|$)']:
                match = re.search(pattern, page_text)
                if match:
                    processo.relator = match.group(1).strip()
                    break

            # Vara / Origem
            match = re.search(r'(?:Vara|Órgão Julgador|Lotação):\s*(.+?)(?:\n|$)', page_text)
            if match:
                processo.origem = match.group(1).strip()

        except Exception:
            pass

        # Partes
        try:
            partes_section = re.findall(
                r'((?:Autor|Réu|Requerente|Requerido|Impetrante|Impetrado|Exequente|Executado|Recorrente|Recorrido|Apelante|Apelado)[^:]*:\s*.+?)(?:\n|$)',
                page_text
            )
            processo.partes = [p.strip() for p in partes_section[:20]]
        except Exception:
            pass

        # Movimentacoes
        try:
            rows = await self._page.query_selector_all("table.infraTable tr, table.tabelaMovimentacoes tr, .evento-linha")
            movs = []
            for row in rows[:50]:
                try:
                    text = await row.text_content()
                    if text:
                        # eProc: data no formato DD/MM/AAAA ou DD/MM/YYYY HH:MM
                        match = re.match(r'\s*(\d{2}/\d{2}/\d{4})\s+(.+)', text.strip())
                        if match:
                            movs.append(Movimentacao(
                                data=match.group(1),
                                descricao=match.group(2).strip()[:500],
                            ))
                except Exception:
                    continue
            processo.movimentacoes = movs
        except Exception:
            pass

        return processo

    async def buscar_por_nome(self, nome: str) -> list[ProcessoInfo]:
        """Busca por nome no eProc"""
        await self._init_browser()

        base = self.config.url_consulta
        self.logger.info(f"Buscando por nome no eProc {self.config.tribunal}: {nome}")
        await self._page.goto(base, wait_until="domcontentloaded", timeout=30000)
        await self._human_delay(1500, 3000)

        # Tenta preencher campo de nome
        name_selectors = [
            "input[name='txtNomeParte']",
            "input[name='nome_parte']",
            "input[type='text'][name*='parte']",
            "input[type='text'][name*='nome']",
        ]
        for sel in name_selectors:
            try:
                el = await self._page.query_selector(sel)
                if el:
                    await self._human_type(sel, nome)
                    break
            except Exception:
                continue

        # Submete
        try:
            btn = await self._page.query_selector("input[type='submit'], button[type='submit']")
            if btn:
                await btn.click()
                await self._human_delay(2000, 4000)
        except Exception:
            pass

        if await self._check_captcha():
            await self._solve_captcha()
            await self._human_delay()

        processos = []
        try:
            page_text = await self._page.evaluate("() => document.body.innerText")
            matches = re.findall(r'(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})', page_text)
            seen = set()
            for num in matches[:20]:
                if num not in seen:
                    seen.add(num)
                    processos.append(ProcessoInfo(
                        numero=num,
                        tribunal=self.config.tribunal,
                        url=self._page.url,
                    ))
        except Exception:
            pass

        return processos


# Pre-configurados
EPROC_TRIBUNAIS = {
    "TRF2":     ("TRF2", "https://eproc.trf2.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica"),
    "TRF4_1G":  ("TRF4", "https://eproc.trf4.jus.br/eproc2trf4/"),
    "TRF4_2G":  ("TRF4", "https://eproc.trf4.jus.br/eproc2trf4/"),
    "TJPR":     ("TJPR", "https://eproc1g.tjpr.jus.br/eproc/externo_controlador.php"),
    "TJSC":     ("TJSC", "https://eproc1g.tjsc.jus.br/eproc/"),
    "TJRS":     ("TJRS", "https://eproc1g.tjrs.jus.br/eproc/"),
}


def get_eproc_scraper(key: str) -> EProcScraper:
    if key not in EPROC_TRIBUNAIS:
        raise ValueError(f"Tribunal eProc nao configurado: {key}. Disponiveis: {list(EPROC_TRIBUNAIS.keys())}")
    tribunal, url = EPROC_TRIBUNAIS[key]
    config = ScraperConfig(sistema="eproc", tribunal=tribunal, url_consulta=url)
    return EProcScraper(config)
