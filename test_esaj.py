import asyncio
from scraper.tribunais.esaj_scraper import ESAJScraper

async def main():
    scraper = ESAJScraper("TJSP")
    print("Buscando Processo no TJSP (eSAJ)...")
    resultado = await scraper.buscar_por_numero("1001869-51.2014.8.26.0100")
    if resultado.erro:
        print(f"Erro: {resultado.erro}")
    elif resultado.processos:
        processo = resultado.processos[0]
        print(f"Encontrado! Assunto: {processo.assunto}")
        print(f"Classe: {processo.classe}")
        print(f"Partes: {processo.partes}")
        print("Movimentações (últimas):")
        for m in processo.movimentacoes[:5]:
            print(f"  {m.data} - {m.descricao}")
    else:
        print("Não encontrado")

if __name__ == "__main__":
    asyncio.run(main())
