"""
Orquestrador de scrapers - Roteia consultas para o scraper correto
baseado no tribunal/sistema detectado.

Estrategia:
1. Se tribunal suporta MNI e ha certificado => MNI
2. Se tribunal suporta MNI sem certificado => scraping da consulta publica
3. Senao => scraper do sistema correspondente (eSAJ, eProc, PROJUDI, etc.)
"""
import asyncio
import json
import logging
import sys
import os
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from base_scraper import ProcessoInfo, ResultadoBusca
from tribunal_mapeamento import (
    TRIBUNAIS, get_tribunal, get_sistema_para_tribunal,
    detectar_tribunal_por_cnj, Sistema, MetodoAcesso,
)

logger = logging.getLogger("iuria.orquestrador")


class ScraperOrchestrator:
    """
    Orquestrador central - 1 bot por sistema por tribunal.
    Detecta automaticamente o melhor metodo de consulta.
    """

    def __init__(self, cert_path: Optional[str] = None, cert_password: Optional[str] = None):
        self.cert_path = cert_path
        self.cert_password = cert_password
        self._scrapers_cache = {}

    def _get_scraper_for_tribunal(self, tribunal_sigla: str, grau: str = "1g"):
        """
        Retorna o scraper adequado para o tribunal+grau.
        Prioridade: MNI (com cert) > Scraping por sistema
        """
        cache_key = f"{tribunal_sigla}_{grau}"
        if cache_key in self._scrapers_cache:
            return self._scrapers_cache[cache_key]

        sistema_info = get_sistema_para_tribunal(tribunal_sigla, grau)
        if not sistema_info:
            raise ValueError(f"Nenhum sistema encontrado para {tribunal_sigla} ({grau})")

        sistema = sistema_info.sistema
        url = sistema_info.url_consulta

        # Tenta MNI primeiro se disponivel e ha certificado
        if sistema_info.suporta_mni and self.cert_path:
            try:
                from mni import get_mni_client
                client = get_mni_client(
                    tribunal_sigla,
                    cert_path=self.cert_path,
                    cert_password=self.cert_password,
                )
                self._scrapers_cache[cache_key] = ("mni", client)
                return ("mni", client)
            except Exception as e:
                logger.warning(f"MNI nao disponivel para {tribunal_sigla}: {e}")

        # Fallback: scraper do sistema
        scraper = None
        if sistema == Sistema.ESAJ:
            from sistemas.esaj_scraper import criar_esaj_scraper
            scraper = criar_esaj_scraper(tribunal_sigla, url, grau)
        elif sistema in (Sistema.EPROC, Sistema.EPROC_V2):
            from sistemas.eproc_scraper import EProcScraper
            from sistemas.base_sistema import ScraperConfig
            config = ScraperConfig(sistema="eproc", tribunal=tribunal_sigla, url_consulta=url, grau=grau)
            scraper = EProcScraper(config)
        elif sistema == Sistema.PJE or sistema == Sistema.PJE_LEGACY:
            from sistemas.pje_scraper import get_pje_scraper
            scraper = get_pje_scraper(tribunal_sigla, url, grau)
        elif sistema == Sistema.PROJUDI:
            from sistemas.projudi_scraper import PROJUDIScraper
            from sistemas.base_sistema import ScraperConfig
            config = ScraperConfig(sistema="projudi", tribunal=tribunal_sigla, url_consulta=url)
            scraper = PROJUDIScraper(config)
        elif sistema == Sistema.STF_PORTAL:
            from tribunais.stf import STFScraper
            scraper = STFScraper()
            self._scrapers_cache[cache_key] = ("stf_legacy", scraper)
            return ("stf_legacy", scraper)
        elif sistema == Sistema.STJ_PORTAL:
            from sistemas.stj_scraper import get_stj_scraper
            scraper = get_stj_scraper()
        elif sistema == Sistema.DCP:
            from sistemas.dcp_scraper import get_dcp_scraper
            scraper = get_dcp_scraper()
        else:
            # Generico PJe como fallback
            from sistemas.pje_scraper import get_pje_scraper
            scraper = get_pje_scraper(tribunal_sigla, url, grau)

        self._scrapers_cache[cache_key] = ("scraper", scraper)
        return ("scraper", scraper)

    async def consultar(self, tribunal: str, termo: str, tipo: str = "numero", grau: str = "1g") -> dict:
        """
        Consulta processo em qualquer tribunal.
        Detecta automaticamente o melhor metodo.
        """
        logger.info(f"Consultando {tribunal} ({grau}): {termo} [{tipo}]")

        try:
            scraper_type, scraper = self._get_scraper_for_tribunal(tribunal, grau)

            if scraper_type == "mni":
                # Consulta via MNI SOAP
                resultado = await scraper.consultar_processo(termo)
                return {
                    "tribunal": tribunal,
                    "metodo": "mni",
                    "sucesso": True,
                    "processo": resultado.to_dict() if resultado else None,
                    "total_encontrados": 1 if resultado else 0,
                }

            elif scraper_type == "stf_legacy":
                # STF scraper legado (classe diferente)
                if tipo == "numero":
                    resultado = await scraper.buscar_por_numero(termo)
                else:
                    resultado = await scraper.buscar_por_nome(termo)
                return resultado.to_dict()

            else:
                # Scraper de sistema
                if tipo == "numero":
                    resultado = await scraper.consultar(termo)
                else:
                    resultado = await scraper.buscar(termo)
                return resultado.to_dict()

        except Exception as e:
            logger.error(f"Erro ao consultar {tribunal}: {e}")
            return {
                "tribunal": tribunal,
                "tipo_busca": tipo,
                "termo_busca": termo,
                "erro": str(e),
                "processos": [],
                "total_encontrados": 0,
            }

    async def consultar_auto(self, numero_cnj: str) -> dict:
        """
        Consulta automatica: detecta tribunal pelo numero CNJ e consulta.
        """
        tribunal = detectar_tribunal_por_cnj(numero_cnj)
        if not tribunal:
            return {"erro": f"Nao foi possivel detectar tribunal para: {numero_cnj}"}

        logger.info(f"Auto-detectado: {tribunal.sigla} ({tribunal.nome})")
        resultado = await self.consultar(tribunal.sigla, numero_cnj, "numero")
        resultado["tribunal_detectado"] = {
            "sigla": tribunal.sigla,
            "nome": tribunal.nome,
            "tipo": tribunal.tipo,
            "uf": tribunal.uf,
        }
        return resultado

    def listar_tribunais_disponiveis(self) -> dict:
        """Lista todos os tribunais e seus scrapers disponivos"""
        result = {}
        for sigla, info in sorted(TRIBUNAIS.items()):
            sistemas = []
            for s in info.sistemas:
                sistemas.append({
                    "sistema": s.sistema.value,
                    "grau": s.grau,
                    "suporta_mni": s.suporta_mni,
                    "metodo_acesso": s.metodo_acesso.value,
                })
            result[sigla] = {
                "nome": info.nome,
                "tipo": info.tipo,
                "uf": info.uf,
                "sistemas": sistemas,
                "status": info.status.value,
            }
        return result


