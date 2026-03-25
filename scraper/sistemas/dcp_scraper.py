"""
Scraper para DCP - Distribuicao e Controle Processual (TJRJ legado)
URL: https://www3.tjrj.jus.br/consultaprocessual/
Usado em paralelo com PJe no TJRJ para processos antigos.
"""
import asyncio
import re
import sys
import os
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import ProcessoInfo, Movimentacao
from sistemas.base_sistema import SistemaScraperBase, ScraperConfig


class DCPScraper(SistemaScraperBase):
    """Bot para DCP do TJRJ (sistema legado)"""

    async def consultar_processo(self, numero: str) -> Optional[ProcessoInfo]:
        await self._init_browser()
        numero_limpo = re.sub(r'[^\d]', '', numero)

        self.logger.info(f"Consultando DCP TJRJ: {numero}")
        await self._page.goto(self.config.url_consulta, wait_until="domcontentloaded", timeout=self.config.timeout_seconds * 1000)
        await self._human_delay(2000, 4000)

        # DCP TJRJ - preenche numero
        for sel in ["input[name='numProcesso']", "input#numProcesso", "input[type='text']"]:
            try:
                el = await self._page.query_selector(sel)
                if el:
                    await self._human_type(sel, numero_limpo)
                    break
            except Exception:
                continue

        # Pesquisa
        try:
            btn = await self._page.query_selector("input[type='submit'], button:has-text('Pesquisar'), input[value='Consultar']")
            if btn:
                await btn.click()
                await self._human_delay(2000, 4000)
        except Exception:
            pass

        if await self._check_captcha():
            solved = await self._solve_captcha()
            if not solved:
                raise Exception("CAPTCHA nao resolvido no DCP")

        page_text = await self._page.evaluate("() => document.body.innerText")
        if "não encontrado" in page_text.lower():
            return None

        processo = ProcessoInfo(numero=numero, tribunal="TJRJ", url=self._page.url)

        try:
            for pattern, attr in [
                (r'Classe:\s*(.+?)(?:\n|$)', 'classe'),
                (r'Assunto:\s*(.+?)(?:\n|$)', 'assunto'),
                (r'(?:Juiz|Magistrado):\s*(.+?)(?:\n|$)', 'relator'),
                (r'(?:Vara|Serventia):\s*(.+?)(?:\n|$)', 'origem'),
            ]:
                match = re.search(pattern, page_text)
                if match:
                    setattr(processo, attr, match.group(1).strip())
        except Exception:
            pass

        # Partes
        try:
            partes_matches = re.findall(
                r'((?:Autor|Réu|Requerente|Requerido|Exequente|Executado)[^:]*:\s*.+?)(?:\n|$)', page_text
            )
            processo.partes = [p.strip() for p in partes_matches[:20]]
        except Exception:
            pass

        # Movimentacoes
        try:
            movs = []
            for line in page_text.split('\n'):
                match = re.match(r'\s*(\d{2}/\d{2}/\d{4})\s+(.+)', line.strip())
                if match:
                    movs.append(Movimentacao(data=match.group(1), descricao=match.group(2).strip()[:500]))
            processo.movimentacoes = movs[:50]
        except Exception:
            pass

        return processo

    async def buscar_por_nome(self, nome: str) -> list[ProcessoInfo]:
        await self._init_browser()
        self.logger.info(f"Buscando por nome no DCP TJRJ: {nome}")
        await self._page.goto(self.config.url_consulta, wait_until="domcontentloaded", timeout=30000)
        await self._human_delay()

        for sel in ["input[name='nomeParte']", "input[id*='nome']"]:
            try:
                el = await self._page.query_selector(sel)
                if el:
                    await self._human_type(sel, nome)
                    break
            except Exception:
                continue

        try:
            btn = await self._page.query_selector("input[type='submit'], button:has-text('Pesquisar')")
            if btn:
                await btn.click()
                await self._human_delay(3000, 5000)
        except Exception:
            pass

        processos = []
        try:
            page_text = await self._page.evaluate("() => document.body.innerText")
            matches = re.findall(r'(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})', page_text)
            seen = set()
            for num in matches[:20]:
                if num not in seen:
                    seen.add(num)
                    processos.append(ProcessoInfo(numero=num, tribunal="TJRJ"))
        except Exception:
            pass
        return processos


def get_dcp_scraper() -> DCPScraper:
    config = ScraperConfig(
        sistema="dcp",
        tribunal="TJRJ",
        url_consulta="https://www3.tjrj.jus.br/consultaprocessual/",
    )
    return DCPScraper(config)
