import asyncio
from scraper.tribunais.stf_scrapling import STFScrapling

async def main():
    scraper = STFScrapling()
    print("Buscando PET 13350 no STF...")
    resultado = await scraper.buscar_por_numero("PET 13350")
    if resultado.erro:
        print(f"Erro: {resultado.erro}")
    elif resultado.processos:
        processo = resultado.processos[0]
        print(f"Encontrado! Assunto: {processo.assunto}")
        print(f"Classe: {processo.classe}")
        print("Movimentações (últimas):")
        for m in processo.movimentacoes[:5]:
            print(f"  {m.data} - {m.descricao}")
    else:
        print("Não encontrado")

if __name__ == "__main__":
    asyncio.run(main())
