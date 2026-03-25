#!/usr/bin/env python3
"""
Main entry point for running scrapers
Called from Node.js backend via child_process

Supports:
  - 62 tribunals (STF, STJ, TRFs, TJs, TRTs)
  - 8+ systems (PJe, eSAJ, eProc, PROJUDI, DCP, STF/STJ portal, etc.)
  - MNI SOAP/XML integration (with certificate + public fallback)
  - Anti-detection (patchright, browserforge, Bezier mouse, residential proxy)
  - NLP andamento parser + workalendar BR holidays
  - PDF extraction pipeline (MNI Base64 + scraping stream)
  - Resilient orchestrator (MNI->Scraping->CAPTCHA, circuit breaker)
"""
import asyncio
import json
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from orquestrador import get_orchestrator, ScraperOrchestrator
from tribunal_mapeamento import TRIBUNAIS, resumo_mapeamento
from tribunais.stf import STFScraper

# Legacy registry (kept for backward compatibility)
SCRAPERS = {
    "STF": STFScraper,
}


async def consultar(tribunal: str, termo: str, tipo: str = "numero") -> dict:
    """
    Execute a search on a tribunal using the orchestrator.
    Automatically selects the best method (MNI, PJe, eSAJ, etc.)
    """
    orch = get_orchestrator()
    return await orch.consultar(tribunal, termo, tipo)


async def consultar_auto(numero_cnj: str) -> dict:
    """Auto-detect tribunal from CNJ number and search"""
    orch = get_orchestrator()
    return await orch.consultar_auto(numero_cnj)


async def consultar_todos(termo: str, tipo: str = "numero", tribunais: list = None) -> dict:
    """Execute search on multiple tribunals"""
    orch = get_orchestrator()
    if tribunais is None:
        # Default: only search implemented tribunals
        tribunais = ["STF"]

    resultados = {}
    for tribunal in tribunais:
        resultado = await orch.consultar(tribunal, termo, tipo)
        resultados[tribunal] = resultado

    return {
        "termo": termo,
        "tipo": tipo,
        "resultados": resultados,
        "total_tribunais": len(resultados),
    }


def listar_tribunais() -> dict:
    """List all available tribunals with their systems"""
    orch = get_orchestrator()
    todos = orch.listar_tribunais_disponiveis()

    # Summary
    resumo = resumo_mapeamento()

    return {
        "resumo": resumo,
        "tribunais": [
            {
                "sigla": sigla,
                "nome": info["nome"],
                "tipo": info["tipo"],
                "uf": info.get("uf"),
                "sistemas": info["sistemas"],
                "status": info["status"],
            }
            for sigla, info in sorted(todos.items())
        ],
    }


