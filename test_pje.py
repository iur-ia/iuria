import asyncio
from scraper.tribunais.pje_scraper import PJeScraper

async def main():
    scraper = PJeScraper("TJMG")
    print("Buscando Processo no TJMG (PJe)...")
    resultado = await scraper.buscar_por_numero("5012345-67.2021.8.13.0024")
    if resultado.erro:
        print(f"Erro: {resultado.erro}")
    elif resultado.processos:
        processo = resultado.processos[0]
        print(f"Encontrado! Assunto: {processo.assunto}")
        print(f"Classe: {processo.classe}")
        print(f"Partes: {processo.partes}")
    else:
        print("Não encontrado")

if __name__ == "__main__":
    asyncio.run(main())
