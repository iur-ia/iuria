#!/usr/bin/env python3
"""
Script para detectar tribunal automaticamente pelo número do processo.
Chamado pelo backend Node.js.

Também expõe o comando 'engine' que retorna qual engine de scraping
usar para cada tribunal (chromium, firefox, camoufox).
"""
import sys
import json
from cnj_parser import detectar_tribunal, get_tribunal_info, listar_todos_tribunais

CLOUDFLARE_TRIBUNAIS = {
    "TJSP", "TJBA", "TJCE",
}

# TJSC uses eSAJ (Scrapling) without heavy Imperva — kept empty to allow extension
IMPERVA_TRIBUNAIS: set = set()

FIREFOX_TRIBUNAIS = {
    "TJRJ",
}


def get_engine_para_tribunal(sigla: str) -> dict:
    """
    Retorna engine recomendado e flags para o tribunal.

    Engines:
      - camoufox  → portais com Cloudflare/Imperva pesado (TJSP, TJBA, TJCE)
      - firefox   → portais Angular com bloqueio a Chromium (TJRJ)
      - chromium  → demais portais (padrão)
    """
    sigla_upper = sigla.upper()

    if sigla_upper in CLOUDFLARE_TRIBUNAIS or sigla_upper in IMPERVA_TRIBUNAIS:
        return {
            "engine": "camoufox",
            "cloudflare": True,
            "imperva": sigla_upper in IMPERVA_TRIBUNAIS,
            "descricao": "Portal com proteção Cloudflare/Imperva — usar Camoufox",
        }

    if sigla_upper in FIREFOX_TRIBUNAIS:
        return {
            "engine": "firefox",
            "cloudflare": False,
            "imperva": False,
            "descricao": "Portal Angular — usar Playwright Firefox para maior compatibilidade",
        }

    return {
        "engine": "chromium",
        "cloudflare": False,
        "imperva": False,
        "descricao": "Portal padrão — usar Scrapling/Chromium",
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Uso: python detect_tribunal.py <comando> [args]"}))
        sys.exit(1)

    comando = sys.argv[1]

    if comando == "listar":
        tribunais = listar_todos_tribunais()
        print(json.dumps(tribunais, ensure_ascii=False, indent=2))

    elif comando == "detectar":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Número do processo não informado"}))
            sys.exit(1)

        numero = sys.argv[2]
        tribunal_sigla, formato = detectar_tribunal(numero)

        if tribunal_sigla:
            info = get_tribunal_info(tribunal_sigla)
            engine_info = get_engine_para_tribunal(tribunal_sigla)
            result = {
                "detectado": True,
                "tribunal": tribunal_sigla,
                "formato": formato,
                "info": info,
                "engine": engine_info,
            }
        else:
            result = {
                "detectado": False,
                "tribunal": None,
                "formato": formato,
                "info": None,
                "engine": None,
                "mensagem": "Não foi possível detectar o tribunal automaticamente",
            }

        print(json.dumps(result, ensure_ascii=False, indent=2))

    elif comando == "engine":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Sigla do tribunal não informada"}))
            sys.exit(1)

        sigla = sys.argv[2]
        result = get_engine_para_tribunal(sigla)
        result["tribunal"] = sigla.upper()
        print(json.dumps(result, ensure_ascii=False, indent=2))

    elif comando == "engines":
        todos = listar_todos_tribunais()
        result = {}
        for t in todos:
            sigla = t.get("sigla", "")
            if sigla:
                result[sigla] = get_engine_para_tribunal(sigla)
        print(json.dumps(result, ensure_ascii=False, indent=2))

    else:
        print(json.dumps({"error": f"Comando desconhecido: {comando}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
