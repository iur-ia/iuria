import re
file = 'scraper/tribunais/eproc_scraper.py'
with open(file, 'r') as f:
    code = f.read()

target = "resultado.erro = str(e)"
replacement = """import traceback
            resultado.erro = str(e)
            print(traceback.format_exc())"""
code = code.replace(target, replacement)

with open(file, 'w') as f:
    f.write(code)
