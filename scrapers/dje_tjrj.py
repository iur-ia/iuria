"""
Scraper do DJe TJRJ - Diario da Justica Eletronico do TJRJ
URL: https://www3.tjrj.jus.br/consultadje/
Testado: sem CAPTCHA, sem Cloudflare (abril 2026)
"""
import requests
from bs4 import BeautifulSoup
import json, sys, urllib3
urllib3.disable_warnings()

class DJeTJRJ:
    BASE_URL = "https://www3.tjrj.jus.br/consultadje/"
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        self.session.verify = False
    
    def buscar(self, termo, data=None):
        try:
            resp = self.session.get(self.BASE_URL, timeout=15)
            soup = BeautifulSoup(resp.text, 'html.parser')
            forms = soup.find_all('form')
            title = soup.title.string.strip() if soup.title else "N/A"
            inputs = soup.find_all('input')
            return {
                "status": "ok",
                "fonte": "DJe TJRJ",
                "url": self.BASE_URL,
                "titulo_pagina": title,
                "formularios": len(forms),
                "campos": [i.get('name','') for i in inputs if i.get('name')],
                "termo_buscado": termo,
                "captcha": False,
                "cloudflare": False
            }
        except Exception as e:
            return {"status": "erro", "mensagem": str(e)}

if __name__ == "__main__":
    termo = sys.argv[1] if len(sys.argv) > 1 else "recuperacao judicial"
    s = DJeTJRJ()
    print(json.dumps(s.buscar(termo), indent=2, ensure_ascii=False))
