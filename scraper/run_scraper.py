#!/usr/bin/env python3
"""
Main entry point for running scrapers
Called from Node.js backend via child_process

Strategy (in priority order):
1. DataJud API (CNJ) - covers ALL tribunals, public key, semi-realtime data
2. ScraperAPI + Brazilian residential proxies - for specific tribunals
3. Scrapling stealth Playwright - anti-detection browser automation
4. Direct Playwright - fallback

Supported tribunals: STF, STJ, TRF1-5, TRF6 (via DataJud),
  TJSP, TJRJ, TJMG, TJRS, TJPR, TJSC, TJBA, TJPE, TJGO, TJCE,
  TJMA, TJMT, TJMS, TJPA, TJPI, TJRN, TJSE, TJTO, TJAM, TJAC,
  TJAL, TJDFT, TJES, TJPB, TJAP, TJRO, TJRR, + all via DataJud
"""
import asyncio
import json
import sys
import os
import importlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datajud import DataJudClient, TRIBUNAL_INDICES


def _get_scraping_scraper(tribunal: str):
    """
    Returns the best available scraper class for a tribunal.
    Priority: Scrapling stealth > legacy Playwright
    """
    tribunal = tribunal.upper()

    scraper_map = {
        "STF": [
            ("scraper_api", "is_scraper_api_available", "tribunais.stf_api", "STFScraperAPI"),
            ("scrapling", "DynamicFetcher", "tribunais.stf_scrapling", "STFScrapling"),
            (None, None, "tribunais.stf", "STFScraper"),
        ],
        "STJ": [
            ("scraper_api", "is_scraper_api_available", "tribunais.stj_api", "STJScraperAPI"),
            ("scrapling", "DynamicFetcher", "tribunais.stj_scrapling", "STJScrapling"),
            (None, None, "tribunais.stj", "STJScraper"),
        ],
        "TRF2": [
            ("scraper_api", "is_scraper_api_available", "tribunais.trf2_api", "TRF2ScraperAPI"),
            ("scrapling", "DynamicFetcher", "tribunais.trf2_scrapling", "TRF2Scrapling"),
            (None, None, "tribunais.trf2", "TRF2Scraper"),
        ],
        "TJRJ": [
            (None, None, "tribunais.tjrj_playwright", "TJRJPlaywright"),
            ("scraper_api", "is_scraper_api_available", "tribunais.tjrj_api", "TJRJScraperAPI"),
            ("scrapling", "DynamicFetcher", "tribunais.tjrj_scrapling", "TJRJScrapling"),
            (None, None, "tribunais.tjrj", "TJRJScraper"),
        ],
        "TRF1": [
            ("scrapling", "DynamicFetcher", "tribunais.trf1_scrapling", "TRF1Scrapling"),
        ],
        "TRF3": [
            ("scrapling", "DynamicFetcher", "tribunais.trf3_scrapling", "TRF3Scrapling"),
        ],
        "TRF4": [
            ("scrapling", "DynamicFetcher", "tribunais.trf4_scrapling", "TRF4Scrapling"),
        ],
        "TRF5": [
            ("scrapling", "DynamicFetcher", "tribunais.trf5_scrapling", "TRF5Scrapling"),
        ],
    }

    esaj_tribunais = ["TJSP", "TJBA", "TJCE", "TJAC", "TJAL", "TJAM", "TJSC", "TJMS"]
    pje_tribunais = [
        "TJMG", "TJPE", "TJRS", "TJPR", "TJGO", "TJMA", "TJPI",
        "TJRN", "TJSE", "TJTO", "TJRO", "TJMT", "TJPA", "TJPB",
        "TJAP", "TJRR", "TJES", "TJDFT"
    ]

    if tribunal in esaj_tribunais:
        try:
            from scrapling import DynamicFetcher
            from tribunais.esaj_scraper import ESAJScraper
            return lambda: ESAJScraper(tribunal)
        except ImportError:
            return None

    if tribunal in pje_tribunais:
        try:
            from scrapling import DynamicFetcher
            from tribunais.pje_scraper import PJeScraper
            return lambda: PJeScraper(tribunal)
        except ImportError:
            return None

    fallbacks = scraper_map.get(tribunal)
    if not fallbacks:
        return None

    for check_mod, check_attr, scraper_mod, scraper_class in fallbacks:
        try:
            if check_mod == "scraper_api":
                from scraper_api import is_scraper_api_available
                if not is_scraper_api_available():
                    continue
            elif check_mod == "scrapling":
                from scrapling import DynamicFetcher

            mod = importlib.import_module(scraper_mod)
            cls = getattr(mod, scraper_class)
            return cls
        except (ImportError, AttributeError):
            continue

    return None


