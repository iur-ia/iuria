import os
import glob
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    if "from scrapling import DynamicFetcher" in content:
        print(f"Fixing {filepath}")
        content = content.replace("from scrapling import DynamicFetcher", "from scrapling import Fetcher\n        fetcher = Fetcher(verify=False)")
        content = re.sub(r'fetcher = DynamicFetcher\(\)', '', content)
        content = re.sub(r'page = fetcher.fetch\([^)]*\)', 'page = fetcher.get(url)', content, flags=re.DOTALL)
        content = content.replace("page = await loop.run_in_executor(None, self._fetch_with_scrapling, url)", "page = self._fetch_with_scrapling(url)")

        with open(filepath, 'w') as f:
            f.write(content)

for filepath in glob.glob("scraper/tribunais/*_scrapling.py"):
    fix_file(filepath)

for filepath in glob.glob("scraper/tribunais/pje_scraper.py"):
    fix_file(filepath)

for filepath in glob.glob("scraper/tribunais/esaj_scraper.py"):
    fix_file(filepath)
