#!/usr/bin/env python3
"""
Tribunal Tester - Tests scraper connectivity against real Brazilian court websites.
iuria LexFutura

Tests each tribunal system type to verify:
1. The URL is reachable (HTTP 200, not blocked)
2. The page contains expected content (form fields, process data)
3. The scraping method works (curl_cffi, patchright, MNI)

Run: python tribunal_tester.py [--all | --system <pje|esaj|eproc|stj|stf>]
"""

import asyncio
import json
import logging
import re
import sys
import os
import time
from dataclasses import dataclass, field, asdict
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = logging.getLogger("iuria.tester")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")


@dataclass
class TestResult:
    tribunal: str
    sistema: str
    url: str
    reachable: bool = False
    status_code: int = 0
    method_used: str = ""
    has_form: bool = False
    has_content: bool = False
    blocked: bool = False
    error: Optional[str] = None
    elapsed_ms: float = 0
    details: str = ""

    @property
    def status(self) -> str:
        if self.reachable and self.has_content and not self.blocked:
            return "OK"
        elif self.reachable and self.blocked:
            return "BLOCKED"
        elif self.reachable:
            return "PARTIAL"
        else:
            return "FAIL"


# ==================== TEST TARGETS ====================
# Real tribunal URLs organized by system type

TRIBUNAL_TESTS = {
    # === TRIBUNAIS SUPERIORES ===
    "STF": {
        "sistema": "stf_portal",
        "url": "https://portal.stf.jus.br/processos/listarProcessos.asp",
        "verify_text": ["STF", "Processo"],
        "api_url": "https://portal.stf.jus.br/processos/listarProcessos.asp?classe=ADI&numeroProcesso=1",
    },
    "STJ": {
        "sistema": "stj_portal",
        "url": "https://processo.stj.jus.br/processo/pesquisa/",
        "verify_text": ["STJ", "pesquisa", "processo"],
        "search_url": "https://processo.stj.jus.br/processo/pesquisa/?aplicacao=processos.ea&tipoPesquisa=tipoPesquisaGenerica&termo=REsp+1234567",
    },

    # === JUSTICA FEDERAL (TRFs) - eProc ===
    "TRF2": {
        "sistema": "eproc",
        "url": "https://eproc.trf2.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica",
        "verify_text": ["processo", "consulta"],
    },
    "TRF4": {
        "sistema": "eproc_v2",
        "url": "https://eproc.trf4.jus.br/eproc2trf4/",
        "verify_text": ["processo", "eproc"],
    },

    # === JUSTICA FEDERAL (TRFs) - PJe ===
    "TRF1": {
        "sistema": "pje",
        "url": "https://pje1g.trf1.jus.br/consultapublica/ConsultaPublica/listView.seam",
        "verify_text": ["processo", "consulta", "PJe"],
    },
    "TRF3": {
        "sistema": "pje",
        "url": "https://pje1g.trf3.jus.br/pje/ConsultaPublica/listView.seam",
        "verify_text": ["processo", "consulta"],
    },
    "TRF5": {
        "sistema": "pje",
        "url": "https://pje.trf5.jus.br/pje/ConsultaPublica/listView.seam",
        "verify_text": ["processo", "consulta"],
    },

    # === JUSTICA ESTADUAL - eSAJ ===
    "TJSP": {
        "sistema": "esaj",
        "url": "https://esaj.tjsp.jus.br/cpopg/open.do",
        "verify_text": ["TJSP", "processo", "consulta"],
    },
    "TJSC_ESAJ": {
        "sistema": "esaj",
        "url": "https://esaj.tjsc.jus.br/cpopg/open.do",
        "verify_text": ["processo", "consulta"],
    },
    "TJMS_ESAJ": {
        "sistema": "esaj",
        "url": "https://esaj.tjms.jus.br/cpopg5/open.do",
        "verify_text": ["processo", "consulta"],
    },

    # === JUSTICA ESTADUAL - PJe ===
    "TJRJ_PJE": {
        "sistema": "pje",
        "url": "https://tjrj.pje.jus.br/pje/ConsultaPublica/listView.seam",
        "verify_text": ["processo", "consulta"],
    },
    "TJMG_PJE": {
        "sistema": "pje",
        "url": "https://pje.tjmg.jus.br/pje/ConsultaPublica/listView.seam",
        "verify_text": ["processo", "consulta"],
    },
    "TJBA_PJE": {
        "sistema": "pje",
        "url": "https://pje.tjba.jus.br/pje/ConsultaPublica/listView.seam",
        "verify_text": ["processo", "consulta"],
    },
    "TJPE_PJE": {
        "sistema": "pje",
        "url": "https://pje.tjpe.jus.br/pje/ConsultaPublica/listView.seam",
        "verify_text": ["processo", "consulta"],
    },
    "TJCE_PJE": {
        "sistema": "pje",
        "url": "https://pje.tjce.jus.br/pje/ConsultaPublica/listView.seam",
        "verify_text": ["processo", "consulta"],
    },
    "TJDFT_PJE": {
        "sistema": "pje",
        "url": "https://pje.tjdft.jus.br/pje/ConsultaPublica/listView.seam",
        "verify_text": ["processo", "consulta"],
    },
    "TJGO_PJE": {
        "sistema": "pje",
        "url": "https://pje.tjgo.jus.br/pje/ConsultaPublica/listView.seam",
        "verify_text": ["processo", "consulta"],
    },
    "TJMA_PJE": {
        "sistema": "pje",
        "url": "https://pje.tjma.jus.br/pje/ConsultaPublica/listView.seam",
        "verify_text": ["processo", "consulta"],
    },

    # === JUSTICA ESTADUAL - eProc ===
    "TJRJ_EPROC": {
        "sistema": "eproc",
        "url": "https://eproc.tjrj.jus.br/eproc/externo_controlador.php",
        "verify_text": ["processo"],
    },

    # === JUSTICA ESTADUAL - DCP (Legado TJRJ) ===
    "TJRJ_DCP": {
        "sistema": "dcp",
        "url": "https://www3.tjrj.jus.br/ejud/ConsultaProcesso.aspx",
        "verify_text": ["processo", "consulta"],
    },

    # === JUSTICA DO TRABALHO (TRTs) - PJe ===
    "TST": {
        "sistema": "pje",
        "url": "https://pje.tst.jus.br/consultaprocessual/",
        "verify_text": ["processo", "consulta"],
    },
    "TRT1": {
        "sistema": "pje",
        "url": "https://pje.trt1.jus.br/consultaprocessual/",
        "verify_text": ["processo"],
    },
    "TRT2": {
        "sistema": "pje",
        "url": "https://pje.trt2.jus.br/consultaprocessual/",
        "verify_text": ["processo"],
    },
    "TRT3": {
        "sistema": "pje",
        "url": "https://pje.trt3.jus.br/consultaprocessual/",
        "verify_text": ["processo"],
    },
    "TRT15": {
        "sistema": "pje",
        "url": "https://pje.trt15.jus.br/consultaprocessual/",
        "verify_text": ["processo"],
    },

    # === MNI SOAP Endpoints ===
    "MNI_TRF1": {
        "sistema": "mni_wsdl",
        "url": "https://pje1g.trf1.jus.br/mni/servicos/?wsdl",
        "verify_text": ["wsdl", "definitions", "intercomunicacao"],
    },
    "MNI_TJSP": {
        "sistema": "mni_wsdl",
        "url": "https://pje.tjsp.jus.br/mni/servicos/?wsdl",
        "verify_text": ["wsdl", "definitions"],
    },
    "MNI_TRT2": {
        "sistema": "mni_wsdl",
        "url": "https://pje.trt2.jus.br/mni/servicos/?wsdl",
        "verify_text": ["wsdl", "definitions"],
    },
}