async def consultar_datajud(tribunal: str, termo: str, tipo: str = "numero") -> dict:
    """Query DataJud API first as the primary source"""
    try:
        client = DataJudClient()

        if tipo == "numero":
            resultado = client.buscar_por_numero(tribunal, termo)
        else:
            resultado = ResultadoBusca(
                tribunal=tribunal,
                tipo_busca=tipo,
                termo_busca=termo,
                erro="DataJud API suporta apenas busca por numero CNJ"
            )
            from base_scraper import ResultadoBusca
            return resultado.to_dict()

        result_dict = resultado.to_dict()
        if result_dict.get("processos") and len(result_dict["processos"]) > 0:
            result_dict["fonte"] = "datajud"
            result_dict["fonte_label"] = "DataJud CNJ"
            result_dict["fonte_descricao"] = "Dados da base nacional do CNJ (pode ter atraso de 1-2 dias)"
        return result_dict
    except Exception as e:
        return {"erro": f"Erro ao consultar DataJud: {str(e)}", "fonte": "datajud"}


async def consultar_scraping(tribunal: str, termo: str, tipo: str = "numero") -> dict:
    """Query using web scraping as fallback"""
    scraper_factory = _get_scraping_scraper(tribunal)

    if not scraper_factory:
        return {
            "erro": f"Tribunal {tribunal} nao tem scraper de tempo real disponivel. Use a busca via DataJud.",
            "tribunal": tribunal,
            "termo": termo,
            "tipo": tipo
        }

    try:
        scraper = scraper_factory()
        resultado = await scraper.buscar(termo, tipo)
        result_dict = resultado.to_dict()
        result_dict["fonte"] = "scraping"
        result_dict["fonte_label"] = "Portal do Tribunal"
        result_dict["fonte_descricao"] = "Dados em tempo real extraidos diretamente do portal do tribunal"
        return result_dict
    except Exception as e:
        return {
            "erro": str(e),
            "tribunal": tribunal,
            "termo": termo,
            "tipo": tipo
        }


async def consultar(tribunal: str, termo: str, tipo: str = "numero") -> dict:
    """
    Execute a search on a tribunal.
    Strategy:
    1. If CNJ number → try DataJud first (fast, reliable, covers all tribunals)
    2. Fall through to scraping if DataJud returns no results or on error
    3. If nome/oab/cnpj → go straight to scraping

    Args:
        tribunal: Tribunal code (e.g., "STF", "TJSP")
        termo: Search term (process number or party name)
        tipo: "numero", "nome", "oab", or "cnpj"
    """
    tribunal = tribunal.upper()

    is_cnj = False
    if tipo == "numero":
        import re
        is_cnj = bool(re.match(r'^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$', termo.strip()))

    if tipo == "numero" and is_cnj and tribunal in TRIBUNAL_INDICES:
        datajud_result = await consultar_datajud(tribunal, termo, tipo)

        processos = datajud_result.get("processos", [])
        if processos and len(processos) > 0:
            print(f"DataJud retornou {len(processos)} processo(s) para {tribunal}", file=sys.stderr)
            return datajud_result

        print(f"DataJud sem resultados para {tribunal}, tentando scraping...", file=sys.stderr)

    scraping_result = await consultar_scraping(tribunal, termo, tipo)

    scraping_processos = scraping_result.get("processos", [])
    if not scraping_processos and tribunal in TRIBUNAL_INDICES:
        if tipo == "numero":
            print(f"Scraping sem resultados, tentando DataJud como fallback para {tribunal}...", file=sys.stderr)
            datajud_result = await consultar_datajud(tribunal, termo, tipo)
            if datajud_result.get("processos"):
                return datajud_result

    return scraping_result


async def consultar_todos(termo: str, tipo: str = "numero", tribunais: list = None) -> dict:
    """
    Execute a search on all (or selected) tribunals

    Args:
        termo: Search term
        tipo: Search type - "numero" or "nome"
        tribunais: Optional list of tribunal codes to search

    Returns:
        Dictionary with results from all tribunals
    """
    todos_tribunais = list(TRIBUNAL_INDICES.keys())

    if tribunais is None:
        tribunais = todos_tribunais

    resultados = {}

    for tribunal in tribunais:
        resultado = await consultar(tribunal, termo, tipo)
        resultados[tribunal] = resultado

    return {
        "termo": termo,
        "tipo": tipo,
        "resultados": resultados,
        "total_tribunais": len(resultados)
    }


