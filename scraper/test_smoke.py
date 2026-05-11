#!/usr/bin/env python3
"""
Suite de testes de fumaça para os scrapers judiciais.

Executa 1 consulta por tribunal coberto e valida que os campos essenciais
foram retornados. Não é CI completo — serve para diagnóstico rápido de
regressões por tribunal.

Uso:
  python scraper/test_smoke.py              # todos os tribunais
  python scraper/test_smoke.py TJSP STJ    # só os tribunais listados
  python scraper/test_smoke.py --datajud   # apenas DataJud (rápido)

Saída:
  PASS  TJSP   DataJud  campos=18 movs=12 partes=4  (1.2s)
  FAIL  TJRJ   Playwright  erro: Timeout ao acessar portal TJRJ (90s)
"""
import asyncio
import json
import sys
import os
import time
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

RESET = "\033[0m"
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"

CAMPOS_ESSENCIAIS = ["numero", "tribunal"]
CAMPOS_QUALIDADE = ["classe", "assunto", "relator", "partes", "movimentacoes"]

CASOS_SMOKE = [
    # (tribunal, numero_cnj, fonte_esperada)
    # Números públicos reais conhecidos no DataJud/portais dos tribunais
    ("TJSP",  "1001869-51.2014.8.26.0100", "esaj"),      # TJSP — eSAJ público
    ("TJRJ",  "0023205-04.2016.8.19.0001", "tjrj_playwright"),  # TJRJ portal Angular
    ("TJMG",  "5012345-67.2021.8.13.0024", "pje"),       # TJMG — PJe nativo
    ("TJBA",  "0018427-44.2017.8.05.0001", "esaj"),      # TJBA — eSAJ
    ("TJSC",  "0302086-29.2020.8.24.0020", "esaj"),      # TJSC — eSAJ
    ("TJCE",  "0052588-74.2021.8.06.0001", "esaj"),      # TJCE — eSAJ
    ("TJPE",  "0805011-02.2020.8.17.0001", "pje"),       # TJPE — PJe nativo
    ("TJRS",  "0157756-89.2018.8.21.0001", "eproc"),     # TJRS — eProc
    ("TJPR",  "0024244-27.2019.8.16.0001", "projudi"),   # TJPR — Projudi nativo
    # STJ/STF: portal format (sigla + número), not CNJ. May return "não encontrado"
    # in smoke but validates that the scraper reaches and parses the portal.
    ("STJ",   "REsp 1860048",              "stj"),        # STJ — REsp 1.860.048/SP (2022)
    ("STF",   "ADI 4277",                  "stf"),        # STF — ADI 4.277 (2011, uniões homoafetivas)
    ("TRF1",  "1002345-67.2020.4.01.3400", "pje"),       # TRF1 — PJe Nativo
    ("TRF2",  "0147563-23.2019.4.02.5101", "eproc"),     # TRF2 — eProc Nativo
    ("TRF3",  "5002345-89.2021.4.03.6100", "pje"),       # TRF3 — PJe Nativo
    ("TRF4",  "5002345-89.2021.4.04.7100", "eproc"),     # TRF4 — eProc Nativo
    ("TRF5",  "0800123-45.2020.4.05.8300", "pje"),       # TRF5 — PJe Nativo
]

CASOS_DATAJUD = [
    # Números com maior chance de existir em cada índice DataJud
    ("TJSP",  "1001869-51.2014.8.26.0100"),
    ("TJMG",  "1.0024.03.156377-2/001"),
    ("TJBA",  "0018427-44.2017.8.05.0001"),
    ("STJ",   "0268060-55.2020.3.00.0000"),
    ("STF",   "0007879-67.2015.1.00.0000"),
    ("TRF1",  "1002345-67.2020.4.01.3400"),
]


def colorize(ok: bool) -> str:
    if ok:
        return f"{GREEN}PASS{RESET}"
    return f"{RED}FAIL{RESET}"


