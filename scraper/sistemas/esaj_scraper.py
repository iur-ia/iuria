"""
Scraper para sistema eSAJ (Softplan SAJ)
Tribunais: TJSP, TJSC, TJMS, TJCE, TJAM, TJBA
URLs variam por tribunal mas estrutura HTML eh consistente.

Paginas principais:
  - cpopg: Consulta Processos 1o Grau
  - cposg: Consulta Processos 2o Grau
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


class ESAJScraper(SistemaScraperBase):
    """
    Bot para sistema eSAJ (Softplan).
    Cobre: TJSP, TJSC, TJMS, TJCE, TJAM, TJBA e variantes.
    """

    async def consultar_processo(self, numero: str) -> Optional[ProcessoInfo]:
        """Consulta processo por numero CNJ no eSAJ"""
        await self._init_browser()

        # Normaliza numero (remove pontos e tracos)
        numero_limpo = re.sub(r'[^\d]', '', numero)
        numero_formatado = numero

        # Constroi URL de consulta direta por numero unificado
        # eSAJ aceita numeros no formato NNNNNNN-DD.AAAA.J.TT.OOOO
        base = self.config.url_consulta
        if "/cpopg/" in base:
            url = f"{base}?conversationId=&dadosConsulta.localPesquisa.cdLocal=-1&cbPesquisa=NUMPROC&dadosConsulta.tipoNuProcesso=UNIFICADO&numeroDigitoAnoUnificado={numero_limpo[:15]}&foroNumeroUnificado={numero_limpo[15:]}&dadosConsulta.valorConsultaNuUnificado={numero_formatado}"
        else:
            url = f"{base}?conversationId=&cbPesquisa=NUMPROC&numeroDigitoAnoUnificado={numero_limpo[:15]}&foroNumeroUnificado={numero_limpo[15:]}"

        self.logger.info(f"Consultando eSAJ {self.config.tribunal}: {numero}")
        await self._page.goto(url, wait_until="domcontentloaded", timeout=self.config.timeout_seconds * 1000)
        await self._human_delay(1500, 3000)

        # Verifica CAPTCHA
        if await self._check_captcha():
            solved = await self._solve_captcha()
            if not solved:
                raise Exception("CAPTCHA nao resolvido no eSAJ")
            await self._human_delay(1000, 2000)

        # Verifica se encontrou
        page_text = await self._page.evaluate("() => document.body.innerText")
        if "Não existem informações" in page_text or "não foi encontrado" in page_text.lower():
            return None

        # Extrai dados do processo
        processo = ProcessoInfo(
            numero=numero,
            tribunal=self.config.tribunal,
            url=self._page.url,
        )

        # Classe e assunto
        try:
            classe_el = await self._page.query_selector("#classeProcesso")
            if classe_el:
                processo.classe = (await classe_el.text_content()).strip()

            assunto_el = await self._page.query_selector("#assuntoProcesso")
            if assunto_el:
                processo.assunto = (await assunto_el.text_content()).strip()
        except Exception:
            pass

        # Juiz / Relator
        try:
            juiz_el = await self._page.query_selector("#juizProcesso")
            if juiz_el:
                processo.relator = (await juiz_el.text_content()).strip()
        except Exception:
            pass

        # Foro / Vara (origem)
        try:
            foro_el = await self._page.query_selector("#foroProcesso, #varaProcesso")
            if foro_el:
                processo.origem = (await foro_el.text_content()).strip()
        except Exception:
            pass

        # Partes
        try:
            partes_els = await self._page.query_selector_all("#tablePartesPrincipais tr")
            partes = []
            for row in partes_els:
                cols = await row.query_selector_all("td")
                if len(cols) >= 2:
                    tipo = (await cols[0].text_content()).strip().rstrip(":")
                    nome = (await cols[1].text_content()).strip()
                    if nome:
                        partes.append(f"{tipo}: {nome}")
            processo.partes = partes[:20]
        except Exception:
            pass

        # Movimentacoes
        try:
            # Expande todas as movimentacoes (botao "Listar todas")
            try:
                link_mais = await self._page.query_selector("#linkmovalistar, a:has-text('Listar todas')")
                if link_mais:
                    await link_mais.click()
                    await self._human_delay(1000, 2000)
            except Exception:
                pass

            mov_rows = await self._page.query_selector_all("#tabelaTodasMovimentacoes tr, #tabelaUltimasMovimentacoes tr")
            movs = []
            for row in mov_rows:
                try:
                    data_el = await row.query_selector("td.dataMovimentacao, td:first-child")
                    desc_el = await row.query_selector("td.descricaoMovimentacao, td:nth-child(3)")
                    if data_el and desc_el:
                        data = (await data_el.text_content()).strip()
                        desc = (await desc_el.text_content()).strip()
                        if data and desc and re.match(r'\d{2}/\d{2}/\d{4}', data):
                            movs.append(Movimentacao(data=data, descricao=desc))
                except Exception:
                    continue
            processo.movimentacoes = movs[:50]
        except Exception:
            pass

        return processo

    async def buscar_por_nome(self, nome: str) -> list[ProcessoInfo]:
        """Busca processos por nome no eSAJ"""
        await self._init_browser()

        base = self.config.url_consulta
        nome_encoded = quote(nome)
        url = f"{base}?conversationId=&cbPesquisa=NMPARTE&dadosConsulta.valorConsulta={nome_encoded}"

        self.logger.info(f"Buscando por nome no eSAJ {self.config.tribunal}: {nome}")
        await self._page.goto(url, wait_until="domcontentloaded", timeout=self.config.timeout_seconds * 1000)
        await self._human_delay(2000, 4000)

        if await self._check_captcha():
            solved = await self._solve_captcha()
            if not solved:
                return []
            await self._human_delay()

        processos = []
        try:
            links = await self._page.query_selector_all("a[href*='show.do']")
            for link in links[:20]:
                try:
                    href = await link.get_attribute("href")
                    text = (await link.text_content()).strip()
                    # Extrai numero do texto ou href
                    match = re.search(r'(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})', text + " " + (href or ""))
                    if match:
                        processo = ProcessoInfo(
                            numero=match.group(1),
                            tribunal=self.config.tribunal,
                            url=href if href and href.startswith("http") else None,
                        )
                        processos.append(processo)
                except Exception:
                    continue
        except Exception:
            pass

        return processos


# Fabricas para cada tribunal eSAJ
def criar_esaj_scraper(tribunal: str, url: str, grau: str = "1g", **kwargs) -> ESAJScraper:
    """Cria scraper eSAJ configurado para um tribunal especifico"""
    config = ScraperConfig(
        sistema="esaj",
        tribunal=tribunal,
        url_consulta=url,
        grau=grau,
        **kwargs,
    )
    return ESAJScraper(config)


# Pre-configurados
ESAJ_TRIBUNAIS = {
    "TJSP_1G": ("TJSP", "https://esaj.tjsp.jus.br/cpopg/open.do", "1g"),
    "TJSP_2G": ("TJSP", "https://esaj.tjsp.jus.br/cposg/open.do", "2g"),
    "TJSC":    ("TJSC", "https://esaj.tjsc.jus.br/cpopg/open.do", "1g"),
    "TJMS":    ("TJMS", "https://esaj.tjms.jus.br/cpopg5/open.do", "1g"),
    "TJCE":    ("TJCE", "https://esaj.tjce.jus.br/cpopg/open.do", "1g"),
    "TJAM":    ("TJAM", "https://consultasaj.tjam.jus.br/cpopg/open.do", "1g"),
    "TJBA":    ("TJBA", "https://esaj.tjba.jus.br/cpopg/open.do", "1g"),
}


def get_esaj_scraper(key: str) -> ESAJScraper:
    """Retorna scraper eSAJ pre-configurado"""
    if key not in ESAJ_TRIBUNAIS:
        raise ValueError(f"Tribunal eSAJ nao configurado: {key}. Disponiveis: {list(ESAJ_TRIBUNAIS.keys())}")
    tribunal, url, grau = ESAJ_TRIBUNAIS[key]
    return criar_esaj_scraper(tribunal, url, grau)