def listar_tribunais() -> dict:
    """List available tribunals with their scraper and DataJud status"""
    esaj_tribunais = ["TJSP", "TJBA", "TJCE", "TJAC", "TJAL", "TJAM", "TJSC", "TJMS"]
    pje_tribunais = [
        "TJMG", "TJPE", "TJRS", "TJPR", "TJGO", "TJMA", "TJPI",
        "TJRN", "TJSE", "TJTO", "TJRO", "TJMT", "TJPA", "TJPB",
        "TJAP", "TJRR", "TJES", "TJDFT"
    ]
    scrapling_tribunais = ["STF", "STJ", "TRF1", "TRF2", "TRF3", "TRF4", "TRF5", "TJRJ"]
    scraper_api_tribunais = ["STF", "STJ", "TRF2", "TJRJ"]

    nomes = {
        "STF": "Supremo Tribunal Federal",
        "STJ": "Superior Tribunal de Justica",
        "TST": "Tribunal Superior do Trabalho",
        "TSE": "Tribunal Superior Eleitoral",
        "STM": "Superior Tribunal Militar",
        "TRF1": "Tribunal Regional Federal da 1a Regiao",
        "TRF2": "Tribunal Regional Federal da 2a Regiao",
        "TRF3": "Tribunal Regional Federal da 3a Regiao",
        "TRF4": "Tribunal Regional Federal da 4a Regiao",
        "TRF5": "Tribunal Regional Federal da 5a Regiao",
        "TRF6": "Tribunal Regional Federal da 6a Regiao",
        "TJAC": "Tribunal de Justica do Acre",
        "TJAL": "Tribunal de Justica de Alagoas",
        "TJAP": "Tribunal de Justica do Amapa",
        "TJAM": "Tribunal de Justica do Amazonas",
        "TJBA": "Tribunal de Justica da Bahia",
        "TJCE": "Tribunal de Justica do Ceara",
        "TJDFT": "Tribunal de Justica do Distrito Federal",
        "TJES": "Tribunal de Justica do Espirito Santo",
        "TJGO": "Tribunal de Justica de Goias",
        "TJMA": "Tribunal de Justica do Maranhao",
        "TJMT": "Tribunal de Justica de Mato Grosso",
        "TJMS": "Tribunal de Justica de Mato Grosso do Sul",
        "TJMG": "Tribunal de Justica de Minas Gerais",
        "TJPA": "Tribunal de Justica do Para",
        "TJPB": "Tribunal de Justica da Paraiba",
        "TJPR": "Tribunal de Justica do Parana",
        "TJPE": "Tribunal de Justica de Pernambuco",
        "TJPI": "Tribunal de Justica do Piaui",
        "TJRJ": "Tribunal de Justica do Rio de Janeiro",
        "TJRN": "Tribunal de Justica do Rio Grande do Norte",
        "TJRS": "Tribunal de Justica do Rio Grande do Sul",
        "TJRO": "Tribunal de Justica de Rondonia",
        "TJRR": "Tribunal de Justica de Roraima",
        "TJSC": "Tribunal de Justica de Santa Catarina",
        "TJSE": "Tribunal de Justica de Sergipe",
        "TJSP": "Tribunal de Justica de Sao Paulo",
        "TJTO": "Tribunal de Justica do Tocantins",
    }

    tribunais_list = []
    for sigla, nome in nomes.items():
        if sigla in scraper_api_tribunais and sigla in scrapling_tribunais:
            sistema = "ScraperAPI + Scrapling (tempo real)"
            ativo = True
        elif sigla in scrapling_tribunais:
            sistema = "Scrapling (tempo real)"
            ativo = True
        elif sigla in esaj_tribunais:
            sistema = "eSAJ (tempo real)"
            ativo = True
        elif sigla in pje_tribunais:
            sistema = "PJe (tempo real)"
            ativo = True
        elif sigla in TRIBUNAL_INDICES:
            sistema = "DataJud API"
            ativo = True
        else:
            sistema = "Nao disponivel"
            ativo = False

        tribunais_list.append({
            "sigla": sigla,
            "nome": nome,
            "sistema": sistema,
            "datajud": sigla in TRIBUNAL_INDICES,
            "ativo": ativo,
        })

    return {"tribunais": tribunais_list, "total": len(tribunais_list)}


async def main():
    """Main entry point - parse command line arguments"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "erro": "Uso: python run_scraper.py <comando> [args...]",
            "comandos": {
                "listar": "Lista tribunais disponiveis",
                "consultar": "<tribunal> <termo> [tipo] - Consulta um tribunal",
                "consultar_todos": "<termo> [tipo] - Consulta todos os tribunais"
            }
        }, ensure_ascii=False))
        sys.exit(1)

    comando = sys.argv[1]

    try:
        if comando == "listar":
            resultado = listar_tribunais()

        elif comando == "consultar":
            if len(sys.argv) < 4:
                resultado = {"erro": "Uso: consultar <tribunal> <termo> [tipo]"}
            else:
                tribunal = sys.argv[2].upper()
                termo = sys.argv[3]
                tipo = sys.argv[4] if len(sys.argv) > 4 else "numero"
                resultado = await consultar(tribunal, termo, tipo)

        elif comando == "consultar_todos":
            if len(sys.argv) < 3:
                resultado = {"erro": "Uso: consultar_todos <termo> [tipo]"}
            else:
                termo = sys.argv[2]
                tipo = sys.argv[3] if len(sys.argv) > 3 else "numero"
                resultado = await consultar_todos(termo, tipo)

        else:
            resultado = {"erro": f"Comando desconhecido: {comando}"}

        print(json.dumps(resultado, ensure_ascii=False, indent=2))

    except Exception as e:
        print(json.dumps({
            "erro": str(e),
            "comando": comando
        }, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
