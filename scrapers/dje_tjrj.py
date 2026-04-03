"""
Scraper do DJe TJRJ (Diario da Justica Eletronico do TJRJ)
URL: https://www3.tjrj.jus.br/consultadje/
Sem CAPTCHA, sem Cloudflare - acesso direto funciona

Uso:
    from dje_tjrj import DJeTJRJ
    scraper = DJeTJRJ()
    results = scraper.buscar("recuperacao judicial")
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import json
import re
import urllib3

# Suprimir warnings de SSL para sites gov que usam certificados self-signed
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class DJeTJRJ:
    BASE_URL = "https://www3.tjrj.jus.br/consultadje/"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        })
        self._viewstate = None
        self._eventvalidation = None

    def _get_form_tokens(self) -> bool:
        """Carrega a pagina inicial e extrai tokens de formulario ASP.NET."""
        try:
            resp = self.session.get(self.BASE_URL, verify=False, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            vs = soup.find("input", {"name": "__VIEWSTATE"})
            ev = soup.find("input", {"name": "__EVENTVALIDATION"})
            self._viewstate = vs["value"] if vs else ""
            self._eventvalidation = ev["value"] if ev else ""
            return True
        except Exception:
            return False

    def buscar(
        self,
        termo: str,
        data_inicio: str = None,
        data_fim: str = None,
        caderno: str = "Judicial",
    ) -> list:
        """
        Busca publicacoes no DJe TJRJ por termo.

        Args:
            termo: Texto a buscar (ex: "recuperacao judicial", nome da parte, n. OAB)
            data_inicio: Data inicial no formato DD/MM/AAAA (default: 7 dias atras)
            data_fim: Data final no formato DD/MM/AAAA (default: hoje)
            caderno: "Judicial" ou "Administrativo"

        Returns:
            Lista de dicionarios com publicacoes encontradas
        """
        if not data_inicio:
            data_inicio = (datetime.now() - timedelta(days=7)).strftime("%d/%m/%Y")
        if not data_fim:
            data_fim = datetime.now().strftime("%d/%m/%Y")

        # Obter tokens do formulario
        if not self._get_form_tokens():
            return [{"erro": "Falha ao acessar pagina do DJe TJRJ", "fonte": "DJe TJRJ"}]

        # Montar payload de busca
        payload = {
            "__VIEWSTATE": self._viewstate or "",
            "__EVENTVALIDATION": self._eventvalidation or "",
            "txtPesquisa": termo,
            "txtDataInicial": data_inicio,
            "txtDataFinal": data_fim,
            "ddlCaderno": caderno,
            "btnPesquisar": "Pesquisar",
        }

        try:
            resp = self.session.post(
                self.BASE_URL,
                data=payload,
                verify=False,
                timeout=30,
            )
            resp.raise_for_status()
            return self._parse_resultados(resp.text, termo)
        except requests.Timeout:
            return [{"erro": "Timeout na busca", "fonte": "DJe TJRJ", "termo": termo}]
        except Exception as e:
            return [{"erro": str(e), "fonte": "DJe TJRJ", "termo": termo}]

    def _parse_resultados(self, html: str, termo: str) -> list:
        """Parseia a pagina de resultados do DJe TJRJ."""
        soup = BeautifulSoup(html, "html.parser")
        resultados = []

        # O TJRJ retorna resultados em divs com classe especifica
        items = soup.find_all("div", class_=re.compile(r"resultado|item|publicacao", re.I))
        if not items:
            # Fallback: buscar em tabelas
            items = soup.find_all("tr", class_=re.compile(r"resultado|item|linha", re.I))

        for item in items:
            texto = item.get_text(separator=" ", strip=True)
            if not texto or len(texto) < 20:
                continue

            # Extrair data da publicacao
            data_match = re.search(r"(\d{2}/\d{2}/\d{4})", texto)
            data_pub = data_match.group(1) if data_match else None

            # Extrair numero de processo
            proc_match = re.search(
                r"(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})", texto
            )
            numero_processo = proc_match.group(1) if proc_match else None

            resultados.append({
                "fonte": "DJe TJRJ",
                "tribunal": "TJRJ",
                "data_publicacao": data_pub,
                "numero_processo": numero_processo,
                "conteudo_resumo": texto[:500],
                "termo_busca": termo,
            })

        if not resultados:
            resultados.append({
                "fonte": "DJe TJRJ",
                "tribunal": "TJRJ",
                "termo_busca": termo,
                "status": "nenhum_resultado",
                "mensagem": "Nenhuma publicacao encontrada para o termo informado",
            })

        return resultados

    def buscar_por_oab(self, numero_oab: str, secional: str = "RJ") -> list:
        """Busca publicacoes por numero da OAB."""
        termo = f"OAB/{secional} {numero_oab}"
        return self.buscar(termo)

    def buscar_por_processo(self, numero_processo: str) -> list:
        """Busca publicacoes por numero do processo."""
        return self.buscar(numero_processo)


if __name__ == "__main__":
    scraper = DJeTJRJ()
    results = scraper.buscar("recuperacao judicial")
    print(json.dumps(results, indent=2, ensure_ascii=False))
