import sys
import os

# Adiciona o diretório base para conseguir importar as coisas locais
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'scraper')))

from detect_tribunal import detectar_tribunal
from tribunais.pje_scraper import PJeScraper
from tribunais.esaj_scraper import ESAJScraper
import asyncio

async def testar_rota(numero):
    sigla = detectar_tribunal(numero)
    print(f"Número {numero} pertence ao tribunal: {sigla}")

    # Simple router logic based on known platforms
    esaj_tribunais = {"TJSP", "TJSC", "TJBA", "TJCE", "TJMS", "TJAC", "TJAL", "TJAM"}
    pje_tribunais = {
        "TJMG", "TJPE", "TJRN", "TJRO", "TJPI", "TJMA", "TJPA", "TJMT",
        "TJRR", "TJAP", "TJPB", "TJSE", "TJES", "TJDFT",
        "TRF1", "TRF3", "TRF5", "TRF6"
    }
    eproc_tribunais = {"TRF2", "TRF4", "TJRJ", "TJTO"}

    if sigla in esaj_tribunais:
        print(f"Rotear para ESAJ ({sigla})")
    elif sigla in pje_tribunais:
        print(f"Rotear para PJe ({sigla})")
    elif sigla in eproc_tribunais:
        print(f"Rotear para eProc ({sigla})")
    else:
        print(f"Tribunal {sigla} com plataforma customizada")

asyncio.run(testar_rota("1001869-51.2014.8.26.0100")) # TJSP
asyncio.run(testar_rota("5012345-67.2021.8.13.0024")) # TJMG
asyncio.run(testar_rota("5001234-56.2023.4.04.7000")) # TRF4
asyncio.run(testar_rota("0023205-04.2016.8.19.0001")) # TJRJ
