#!/usr/bin/env python3
"""
Main entry point for running scrapers
Called from Node.js backend via child_process
"""
import asyncio
import json
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tribunais.stf import STFScraper


# Registry of available scrapers
SCRAPERS = {
    "STF": STFScraper,
}


async def consultar(tribunal: str, termo: str, tipo: str = "numero") -> dict:
    """
    Execute a search on a tribunal
    
    Args:
        tribunal: Tribunal code (e.g., "STF")
        termo: Search term (process number or party name)
        tipo: Search type - "numero" or "nome"
    
    Returns:
        Dictionary with search results
    """
    if tribunal not in SCRAPERS:
        return {
            "erro": f"Tribunal não suportado: {tribunal}",
            "tribunais_disponiveis": list(SCRAPERS.keys())
        }
    
    scraper_class = SCRAPERS[tribunal]
    scraper = scraper_class()
    
    try:
        resultado = await scraper.buscar(termo, tipo)
        return resultado.to_dict()
    except Exception as e:
        return {
            "erro": str(e),
            "tribunal": tribunal,
            "termo": termo,
            "tipo": tipo
        }


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
    if tribunais is None:
        tribunais = list(SCRAPERS.keys())
    
    resultados = {}
    
    for tribunal in tribunais:
        if tribunal in SCRAPERS:
            resultado = await consultar(tribunal, termo, tipo)
            resultados[tribunal] = resultado
    
    return {
        "termo": termo,
        "tipo": tipo,
        "resultados": resultados,
        "total_tribunais": len(resultados)
    }


def listar_tribunais() -> dict:
    """List available tribunals"""
    return {
        "tribunais": [
            {
                "codigo": codigo,
                "nome": scraper_class().tribunal_nome,
                "sigla": scraper_class().tribunal_sigla
            }
            for codigo, scraper_class in SCRAPERS.items()
        ]
    }


async def main():
    """Main entry point - parse command line arguments"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "erro": "Uso: python run_scraper.py <comando> [args...]",
            "comandos": {
                "listar": "Lista tribunais disponíveis",
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
