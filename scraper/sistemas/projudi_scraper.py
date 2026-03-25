"""
Scraper para sistema PROJUDI (legado, sendo migrado para PJe)
Tribunais: TJAC, TJGO, TJMG, TJPA, TJPR (parcial)
"""
import asyncio
import re
import sys
import os
from typing import Optional
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import ProcessoInfo, Movimentacao
from sistemas.base_sistema import SistemaScraperBase, ScraperConfig


class PROJUDIScraper(SistemaScraperBase):
    """Bot para sistema PROJUDI"""

    async def consultar_processo(self, numero: str) -> Optional[ProcessoInfo]:
        await self._init_browser()
        numero_limpo = re.sub(r'[^\d]', '', numero)

        self.logger.info(f"Consultando PROJUDI {self.config.tribunal}: {numero}")
        await self._page.goto(self.config.url_consulta, wait_until="domcontentloaded", timeout=self.config.timeout_seconds * 1000)
        await self._human_delay(2000, 4000)

        # Preenche numero do processo
        for sel in ["input[name='numProcesso']", "input[id*='numProcesso']", "input[type='text']"]:
            try:
                el = await self._page.query_selector(sel)
                if el:
                    await self._human_type(sel, numero_limpo)
                    break
            except Exception:
                continue

        # Pesquisa
        try:
            btn = await self._page.query_selector("input[type='submit'], button:has-text('Pesquisar'), input[value='Pesquisar']")
            if btn:
                await btn.click()
                await self._human_delay(2000, 4000)
        except Exception:
            pass

        if await self._check_captcha():
            solved = await self._solve_captcha()
            if not solved:
                raise Exception("CAPTCHA nao resolvido no PROJUDI")

        page_text = await self._page.evaluate("() => document.body.innerText")
        if "não encontrado" in page_text.lower() or "nenhum resultado" in page_text.lower():
            return None

        processo = ProcessoInfo(numero=numero, tribunal=self.config.tribunal, url=self._page.url)

        # Extrai dados basicos via regex no texto
        try:
            for pattern, attr in [
                (r'Classe:\s*(.+?)(?:\n|$)', 'classe'),
                (r'Assunto:\s*(.+?)(?:\n|$)', 'assunto'),
                (r'(?:Juiz|Magistrado):\s*(.+?)(?:\n|$)', 'relator'),
                (r'(?:Vara|Comarca):\s*(.+?)(?:\n|$)', 'origem'),
            ]:
                match = re.search(pattern, page_text)
                if match:
                    setattr(processo, attr, match.group(1).strip())
        except Exception:
            pass

        # Partes
        try:
            partes_matches = re.findall(
                r'((?:Autor|Réu|Requerente|Requerido)[^:]*:\s*.+?)(?:\n|$)', page_text
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
        self.logger.info(f"Buscando por nome no PROJUDI {self.config.tribunal}: {nome}")
        await self._page.goto(self.config.url_consulta, wait_until="domcontentloaded", timeout=30000)
        await self._human_delay()

        for sel in ["input[name='nomeParte']", "input[id*='nomeParte']"]:
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
                await self._human_delay(2000, 4000)
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
                    processos.append(ProcessoInfo(numero=num, tribunal=self.config.tribunal))
        except Exception:
            pass
        return processos


PROJUDI_TRIBUNAIS = {
    "TJAC": ("TJAC", "https://projudi.tjac.jus.br/"),
    "TJGO": ("TJGO", "https://projudi.tjgo.jus.br/"),
    "TJMG": ("TJMG", "https://projudi.tjmg.jus.br/"),
    "TJPA": ("TJPA", "https://projudi.tjpa.jus.br/"),
    "TJPR": ("TJPR", "https://projudi.tjpr.jus.br/projudi/"),
}


def get_projudi_scraper(key: str) -> PROJUDIScraper:
    if key not in PROJUDI_TRIBUNAIS:
        raise ValueError(f"Tribunal PROJUDI nao configurado: {key}")
    tribunal, url = PROJUDI_TRIBUNAIS[key]
    config = ScraperConfig(sistema="projudi", tribunal=tribunal, url_consulta=url)
    return PROJUDIScraper(config)