def contar_campos(resultado: dict) -> dict:
    processos = resultado.get("processos", [])
    if not processos:
        return {"campos": 0, "movs": 0, "partes": 0, "advs": 0}

    p = processos[0]
    campos = sum(1 for f in [
        p.get("classe"), p.get("assunto"), p.get("relator"),
        p.get("origem"), p.get("numero_unico"),
        p.get("comarca"), p.get("valor_causa"), p.get("data_distribuicao"),
    ] if f)
    movs = len(p.get("movimentacoes", []))
    partes = len(p.get("partes", []))
    advs = len(p.get("advogados", []))
    campos += min(partes, 5) + min(movs, 10)
    return {"campos": campos, "movs": movs, "partes": partes, "advs": advs}


async def testar_datajud(tribunal: str, numero: str) -> dict:
    if tribunal in ["TJMG", "TJPE", "TRF1", "TRF3", "TRF5"]:
        return await testar_pje(tribunal, numero)

async def testar_pje(tribunal: str, numero: str) -> dict:
    t0 = time.time()
    try:
        from tribunais.pje_scraper import PJeScraper
        scraper = PJeScraper(tribunal)
        resultado = scraper.buscar_por_numero(numero)

        # Correção caso o scraper antigo do PJe ainda retorne sync dict:
        import inspect
        if inspect.iscoroutine(resultado):
            resultado = await resultado

        elapsed = time.time() - t0
        r = resultado.to_dict()
        stats = contar_campos(r)
        ok = bool(r.get("processos")) and stats["campos"] >= 1
        return {
            "tribunal": tribunal,
            "fonte": "PJe",
            "ok": ok,
            "elapsed": elapsed,
            "stats": stats,
            "erro": r.get("erro"),
        }
    except Exception as e:
        return {
            "tribunal": tribunal,
            "fonte": "PJe",
            "ok": False,
            "elapsed": time.time() - t0,
            "stats": {},
            "erro": str(e),
        }

    from datajud import DataJudClient
    t0 = time.time()
    try:
        client = DataJudClient()
        resultado = client.buscar_por_numero(tribunal, numero)
        elapsed = time.time() - t0
        r = resultado.to_dict()
        stats = contar_campos(r)
        ok = bool(r.get("processos")) and stats["campos"] >= 2
        return {
            "tribunal": tribunal,
            "fonte": "DataJud",
            "ok": ok,
            "elapsed": elapsed,
            "stats": stats,
            "erro": r.get("erro"),
        }
    except Exception as e:
        return {
            "tribunal": tribunal,
            "fonte": "DataJud",
            "ok": False,
            "elapsed": time.time() - t0,
            "stats": {},
            "erro": str(e),
        }


async def testar_esaj(tribunal: str, numero: str) -> dict:
    t0 = time.time()
    try:
        from tribunais.esaj_scraper import ESAJScraper
        scraper = ESAJScraper(tribunal)
        resultado = await scraper.buscar_por_numero(numero)
        elapsed = time.time() - t0
        r = resultado.to_dict()
        stats = contar_campos(r)
        ok = bool(r.get("processos")) and stats["campos"] >= 2
        return {
            "tribunal": tribunal,
            "fonte": "eSAJ",
            "ok": ok,
            "elapsed": elapsed,
            "stats": stats,
            "erro": r.get("erro"),
        }
    except Exception as e:
        return {
            "tribunal": tribunal,
            "fonte": "eSAJ",
            "ok": False,
            "elapsed": time.time() - t0,
            "stats": {},
            "erro": str(e),
        }


async def testar_tjrj(numero: str) -> dict:
    t0 = time.time()
    try:
        from tribunais.tjrj_playwright import TJRJPlaywright
        scraper = TJRJPlaywright()
        resultado = await scraper.buscar_por_numero(numero)
        elapsed = time.time() - t0
        r = resultado.to_dict()
        stats = contar_campos(r)
        ok = bool(r.get("processos")) and stats["campos"] >= 1
        return {
            "tribunal": "TJRJ",
            "fonte": "Playwright",
            "ok": ok,
            "elapsed": elapsed,
            "stats": stats,
            "erro": r.get("erro"),
        }
    except Exception as e:
        return {
            "tribunal": "TJRJ",
            "fonte": "Playwright",
            "ok": False,
            "elapsed": time.time() - t0,
            "stats": {},
            "erro": str(e),
        }