# Singleton global
_orchestrator = None

def get_orchestrator(**kwargs) -> ScraperOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = ScraperOrchestrator(**kwargs)
    return _orchestrator


# CLI
async def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "uso": "python orquestrador.py <comando> [args]",
            "comandos": {
                "listar": "Lista tribunais disponiveis",
                "consultar": "<tribunal> <termo> [tipo] [grau]",
                "auto": "<numero_cnj> - Detecta tribunal e consulta",
            }
        }, ensure_ascii=False, indent=2))
        return

    cmd = sys.argv[1]
    orch = get_orchestrator()

    if cmd == "listar":
        print(json.dumps(orch.listar_tribunais_disponiveis(), indent=2, ensure_ascii=False))
    elif cmd == "consultar" and len(sys.argv) >= 4:
        tribunal = sys.argv[2].upper()
        termo = sys.argv[3]
        tipo = sys.argv[4] if len(sys.argv) > 4 else "numero"
        grau = sys.argv[5] if len(sys.argv) > 5 else "1g"
        result = await orch.consultar(tribunal, termo, tipo, grau)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    elif cmd == "auto" and len(sys.argv) >= 3:
        result = await orch.consultar_auto(sys.argv[2])
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(json.dumps({"erro": "Comando invalido"}))


if __name__ == "__main__":
    asyncio.run(main())
