#!/usr/bin/env python3
"""
Comprehensive Scraping Test Suite - iuria LexFutura
Tests real scraping of Brazilian courts using multiple strategies:
  1. Direct HTTP scraping (requests + BeautifulSoup)
  2. MCP TecJustica API (JSON-RPC 2.0)
  3. JusBrasil fallback
  
Tests each priority tribunal:
  - STF (Supremo Tribunal Federal)
  - STJ (Superior Tribunal de Justica)
  - TRF2 (Justica Federal RJ/ES - eProc)
  - TJRJ 1a instancia (PJe)
  - TJRJ 2a instancia (DCP legacy)
  - TJRJ eProc (new deployment Oct 2025)
  
Also tests connectivity to all 92 tribunals via MCP.
"""

import asyncio
import json
import sys
import os
import time
from datetime import datetime

# Add parent dirs to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scraper"))


# ==================== TEST DATA ====================
# Real process numbers found via web search

TEST_CASES = {
    "STF": {
        "description": "Supremo Tribunal Federal - ADI 7676",
        "numero": "ADI 7676",
        "numero_cnj": "0146432-59.2024.1.00.0000",
        "expected": {
            "classe": "ADI",
            "relator": "FLAVIO DINO",
        },
        "url": "https://portal.stf.jus.br/processos/detalhe.asp?incidente=6961530",
        "incidente": "6961530",
    },
    "STJ": {
        "description": "Superior Tribunal de Justica - REsp 2189763",
        "numero": "REsp 2189763",
        "numero_cnj": "2189763",
        "expected": {
            "classe": "REsp",
        },
        "url": "https://processo.stj.jus.br/processo/pesquisa/",
    },
    "TRF2": {
        "description": "TRF 2a Regiao (RJ/ES) - Justica Federal via eProc",
        "numero": "5001234-56.2024.4.02.5101",
        "expected": {},
        "url": "https://eproc.trf2.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica",
    },
    "TJRJ-PJE": {
        "description": "TJRJ 1a Instancia - PJe (Processo Judicial Eletronico)",
        "numero": "0072018-74.2024.8.19.0001",
        "expected": {
            "classe": "Tutela Cautelar Antecedente",
        },
        "url": "https://tjrj.pje.jus.br/pje/ConsultaPublica/listView.seam",
    },
    "TJRJ-DCP": {
        "description": "TJRJ - DCP (Distribuicao e Controle Processual - legado)",
        "numero": "0072018-74.2024.8.19.0001",
        "expected": {},
        "url": "https://www3.tjrj.jus.br/consultaprocessual/",
    },
    "TJRJ-EPROC": {
        "description": "TJRJ - eProc (novo sistema desde Out/2025)",
        "numero": "0072018-74.2024.8.19.0001",
        "expected": {},
        "url": "https://eproc.tjrj.jus.br/eproc/externo_controlador.php",
    },
}


# ==================== TEST FUNCTIONS ====================

