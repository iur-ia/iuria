import re

file = 'scraper/cnj_parser.py'
with open(file, 'r') as f:
    code = f.read()

target = """    # Alguns tribunais federais dependem 100% do DataJud no momento (se o scraper direto falhar)"""
replacement = """    # DataJud deprecado por falta de dados úteis (LGPD/Restrições). Agora sempre chamaremos os métodos locais."""

code = code.replace(target, replacement)
code = code.replace('        if sigla in ["TJMG", "TJPE", "TJRS", "TJPR"]:\n            # Vamos usar DataJud temporariamente ate ter o parser PJe/eProc completo\n            return await self._fallback_datajud(tribunal, numero_limpo)', '')

with open(file, 'w') as f:
    f.write(code)
