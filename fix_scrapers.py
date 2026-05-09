import os
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    target_esaj = """    def _fetch_with_scrapling(self, url: str, wait: float = None) -> Optional[object]:
        \"\"\"
        Realiza a requisição usando Scrapling.
        Lida com os desafios do eSAJ:
        - JS blocks (document.cookie)
        - Cloudflare/Imperva → tenta Camoufox primeiro, fallback Scrapling
        \"\"\"
        from scrapling import Fetcher
        fetcher = Fetcher()

        try:
            # Tentar importar Camoufox para bypass mais agressivo
            from camoufox.sync_api import Camoufox
            with Camoufox(headless=True) as browser:
                page_cf = browser.new_page()
                page_cf.goto(url, wait_until="networkidle")

                # Aguardar Cloudflare se estiver presente
                if "just a moment" in page_cf.content().lower() or "cloudflare" in page_cf.content().lower():
                    page_cf.wait_for_timeout(5000)

                # Converter para compatibilidade com a extração
                class CamoufoxAdapter:
                    def __init__(self, pw_page):
                        self.page = pw_page
                        self.url = pw_page.url
                    def get_all_text(self, ignore_tags=None):
                        return self.page.evaluate("document.body.innerText")
                    def css(self, selector):
                        class Item:
                            def __init__(self, el):
                                self.text = el.inner_text().strip() if el else ""
                                self.attrib = {"href": el.get_attribute("href") if el else ""}

                        els = self.page.locator(selector).all()
                        class Selector:
                            def __init__(self, items):
                                self.items = items
                                self.first = items[0] if items else None
                            def __iter__(self):
                                return iter(self.items)
                        return Selector([Item(el) for el in els])

                return CamoufoxAdapter(page_cf)

        except Exception as e:
            print(f"[esaj] Camoufox falhou: {e}", file=sys.stderr)
            print("[esaj] Usando Scrapling fallback...", file=sys.stderr)

            # Fallback normal
            ua = random.choice([
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            ])

            w = wait if wait else random.uniform(2.0, 4.0)

            from scrapling import Adaptor
            page = fetcher.get(url, proxy=None, proxies=None, impersonate='chrome120', timeout=30000, verify=False)
            return page"""

    target_pje = """    def _fetch_with_scrapling(self, url: str, wait_selector: str = None):
        \"\"\"
        Realiza a requisição usando Scrapling.
        Lida com SPA do PJe que requer execução de JS para carregar.
        \"\"\"
        from scrapling import Fetcher
        fetcher = Fetcher()

        ua = random.choice(USER_AGENTS)
        wait = random.uniform(2.0, 4.0)


        page = fetcher.get(url, proxy=None, proxies=None, impersonate='chrome120', timeout=30000, verify=False)
        return page"""

    replacement = """    def _fetch_with_scrapling(self, url: str, wait: float = None):
        import requests
        import os
        import urllib3
        urllib3.disable_warnings()

        tinyfish_url = os.environ.get("TINYFISH_URL")
        tinyfish_key = os.environ.get("TINYFISH_KEY")

        if tinyfish_url and tinyfish_key:
            api_url = f"{tinyfish_url}?api_key={tinyfish_key}&url={requests.utils.quote(url)}"
            resp = requests.get(api_url, verify=False, timeout=60)
        else:
            resp = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, verify=False, timeout=30)

        from bs4 import BeautifulSoup
        soup = BeautifulSoup(resp.text, 'html.parser')

        class MockPage:
            def __init__(self, text, soup, url):
                self.text = text
                self.soup = soup
                self.url = url
            def get_all_text(self, *a, **kw):
                return self.text
            def css(self, selector):
                class Item:
                    def __init__(self, el):
                        self.el = el
                        self.text = el.text.strip() if el else ""
                        self.attrib = el.attrs if el else {}
                    def css(self, sel):
                        found = self.el.select(sel)
                        return MockPage("", None, "")._make_sel(found)
                found = self.soup.select(selector)
                return self._make_sel(found)
            def _make_sel(self, found):
                class Selector:
                    def __init__(self, items):
                        self.items = items
                        self.first = items[0] if items else None
                    def __iter__(self):
                        return iter(self.items)
                return Selector([Item(x) for x in found])

        return MockPage(resp.text, soup, url)"""

    if "esaj_scraper.py" in filepath:
        if target_esaj in content:
            content = content.replace(target_esaj, replacement)
        else:
            # Tentativa Regex caso tenha mudado espacamento
            content = re.sub(r'    def _fetch_with_scrapling\(self, url: str, wait: float = None\) -> Optional\[object\]:.*?return page', replacement, content, flags=re.DOTALL)

    elif "pje_scraper.py" in filepath:
        if target_pje in content:
            # Adaptando a assinatura pro PJe que recebe wait_selector
            content = content.replace(target_pje, replacement.replace("wait: float = None", "wait_selector: str = None"))
        else:
            content = re.sub(r'    def _fetch_with_scrapling\(self, url: str, wait_selector: str = None\):.*?return page', replacement.replace("wait: float = None", "wait_selector: str = None"), content, flags=re.DOTALL)

    with open(filepath, 'w') as f:
        f.write(content)

fix_file('scraper/tribunais/esaj_scraper.py')
fix_file('scraper/tribunais/pje_scraper.py')
