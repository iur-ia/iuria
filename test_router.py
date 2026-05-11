import os
# os.environ
# os.environ
import asyncio
import json
import sys
import os

# Adiciona o diretório base para resolver os imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'scraper')))

from detect_tribunal import detectar_tribunal
from run_scraper import _get_scraping_scraper
from cnj_parser import get_router_logic

async def testar_processo(numero, esperado_tribunal):
    print(f"\n==============================================")
    print(f"Testando processo: {numero} ({esperado_tribunal})")

    # 1. Roteamento automático do CNJ
    try:
        sigla, _ = detectar_tribunal(numero)
    except ValueError:
        sigla = esperado_tribunal

    if not sigla:
        print("Erro: Não foi possível detectar o tribunal")
        return

    rota = get_router_logic(sigla)
    print(f"Roteador detectou: {sigla} -> Sistema: {rota['tipo'].upper()}")

    # 2. Pegar Scraper Unificado
    ScraperClass = _get_scraping_scraper(sigla)
    if not ScraperClass:
        print("Erro: Scraper Class não encontrado!")
        return

    try:
        # 3. Executar Busca
        scraper = ScraperClass(sigla) if rota["tipo"] != "custom" else ScraperClass()
        resultado = await scraper.buscar_por_numero(numero)

        # Correção caso o motor seja Legacy
        import inspect
        if inspect.iscoroutine(resultado):
            resultado = await resultado

        # 4. Avaliar Resultado
        if getattr(resultado, "erro", None):
            print(f"ERRO DE ACESSO: {resultado.erro}")
        elif getattr(resultado, "processos", None):
            p = resultado.processos[0]
            print(f"✅ SUCESSO! DADOS ENCONTRADOS NO TRIBUNAL!")
            print(f"Número Único: {p.numero_unico}")
            print(f"Classe: {p.classe}")
            print(f"Assunto: {p.assunto}")
            print(f"Polo Ativo / Passivo: {p.partes}")
            print(f"Andamentos Registrados: {len(p.movimentacoes)}")
            if p.movimentacoes:
                print(f"Último Andamento: {p.movimentacoes[0].data} - {p.movimentacoes[0].descricao}")
        else:
            print("❌ PROCESSO NÃO ENCONTRADO na base pública do portal.")

    except Exception as e:
        print(f"Erro Crítico na Execução do Teste: {e}")

async def main():
    # TJSP (eSAJ)
    await testar_processo("1001869-51.2014.8.26.0100", "TJSP")

    # TRF4 (eProc) - Processo público aleatório TRF4
    await testar_processo("5001234-56.2023.4.04.7000", "TRF4")

    # TJMG (PJe)
    await testar_processo("5012345-67.2021.8.13.0024", "TJMG")

    # TJRJ (eProc local)
    await testar_processo("0023205-04.2016.8.19.0001", "TJRJ")

if __name__ == "__main__":
    asyncio.run(main())
