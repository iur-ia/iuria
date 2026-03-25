"""
Worker autonomo de monitoramento de processos.
Executa verificacoes periodicas nos processos monitorados,
detecta novos andamentos, e gera alertas.

Modos de execucao:
  - run_once: executa uma verificacao e sai
  - run_daemon: loop continuo com agendamento (cron-like)
  - check_single <id>: verifica um monitoramento especifico

Chamado pelo backend Node.js via child_process ou como daemon.
"""
import asyncio
import hashlib
import json
import logging
import os
import sys
import time
from datetime import datetime, timedelta
from typing import Optional

# Setup paths
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from orquestrador import get_orchestrator
from base_scraper import ProcessoInfo

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("iuria.worker")


def compute_hash(data: list) -> str:
    """Calcula hash SHA256 de uma lista de andamentos"""
    content = json.dumps(data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(content.encode()).hexdigest()


async def check_monitoramento(monitoramento: dict) -> dict:
    """
    Verifica um processo monitorado.
    Retorna resultado da verificacao com novos andamentos.
    """
    numero = monitoramento.get("numeroProcesso", "")
    tribunal = monitoramento.get("tribunal", "")
    hash_anterior = monitoramento.get("hashAndamentos", "")
    contador_anterior = monitoramento.get("contadorAndamentos", 0)

    logger.info(f"Verificando: {numero} ({tribunal})")

    try:
        orch = get_orchestrator()
        resultado = await orch.consultar(tribunal, numero, "numero")

        # Extrai andamentos do resultado
        andamentos = []
        processos = resultado.get("processos", [])
        if processos:
            processo = processos[0] if isinstance(processos, list) else processos
            andamentos = processo.get("movimentacoes", [])
        elif resultado.get("processo"):
            # MNI format
            andamentos = resultado["processo"].get("movimentacoes", [])

        # Calcula hash e detecta mudancas
        hash_atual = compute_hash(andamentos)
        contador_atual = len(andamentos)
        novos_detectados = max(0, contador_atual - contador_anterior)

        # Compara hashes
        houve_mudanca = hash_anterior and hash_atual != hash_anterior

        result = {
            "monitoramento_id": monitoramento.get("id", ""),
            "numero_processo": numero,
            "tribunal": tribunal,
            "sucesso": True,
            "hash_anterior": hash_anterior,
            "hash_atual": hash_atual,
            "contador_anterior": contador_anterior,
            "contador_atual": contador_atual,
            "novos_detectados": novos_detectados,
            "houve_mudanca": houve_mudanca,
            "andamentos_novos": andamentos[:novos_detectados] if novos_detectados > 0 else [],
            "timestamp": datetime.now().isoformat(),
        }

        if houve_mudanca or novos_detectados > 0:
            logger.info(
                f"MUDANCA DETECTADA em {numero}: {novos_detectados} novos andamentos"
            )
        else:
            logger.info(f"Sem mudancas em {numero}")

        return result

    except Exception as e:
        logger.error(f"Erro ao verificar {numero}: {e}")
        return {
            "monitoramento_id": monitoramento.get("id", ""),
            "numero_processo": numero,
            "tribunal": tribunal,
            "sucesso": False,
            "erro": str(e),
            "timestamp": datetime.now().isoformat(),
        }


async def run_once(monitoramentos: Optional[list] = None) -> dict:
    """
    Executa verificacao unica de todos os monitoramentos pendentes.
    Se monitoramentos nao for fornecido, usa dados mock/stdin.
    """
    if monitoramentos is None:
        # Tenta ler de stdin
        try:
            stdin_data = sys.stdin.read()
            if stdin_data.strip():
                monitoramentos = json.loads(stdin_data)
        except Exception:
            pass

    if not monitoramentos:
        # Sem dados - retorna status vazio
        return {
            "status": "sem_monitoramentos",
            "verificacoes": 0,
            "timestamp": datetime.now().isoformat(),
        }

    resultados = []
    total_novos = 0

    for mon in monitoramentos:
        # Verifica se esta na hora
        proxima = mon.get("proximaChecagem")
        if proxima:
            try:
                prox_dt = datetime.fromisoformat(str(proxima).replace("Z", "+00:00"))
                if prox_dt > datetime.now(prox_dt.tzinfo if prox_dt.tzinfo else None):
                    continue  # Ainda nao esta na hora
            except Exception:
                pass

        resultado = await check_monitoramento(mon)
        resultados.append(resultado)

        if resultado.get("novos_detectados", 0) > 0:
            total_novos += resultado["novos_detectados"]

        # Rate limiting - espera entre consultas
        await asyncio.sleep(2)

    return {
        "status": "concluido",
        "verificacoes_realizadas": len(resultados),
        "total_novos_andamentos": total_novos,
        "resultados": resultados,
        "timestamp": datetime.now().isoformat(),
    }


async def run_daemon(intervalo_minutos: int = 15):
    """
    Loop continuo - executa verificacoes periodicamente.
    Ideal para rodar como processo background.
    """
    logger.info(f"Worker daemon iniciado (intervalo: {intervalo_minutos}min)")

    while True:
        try:
            logger.info("Iniciando ciclo de verificacao...")
            # Em producao, busca monitoramentos do banco via API
            # Aqui simula com request HTTP
            import httpx
            async with httpx.AsyncClient() as client:
                resp = await client.get("http://localhost:5000/api/monitoramentos")
                if resp.status_code == 200:
                    monitoramentos = resp.json()
                    resultado = await run_once(monitoramentos)
                    logger.info(
                        f"Ciclo concluido: {resultado['verificacoes_realizadas']} verificacoes, "
                        f"{resultado['total_novos_andamentos']} novos andamentos"
                    )

                    # Atualiza monitoramentos com novos dados
                    for res in resultado.get("resultados", []):
                        if res.get("sucesso") and res.get("monitoramento_id"):
                            try:
                                await client.patch(
                                    f"http://localhost:5000/api/monitoramentos/{res['monitoramento_id']}",
                                    json={
                                        "contadorAndamentos": res.get("contador_atual", 0),
                                        "hashAndamentos": res.get("hash_atual", ""),
                                        "novosAndamentos": res.get("novos_detectados", 0),
                                        "ultimaChecagem": datetime.now().isoformat(),
                                        "proximaChecagem": (datetime.now() + timedelta(minutes=intervalo_minutos)).isoformat(),
                                    },
                                )
                            except Exception as e:
                                logger.error(f"Erro ao atualizar monitoramento: {e}")
                else:
                    logger.warning(f"Erro ao buscar monitoramentos: HTTP {resp.status_code}")

        except Exception as e:
            logger.error(f"Erro no ciclo do daemon: {e}")

        logger.info(f"Proximo ciclo em {intervalo_minutos} minutos...")
        await asyncio.sleep(intervalo_minutos * 60)


# CLI
async def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "uso": "python monitoring_worker.py <comando>",
            "comandos": {
                "run_once": "Executa verificacao unica (monitoramentos via stdin JSON)",
                "run_daemon": "[intervalo_min] - Loop continuo",
                "check": "<tribunal> <numero> - Verifica processo especifico",
            },
        }, ensure_ascii=False, indent=2))
        return

    cmd = sys.argv[1]

    if cmd == "run_once":
        resultado = await run_once()
        print(json.dumps(resultado, ensure_ascii=False, indent=2))

    elif cmd == "run_daemon":
        intervalo = int(sys.argv[2]) if len(sys.argv) > 2 else 15
        await run_daemon(intervalo)

    elif cmd == "check" and len(sys.argv) >= 4:
        tribunal = sys.argv[2].upper()
        numero = sys.argv[3]
        resultado = await check_monitoramento({
            "id": "manual",
            "numeroProcesso": numero,
            "tribunal": tribunal,
            "hashAndamentos": "",
            "contadorAndamentos": 0,
        })
        print(json.dumps(resultado, ensure_ascii=False, indent=2))

    else:
        print(json.dumps({"erro": f"Comando invalido: {cmd}"}))


if __name__ == "__main__":
    asyncio.run(main())
