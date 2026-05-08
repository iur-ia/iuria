import os
import glob
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    if "from scrapling import Fetcher" in content:
        print(f"Fixing {filepath}")
        content = content.replace("page = fetcher.get(url, proxy=None, proxies=None, impersonate='chrome120', timeout=30000)", "page = fetcher.get(url, proxy=None, proxies=None, impersonate='chrome120', timeout=30000, verify=False)")

        with open(filepath, 'w') as f:
            f.write(content)

for filepath in glob.glob("scraper/tribunais/*_scrapling.py"):
    fix_file(filepath)

for filepath in glob.glob("scraper/tribunais/pje_scraper.py"):
    fix_file(filepath)

for filepath in glob.glob("scraper/tribunais/esaj_scraper.py"):
    fix_file(filepath)