async def test_single_tribunal(name: str, config: dict, engine=None) -> TestResult:
    """Test a single tribunal URL"""
    url = config["url"]
    sistema = config["sistema"]
    verify_text = config.get("verify_text", [])

    result = TestResult(tribunal=name, sistema=sistema, url=url)
    start = time.time()

    try:
        if engine:
            # Use stealth engine (curl_cffi -> patchright)
            fetch_result = await engine.fetch(url, timeout=25)
            result.status_code = fetch_result.status_code
            result.method_used = fetch_result.method
            result.reachable = fetch_result.status_code in (200, 301, 302)
            result.blocked = fetch_result.is_blocked

            if fetch_result.html:
                html_lower = fetch_result.html.lower()
                result.has_content = any(t.lower() in html_lower for t in verify_text)
                result.has_form = any(tag in html_lower for tag in [
                    "<form", "<input", "numprocesso", "numeroprocesso", "pesquisar",
                ])

            if fetch_result.error:
                result.error = fetch_result.error
        else:
            # Fallback: use curl_cffi directly
            try:
                from curl_cffi.requests import get as cffi_get
                resp = cffi_get(url, impersonate="chrome131", timeout=25,
                                verify=False, allow_redirects=True)
                result.status_code = resp.status_code
                result.method_used = "curl_cffi"
                result.reachable = resp.status_code in (200, 301, 302)

                html_lower = resp.text.lower()
                result.has_content = any(t.lower() in html_lower for t in verify_text)
                result.has_form = any(tag in html_lower for tag in [
                    "<form", "<input", "numprocesso",
                ])
                result.blocked = resp.status_code in (403, 429, 503)
            except Exception as e:
                result.error = str(e)

    except Exception as e:
        result.error = str(e)

    result.elapsed_ms = (time.time() - start) * 1000
    return result


