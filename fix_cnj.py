import re

file = 'scraper/cnj_parser.py'
with open(file, 'r') as f:
    code = f.read()

replacement = """def get_router_logic(sigla: str) -> dict:
    sigla = sigla.upper()
    esaj_tribunais = {"TJSP", "TJSC", "TJBA", "TJCE", "TJMS", "TJAC", "TJAL", "TJAM"}
    pje_tribunais = {
        "TJMG", "TJPE", "TJRN", "TJRO", "TJPI", "TJMA", "TJPA", "TJMT",
        "TJRR", "TJAP", "TJPB", "TJSE", "TJES", "TJDFT",
        "TRF1", "TRF3", "TRF5", "TRF6"
    }
    eproc_tribunais = {"TRF2", "TRF4", "TJRJ", "TJTO"}

    # Eleitoral e Trabalho (PJe)
    if "TRE" in sigla or "TRT" in sigla or "TSE" in sigla or "TST" in sigla:
        return {"tipo": "pje", "tribunal": sigla}

    if sigla in esaj_tribunais:
        return {"tipo": "esaj", "tribunal": sigla}
    elif sigla in pje_tribunais:
        return {"tipo": "pje", "tribunal": sigla}
    elif sigla in eproc_tribunais:
        return {"tipo": "eproc", "tribunal": sigla}
    elif sigla == "STF":
        return {"tipo": "custom", "modulo": "tribunais.stf_scrapling", "classe": "STFScrapling"}
    elif sigla == "STJ":
        return {"tipo": "custom", "modulo": "tribunais.stj_scrapling", "classe": "STJScrapling"}

    # Fallback default
    return {"tipo": "pje", "tribunal": sigla}

"""
code = replacement + "\n" + code

with open(file, 'w') as f:
    f.write(code)