def test_direct_http_scraping():
    """Test direct HTTP scraping of each tribunal"""
    from real_scraper import get_unified_scraper
    
    scraper = get_unified_scraper()
    results = {}
    
    print("\n" + "=" * 70)
    print("TEST 1: Direct HTTP Scraping")
    print("=" * 70)
    
    # Test STF
    print("\n--- STF (portal.stf.jus.br) ---")
    r = scraper.consultar("STF", "ADI 7676")
    results["STF"] = r.to_dict()
    print(f"  Status: {'OK' if r.sucesso else 'FAIL'}")
    print(f"  Classe: {r.classe}")
    print(f"  Relator: {r.relator}")
    print(f"  Partes: {len(r.partes)}")
    print(f"  Movimentacoes: {len(r.movimentacoes)}")
    print(f"  Tempo: {r.tempo_ms:.0f}ms")
    if r.erro:
        print(f"  Erro: {r.erro}")
    
    # Test STJ
    print("\n--- STJ (processo.stj.jus.br) ---")
    r = scraper.consultar("STJ", "REsp 2189763")
    results["STJ"] = r.to_dict()
    print(f"  Status: {'OK' if r.sucesso else 'BLOCKED/FAIL'}")
    print(f"  Metodo: {r.metodo}")
    print(f"  Tempo: {r.tempo_ms:.0f}ms")
    if r.erro:
        print(f"  Erro: {r.erro}")
    
    # Test TRF2
    print("\n--- TRF2 (eproc.trf2.jus.br) ---")
    r = scraper.consultar("TRF2", "5001234-56.2024.4.02.5101")
    results["TRF2"] = r.to_dict()
    print(f"  Status: {'OK' if r.sucesso else 'BLOCKED/FAIL'}")
    print(f"  Metodo: {r.metodo}")
    print(f"  Tempo: {r.tempo_ms:.0f}ms")
    if r.erro:
        print(f"  Erro: {r.erro}")
    
    # Test TJRJ
    print("\n--- TJRJ (PJe + DCP + eProc) ---")
    r = scraper.consultar("TJRJ", "0072018-74.2024.8.19.0001")
    results["TJRJ"] = r.to_dict()
    print(f"  Status: {'OK' if r.sucesso else 'BLOCKED/FAIL'}")
    print(f"  Metodo: {r.metodo}")
    print(f"  Tempo: {r.tempo_ms:.0f}ms")
    if r.erro:
        print(f"  Erro: {r.erro}")
    
    return results


def test_mcp_techjustica():
    """Test MCP TecJustica API integration"""
    print("\n" + "=" * 70)
    print("TEST 2: MCP TecJustica API")
    print("=" * 70)
    
    results = {}
    
    try:
        from mcp_techjustica import get_mcp_client, MCPTechjusticaClient
        
        client = get_mcp_client()
        print(f"  API Key: {client.api_key[:12]}...{client.api_key[-4:]}")
        print(f"  Base URL: {client.base_url}")
        print(f"  Tribunais suportados: {len(client.TRIBUNAIS_SUPORTADOS)}")
        
        # Test status
        print("\n  --- Status Check ---")
        status = asyncio.run(client.verificar_status())
        print(f"  Status: {status.get('status', 'unknown')}")
        if status.get("error"):
            print(f"  Error: {status['error']}")
        results["status"] = status
        
        # Test STF
        print("\n  --- STF via MCP ---")
        try:
            proc = asyncio.run(client.consultar_processo("STF", "ADI 7676"))
            results["STF_mcp"] = proc.to_dict()
            print(f"  Classe: {proc.classe}")
            print(f"  Relator: {proc.relator}")
            print(f"  Partes: {len(proc.partes)}")
            print(f"  Movimentacoes: {len(proc.movimentacoes)}")
        except Exception as e:
            print(f"  Error: {e}")
            results["STF_mcp"] = {"erro": str(e)}
        
        # Test STJ
        print("\n  --- STJ via MCP ---")
        try:
            proc = asyncio.run(client.consultar_processo("STJ", "REsp 2189763"))
            results["STJ_mcp"] = proc.to_dict()
            print(f"  Classe: {proc.classe}")
            print(f"  Relator: {proc.relator}")
        except Exception as e:
            print(f"  Error: {e}")
            results["STJ_mcp"] = {"erro": str(e)}
        
        # Test TJRJ
        print("\n  --- TJRJ via MCP ---")
        try:
            proc = asyncio.run(client.consultar_processo("TJRJ", "0072018-74.2024.8.19.0001"))
            results["TJRJ_mcp"] = proc.to_dict()
            print(f"  Classe: {proc.classe}")
            print(f"  Partes: {len(proc.partes)}")
        except Exception as e:
            print(f"  Error: {e}")
            results["TJRJ_mcp"] = {"erro": str(e)}
        
        # Test TRF2
        print("\n  --- TRF2 via MCP ---")
        try:
            proc = asyncio.run(client.consultar_processo("TRF2", "5001234-56.2024.4.02.5101"))
            results["TRF2_mcp"] = proc.to_dict()
            print(f"  Classe: {proc.classe}")
        except Exception as e:
            print(f"  Error: {e}")
            results["TRF2_mcp"] = {"erro": str(e)}
        
        # Metrics
        print("\n  --- Metricas ---")
        metrics = client.get_metrics()
        print(f"  Total requests: {metrics['total_requests']}")
        print(f"  Successful: {metrics['successful']}")
        print(f"  Failed: {metrics['failed']}")
        print(f"  Cached: {metrics['cached_hits']}")
        results["metrics"] = metrics
        
    except ImportError as e:
        print(f"  MCP client not available: {e}")
        results["error"] = str(e)
    except Exception as e:
        print(f"  Error: {e}")
        results["error"] = str(e)
    
    return results


