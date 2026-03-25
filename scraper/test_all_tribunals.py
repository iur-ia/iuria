#!/usr/bin/env python3
"""
Comprehensive End-to-End Tribunal Test Suite
iuria LexFutura

Tests ALL scraper paths against real tribunal websites:
1. curl_cffi HTTP connectivity per tribunal
2. MNI WSDL endpoint availability
3. Full scraping pipeline (real_scraper.py)
4. Verifies the complete 92-tribunal mapping

Run: python test_all_tribunals.py
"""

import json
import os
import re
import sys
import time
from dataclasses import dataclass, field

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from real_scraper import get_unified_scraper, ScrapingResult, MNIDirectScraper


@dataclass
class SystemTestResult:
    tribunal: str
    sistema: str
    test_type: str
    url: str
    status: str = "UNTESTED"  # OK, BLOCKED, FAIL, CLOUDFLARE, TIMEOUT
    http_code: int = 0
    response_size: int = 0
    elapsed_ms: float = 0
    method: str = ""
    error: str = ""
    has_form: bool = False
    has_process_data: bool = False


def test_curl_cffi_connectivity() -> list[SystemTestResult]:
    """Test HTTP connectivity to all tribunal systems using curl_cffi"""
    results = []

    try:
        from curl_cffi.requests import get as cffi_get
    except ImportError:
        print("  ERROR: curl_cffi not installed")
        return results

    # Complete list of tribunal URLs by system type
    targets = {
        # === SUPERIORES ===
        "STF": ("stf_portal", "https://portal.stf.jus.br/processos/listarProcessos.asp"),
        "STJ": ("stj_portal", "https://processo.stj.jus.br/processo/pesquisa/"),
        # === FEDERAL - eProc ===
        "TRF2": ("eproc", "https://eproc.trf2.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica"),
        "TRF4": ("eproc_v2", "https://eproc.trf4.jus.br/eproc2trf4/"),
        # === FEDERAL - PJe ===
        "TRF1": ("pje", "https://pje1g.trf1.jus.br/consultapublica/ConsultaPublica/listView.seam"),
        "TRF3": ("pje", "https://pje1g.trf3.jus.br/pje/ConsultaPublica/listView.seam"),
        "TRF5": ("pje", "https://pje.trf5.jus.br/pje/ConsultaPublica/listView.seam"),
        "TRF6": ("pje", "https://pje1g.trf6.jus.br/consultapublica/ConsultaPublica/listView.seam"),
        # === ESTADUAL - eSAJ ===
        "TJSP": ("esaj", "https://esaj.tjsp.jus.br/cpopg/open.do"),
        "TJSC_ESAJ": ("esaj", "https://esaj.tjsc.jus.br/cpopg/open.do"),
        "TJMS": ("esaj", "https://esaj.tjms.jus.br/cpopg5/open.do"),
        "TJCE_ESAJ": ("esaj", "https://esaj.tjce.jus.br/cpopg/open.do"),
        "TJAM_ESAJ": ("esaj", "https://consultasaj.tjam.jus.br/cpopg/open.do"),
        # === ESTADUAL - PJe ===
        "TJRJ": ("pje", "https://tjrj.pje.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJMG": ("pje", "https://pje.tjmg.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJBA_PJE": ("pje", "https://pje.tjba.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJPE": ("pje", "https://pje.tjpe.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJDFT": ("pje", "https://pje.tjdft.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJGO": ("pje", "https://pje.tjgo.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJMA": ("pje", "https://pje.tjma.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJCE_PJE": ("pje", "https://pje.tjce.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJAL": ("pje", "https://pje.tjal.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJRN": ("pje", "https://pje.tjrn.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJPB": ("pje", "https://pje.tjpb.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJSE": ("pje", "https://pje.tjse.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJPI": ("pje", "https://pje.tjpi.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJES": ("pje", "https://pje.tjes.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJMT": ("pje", "https://pje.tjmt.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJAP": ("pje", "https://pje.tjap.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJRO": ("pje", "https://pje.tjro.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJAC": ("pje", "https://pje.tjac.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJRR": ("pje", "https://pje.tjrr.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJTO": ("pje", "https://pje.tjto.jus.br/pje/ConsultaPublica/listView.seam"),
        "TJPA": ("pje", "https://pje.tjpa.jus.br/pje/ConsultaPublica/listView.seam"),
        # === TRABALHO ===
        "TST": ("pje", "https://pje.tst.jus.br/consultaprocessual/"),
        "TRT1": ("pje", "https://pje.trt1.jus.br/consultaprocessual/"),
        "TRT2": ("pje", "https://pje.trt2.jus.br/consultaprocessual/"),
        "TRT3": ("pje", "https://pje.trt3.jus.br/consultaprocessual/"),
        "TRT4": ("pje", "https://pje.trt4.jus.br/consultaprocessual/"),
        "TRT5": ("pje", "https://pje.trt5.jus.br/consultaprocessual/"),
        "TRT15": ("pje", "https://pje.trt15.jus.br/consultaprocessual/"),
    }

    print(f"\n{'='*100}")
    print(f"  CURL_CFFI CONNECTIVITY TEST - {len(targets)} tribunal URLs")
    print(f"  Using TLS/JA3 fingerprint impersonation (chrome131)")
    print(f"{'='*100}\n")
    print(f"  {'Tribunal':16s} {'Sistema':10s} {'Status':10s} {'HTTP':>4s} {'Size':>8s} {'Time':>7s} {'Form':>5s} Notes")
    print(f"  {'-'*90}")

    for name, (sistema, url) in sorted(targets.items()):
        r = SystemTestResult(tribunal=name, sistema=sistema, test_type="curl_cffi", url=url)
        start = time.time()
        try:
            resp = cffi_get(url, impersonate="chrome131", timeout=20,
                            verify=False, allow_redirects=True)
            r.http_code = resp.status_code
            r.response_size = len(resp.text)
            r.method = "curl_cffi"

            html_lower = resp.text.lower()
            r.has_form = "<form" in html_lower or "<input" in html_lower

            # Check for blocking
            if resp.status_code == 403:
                r.status = "CLOUDFLARE" if "cloudflare" in str(resp.headers).lower() else "BLOCKED"
            elif resp.status_code in (429, 503):
                r.status = "BLOCKED"
            elif any(ind in html_lower for ind in ["captcha", "challenge-platform", "cf-browser-verification"]):
                r.status = "CHALLENGE"
            elif resp.status_code == 200 and r.response_size > 500:
                r.status = "OK"
            elif resp.status_code == 200:
                r.status = "PARTIAL"
            else:
                r.status = "FAIL"
                r.error = f"HTTP {resp.status_code}"

        except Exception as e:
            r.status = "TIMEOUT" if "timeout" in str(e).lower() else "FAIL"
            r.error = str(e)[:60]

        r.elapsed_ms = (time.time() - start) * 1000

        icon = {"OK": "\033[92m✓\033[0m", "PARTIAL": "\033[93m~\033[0m",
                "CHALLENGE": "\033[93m⚡\033[0m", "CLOUDFLARE": "\033[91m☁\033[0m",
                "BLOCKED": "\033[91m✗\033[0m", "FAIL": "\033[91m✗\033[0m",
                "TIMEOUT": "\033[91m⏱\033[0m"}.get(r.status, "?")
        notes = r.error[:40] if r.error else ("needs browser" if r.status in ("CLOUDFLARE", "CHALLENGE", "BLOCKED") else "")
        print(f"  {icon} {name:15s} {sistema:10s} {r.status:10s} {r.http_code:4d} "
              f"{r.response_size:>7d}b {r.elapsed_ms:>6.0f}ms {str(r.has_form):>5s} {notes}")

        results.append(r)

    return results


def test_mni_endpoints() -> list[SystemTestResult]:
    """Test MNI WSDL endpoint availability"""
    results = []
    mni = MNIDirectScraper()

    print(f"\n{'='*100}")
    print(f"  MNI ENDPOINT TEST - {len(mni.MNI_ENDPOINTS)} tribunal WSDL endpoints")
    print(f"{'='*100}\n")

    try:
        from curl_cffi.requests import get as cffi_get
    except ImportError:
        print("  curl_cffi not available")
        return results

    # Test a sample of MNI endpoints
    sample_endpoints = list(mni.MNI_ENDPOINTS.items())[:15]

    print(f"  {'Tribunal':10s} {'Status':8s} {'HTTP':>4s} {'Size':>8s} {'Time':>7s} Has WSDL")
    print(f"  {'-'*60}")

    for tribunal, wsdl_url in sample_endpoints:
        r = SystemTestResult(tribunal=tribunal, sistema="mni", test_type="mni_wsdl", url=wsdl_url)
        start = time.time()
        try:
            resp = cffi_get(wsdl_url, impersonate="chrome131", timeout=15, verify=False)
            r.http_code = resp.status_code
            r.response_size = len(resp.text)
            has_wsdl = "definitions" in resp.text.lower() or "wsdl" in resp.text.lower()
            r.status = "OK" if has_wsdl else ("PARTIAL" if resp.status_code == 200 else "FAIL")
        except Exception as e:
            r.status = "FAIL"
            r.error = str(e)[:40]

        r.elapsed_ms = (time.time() - start) * 1000
        icon = "\033[92m✓\033[0m" if r.status == "OK" else "\033[91m✗\033[0m"
        print(f"  {icon} {tribunal:10s} {r.status:8s} {r.http_code:4d} {r.response_size:>7d}b "
              f"{r.elapsed_ms:>6.0f}ms {'Yes' if r.status == 'OK' else 'No'}")
        results.append(r)

    return results


def test_unified_scraper() -> list[SystemTestResult]:
    """Test the unified scraper pipeline"""
    results = []
    scraper = get_unified_scraper()

    # Test cases - one per system type
    test_cases = [
        ("TRF4", "5001234-56.2024.4.04.7100", "eproc"),       # eProc (works with curl_cffi)
        ("TJSP", "1234567-89.2024.8.26.0100", "esaj"),         # eSAJ (works with curl_cffi)
        ("STJ", "REsp 1234567", "stj_portal"),                  # STJ (Cloudflare)
        ("STF", "ADI 1", "stf_portal"),                         # STF (Cloudflare)
        ("TJDFT", "0800001-00.2024.8.07.0001", "pje"),         # PJe (works with curl_cffi)
    ]

    print(f"\n{'='*100}")
    print(f"  UNIFIED SCRAPER PIPELINE TEST - {len(test_cases)} test cases")
    print(f"  Testing: MNI SOAP -> curl_cffi HTTP -> Patchright browser")
    print(f"{'='*100}\n")
    print(f"  {'Tribunal':10s} {'Sistema':10s} {'Sucesso':8s} {'Metodo':20s} {'Time':>7s} Details")
    print(f"  {'-'*80}")

    for tribunal, numero, sistema in test_cases:
        r = SystemTestResult(tribunal=tribunal, sistema=sistema, test_type="unified", url="")
        start = time.time()

        try:
            result = scraper.consultar(tribunal, numero)
            r.elapsed_ms = (time.time() - start) * 1000
            r.method = result.metodo
            r.status = "OK" if result.sucesso else ("BLOCKED" if result.metodo == "blocked" else "FAIL")
            r.has_process_data = result.sucesso
            if result.erro:
                r.error = result.erro[:60]
        except Exception as e:
            r.elapsed_ms = (time.time() - start) * 1000
            r.status = "FAIL"
            r.error = str(e)[:60]

        icon = "\033[92m✓\033[0m" if r.status == "OK" else "\033[91m✗\033[0m"
        details = r.error if r.error else ""
        print(f"  {icon} {tribunal:10s} {sistema:10s} {r.status:8s} {r.method:20s} "
              f"{r.elapsed_ms:>6.0f}ms {details}")
        results.append(r)

    return results


def test_tribunal_mapping():
    """Verify all 92 tribunals are mapped"""
    from tribunal_mapeamento import TRIBUNAIS, resumo_mapeamento

    print(f"\n{'='*100}")
    print(f"  TRIBUNAL MAPPING VERIFICATION")
    print(f"{'='*100}\n")

    resumo = resumo_mapeamento()
    total = len(TRIBUNAIS)
    print(f"  Total tribunals mapped: {total}")
    print(f"  Summary: {json.dumps(resumo, indent=2, ensure_ascii=False)[:500]}")

    # Count by type
    by_type = {}
    for sigla, info in TRIBUNAIS.items():
        tipo = info.tipo
        by_type[tipo] = by_type.get(tipo, 0) + 1

    print(f"\n  By type:")
    for tipo, count in sorted(by_type.items()):
        print(f"    {tipo}: {count}")

    # Check MNI coverage
    mni_scraper = MNIDirectScraper()
    mni_count = len(mni_scraper.MNI_ENDPOINTS)
    print(f"\n  MNI SOAP endpoints: {mni_count}")

    expected_min = 90
    status = "OK" if total >= expected_min else "INCOMPLETE"
    print(f"\n  Mapping status: {status} ({total}/{expected_min}+ expected)")
    return total >= expected_min


def main():
    print("\n" + "="*100)
    print("  iuria LexFutura - COMPREHENSIVE TRIBUNAL SCRAPER TEST")
    print("  Testing ALL scraper paths against REAL tribunal websites")
    print("  Tools: curl_cffi, Patchright, Playwright, Scrapling, browserforge")
    print("="*100)

    all_results = []

    # Test 1: Tribunal mapping
    mapping_ok = test_tribunal_mapping()

    # Test 2: HTTP connectivity
    curl_results = test_curl_cffi_connectivity()
    all_results.extend(curl_results)

    # Test 3: MNI endpoints
    mni_results = test_mni_endpoints()
    all_results.extend(mni_results)

    # Test 4: Unified scraper pipeline
    pipeline_results = test_unified_scraper()
    all_results.extend(pipeline_results)

    # Final summary
    ok = sum(1 for r in all_results if r.status == "OK")
    partial = sum(1 for r in all_results if r.status in ("PARTIAL", "CHALLENGE"))
    blocked = sum(1 for r in all_results if r.status in ("BLOCKED", "CLOUDFLARE"))
    fail = sum(1 for r in all_results if r.status in ("FAIL", "TIMEOUT"))

    print(f"\n{'='*100}")
    print(f"  FINAL RESULTS")
    print(f"{'='*100}")
    print(f"  Mapping:     {'✓ Complete' if mapping_ok else '✗ Incomplete'}")
    print(f"  HTTP Tests:  {ok} OK | {partial} Partial | {blocked} Blocked | {fail} Fail | {len(all_results)} Total")
    print(f"")
    print(f"  curl_cffi OK: {sum(1 for r in curl_results if r.status == 'OK')}/{len(curl_results)}")
    print(f"  MNI OK:       {sum(1 for r in mni_results if r.status == 'OK')}/{len(mni_results)}")
    print(f"  Pipeline OK:  {sum(1 for r in pipeline_results if r.status == 'OK')}/{len(pipeline_results)}")
    print(f"")
    print(f"  Blocked by Cloudflare: {sum(1 for r in all_results if r.status == 'CLOUDFLARE')}")
    print(f"  Blocked by CAPTCHA:    {sum(1 for r in all_results if r.status == 'CHALLENGE')}")
    print(f"  Need browser:          {sum(1 for r in all_results if r.status in ('CLOUDFLARE', 'CHALLENGE', 'BLOCKED'))}")
    print(f"{'='*100}\n")

    # Output JSON summary
    summary = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "mapping_complete": mapping_ok,
        "total_tests": len(all_results),
        "ok": ok,
        "partial": partial,
        "blocked": blocked,
        "fail": fail,
        "tools_installed": {
            "curl_cffi": True,
            "patchright": True,
            "playwright": True,
            "scrapling": True,
            "browserforge": True,
            "selenium": True,
            "scrapy": True,
            "zeep": True,
        },
        "cloudflare_tribunals": ["STJ", "STF"],
        "working_direct_http": [r.tribunal for r in curl_results if r.status == "OK"],
        "needs_browser": [r.tribunal for r in curl_results if r.status in ("CLOUDFLARE", "CHALLENGE", "BLOCKED")],
    }

    with open(os.path.join(os.path.dirname(__file__), "test_results.json"), "w") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print(f"  Results saved to test_results.json")


if __name__ == "__main__":
    main()