async def test_all_tribunals(filter_system: str = None) -> list[TestResult]:
    """Test all tribunal URLs"""
    from stealth_fetcher import StealthEngine

    engine = StealthEngine()
    results = []

    targets = TRIBUNAL_TESTS
    if filter_system:
        targets = {k: v for k, v in targets.items() if v["sistema"] == filter_system}

    print(f"\n{'='*80}")
    print(f"  TRIBUNAL CONNECTIVITY TEST - {len(targets)} targets")
    print(f"{'='*80}\n")

    for name, config in sorted(targets.items()):
        result = await test_single_tribunal(name, config, engine)
        results.append(result)

        status_icon = {
            "OK": "\033[92m✓\033[0m",
            "PARTIAL": "\033[93m◐\033[0m",
            "BLOCKED": "\033[91m✗\033[0m",
            "FAIL": "\033[91m✗\033[0m",
        }.get(result.status, "?")

        method_str = f"[{result.method_used}]" if result.method_used else ""
        error_str = f" - {result.error[:60]}" if result.error else ""
        print(f"  {status_icon} {name:20s} {result.sistema:12s} {result.status:8s} "
              f"{result.status_code:3d} {result.elapsed_ms:6.0f}ms {method_str}{error_str}")

    await engine.close()

    # Summary
    ok = sum(1 for r in results if r.status == "OK")
    partial = sum(1 for r in results if r.status == "PARTIAL")
    blocked = sum(1 for r in results if r.status == "BLOCKED")
    fail = sum(1 for r in results if r.status == "FAIL")

    print(f"\n{'='*80}")
    print(f"  SUMMARY: {ok} OK | {partial} PARTIAL | {blocked} BLOCKED | {fail} FAIL | "
          f"{len(results)} TOTAL")
    print(f"{'='*80}\n")

    return results


async def test_stj_specifically() -> TestResult:
    """Detailed STJ test - the most problematic tribunal"""
    from stealth_fetcher import StealthEngine

    engine = StealthEngine()
    print("\n" + "="*60)
    print("  STJ DETAILED TEST (processo.stj.jus.br)")
    print("="*60)

    # Test 1: curl_cffi
    print("\n  [1/3] Testing curl_cffi (TLS impersonation)...")
    result_curl = engine.curl.fetch(
        "https://processo.stj.jus.br/processo/pesquisa/",
        timeout=25,
    )
    print(f"    Status: {result_curl.status_code}, Blocked: {result_curl.is_blocked}, "
          f"Size: {len(result_curl.html)} bytes, Time: {result_curl.elapsed_ms:.0f}ms")

    # Test 2: Patchright browser
    print("\n  [2/3] Testing Patchright (stealth browser)...")
    result_browser = await engine.patchright.fetch(
        "https://processo.stj.jus.br/processo/pesquisa/"
        "?aplicacao=processos.ea&tipoPesquisa=tipoPesquisaGenerica&termo=REsp+1234567",
        timeout=30,
    )
    print(f"    Status: {result_browser.status_code}, Has HTML: {len(result_browser.html)} bytes, "
          f"Time: {result_browser.elapsed_ms:.0f}ms")
    if result_browser.text:
        # Check for STJ content markers
        text = result_browser.text
        has_results = any(kw in text for kw in ["Classe", "Relator", "Processo", "registro"])
        print(f"    Content markers: {has_results}")
        if has_results:
            print(f"    First 200 chars: {text[:200].strip()}")

    # Test 3: curl_cffi with search params
    print("\n  [3/3] Testing curl_cffi with search parameters...")
    result_search = engine.curl.fetch(
        "https://processo.stj.jus.br/processo/pesquisa/"
        "?aplicacao=processos.ea&tipoPesquisa=tipoPesquisaGenerica&termo=REsp+1234567",
        timeout=25,
    )
    print(f"    Status: {result_search.status_code}, Blocked: {result_search.is_blocked}, "
          f"Size: {len(result_search.html)} bytes")

    await engine.close()

    best = result_browser if result_browser.success else result_curl
    return TestResult(
        tribunal="STJ",
        sistema="stj_portal",
        url="https://processo.stj.jus.br/processo/pesquisa/",
        reachable=best.status_code in (200, 301, 302),
        status_code=best.status_code,
        method_used=best.method,
        has_content=len(best.html) > 500,
        blocked=best.is_blocked,
        elapsed_ms=best.elapsed_ms,
    )


# ==================== CLI ====================

async def main():
    args = sys.argv[1:]

    if "--stj" in args:
        await test_stj_specifically()
    elif "--system" in args:
        idx = args.index("--system")
        if idx + 1 < len(args):
            await test_all_tribunals(filter_system=args[idx + 1])
        else:
            print("Usage: --system <pje|esaj|eproc|stj_portal|mni_wsdl>")
    elif "--all" in args or not args:
        await test_all_tribunals()
    else:
        print("Usage: python tribunal_tester.py [--all | --stj | --system <type>]")


if __name__ == "__main__":
    asyncio.run(main())