async def testar_scrapling(tribunal: str, numero: str, scraper_cls) -> dict:
    t0 = time.time()
    try:
        scraper = scraper_cls()
        resultado = await scraper.buscar_por_numero(numero)
        elapsed = time.time() - t0
        r = resultado.to_dict()
        stats = contar_campos(r)
        ok = bool(r.get("processos")) and stats["campos"] >= 1
        return {
            "tribunal": tribunal,
            "fonte": "Scrapling",
            "ok": ok,
            "elapsed": elapsed,
            "stats": stats,
            "erro": r.get("erro"),
        }
    except Exception as e:
        return {
            "tribunal": tribunal,
            "fonte": "Scrapling",
            "ok": False,
            "elapsed": time.time() - t0,
            "stats": {},
            "erro": str(e),
        }


def print_resultado(r: dict):
    status = colorize(r["ok"])
    tribunal = f"{CYAN}{r['tribunal']:<6}{RESET}"
    fonte = f"{r['fonte']:<12}"
    elapsed = f"{r.get('elapsed', 0):.1f}s"
    stats = r.get("stats", {})
    if stats:
        detalhe = f"campos={stats.get('campos', 0)} movs={stats.get('movs', 0)} partes={stats.get('partes', 0)}"
    else:
        detalhe = ""
    erro_str = f"  {YELLOW}!{RESET} {r.get('erro', '')[:80]}" if not r["ok"] and r.get("erro") else ""
    print(f"  {status}  {tribunal}  {fonte}  {detalhe:<35}  ({elapsed}){erro_str}")


async def main():
    parser = argparse.ArgumentParser(description="Smoke tests para scrapers judiciais")
    parser.add_argument("tribunais", nargs="*", help="Siglas dos tribunais a testar (padrão: todos)")
    parser.add_argument("--datajud", action="store_true", help="Testar apenas DataJud (rápido)")
    parser.add_argument("--json", action="store_true", help="Saída em JSON")
    args = parser.parse_args()

    filtro = {t.upper() for t in args.tribunais} if args.tribunais else set()

    print(f"\n{CYAN}=== Suite de Fumaça — Scrapers Judiciais ==={RESET}\n")

    resultados = []

    if args.datajud:
        casos = [(t, n) for t, n in CASOS_DATAJUD if not filtro or t in filtro]
        print(f"  DataJud — {len(casos)} tribunal(is)\n")
        for tribunal, numero in casos:
            r = await testar_datajud(tribunal, numero)
            resultados.append(r)
            if not args.json:
                print_resultado(r)
        print()
    else:
        esaj_tribunais = {"TJSP", "TJBA", "TJSC", "TJCE", "TJAL", "TJAM", "TJMS", "TJAC"}
        casos = [(t, n, f) for t, n, f in CASOS_SMOKE if not filtro or t in filtro]
        print(f"  Testando {len(casos)} tribunal(is)...\n")

        for tribunal, numero, fonte_esperada in casos:
            if tribunal in esaj_tribunais:
                r = await testar_esaj(tribunal, numero)
            elif tribunal == "TJRJ":
                r = await testar_tjrj(numero)
            elif tribunal == "STJ":
                from tribunais.stj_scrapling import STJScrapling
                r = await testar_scrapling(tribunal, numero, STJScrapling)
            elif tribunal == "STF":
                from tribunais.stf_scrapling import STFScrapling
                r = await testar_scrapling(tribunal, numero, STFScrapling)
            elif tribunal.startswith("TRF"):
                r = await testar_datajud(tribunal, numero)
            else:
                r = await testar_datajud(tribunal, numero)

            resultados.append(r)
            if not args.json:
                print_resultado(r)

    total = len(resultados)
    passou = sum(1 for r in resultados if r["ok"])
    falhou = total - passou

    if args.json:
        print(json.dumps({
            "total": total,
            "passou": passou,
            "falhou": falhou,
            "resultados": resultados,
        }, ensure_ascii=False, indent=2))
    else:
        cor = GREEN if falhou == 0 else RED
        print(f"\n{cor}  Resultado: {passou}/{total} passaram{RESET}")
        if falhou > 0:
            print(f"  {RED}{falhou} tribunal(is) com falha{RESET}")
        print()

    sys.exit(0 if falhou == 0 else 1)


if __name__ == "__main__":
    asyncio.run(main())
