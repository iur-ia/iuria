import re

file = 'scraper/run_scraper.py'
with open(file, 'r') as f:
    code = f.read()

target = """def _get_scraping_scraper(tribunal: str):"""

replacement = """def _get_scraping_scraper(tribunal: str):
    from cnj_parser import get_router_logic
    rota = get_router_logic(tribunal)

    if rota["tipo"] == "esaj":
        from tribunais.esaj_scraper import ESAJScraper
        return ESAJScraper
    elif rota["tipo"] == "pje":
        from tribunais.pje_scraper import PJeScraper
        return PJeScraper
    elif rota["tipo"] == "eproc":
        # Todo eproc via TinyFish
        from tribunais.eproc_scraper import EProcScraper
        return EProcScraper
    elif rota["tipo"] == "custom":
        modulo = __import__(f"scraper.{rota['modulo']}", fromlist=[rota["classe"]])
        return getattr(modulo, rota["classe"])

    return None

def _get_scraping_scraper_old(tribunal: str):"""

if target in code:
    code = code.replace(target, replacement)
    with open(file, 'w') as f:
        f.write(code)
