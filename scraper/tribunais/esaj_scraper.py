"""
Scraper eSAJ - Sistema de Automação do Judiciário (Softplan)
Cobre 8+ tribunais estaduais com um único scraper paramétrico:
TJSP, TJBA, TJCE, TJAC, TJAL, TJAM, TJSC, TJMS

Portais:
- TJSP: https://esaj.tjsp.jus.br/
- TJBA: https://esaj.tjba.jus.br/
- TJCE: https://esaj.tjce.jus.br/
- TJAC: https://esaj.tjac.jus.br/
- TJSC: https://esaj.tjsc.jus.br/
- TJMS: https://esaj.tjms.jus.br/
- TJAL: https://www2.tjal.jus.br/
- TJAM: https://consultasaj.tjam.jus.br/

Estratégia de engine:
- Tribunais com Cloudflare/Imperva pesado → tenta Camoufox antes de Scrapling
- Demais tribunais → Scrapling DynamicFetcher direto

Campos extraídos (alinhado com mapeamento courtsbr/esaj):
  número, classe, assunto, valor da causa, comarca, vara, juiz/a,
  data de distribuição, partes (com tipo de polo), advogados (com OAB),
  movimentações (data + descrição completa)
"""
import re
import sys
import os
import asyncio
import time
import random
from typing import Optional, List, Dict
from urllib.parse import quote, urlencode

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import BaseScraper, ResultadoBusca, ProcessoInfo, Movimentacao

TRIBUNAIS_ESAJ = {
    "TJSP": {
        "nome": "Tribunal de Justiça de São Paulo",
        "base_url": "https://esaj.tjsp.jus.br",
        "consulta_1g": "https://esaj.tjsp.jus.br/cpopg/show.do",
        "consulta_2g": "https://esaj.tjsp.jus.br/cposg/show.do",
        "busca_nome": "https://esaj.tjsp.jus.br/cpopg/search.do",
        "cloudflare": True,
    },
    "TJBA": {
        "nome": "Tribunal de Justiça da Bahia",
        "base_url": "https://esaj.tjba.jus.br",
        "consulta_1g": "https://esaj.tjba.jus.br/cpopg/show.do",
        "consulta_2g": "https://esaj.tjba.jus.br/cposg/show.do",
        "busca_nome": "https://esaj.tjba.jus.br/cpopg/search.do",
        "cloudflare": True,
    },
    "TJCE": {
        "nome": "Tribunal de Justiça do Ceará",
        "base_url": "https://esaj.tjce.jus.br",
        "consulta_1g": "https://esaj.tjce.jus.br/cpopg/show.do",
        "consulta_2g": "https://esaj.tjce.jus.br/cposg/show.do",
        "busca_nome": "https://esaj.tjce.jus.br/cpopg/search.do",
        "cloudflare": True,
    },
    "TJSC": {
        "nome": "Tribunal de Justiça de Santa Catarina",
        "base_url": "https://esaj.tjsc.jus.br",
        "consulta_1g": "https://esaj.tjsc.jus.br/cpopg/show.do",
        "consulta_2g": "https://esaj.tjsc.jus.br/cposg/show.do",
        "busca_nome": "https://esaj.tjsc.jus.br/cpopg/search.do",
        "cloudflare": False,
    },
    "TJMS": {
        "nome": "Tribunal de Justiça de Mato Grosso do Sul",
        "base_url": "https://esaj.tjms.jus.br",
        "consulta_1g": "https://esaj.tjms.jus.br/cpopg5/show.do",
        "consulta_2g": "https://esaj.tjms.jus.br/cposg5/show.do",
        "busca_nome": "https://esaj.tjms.jus.br/cpopg5/search.do",
        "cloudflare": False,
    },
    "TJAC": {
        "nome": "Tribunal de Justiça do Acre",
        "base_url": "https://esaj.tjac.jus.br",
        "consulta_1g": "https://esaj.tjac.jus.br/cpopg/show.do",
        "consulta_2g": "https://esaj.tjac.jus.br/cposg/show.do",
        "busca_nome": "https://esaj.tjac.jus.br/cpopg/search.do",
        "cloudflare": False,
    },
    "TJAL": {
        "nome": "Tribunal de Justiça de Alagoas",
        "base_url": "https://www2.tjal.jus.br",
        "consulta_1g": "https://www2.tjal.jus.br/cpopg/show.do",
        "consulta_2g": "https://www2.tjal.jus.br/cposg/show.do",
        "busca_nome": "https://www2.tjal.jus.br/cpopg/search.do",
        "cloudflare": False,
    },
    "TJAM": {
        "nome": "Tribunal de Justiça do Amazonas",
        "base_url": "https://consultasaj.tjam.jus.br",
        "consulta_1g": "https://consultasaj.tjam.jus.br/cpopg/show.do",
        "consulta_2g": "https://consultasaj.tjam.jus.br/cposg/show.do",
        "busca_nome": "https://consultasaj.tjam.jus.br/cpopg/search.do",
        "cloudflare": False,
    },
}

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]


