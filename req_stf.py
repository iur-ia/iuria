import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request(
    "https://portal.stf.jus.br/processos/detalhe.asp?incidente=7134102",
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'}
)

try:
    with urllib.request.urlopen(req, context=ctx) as response:
        print(response.read().decode('utf-8')[:500])
except Exception as e:
    print(e)
