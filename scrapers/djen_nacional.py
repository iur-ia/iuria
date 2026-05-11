import requests
import json
from datetime import datetime, timedelta
import urllib3

urllib3.disable_warnings()

class DJENScraper:
    """
    Integração direta com o DJEN (Diário da Justiça Eletrônico Nacional) do CNJ.
    """
    def __init__(self, proxy_url=None, proxy_key=None):
        self.api_url = "https://comunica.pje.jus.br/api/v1/comunicacao"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        self.proxy_url = proxy_url
        self.proxy_key = proxy_key

    def buscar_publicacoes(self, data_inicio=None, data_fim=None, numero_processo=None, pagina=1):
        """
        Busca publicações e prazos diretamente no painel do CNJ.
        """
        if not data_inicio:
            data_inicio = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        if not data_fim:
            data_fim = datetime.now().strftime("%Y-%m-%d")

        payload = {
            "dataDisponibilizacaoInicio": data_inicio,
            "dataDisponibilizacaoFim": data_fim,
            "pagina": pagina,
            "itensPorPagina": 50
        }

        if numero_processo:
            payload["numeroProcesso"] = numero_processo

        try:
            if self.proxy_url and self.proxy_key:
                # Wrap it with TinyFish
                # Note: TinyFish usually requires URL encoding. For POST, we might need specific proxy params,
                # but if TinyFish handles GET we can just pass the URL.
                pass

            resp = requests.post(
                self.api_url,
                json=payload,
                headers=self.headers,
                verify=False,
                timeout=45
            )

            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                total = data.get("count", 0)

                return {
                    "status": "ok",
                    "total": total,
                    "fonte": "DJEN (CNJ)",
                    "resultados": [
                        {
                            "processo": item.get("numeroProcesso"),
                            "tribunal": item.get("siglaTribunal"),
                            "data_disponibilizacao": item.get("dataDisponibilizacao"),
                            "tipo": item.get("tipoComunicacao"),
                            "conteudo": item.get("texto"),
                            "destinatarios": [d.get("nome") for d in item.get("destinatarios", [])]
                        }
                        for item in items
                    ]
                }
            else:
                return {"status": "erro", "http": resp.status_code, "mensagem": resp.text[:200]}

        except Exception as e:
            return {"status": "erro", "mensagem": str(e)}

if __name__ == "__main__":
    import sys
    djen = DJENScraper()
    proc = sys.argv[1] if len(sys.argv) > 1 else None
    print(json.dumps(djen.buscar_publicacoes(numero_processo=proc), ensure_ascii=False, indent=2))