async def main():
    """Main entry point - parse command line arguments"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "erro": "Uso: python run_scraper.py <comando> [args...]",
            "comandos": {
                "listar": "Lista tribunais disponiveis (62 tribunais, 8+ sistemas)",
                "consultar": "<tribunal> <termo> [tipo] - Consulta um tribunal",
                "auto": "<numero_cnj> - Detecta tribunal e consulta automaticamente",
                "consultar_todos": "<termo> [tipo] - Consulta todos os tribunais implementados",
                "mni_status": "Lista tribunais com MNI disponivel",
                "resumo": "Resumo do mapeamento de tribunais",
                "parse_andamento": "<texto> - Classifica andamento com NLP",
                "parse_batch": "Classifica lote de andamentos (JSON via stdin)",
                "resilient": "<tribunal> <numero> [cert] [pwd] - Consulta com cascata resiliente",
                "resilient_metrics": "Metricas do orquestrador resiliente",
                "healthcheck": "Status dos circuit breakers",
                "calcular_prazo": "<YYYY-MM-DD> <dias> [true/false] [UF] - Calcula prazo processual",
                "feriados": "[ano] [UF] - Lista feriados",
            },
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

        elif comando == "auto":
            if len(sys.argv) < 3:
                resultado = {"erro": "Uso: auto <numero_cnj>"}
            else:
                resultado = await consultar_auto(sys.argv[2])

        elif comando == "consultar_todos":
            if len(sys.argv) < 3:
                resultado = {"erro": "Uso: consultar_todos <termo> [tipo]"}
            else:
                termo = sys.argv[2]
                tipo = sys.argv[3] if len(sys.argv) > 3 else "numero"
                tribunais_list = sys.argv[4].split(",") if len(sys.argv) > 4 else None
                resultado = await consultar_todos(termo, tipo, tribunais_list)

        elif comando == "mni_status":
            from mni import listar_tribunais_mni, MNI_ENDPOINTS
            tribunais_mni = listar_tribunais_mni()
            resultado = {
                "total_endpoints_mni": len(MNI_ENDPOINTS),
                "tribunais_mni": tribunais_mni,
            }

        elif comando == "resumo":
            resultado = resumo_mapeamento()

        elif comando == "parse_andamento":
            # Parse andamento text using NLP parser
            if len(sys.argv) < 3:
                resultado = {"erro": "Uso: parse_andamento <texto>"}
            else:
                texto = " ".join(sys.argv[2:])
                from prazos.andamento_parser import AndamentoParser
                parser = AndamentoParser(usar_nlp=True)
                match = parser.parse(texto)
                resultado = {
                    "texto": texto,
                    "tipo": match.tipo,
                    "subtipo": match.subtipo,
                    "descricao": match.descricao,
                    "confianca": match.confianca,
                    "gera_prazo": match.gera_prazo,
                    "dias_prazo": match.dias_prazo,
                    "dias_uteis": match.dias_uteis,
                    "fundamento": match.fundamento_legal,
                    "prioridade": match.prioridade,
                }

        elif comando == "parse_batch":
            # Parse batch of andamentos from stdin JSON
            from prazos.andamento_parser import AndamentoParser
            parser = AndamentoParser(usar_nlp=True)
            dados = json.loads(sys.stdin.read())
            andamentos = dados.get("andamentos", [])
            resultado = {
                "classificacoes": parser.parse_batch(andamentos),
                "stats": parser.get_stats(),
            }

        elif comando == "resilient":
            # Resilient query using cascading fallback
            if len(sys.argv) < 4:
                resultado = {"erro": "Uso: resilient <tribunal> <numero>"}
            else:
                from resilient_orchestrator import get_resilient_orchestrator
                rorch = get_resilient_orchestrator()
                tribunal = sys.argv[2].upper()
                numero = sys.argv[3]
                cert = sys.argv[4] if len(sys.argv) > 4 else None
                cert_pwd = sys.argv[5] if len(sys.argv) > 5 else None
                resultado = await rorch.consultar(tribunal, numero, cert, cert_pwd)

        elif comando == "resilient_metrics":
            from resilient_orchestrator import get_resilient_orchestrator
            rorch = get_resilient_orchestrator()
            resultado = rorch.get_metrics()

        elif comando == "healthcheck":
            from resilient_orchestrator import get_resilient_orchestrator
            rorch = get_resilient_orchestrator()
            resultado = rorch.get_circuit_breaker_status()

        elif comando == "calcular_prazo":
            # Calculate deadline: calcular_prazo <data_intimacao> <dias> [dias_uteis] [UF]
            from prazos.motor_prazos import calcular_prazo
            from datetime import date
            if len(sys.argv) < 4:
                resultado = {"erro": "Uso: calcular_prazo <YYYY-MM-DD> <dias> [true/false] [UF]"}
            else:
                parts = sys.argv[2].split("-")
                dt = date(int(parts[0]), int(parts[1]), int(parts[2]))
                dias = int(sys.argv[3])
                dias_uteis = sys.argv[4].lower() == "true" if len(sys.argv) > 4 else True
                estado = sys.argv[5] if len(sys.argv) > 5 else None
                resultado = calcular_prazo(dt, dias, dias_uteis, estado)

        elif comando == "feriados":
            # List holidays for year/state
            from prazos.feriados import obter_feriados_detalhados
            ano = int(sys.argv[2]) if len(sys.argv) > 2 else 2026
            estado = sys.argv[3] if len(sys.argv) > 3 else None
            resultado = {
                "ano": ano,
                "estado": estado,
                "feriados": obter_feriados_detalhados(ano, estado),
            }

        else:
            resultado = {"erro": f"Comando desconhecido: {comando}"}

        print(json.dumps(resultado, ensure_ascii=False, indent=2))

    except Exception as e:
        print(json.dumps({
            "erro": str(e),
            "comando": comando,
        }, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
