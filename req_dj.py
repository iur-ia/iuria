import requests
import json
import urllib3
import traceback

urllib3.disable_warnings()

url = "https://comunica.pje.jus.br/api/v1/comunicacao"

payload = {
  "dataDisponibilizacaoFim": "2024-05-11",
  "dataDisponibilizacaoInicio": "2024-05-10",
  "pagina": 1,
  "itensPorPagina": 10
}

try:
    print("Testando DJEN...")
    res = requests.post(url, json=payload, headers={'User-Agent': 'Mozilla/5.0'}, verify=False, timeout=20)
    data = res.json()
    print("Sucesso no DJEN API!")
    if "items" in data:
        for i, item in enumerate(data["items"][:3]):
            print(f"[{i}] {item.get('numeroProcesso')} - {item.get('siglaTribunal')} - {item.get('tipoComunicacao')}")
except Exception as e:
    print("Erro DJEN:", e)