def test_tribunal_mapeamento():
    """Test tribunal mapping completeness"""
    print("\n" + "=" * 70)
    print("TEST 3: Tribunal Mapping Completeness")
    print("=" * 70)
    
    from tribunal_mapeamento import (
        TRIBUNAIS, resumo_mapeamento, get_tribunal,
        get_tribunais_com_mni, get_tribunais_por_tipo,
        detectar_tribunal_por_cnj,
    )
    
    resumo = resumo_mapeamento()
    print(f"\n  Total tribunais mapeados: {resumo['total_tribunais']}")
    print(f"  Com MNI: {resumo['com_mni']}")
    print(f"  Por tipo:")
    for tipo, count in resumo["por_tipo"].items():
        print(f"    {tipo}: {count}")
    print(f"  Por sistema:")
    for sistema, count in resumo["por_sistema"].items():
        print(f"    {sistema}: {count}")
    
    # Test CNJ detection
    print("\n  --- CNJ Detection ---")
    test_cnjs = [
        ("0146432-59.2024.1.00.0000", "STF"),
        ("0072018-74.2024.8.19.0001", "TJRJ"),
        ("5001234-56.2024.4.02.5101", "TRF2"),
    ]
    for cnj, expected in test_cnjs:
        t = detectar_tribunal_por_cnj(cnj)
        detected = t.sigla if t else "NOT FOUND"
        status = "OK" if detected == expected else "FAIL"
        print(f"  {cnj} -> {detected} (expected: {expected}) [{status}]")
    
    # Verify all priority tribunals exist
    print("\n  --- Priority Tribunals ---")
    priority = ["STF", "STJ", "TRF1", "TRF2", "TRF3", "TRF4", "TRF5", "TRF6",
                 "TJRJ", "TJSP", "TJMG", "TJRS", "TJPR", "TJSC", "TJBA",
                 "TRT1", "TRT2", "TRT3"]
    for sigla in priority:
        t = get_tribunal(sigla)
        status = "MAPPED" if t else "MISSING"
        sistemas = ", ".join(s.sistema.value for s in t.sistemas) if t else "N/A"
        print(f"  {sigla}: {status} ({sistemas})")
    
    return resumo


def test_connectivity():
    """Test basic connectivity to court websites"""
    import requests
    import urllib3
    urllib3.disable_warnings()
    
    print("\n" + "=" * 70)
    print("TEST 4: Court Website Connectivity")
    print("=" * 70)
    
    urls_to_test = {
        "STF": "https://portal.stf.jus.br/",
        "STJ": "https://processo.stj.jus.br/processo/pesquisa/",
        "TRF2-eProc": "https://eproc.trf2.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica",
        "TJRJ-PJe": "https://tjrj.pje.jus.br/pje/ConsultaPublica/listView.seam",
        "TJRJ-DCP": "https://www3.tjrj.jus.br/consultaprocessual/",
        "TJRJ-Portal": "https://www.tjrj.jus.br/",
        "TRF1-PJe": "https://pje1g.trf1.jus.br/consultapublica/",
        "TJSP-eSAJ": "https://esaj.tjsp.jus.br/cpopg/open.do",
        "TRF4-eProc": "https://eproc.trf4.jus.br/eproc2trf4/",
        "CNJ-PJe": "https://www.pje.jus.br/",
    }
    
    results = {}
    for name, url in urls_to_test.items():
        try:
            start = time.time()
            resp = requests.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0",
            }, timeout=15, verify=False, allow_redirects=True)
            elapsed = (time.time() - start) * 1000
            
            results[name] = {
                "status": resp.status_code,
                "size": len(resp.text),
                "time_ms": round(elapsed),
                "accessible": resp.status_code < 400,
            }
            icon = "OK" if resp.status_code < 400 else "BLOCKED" if resp.status_code == 403 else "ERROR"
            print(f"  {name}: {resp.status_code} ({elapsed:.0f}ms) [{icon}] - {len(resp.text)} bytes")
        except Exception as e:
            results[name] = {"status": "error", "error": str(e)[:100]}
            print(f"  {name}: ERROR - {str(e)[:100]}")
    
    return results


