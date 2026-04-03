"""
Integracao com Querido Diario / Ro-DOU para DOU e diarios municipais
API: https://queridodiario.ok.org.br/api/
Ro-DOU: https://github.com/gestaogovbr/Ro-dou

Uso:
    from dou_rodou import DOUSearcher
    searcher = DOUSearcher()
    results = searcher.buscar(["falencia", "recuperacao judicial"])
"""
import requests
import json
from datetime import datetime, timedelta


class DOUSearcher:
    """Cliente para API do Querido Diario (diarios oficiais brasileiros)."""

    API_URL = "https://queridodiario.ok.org.br/api/gazettes"

    # Territory IDs mais usados em direito empresarial
    TERRITORIES = {
        # Capitais
        "rio_de_janeiro_municipio": "3304557",
        "sao_paulo_municipio": "3550308",
        "brasilia": "5300108",
        "belo_horizonte": "3106200",
        "salvador": "2927408",
        "curitiba": "4106902",
        "porto_alegre": "4314902",
        "recife": "2611606",
        "fortaleza": "2304400",
        # Estados
        "rio_de_janeiro_estado": "33",
        "sao_paulo_estado": "35",
        "minas_gerais_estado": "31",
        # Federal
        "brasil_federal": "br",
    }

    def __init__(self, timeout: int = 15):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "iuria-lexfutura/3.0 DOUClient/1.0",
            "Accept": "application/json",
        })

    def buscar(
        self,
        keywords: list,
        territory: str = "rio_de_janeiro_municipio",
        days_back: int = 7,
        size: int = 20,
    ) -> list:
        """
        Busca nos diarios oficiais via API Querido Diario.

        Args:
            keywords: Lista de termos (ex: ["falencia", "recuperacao judicial"])
            territory: Chave do dicionario TERRITORIES ou ID numerico direto
            days_back: Quantos dias para tras buscar (default: 7)
            size: Numero maximo de resultados (default: 20)

        Returns:
            Lista de dicionarios com publicacoes encontradas
        """
        territory_id = self.TERRITORIES.get(territory, territory)
        since = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
        until = datetime.now().strftime("%Y-%m-%d")

        params = {
            "territory_id": territory_id,
            "since": since,
            "until": until,
            "keywords": " ".join(keywords),
            "size": size,
        }

        try:
            resp = self.session.get(
                self.API_URL,
                params=params,
                timeout=self.timeout,
            )

            if resp.status_code == 200:
                data = resp.json()
                gazettes = data.get("gazettes", [])
                return [self._format_gazette(g, keywords) for g in gazettes]

            return [{
                "erro": f"HTTP {resp.status_code}",
                "fonte": "Querido Diario",
                "detalhes": resp.text[:200],
            }]

        except requests.Timeout:
            return [{
                "erro": "Timeout na busca",
                "fonte": "Querido Diario",
                "keywords": keywords,
            }]
        except Exception as e:
            return [{"erro": str(e), "fonte": "Querido Diario"}]

    def _format_gazette(self, gazette: dict, keywords: list) -> dict:
        """Formata um resultado da API para o padrao do iuria."""
        return {
            "fonte": "Querido Diario",
            "territory_id": gazette.get("territory_id"),
            "territory_name": gazette.get("territory_name"),
            "date": gazette.get("date"),
            "edition": gazette.get("edition"),
            "is_extra_edition": gazette.get("is_extra_edition", False),
            "url": gazette.get("url"),
            "txt_url": gazette.get("txt_url"),
            "excertos": gazette.get("excerpts", []),
            "keywords": keywords,
        }

    def buscar_dou_federal(self, keywords: list, days_back: int = 7) -> list:
        """Atalho para buscar no DOU federal."""
        return self.buscar(keywords, territory="brasil_federal", days_back=days_back)

    def buscar_dje_rj(self, keywords: list, days_back: int = 7) -> list:
        """Atalho para buscar no diario do estado do RJ."""
        return self.buscar(keywords, territory="rio_de_janeiro_estado", days_back=days_back)

    def buscar_multi_territories(
        self, keywords: list, territories: list = None, days_back: int = 7
    ) -> dict:
        """
        Busca em multiplos territorios simultaneamente.

        Args:
            keywords: Termos de busca
            territories: Lista de chaves de TERRITORIES (default: RJ municipio + estado + federal)
            days_back: Dias para tras

        Returns:
            Dicionario com resultados por territorio
        """
        if territories is None:
            territories = [
                "rio_de_janeiro_municipio",
                "rio_de_janeiro_estado",
                "brasil_federal",
            ]

        resultados = {}
        for territory in territories:
            resultados[territory] = self.buscar(
                keywords, territory=territory, days_back=days_back
            )

        return resultados

    def listar_territorios(self) -> dict:
        """Retorna os territorios disponiveis."""
        return dict(self.TERRITORIES)


if __name__ == "__main__":
    searcher = DOUSearcher()
    results = searcher.buscar(["falencia", "recuperacao judicial"])
    print(json.dumps(results, indent=2, ensure_ascii=False))
