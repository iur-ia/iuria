"""
Busca em Diarios Oficiais via API Querido Diario
DOU (federal), DOM-Rio (municipal), DOERJ (estadual)
API: https://queridodiario.ok.org.br/api/
"""
import requests, json, sys
from datetime import datetime, timedelta

class DOUSearcher:
    API = "https://queridodiario.ok.org.br/api/gazettes"
    TERRITORIES = {
        "rio_municipio": "3304557",
        "rio_estado": "33",
        "federal": "br",
    }
    
    def buscar(self, keywords, territory="rio_municipio", days=7):
        tid = self.TERRITORIES.get(territory, territory)
        since = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        until = datetime.now().strftime("%Y-%m-%d")
        try:
            r = requests.get(self.API, params={
                "territory_id": tid, "since": since, "until": until,
                "keywords": " ".join(keywords), "size": 10
            }, timeout=15)
            if r.status_code == 200:
                data = r.json()
                return {"status": "ok", "total": data.get("total_gazettes", 0),
                        "resultados": [{
                            "data": g.get("date"), "territorio": g.get("territory_name"),
                            "url": g.get("url", "")[:100]
                        } for g in data.get("gazettes", [])[:5]]}
            return {"status": "erro", "http": r.status_code}
        except Exception as e:
            return {"status": "erro", "mensagem": str(e)}

if __name__ == "__main__":
    s = DOUSearcher()
    kw = sys.argv[1:] if len(sys.argv) > 1 else ["falencia"]
    print(json.dumps(s.buscar(kw), indent=2, ensure_ascii=False))