class ESAJScraper(BaseScraper):
    """Scraper paramétrico para todos os tribunais do sistema eSAJ"""

    def __init__(self, tribunal_sigla: str):
        super().__init__()

        sigla_upper = tribunal_sigla.upper()
        if sigla_upper not in TRIBUNAIS_ESAJ:
            raise ValueError(f"Tribunal {tribunal_sigla} não suportado. Disponíveis: {list(TRIBUNAIS_ESAJ.keys())}")

        config = TRIBUNAIS_ESAJ[sigla_upper]
        self.tribunal_sigla = sigla_upper
        self.tribunal_nome = config["nome"]
        self.config = config
        self.base_url = config["base_url"]
        self.usa_cloudflare = config.get("cloudflare", False)

    def _fetch_with_camoufox(self, url: str) -> Optional[object]:
        """Fetch usando Camoufox para portais com Cloudflare/Imperva."""
        try:
            from camoufox.sync_api import Camoufox

            with Camoufox(headless=True, geoip=True) as browser:
                page = browser.new_page()
                page.set_extra_http_headers({
                    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                })
                page.goto(url, wait_until="networkidle", timeout=45000)
                time.sleep(random.uniform(1.5, 3.0))
                html = page.content()
                page.close()
            return html
        except ImportError:
            print("[esaj] Camoufox não instalado — usando Scrapling", file=sys.stderr)
            return None
        except Exception as e:
            print(f"[esaj] Camoufox falhou: {e}", file=sys.stderr)
            return None

    def _fetch_with_scrapling(self, url: str, wait: float = None) -> Optional[object]:
        """Fetch usando Scrapling DynamicFetcher com técnicas anti-detecção."""
        from scrapling import Fetcher
        fetcher = Fetcher()

        if wait is None:
            wait = random.uniform(1.5, 3.0)

        ua = random.choice(USER_AGENTS)


        page = fetcher.get(url, proxy=None, proxies=None, impersonate='chrome120', timeout=30000, verify=False)
        return page

    def _fetch(self, url: str):
        """
        Seleciona engine de acordo com o tribunal:
        - Cloudflare/Imperva → tenta Camoufox primeiro, fallback Scrapling
        - Outros → Scrapling direto
        """
        if self.usa_cloudflare:
            html = self._fetch_with_camoufox(url)
            if html:
                try:
                    from scrapling import Adaptor
                    return Adaptor(html, auto_match=False)
                except Exception:
                    pass
        return self._fetch_with_scrapling(url)

    def _extrair_valor_causa(self, page_text: str) -> Optional[str]:
        """Extrai valor da causa do texto da página."""
        patterns = [
            r'Valor\s+da\s+[Aa]ção[:\s]+R?\$?\s*([\d.,]+)',
            r'Valor\s+da\s+[Cc]ausa[:\s]+R?\$?\s*([\d.,]+)',
            r'valorCausa["\s:>]+([\d.,]+)',
        ]
        for pat in patterns:
            m = re.search(pat, page_text)
            if m:
                return m.group(1).strip()
        return None

    def _extrair_comarca(self, page, page_text: str) -> Optional[str]:
        """Extrai comarca da página."""
        for sel in ['#comarcaProcesso', '.comarcaProcesso', '#comarca', '.comarca']:
            el = page.css(sel).first if hasattr(page, 'css') else None
            if el:
                return el.text.strip()

        m = re.search(r'[Cc]omarca[:\s]+([^\n|<]{3,80})', page_text)
        if m:
            return m.group(1).strip()
        return None

    def _extrair_distribuicao(self, page_text: str) -> Optional[str]:
        """Extrai data de distribuição."""
        patterns = [
            r'[Dd]istribuição[:\s]+(\d{2}/\d{2}/\d{4})',
            r'[Dd]istribuído[:\s]+(\d{2}/\d{2}/\d{4})',
            r'dataDistribuicao["\s:>]+(\d{2}/\d{2}/\d{4})',
        ]
        for pat in patterns:
            m = re.search(pat, page_text)
            if m:
                return m.group(1)
        return None

    def _extrair_advogados(self, page, page_text: str) -> List[str]:
        """Extrai advogados com número OAB quando disponível."""
        advogados = []

        for sel in ['.advogadoNome', '.nomeAdvogado', 'span[id*="advogad"]', 'td.advogado']:
            if not hasattr(page, 'css'):
                break
            for el in page.css(sel):
                texto = el.text.strip()
                if texto and len(texto) > 3 and texto not in advogados:
                    advogados.append(texto)
                if len(advogados) >= 10:
                    break

        oab_pattern = re.compile(
            r'(?:Adv(?:ogado)?\.?[:\s]+)?([A-ZÁÉÍÓÚÂÊÎÔÛÀÃÕÇÜ][^\n]{5,60})'
            r'(?:[:\s]+OAB[:\s]+([A-Z]{2}\s*[\d/]+))?',
            re.IGNORECASE
        )
        if not advogados:
            for m in oab_pattern.finditer(page_text):
                nome = m.group(1).strip()
                oab = m.group(2)
                if oab:
                    entrada = f"{nome} (OAB {oab.strip()})"
                    if entrada not in advogados:
                        advogados.append(entrada)
                if len(advogados) >= 10:
                    break

        return advogados[:10]

    def _extrair_partes_e_advogados(self, page, page_text: str) -> tuple:
        """Extrai partes (com polo) e advogados separadamente."""
        partes = []
        advogados = []

        if hasattr(page, 'css'):
            for row in page.css('.fundoClaro, .fundoEscuro, tr.fundoClaro, tr.fundoEscuro'):
                cells = row.css('td')
                if len(cells) >= 2:
                    tipo_polo = cells[0].text.strip()
                    nome = cells[1].text.strip()
                    if nome and len(nome) > 2:
                        if tipo_polo:
                            partes.append(f"{tipo_polo}: {nome}")
                        else:
                            partes.append(nome)
                elif len(cells) == 1:
                    txt = cells[0].text.strip()
                    if txt and len(txt) > 2:
                        partes.append(txt)
                if len(partes) >= 12:
                    break

            for el in page.css('.nomeParteEAdvogado, .txtTabelaResumo'):
                txt = el.text.strip()
                if txt and len(txt) > 2 and txt not in partes:
                    partes.append(txt)
                if len(partes) >= 12:
                    break

            advogados = self._extrair_advogados(page, page_text)

        if not partes:
            parte_re = re.compile(r'(?:Requerente|Requerido|Autor|Réu|Impetrant|Impetr)[:\s]+([^\n]{3,80})', re.IGNORECASE)
            for m in parte_re.finditer(page_text):
                tipo = page_text[m.start():m.start()+20].split(':')[0].strip()
                nome = m.group(1).strip()
                entrada = f"{tipo}: {nome}"
                if entrada not in partes:
                    partes.append(entrada)
                if len(partes) >= 12:
                    break

        return partes[:12], advogados

    def _extrair_processo_esaj(self, page, numero: str, url: str) -> Optional[ProcessoInfo]:
        try:
            page_text = page.get_all_text(ignore_tags=("script", "style"))
            if 'não encontrado' in page_text.lower() or 'nenhum processo' in page_text.lower():
                return None

            processo = ProcessoInfo(
                numero=numero,
                numero_unico=numero,
                tribunal=self.tribunal_sigla,
                url=url
            )

            # Extract basics via Regex since HTML tags might be wiped
            for m in page_text.splitlines():
                if m.strip().lower().startswith("classe"):
                    processo.classe = m.split(":", 1)[-1].strip()
                if m.strip().lower().startswith("assunto"):
                    processo.assunto = m.split(":", 1)[-1].strip()

            return processo

        except Exception as e:
            return None

    def _extrair_processo_esaj_old(self, page, numero: str, url: str) -> Optional[ProcessoInfo]:
        """
        Extrai dados de processo de uma página eSAJ.
        Campos: classe, assunto, valor da causa, comarca, vara, juiz,
                distribuição, partes (polo), advogados (OAB), movimentações.
        """
        try:
            page_text = page.get_all_text(ignore_tags=("script", "style")) if hasattr(page, 'get_all_text') else str(page)

            if 'não encontrado' in page_text.lower() or 'nenhum processo' in page_text.lower():
                return None
            if len(page_text.strip()) < 100:
                return None

            processo = ProcessoInfo(
                numero=numero,
                numero_unico=numero,
                tribunal=self.tribunal_sigla,
                url=url
            )

            cnj_match = re.search(r'(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})', page_text)
            if cnj_match:
                processo.numero_unico = cnj_match.group(1)

            if hasattr(page, 'css'):
                classe_el = page.css('.unj-tag, .classeProcesso, #classeProcesso').first
                if classe_el:
                    processo.classe = classe_el.text.strip()

                assunto_el = page.css('.assuntoDescricao, #assuntoDescricao, #assuntoProcesso').first
                if assunto_el:
                    processo.assunto = assunto_el.text.strip()

                juiz_el = page.css('#juizPrincipal, .juiz, .nomeRelator, #magistrado').first
                if juiz_el:
                    processo.relator = juiz_el.text.strip()

                vara_el = page.css('#varaProcesso, .varaProcesso, #orgaoJulgador').first
                if vara_el:
                    processo.origem = vara_el.text.strip()

            if not processo.classe:
                m = re.search(r'[Cc]lasse[:\s]+([^\n|]{3,80})', page_text)
                if m:
                    processo.classe = m.group(1).strip()[:100]

            if not processo.assunto:
                m = re.search(r'[Aa]ssunto[:\s]+([^\n|]{3,150})', page_text)
                if m:
                    processo.assunto = m.group(1).strip()[:200]

            if not processo.relator:
                m = re.search(r'(?:Juiz|Juíza|Magistrad|Relator)[^:]*:[^\n]*\n?\s*([A-Z][^\n]{5,80})', page_text)
                if m:
                    processo.relator = m.group(1).strip()[:100]

            if not processo.origem:
                m = re.search(r'(?:Vara|Câmara|Turma)[:\s]+([^\n|]{3,80})', page_text)
                if m:
                    processo.origem = m.group(1).strip()[:100]

            processo.comarca = self._extrair_comarca(page, page_text)
            processo.valor_causa = self._extrair_valor_causa(page_text)
            processo.data_distribuicao = self._extrair_distribuicao(page_text)

            partes, advogados = self._extrair_partes_e_advogados(page, page_text)
            processo.partes = partes
            processo.advogados = advogados

            movimentacoes = []
            if hasattr(page, 'css'):
                for row in page.css('tr.containerMovimentacao, tr[class*="movimentacao"], .movimentacaoProcesso tr'):
                    try:
                        data_el = row.css('.dataMovimentacao, td:first-child').first
                        desc_el = row.css('.descricaoMovimentacao, td.descricaoMovimentacao, td:last-child').first

                        data = data_el.text.strip() if data_el else ""
                        descricao = desc_el.text.strip() if desc_el else ""

                        if re.match(r'\d{2}/\d{2}/\d{4}', data) and descricao:
                            movimentacoes.append(Movimentacao(data=data, descricao=descricao))

                        if len(movimentacoes) >= 30:
                            break
                    except Exception:
                        continue

            if not movimentacoes:
                data_pattern = re.compile(r'(\d{2}/\d{2}/\d{4})')
                lines = page_text.split('\n')
                i = 0
                while i < len(lines) and len(movimentacoes) < 25:
                    line = lines[i].strip()
                    if data_pattern.match(line) and i + 1 < len(lines):
                        descricao = lines[i + 1].strip()
                        if descricao and len(descricao) > 3:
                            movimentacoes.append(Movimentacao(data=line, descricao=descricao))
                        i += 2
                    else:
                        i += 1

            processo.movimentacoes = movimentacoes

            campos_preenchidos = sum(1 for f in [
                processo.classe, processo.assunto, processo.relator,
                processo.origem, processo.comarca, processo.valor_causa,
                processo.data_distribuicao,
            ] if f)
            campos_preenchidos += min(len(processo.partes), 5)
            campos_preenchidos += min(len(processo.movimentacoes), 10)
            print(
                f"[esaj] fonte=eSAJScraper tribunal={self.tribunal_sigla} "
                f"campos={campos_preenchidos} movs={len(processo.movimentacoes)} "
                f"partes={len(processo.partes)} advs={len(processo.advogados or [])}",
                file=sys.stderr
            )

            return processo

        except Exception as e:
            print(f"Erro ao extrair processo eSAJ: {e}", file=sys.stderr)
            return None

    async def buscar_por_numero(self, numero: str) -> ResultadoBusca:
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="numero",
            termo_busca=numero
        )

        try:
            numero_limpo = re.sub(r'[^\d.-]', '', numero)

            params = urlencode({
                "processo.codigo": "",
                "processo.foro": "0",
                "processo.numero": numero_limpo,
                "uuidCaptcha": "",
                "pbEnviar": "Pesquisar"
            })

            url = f"{self.config['consulta_1g']}?{params}"

            loop = asyncio.get_event_loop()
            page = await loop.run_in_executor(None, self._fetch, url)

            if page:
                processo = self._extrair_processo_esaj(page, numero, url)

                if processo:
                    resultado.processos = [processo]
                else:
                    url_portal = f"{self.config['consulta_1g']}?processo.numero={numero_limpo}"
                    resultado.processos = [ProcessoInfo(
                        numero=numero,
                        tribunal=self.tribunal_sigla,
                        url=url_portal,
                        assunto=f"Acesse o portal {self.tribunal_nome} para ver os detalhes"
                    )]
            else:
                resultado.erro = f"Não foi possível acessar o portal do {self.tribunal_nome}"

        except Exception as e:
            resultado.erro = f"Erro ao consultar {self.tribunal_nome}: {str(e)}"

        return resultado

    async def buscar_por_nome(self, nome: str) -> ResultadoBusca:
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="nome",
            termo_busca=nome
        )

        try:
            params = urlencode({
                "dadosConsulta.tipoPesquisa": "NMPARTE",
                "dadosConsulta.valorConsultaNM": nome,
                "pbEnviar": "Pesquisar"
            })

            url = f"{self.config['busca_nome']}?{params}"

            loop = asyncio.get_event_loop()
            page = await loop.run_in_executor(None, self._fetch, url)

            if page:
                processos = self._extrair_lista_resultados(page)
                resultado.processos = processos

                if not processos:
                    page_text = page.get_all_text(ignore_tags=("script", "style")) if hasattr(page, 'get_all_text') else ''
                    if 'nenhum' in page_text.lower() or 'não encontrado' in page_text.lower():
                        resultado.erro = f"Nenhum processo encontrado para '{nome}'"
                    else:
                        resultado.erro = "Não foi possível extrair resultados"
            else:
                resultado.erro = f"Não foi possível acessar o portal do {self.tribunal_nome}"

        except Exception as e:
            resultado.erro = f"Erro ao buscar por nome em {self.tribunal_nome}: {str(e)}"

        return resultado

    def _extrair_lista_resultados(self, page) -> List[ProcessoInfo]:
        processos = []

        try:
            if not hasattr(page, 'css'):
                return processos

            for link in page.css('a[href*="cpopg"], a[href*="cposg"]'):
                try:
                    href = link.attrib.get('href', '')
                    text = link.text.strip()

                    if href and (re.search(r'\d{7}', text) or 'processo' in href.lower()):
                        cnj_match = re.search(r'(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})', text + href)
                        numero = cnj_match.group(1) if cnj_match else text

                        if numero and len(numero) > 3:
                            url = href if href.startswith('http') else f"{self.base_url}{href}"
                            processo = ProcessoInfo(
                                numero=numero,
                                tribunal=self.tribunal_sigla,
                                url=url
                            )
                            if not any(p.numero == processo.numero for p in processos):
                                processos.append(processo)

                    if len(processos) >= 10:
                        break
                except Exception:
                    continue

        except Exception as e:
            print(f"Erro ao extrair lista eSAJ: {e}", file=sys.stderr)

        return processos


def criar_scraper(tribunal_sigla: str) -> ESAJScraper:
    return ESAJScraper(tribunal_sigla)


def listar_tribunais() -> list:
    return [
        {"sigla": sigla, "nome": info["nome"]}
        for sigla, info in TRIBUNAIS_ESAJ.items()
    ]
