#!/usr/bin/env python3
"""
Script para detectar tribunal automaticamente pelo número do processo.
Chamado pelo backend Node.js.
"""
import sys
import json
from cnj_parser import detectar_tribunal, get_tribunal_info, listar_todos_tribunais


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Uso: python detect_tribunal.py <numero_processo>"}))
        sys.exit(1)
    
    comando = sys.argv[1]
    
    if comando == "listar":
        # Listar todos os tribunais
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
            result = {
                "detectado": True,
                "tribunal": tribunal_sigla,
                "formato": formato,
                "info": info
            }
        else:
            result = {
                "detectado": False,
                "tribunal": None,
                "formato": formato,
                "info": None,
                "mensagem": "Não foi possível detectar o tribunal automaticamente"
            }
        
        print(json.dumps(result, ensure_ascii=False, indent=2))
    
    else:
        print(json.dumps({"error": f"Comando desconhecido: {comando}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
