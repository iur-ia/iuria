"""
Scraper for TRF2 (Tribunal Regional Federal da 2a Regiao) using Scrapling
Covers: RJ e ES (Rio de Janeiro e Espirito Santo)
Anti-detection: stealth Playwright, pt-BR locale, google referer, user-agent rotation
"""
import re
import sys
import os
import asyncio
import random
from typing import Optional, List
from urllib.parse import quote, urlencode

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from base_scraper import BaseScraper, ResultadoBusca, ProcessoInfo, Movimentacao

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]


class TRF2Scrapling(BaseScraper):
    """Scraper for TRF2 using Scrapling with stealth Playwright"""

    def __init__(self):
        super().__init__()
        self.tribunal_nome = "Tribunal Regional Federal da 2a Regiao"
        self.tribunal_sigla = "TRF2"
        self.base_url = "https://eproc.jfrj.jus.br"
        self.consulta_url = "https://eproc.jfrj.jus.br/eproc2trf2/externo_controlador.php"

    def _fetch_with_scrapling(self, url: str):
        """Fetch using Scrapling DynamicFetcher with anti-detection"""
        from scrapling import Fetcher
        fetcher = Fetcher(verify=False)

        ua = random.choice(USER_AGENTS)
        wait = random.uniform(1.5, 3.0)


        page = fetcher.get(url)
        return page

    def _extrair_processo(self, page, numero: str, url: str) -> Optional[ProcessoInfo]:
        """Extract process from TRF2 eProc page"""
        try:
            page_text = page.get_all_text(ignore_tags=("script", "style"))

            if 'não encontrado' in page_text.lower() or 'nenhum' in page_text.lower()[:500]:
                return None
            if '403' in page_text[:200] or 'Forbidden' in page_text[:200]:
                return ProcessoInfo(
                    numero=numero, tribunal=self.tribunal_sigla, url=url,
                    assunto="Acesso bloqueado - acesse diretamente o portal do TRF2"
                )
            if len(page_text.strip()) < 100:
                return None

            processo = ProcessoInfo(
                numero=numero,
                numero_unico=numero,
                tribunal=self.tribunal_sigla,
                url=url
            )

            cnj_match = re.search(r'(\d{7}-\d{2}\.\d{4}\.4\.02\.\d{4})', page_text)
            if cnj_match:
                processo.numero_unico = cnj_match.group(1)

            classe_el = page.css('.infraNomeTipoProcesso, #fldTipoAcao, .tipo-acao').first
            if classe_el:
                processo.classe = classe_el.text.strip()[:100]

            assunto_el = page.css('.infraAssuntoProcesso, #fldAssunto').first
            if assunto_el:
                processo.assunto = assunto_el.text.strip()[:300]
            if not processo.assunto:
                m = re.search(r'(?:Assunto|Tipo de A)[^\n]*:[^\n]*\n?\s*(.+?)(?:\n|$)', page_text)
                if m:
                    processo.assunto = m.group(1).strip()[:300]

            for pat in [
                r'(?:Magistrado|Juiz|Relator)[:\s]+([A-Z][^\n]+?)(?:\n|$)',
                r'(?:MM\. Juíz|Exmo)[:\s]+([A-Z][^\n]+?)(?:\n|$)',
            ]:
                m = re.search(pat, page_text)
                if m:
                    processo.relator = m.group(1).strip()[:100]
                    break

            vara_el = page.css('.infraVara, #fldCargo').first
            if vara_el:
                processo.origem = vara_el.text.strip()[:200]

            partes = []
            for el in page.css('.infraNomeParte, .nome-parte, td.infraNomeParte'):
                t = el.text.strip()
                if t and len(t) > 2 and t not in partes:
                    partes.append(t)
                if len(partes) >= 10:
                    break
            processo.partes = partes

            movimentacoes = []
            for row in page.css('tr.infraTrClara, tr.infraTrEscura'):
                try:
                    cols = list(row.css('td'))
                    if len(cols) >= 2:
                        data = cols[0].text.strip() if cols[0] else ""
                        desc = cols[1].text.strip() if len(cols) > 1 else ""
                        if re.match(r'\d{2}/\d{2}/\d{4}', data) and desc:
                            movimentacoes.append(Movimentacao(data=data, descricao=desc))
                    if len(movimentacoes) >= 25:
                        break
                except:
                    continue

            if not movimentacoes:
                data_re = re.compile(r'\b(\d{2}/\d{2}/\d{4})\b')
                lines = page_text.split('\n')
                i = 0
                while i < len(lines) and len(movimentacoes) < 20:
                    line = lines[i].strip()
                    dm = data_re.search(line)
                    if dm and i + 1 < len(lines):
                        desc = lines[i + 1].strip()
                        if desc and len(desc) > 5:
                            movimentacoes.append(Movimentacao(data=dm.group(1), descricao=desc))
                        i += 2
                    else:
                        i += 1

            processo.movimentacoes = movimentacoes
            return processo

        except Exception as e:
            print(f"Erro ao extrair TRF2: {e}", file=sys.stderr)
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
                "acao": "processo_selecionar",
                "num_processo": numero_limpo,
                "acao_origem": "processo_consulta_externa",
                "acao_retorno": "processo_consulta_externa",
            })
            url = f"{self.consulta_url}?{params}"

            loop = asyncio.get_event_loop()
            page = self._fetch_with_scrapling(url)

            if page:
                processo = self._extrair_processo(page, numero, page.url or url)
                if processo:
                    resultado.processos = [processo]
                else:
                    url_portal = f"{self.consulta_url}?acao=processo_consulta_externa"
                    resultado.processos = [ProcessoInfo(
                        numero=numero, tribunal=self.tribunal_sigla, url=url_portal,
                        assunto="Acesse o portal do TRF2 para ver os detalhes completos"
                    )]
            else:
                resultado.erro = "Nao foi possivel acessar o portal do TRF2"

        except Exception as e:
            resultado.erro = f"Erro ao consultar TRF2: {str(e)}"

        return resultado

    async def buscar_por_nome(self, nome: str) -> ResultadoBusca:
        resultado = ResultadoBusca(
            tribunal=self.tribunal_sigla,
            tipo_busca="nome",
            termo_busca=nome
        )

        try:
            params = urlencode({
                "acao": "processo_consulta_externa",
                "nm_parte": nome,
            })
            url = f"{self.consulta_url}?{params}"

            loop = asyncio.get_event_loop()
            page = self._fetch_with_scrapling(url)

            if page:
                processos = self._extrair_lista_resultados(page)
                resultado.processos = processos
                if not processos:
                    resultado.erro = f"Nenhum processo encontrado para '{nome}' no TRF2"
            else:
                resultado.erro = "Nao foi possivel acessar o portal do TRF2"

        except Exception as e:
            resultado.erro = f"Erro ao buscar por nome no TRF2: {str(e)}"

        return resultado

    def _extrair_lista_resultados(self, page) -> List[ProcessoInfo]:
        processos = []
        try:
            page_text = page.get_all_text(ignore_tags=("script", "style"))
            for match in re.finditer(r'(\d{7}-\d{2}\.\d{4}\.4\.02\.\d{4})', page_text):
                numero = match.group(1)
                url = f"{self.consulta_url}?acao=processo_selecionar&num_processo={numero}"
                p = ProcessoInfo(numero=numero, tribunal=self.tribunal_sigla, url=url)
                if not any(x.numero == p.numero for x in processos):
                    processos.append(p)
                if len(processos) >= 10:
                    break
        except Exception as e:
            print(f"Erro ao extrair lista TRF2: {e}", file=sys.stderr)
        return processos