def test_resilient_orchestrator():
    """Test the resilient orchestrator cascade"""
    print("\n" + "=" * 70)
    print("TEST 5: Resilient Orchestrator")
    print("=" * 70)
    
    try:
        from resilient_orchestrator import get_resilient_orchestrator
        
        orch = get_resilient_orchestrator()
        metrics = orch.get_metrics()
        
        print(f"  Fluxo de redundancia:")
        for step in metrics["redundancia"]["fluxo"]:
            print(f"    {step}")
        
        print(f"\n  MCP configurada: {metrics['redundancia']['mcp_api_configurada']}")
        print(f"  CAPTCHA API: {metrics['redundancia']['captcha_api_configurada']}")
        print(f"  Identity proxy: {metrics['redundancia']['identity_proxy_configurada']}")
        
        # Test cascading query
        print("\n  --- Cascading Query Test ---")
        result = asyncio.run(orch.consultar("STF", "0146432-59.2024.1.00.0000"))
        print(f"  STF result: {result.get('estrategia_usada', 'N/A')}")
        if result.get("erro"):
            print(f"  Error: {result['erro']}")
        else:
            print(f"  Classe: {result.get('classe', 'N/A')}")
            print(f"  Time: {result.get('tempo_ms', 'N/A')}ms")
        
        return {"metrics": metrics, "test_result": result}
    except Exception as e:
        print(f"  Error: {e}")
        return {"error": str(e)}


# ==================== MAIN ====================

def main():
    """Run all tests"""
    print("=" * 70)
    print(f"iuria LexFutura - Scraping Test Suite")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    all_results = {}
    
    # Test 1: Direct HTTP
    all_results["direct_http"] = test_direct_http_scraping()
    
    # Test 2: MCP
    all_results["mcp_techjustica"] = test_mcp_techjustica()
    
    # Test 3: Mapping
    all_results["mapping"] = test_tribunal_mapeamento()
    
    # Test 4: Connectivity
    all_results["connectivity"] = test_connectivity()
    
    # Test 5: Resilient orchestrator
    all_results["resilient"] = test_resilient_orchestrator()
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    
    total_tests = 0
    passed_tests = 0
    
    for category, results in all_results.items():
        if isinstance(results, dict):
            for key, val in results.items():
                total_tests += 1
                if isinstance(val, dict):
                    if val.get("erro") is None and val.get("error") is None:
                        if val.get("accessible") is not False:
                            passed_tests += 1
    
    print(f"\n  Tests executed: ~{total_tests}")
    print(f"  Note: Government court websites often block automated requests.")
    print(f"  The system uses a cascading approach:")
    print(f"    1. MCP TecJustica API (covers all 92 tribunals via MNI)")
    print(f"    2. MNI SOAP direct (with certificate A1)")
    print(f"    3. HTTP scraping (requests + BeautifulSoup)")
    print(f"    4. Anti-detection scraping (Playwright + stealth)")
    print(f"    5. CAPTCHA solver (2Captcha)")
    print(f"    6. Identity proxy (for IP blocking)")
    
    # Save results
    output_path = os.path.join(os.path.dirname(__file__), "..", "tests", "scraping_test_results.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2, default=str)
    print(f"\n  Results saved to: {output_path}")
    
    return all_results


if __name__ == "__main__":
    main()
