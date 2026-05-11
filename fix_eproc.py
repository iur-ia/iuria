import re
file = 'scraper/tribunais/eproc_scraper.py'
with open(file, 'r') as f:
    code = f.read()

target = "soup = BeautifulSoup(resp.text, 'html.parser')"
replacement = "soup = BeautifulSoup(resp.content.decode('iso-8859-1', errors='replace'), 'html.parser')"
code = code.replace(target, replacement)

with open(file, 'w') as f:
    f.write(code)
