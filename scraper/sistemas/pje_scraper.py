"""
Scraper para sistema PJe (Processo Judicial Eletronico)
59 tribunais com PJe no Brasil (maioria com suporte MNI tambem).
Consulta publica via /consultapublica/ ou /ConsultaPublica/listView.seam

Nota: PJe eh o sistema mais padronizado do CNJ, entao
o scraper funciona para quase todos os tribunais com minimas adaptacoes.
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


class PJeScraper(SistemaScraperBase):
    """
    Bot para sistema PJe (CNJ).
    Cobre ~59 tribunais.
    Consulta publica e MNI (via mni_client separado).
    """

    async def consultar_processo(self, numero: str) -> Optional[ProcessoInfo]:
        """Consulta processo na pagina publica do PJe"""
        await self._init_browser()

        numero_limpo = re.sub(r'[^\d]', '', numero)
        base = self.config.url_consulta

        # PJe tem dois formatos de URL:
        # 1. /consultapublica/ConsultaPublica/DetalheProcessoConsultaPublica/listView.seam
        # 2. /consultapublica/ (redirect para formulario)
        self.logger.info(f"Consultando PJe {self.config.tribunal}: {numero}")

        # Tenta URL direta de detalhe se for PJe novo
        if "listView.seam" in base:
            url = f"{base}?conversationId=&numeroProcesso={numero_limpo}"
        else:
            url = base

        await self._page.goto(url, wait_until="domcontentloaded", timeout=self.config.timeout_seconds * 1000)
        await self._human_delay(2000, 4000)

        # Se nao usou URL direta, precisa preencher formulario
        if "listView.seam" not in base:
            input_selectors = [
                "input[id*='numeroProcesso']",
                "input[name*='numeroProcesso']",
                "input[id*='fPP:numProcesso']",
                "input.numProcesso",
            ]
            for sel in input_selectors:
                try:
                    el = await self._page.query_selector(sel)
                    if el:
                        await self._human_type(sel, numero)
                        break
                except Exception:
                    continue

            # Clica pesquisar
            btn_selectors = [
                "input[id*='pesquisar']",
                "button[id*='pesquisar']",
                "input[value='Pesquisar']",
                "button:has-text('Pesquisar')",
            ]
            for sel in btn_selectors:
                try:
                    btn = await self._page.query_selector(sel)
                    if btn:
                        await self._human_click(sel)
                        break
                except Exception:
                    continue

            await self._human_delay(3000, 5000)

        # Check CAPTCHA
        if await self._check_captcha():
            solved = await self._solve_captcha()
            if not solved:
                raise Exception("CAPTCHA nao resolvido no PJe")
            await self._human_delay()

        page_text = await self._page.evaluate("() => document.body.innerText")
        if "nenhum processo encontrado" in page_text.lower() or "nao foi encontrado" in page_text.lower():
            return None

        # Se ha lista de resultados, clica no primeiro
        try:
            link = await self._page.query_selector("a[id*='processoSelecionado'], a.processo-link, td a[href*='detalhe']")
            if link:
                await link.click()
                await self._human_delay(2000, 4000)
                page_text = await self._page.evaluate("() => document.body.innerText")
        except Exception:
            pass

        processo = ProcessoInfo(
            numero=numero,
            tribunal=self.config.tribunal,
            url=self._page.url,
        )

        # Classe
        try:
            for sel in ["span[id*='classeJudicial']", ".classeJudicial", "span.classe"]:
                el = await self._page.query_selector(sel)
                if el:
                    processo.classe = (await el.text_content()).strip()
                    break
            if not processo.classe:
                match = re.search(r'Classe [Jj]udicial:\s*(.+?)(?:\n|$)', page_text)
                if match:
                    processo.classe = match.group(1).strip()
        except Exception:
            pass

        # Assunto
        try:
            for sel in ["span[id*='assunto']", ".assuntoPrincipal"]:
                el = await self._page.query_selector(sel)
                if el:
                    processo.assunto = (await el.text_content()).strip()
                    break
        except Exception:
            pass

        # Juiz/Relator
        try:
            for sel in ["span[id*='magistrado']", "span[id*='relator']", ".magistrado"]:
                el = await self._page.query_selector(sel)
                if el:
                    processo.relator = (await el.text_content()).strip()
                    break
        except Exception:
            pass

        # Orgao julgador (origem)
        try:
            for sel in ["span[id*='orgaoJulgador']", ".orgaoJulgador"]:
                el = await self._page.query_selector(sel)
                if el:
                    processo.origem = (await el.text_content()).strip()
                    break
        except Exception:
            pass

        # Partes
        try:
            partes_els = await self._page.query_selector_all("[id*='poloAtivo'] .nomeParteAdvogado, [id*='poloPassivo'] .nomeParteAdvogado, .parte-nome")
            partes = []
            for el in partes_els[:20]:
                text = (await el.text_content()).strip()
                if text and len(text) > 2:
                    partes.append(text)
            processo.partes = partes
        except Exception:
            pass

        # Movimentacoes
        try:
            # Expande movimentacoes se necessario
            try:
                expand_btn = await self._page.query_selector("a:has-text('todas'), a:has-text('Expandir')")
                if expand_btn:
                    await expand_btn.click()
                    await self._human_delay(1500, 3000)
            except Exception:
                pass

            mov_rows = await self._page.query_selector_all(".movimentacao-item, tr.movimentacao, [id*='movimentacao']")
            movs = []
            for row in mov_rows[:50]:
                try:
                    text = await row.text_content()
                    if text:
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
        """Busca por nome no PJe"""
        await self._init_browser()

        base = self.config.url_consulta
        self.logger.info(f"Buscando por nome no PJe {self.config.tribunal}: {nome}")
        await self._page.goto(base, wait_until="domcontentloaded", timeout=30000)
        await self._human_delay(2000, 4000)

        # Seleciona busca por nome de parte
        try:
            # Seleciona radio "Nome da parte"
            for sel in ["input[value='nomeParte']", "input[id*='nomeParte']", "input[type='radio'][value*='parte']"]:
                el = await self._page.query_selector(sel)
                if el:
                    await el.click()
                    await self._human_delay(500, 1000)
                    break
        except Exception:
            pass

        # Preenche nome
        input_selectors = [
            "input[id*='nomeParte']",
            "input[name*='nomeParte']",
            "input[id*='nomeParteConsulta']",
        ]
        for sel in input_selectors:
            try:
                el = await self._page.query_selector(sel)
                if el:
                    await self._human_type(sel, nome)
                    break
            except Exception:
                continue

        # Pesquisa
        try:
            btn = await self._page.query_selector("input[id*='pesquisar'], button[id*='pesquisar'], button:has-text('Pesquisar')")
            if btn:
                await btn.click()
                await self._human_delay(3000, 5000)
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


def get_pje_scraper(tribunal: str, url: str, grau: str = "1g") -> PJeScraper:
    """Cria scraper PJe para qualquer tribunal"""
    config = ScraperConfig(
        sistema="pje",
        tribunal=tribunal,
        url_consulta=url,
        grau=grau,
        suporta_mni=True,
        suporta_certificado=True,
    )
    return PJeScraper(config)
