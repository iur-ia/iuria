"""
Mapeamento Completo de Tribunais Brasileiros x Sistemas Processuais
iuria LexFutura - Base de conhecimento para roteamento de scrapers

Cada tribunal pode usar diferentes sistemas para diferentes tipos de processo:
- PJe (Processo Judicial Eletronico) - CNJ, maioria dos tribunais
- eSAJ (SAJ Softplan) - TJSP, TJSC, TJMS, TJCE, TJAM, TJBA
- eProc (Processo Eletronico) - TRF4, TJPR (parcial)
- PROJUDI - Varios TJs estaduais (legado, sendo migrado para PJe)
- SEI - Processos administrativos
- DCP - Sistema legado TJRJ
- Outros: TUCUJURIS (TJAP), THEMIS (TJRS legado), CRETA (TJRN legado)

Referencia CNJ segmentos:
  8 = Justica Estadual
  5 = Justica do Trabalho
  4 = Justica Federal
  6 = Justica Militar
  9 = Justica Militar Estadual
  1 = STF
  2 = CNJ
  3 = STJ
"""

import json
from dataclasses import dataclass, field, asdict
from typing import Optional
from enum import Enum


class Sistema(str, Enum):
    """Sistemas processuais eletronicos usados no Brasil"""
    PJE = "pje"                    # Processo Judicial Eletronico (CNJ)
    ESAJ = "esaj"                  # SAJ Softplan (TJSP e outros)
    EPROC = "eproc"                # Processo Eletronico (TRF4)
    PROJUDI = "projudi"            # PROJUDI (legado, migrando p/ PJe)
    SAJ5 = "saj5"                  # SAJ 5.0 (versao mais recente)
    TUCUJURIS = "tucujuris"        # TJAP sistema proprio
    DCP = "dcp"                    # Distribuicao e Controle Processual TJRJ (legado)
    THEMIS = "themis"              # TJRS sistema legado
    CRETA = "creta"                # Sistemas legados diversos
    SEI = "sei"                    # Sistema Eletronico de Informacoes
    STF_PORTAL = "stf_portal"      # Portal do STF (processo eletronico)
    STJ_PORTAL = "stj_portal"      # Portal do STJ
    TST_PORTAL = "tst_portal"      # Portal do TST
    TSE_PORTAL = "tse_portal"      # Portal do TSE
    STM_PORTAL = "stm_portal"      # Portal do STM
    EPROC_V2 = "eproc_v2"         # eProc versao 2 (TRFs)
    PJE_LEGACY = "pje_legacy"     # PJe versoes antigas
    CONSULTA_PUBLICA = "consulta_publica"  # Consulta publica generica


class StatusIntegracao(str, Enum):
    IMPLEMENTADO = "implementado"
    EM_DESENVOLVIMENTO = "em_desenvolvimento"
    PLANEJADO = "planejado"
    FUTURO = "futuro"
    SEM_SUPORTE = "sem_suporte"


class MetodoAcesso(str, Enum):
    MNI = "mni"                    # Modelo Nacional de Interoperabilidade (SOAP)
    SCRAPING = "scraping"          # Web scraping com Playwright/Selenium
    API_REST = "api_rest"          # API REST (quando disponivel)
    HIBRIDO = "hibrido"            # MNI + Scraping fallback


@dataclass
class SistemaTribunal:
    """Um sistema processual especifico de um tribunal"""
    sistema: Sistema
    url_consulta: str
    url_mni: Optional[str] = None          # URL do WSDL MNI
    tipos_processo: list[str] = field(default_factory=lambda: ["civel", "criminal"])
    grau: str = "1g"                       # 1g, 2g, turma_recursal, juizado
    metodo_acesso: MetodoAcesso = MetodoAcesso.SCRAPING
    suporta_mni: bool = False
    suporta_certificado_a1: bool = False
    observacoes: str = ""


@dataclass
class TribunalInfo:
    """Informacoes completas de um tribunal"""
    sigla: str
    nome: str
    tipo: str                              # Superior, Federal, Estadual, Trabalho, Militar, Eleitoral
    uf: Optional[str] = None               # UF (None para tribunais superiores)
    segmento_cnj: int = 8                  # Digito do segmento no numero CNJ
    codigo_cnj: int = 0                    # Codigo do tribunal no CNJ (2 digitos)
    sistemas: list[SistemaTribunal] = field(default_factory=list)
    status: StatusIntegracao = StatusIntegracao.FUTURO
    website: str = ""
    observacoes: str = ""


# ============================================================================
# MAPEAMENTO COMPLETO - TODOS OS TRIBUNAIS DO BRASIL
# ============================================================================

TRIBUNAIS: dict[str, TribunalInfo] = {}

# ======================== TRIBUNAIS SUPERIORES ========================

TRIBUNAIS["STF"] = TribunalInfo(
    sigla="STF", nome="Supremo Tribunal Federal", tipo="Superior",
    segmento_cnj=1, codigo_cnj=0,
    status=StatusIntegracao.IMPLEMENTADO,
    website="https://portal.stf.jus.br",
    observacoes="PRODUCAO: MCP Tech Justica via MNI 2.2.2 (consultarProcesso, consultarMovimentacao, baixarDocumento)",
    sistemas=[
        SistemaTribunal(
            sistema=Sistema.STF_PORTAL,
            url_consulta="https://portal.stf.jus.br/processos/listarProcessos.asp",
            url_mni="https://ws.stf.jus.br/servico-intercomunicacao-2.2.2/intercomunicacao",
            suporta_mni=True,
            suporta_certificado_a1=True,
            metodo_acesso=MetodoAcesso.HIBRIDO,
            tipos_processo=["constitucional", "recursal"],
            grau="unico",
            observacoes="MNI 2.2.2 - WSDL: https://ws.stf.jus.br/servico-intercomunicacao-2.2.2/intercomunicacao?wsdl | Contato: g_integracao@stf.jus.br | Resolucao/STF 693/2020",
        ),
    ],
)

TRIBUNAIS["STJ"] = TribunalInfo(
    sigla="STJ", nome="Superior Tribunal de Justica", tipo="Superior",
    segmento_cnj=3, codigo_cnj=0,
    status=StatusIntegracao.IMPLEMENTADO,
    website="https://www.stj.jus.br",
    observacoes="PRODUCAO: MCP Tech Justica via MNI + Scraping fallback",
    sistemas=[
        SistemaTribunal(
            sistema=Sistema.STJ_PORTAL,
            url_consulta="https://processo.stj.jus.br/processo/pesquisa/",
            metodo_acesso=MetodoAcesso.SCRAPING,
            tipos_processo=["recursal"],
            grau="unico",
        ),
    ],
)

TRIBUNAIS["TST"] = TribunalInfo(
    sigla="TST", nome="Tribunal Superior do Trabalho", tipo="Superior",
    segmento_cnj=5, codigo_cnj=0,
    status=StatusIntegracao.IMPLEMENTADO,
    website="https://www.tst.jus.br",
    sistemas=[
        SistemaTribunal(
            sistema=Sistema.PJE,
            url_consulta="https://pje.tst.jus.br/consultaprocessual/",
            url_mni="https://pje.tst.jus.br/mni/servicos/",
            suporta_mni=True,
            metodo_acesso=MetodoAcesso.HIBRIDO,
            grau="unico",
        ),
    ],
)

TRIBUNAIS["TSE"] = TribunalInfo(
    sigla="TSE", nome="Tribunal Superior Eleitoral", tipo="Superior",
    segmento_cnj=6, codigo_cnj=0,
    status=StatusIntegracao.IMPLEMENTADO,
    website="https://www.tse.jus.br",
    sistemas=[
        SistemaTribunal(
            sistema=Sistema.PJE,
            url_consulta="https://pje.tse.jus.br/pje-web/",
            suporta_mni=True,
            metodo_acesso=MetodoAcesso.HIBRIDO,
            grau="unico",
        ),
    ],
)

TRIBUNAIS["STM"] = TribunalInfo(
    sigla="STM", nome="Superior Tribunal Militar", tipo="Superior",
    segmento_cnj=9, codigo_cnj=0,
    status=StatusIntegracao.IMPLEMENTADO,
    website="https://www.stm.jus.br",
    sistemas=[
        SistemaTribunal(
            sistema=Sistema.STM_PORTAL,
            url_consulta="https://www.stm.jus.br/servicos-stm/processos",
            metodo_acesso=MetodoAcesso.SCRAPING,
            grau="unico",
        ),
    ],
)

# ======================== JUSTICA FEDERAL (TRFs) ========================

TRIBUNAIS["TRF1"] = TribunalInfo(
    sigla="TRF1", nome="TRF 1a Regiao", tipo="Federal", uf="DF",
    segmento_cnj=4, codigo_cnj=1,
    status=StatusIntegracao.IMPLEMENTADO,
    website="https://www.trf1.jus.br",
    observacoes="Cobre: AC, AM, AP, BA, DF, GO, MA, MG, MT, PA, PI, RO, RR, TO",
    sistemas=[
        SistemaTribunal(
            sistema=Sistema.PJE,
            url_consulta="https://pje1g.trf1.jus.br/consultapublica/",
            url_mni="https://pje1g.trf1.jus.br/mni/servicos/",
            suporta_mni=True, suporta_certificado_a1=True,
            metodo_acesso=MetodoAcesso.HIBRIDO, grau="1g",
        ),
        SistemaTribunal(
            sistema=Sistema.PJE,
            url_consulta="https://pje2g.trf1.jus.br/consultapublica/",
            url_mni="https://pje2g.trf1.jus.br/mni/servicos/",
            suporta_mni=True, suporta_certificado_a1=True,
            metodo_acesso=MetodoAcesso.HIBRIDO, grau="2g",
        ),
    ],
)

TRIBUNAIS["TRF2"] = TribunalInfo(
    sigla="TRF2", nome="TRF 2a Regiao", tipo="Federal", uf="RJ",
    segmento_cnj=4, codigo_cnj=2,
    status=StatusIntegracao.IMPLEMENTADO,
    website="https://www10.trf2.jus.br",
    observacoes="Cobre: RJ, ES. Usa eProc",
    sistemas=[
        SistemaTribunal(
            sistema=Sistema.EPROC,
            url_consulta="https://eproc.trf2.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica",
            suporta_mni=False,
            metodo_acesso=MetodoAcesso.SCRAPING, grau="1g",
        ),
        SistemaTribunal(
            sistema=Sistema.EPROC,
            url_consulta="https://eproc.trf2.jus.br/eproc/externo_controlador.php?acao=processo_consulta_publica",
            suporta_mni=False,
            metodo_acesso=MetodoAcesso.SCRAPING, grau="2g",
        ),
    ],
)

TRIBUNAIS["TRF3"] = TribunalInfo(
    sigla="TRF3", nome="TRF 3a Regiao", tipo="Federal", uf="SP",
    segmento_cnj=4, codigo_cnj=3,
    status=StatusIntegracao.IMPLEMENTADO,
    website="https://www.trf3.jus.br",
    observacoes="Cobre: SP, MS. Usa PJe",
    sistemas=[
        SistemaTribunal(
            sistema=Sistema.PJE,
            url_consulta="https://pje1g.trf3.jus.br/pje/ConsultaPublica/listView.seam",
            url_mni="https://pje1g.trf3.jus.br/mni/servicos/",
            suporta_mni=True, suporta_certificado_a1=True,
            metodo_acesso=MetodoAcesso.HIBRIDO, grau="1g",
        ),
        SistemaTribunal(
            sistema=Sistema.PJE,
            url_consulta="https://pje2g.trf3.jus.br/pje/ConsultaPublica/listView.seam",
            url_mni="https://pje2g.trf3.jus.br/mni/servicos/",
            suporta_mni=True, suporta_certificado_a1=True,
            metodo_acesso=MetodoAcesso.HIBRIDO, grau="2g",
        ),
    ],
)

TRIBUNAIS["TRF4"] = TribunalInfo(
    sigla="TRF4", nome="TRF 4a Regiao", tipo="Federal", uf="RS",
    segmento_cnj=4, codigo_cnj=4,
    status=StatusIntegracao.IMPLEMENTADO,
    website="https://www.trf4.jus.br",
    observacoes="Cobre: RS, PR, SC. Pioneiro do eProc",
    sistemas=[
        SistemaTribunal(
            sistema=Sistema.EPROC_V2,
            url_consulta="https://eproc.trf4.jus.br/eproc2trf4/",
            suporta_mni=False,
            metodo_acesso=MetodoAcesso.SCRAPING, grau="1g",
        ),
        SistemaTribunal(
            sistema=Sistema.EPROC_V2,
            url_consulta="https://eproc.trf4.jus.br/eproc2trf4/",
            suporta_mni=False,
            metodo_acesso=MetodoAcesso.SCRAPING, grau="2g",
        ),
    ],
)

TRIBUNAIS["TRF5"] = TribunalInfo(
    sigla="TRF5", nome="TRF 5a Regiao", tipo="Federal", uf="PE",
    segmento_cnj=4, codigo_cnj=5,
    status=StatusIntegracao.IMPLEMENTADO,
    website="https://www.trf5.jus.br",
    observacoes="Cobre: PE, CE, AL, SE, PB, RN. Usa PJe",
    sistemas=[
        SistemaTribunal(
            sistema=Sistema.PJE,
            url_consulta="https://pje.trf5.jus.br/pje/ConsultaPublica/listView.seam",
            url_mni="https://pje.trf5.jus.br/mni/servicos/",
            suporta_mni=True, suporta_certificado_a1=True,
            metodo_acesso=MetodoAcesso.HIBRIDO, grau="1g",
        ),
    ],
)

TRIBUNAIS["TRF6"] = TribunalInfo(
    sigla="TRF6", nome="TRF 6a Regiao", tipo="Federal", uf="MG",
    segmento_cnj=4, codigo_cnj=6,
    status=StatusIntegracao.IMPLEMENTADO,
    website="https://www.trf6.jus.br",
    observacoes="Cobre: MG. Criado em 2022. Usa PJe",
    sistemas=[
        SistemaTribunal(
            sistema=Sistema.PJE,
            url_consulta="https://pje1g.trf6.jus.br/consultapublica/",
            url_mni="https://pje1g.trf6.jus.br/mni/servicos/",
            suporta_mni=True,
            metodo_acesso=MetodoAcesso.HIBRIDO, grau="1g",
        ),
    ],
)

# ======================== JUSTICA ESTADUAL (TJs) ========================

# Dados de sistemas por UF baseados em levantamento CNJ 2024/2025
_TJS_DATA = {
    # sigla: (nome, uf, cod_cnj, sistemas_config)
    "TJAC": ("TJ Acre", "AC", 1, [
        (Sistema.PJE, "https://pje.tjac.jus.br/consultapublica/", True, "1g"),
        (Sistema.PROJUDI, "https://projudi.tjac.jus.br/", False, "1g"),
    ]),
    "TJAL": ("TJ Alagoas", "AL", 2, [
        (Sistema.PJE, "https://pje.tjal.jus.br/consultapublica/", True, "1g"),
    ]),
    "TJAM": ("TJ Amazonas", "AM", 4, [
        (Sistema.ESAJ, "https://consultasaj.tjam.jus.br/cpopg/open.do", False, "1g"),
        (Sistema.PJE, "https://pje.tjam.jus.br/consultapublica/", True, "1g"),
    ]),
    "TJAP": ("TJ Amapa", "AP", 3, [
        (Sistema.TUCUJURIS, "https://consultas.tjap.jus.br/tucujuris/", False, "1g"),
        (Sistema.PJE, "https://pje.tjap.jus.br/consultapublica/", True, "1g"),
    ]),
    "TJBA": ("TJ Bahia", "BA", 5, [
        (Sistema.ESAJ, "https://esaj.tjba.jus.br/cpopg/open.do", False, "1g"),
        (Sistema.PJE, "https://pje.tjba.jus.br/consultapublica/", True, "1g"),
    ]),
    "TJCE": ("TJ Ceara", "CE", 6, [
        (Sistema.ESAJ, "https://esaj.tjce.jus.br/cpopg/open.do", False, "1g"),
        (Sistema.PJE, "https://pje.tjce.jus.br/consultapublica/", True, "1g"),
    ]),
    "TJDFT": ("TJ Distrito Federal e Territorios", "DF", 7, [
        (Sistema.PJE, "https://pje.tjdft.jus.br/consultapublica/", True, "1g"),
    ]),
    "TJES": ("TJ Espirito Santo", "ES", 8, [
        (Sistema.PJE, "https://pje.tjes.jus.br/pje/ConsultaPublica/listView.seam", True, "1g"),
    ]),
    "TJGO": ("TJ Goias", "GO", 9, [
        (Sistema.PJE, "https://pje.tjgo.jus.br/consultapublica/", True, "1g"),
        (Sistema.PROJUDI, "https://projudi.tjgo.jus.br/", False, "1g"),
    ]),
    "TJMA": ("TJ Maranhao", "MA", 10, [
        (Sistema.PJE, "https://pje.tjma.jus.br/consultapublica/", True, "1g"),
    ]),
    "TJMG": ("TJ Minas Gerais", "MG", 13, [
        (Sistema.PJE, "https://pje.tjmg.jus.br/pje/ConsultaPublica/listView.seam", True, "1g"),
        (Sistema.PROJUDI, "https://projudi.tjmg.jus.br/", False, "1g"),
    ]),
    "TJMS": ("TJ Mato Grosso do Sul", "MS", 12, [
        (Sistema.ESAJ, "https://esaj.tjms.jus.br/cpopg5/open.do", False, "1g"),
        (Sistema.PJE, "https://pje.tjms.jus.br/consultapublica/", True, "1g"),
    ]),
    "TJMT": ("TJ Mato Grosso", "MT", 11, [
        (Sistema.PJE, "https://pje.tjmt.jus.br/consultapublica/", True, "1g"),
    ]),
    "TJPA": ("TJ Para", "PA", 14, [
        (Sistema.PJE, "https://pje.tjpa.jus.br/consultapublica/", True, "1g"),
        (Sistema.PROJUDI, "https://projudi.tjpa.jus.br/", False, "1g"),
    ]),
    "TJPB": ("TJ Paraiba", "PB", 15, [
        (Sistema.PJE, "https://pje.tjpb.jus.br/consultapublica/", True, "1g"),
    ]),
    "TJPE": ("TJ Pernambuco", "PE", 17, [
        (Sistema.PJE, "https://pje.tjpe.jus.br/consultapublica/", True, "1g"),
    ]),
    "TJPI": ("TJ Piaui", "PI", 18, [
        (Sistema.PJE, "https://pje.tjpi.jus.br/consultapublica/", True, "1g"),
    ]),
    "TJPR": ("TJ Parana", "PR", 16, [
        (Sistema.PROJUDI, "https://projudi.tjpr.jus.br/projudi/", False, "1g"),
        (Sistema.PJE, "https://pje.tjpr.jus.br/consultapublica/", True, "1g"),
        (Sistema.EPROC, "https://eproc1g.tjpr.jus.br/eproc/externo_controlador.php", False, "1g"),
    ]),
    "TJRJ": ("TJ Rio de Janeiro", "RJ", 19, [
        (Sistema.PJE, "https://pje.tjrj.jus.br/consultapublica/", True, "1g"),
        (Sistema.DCP, "https://www3.tjrj.jus.br/consultaprocessual/", False, "1g"),
    ]),
    "TJRN": ("TJ Rio Grande do Norte", "RN", 20, [
        (Sistema.PJE, "https://pje.tjrn.jus.br/consultapublica/", True, "1g"),
    ]),
    "TJRO": ("TJ Rondonia", "RO", 22, [
        (Sistema.PJE, "https://pje.tjro.jus.br/consultapublica/", True, "1g"),
    ]),
    "TJRR": ("TJ Roraima", "RR", 23, [
        (Sistema.PJE, "https://pje.tjrr.jus.br/consultapublica/", True, "1g"),
    ]),
    "TJRS": ("TJ Rio Grande do Sul", "RS", 21, [
        (Sistema.PJE, "https://pje.tjrs.jus.br/consultapublica/", True, "1g"),
        (Sistema.THEMIS, "https://www.tjrs.jus.br/site_php/consulta/", False, "1g"),
        (Sistema.EPROC_V2, "https://eproc1g.tjrs.jus.br/eproc/", False, "1g"),
    ]),
    "TJSC": ("TJ Santa Catarina", "SC", 24, [
        (Sistema.ESAJ, "https://esaj.tjsc.jus.br/cpopg/open.do", False, "1g"),
        (Sistema.PJE, "https://pje.tjsc.jus.br/consultapublica/", True, "1g"),
        (Sistema.EPROC, "https://eproc1g.tjsc.jus.br/eproc/", False, "1g"),
    ]),
    "TJSE": ("TJ Sergipe", "SE", 25, [
        (Sistema.PJE, "https://pje.tjse.jus.br/consultapublica/", True, "1g"),
    ]),
    "TJSP": ("TJ Sao Paulo", "SP", 26, [
        (Sistema.ESAJ, "https://esaj.tjsp.jus.br/cpopg/open.do", False, "1g"),
        (Sistema.ESAJ, "https://esaj.tjsp.jus.br/cposg/open.do", False, "2g"),
        (Sistema.PJE, "https://pje.tjsp.jus.br/consultapublica/", True, "1g"),
    ]),
    "TJTO": ("TJ Tocantins", "TO", 27, [
        (Sistema.PJE, "https://pje.tjto.jus.br/consultapublica/", True, "1g"),
    ]),
}

# Build TJ entries
for sigla, (nome, uf, cod, sistemas_config) in _TJS_DATA.items():
    sistemas_list = []
    for (sis, url, mni, grau) in sistemas_config:
        url_mni = url.replace("consultapublica/", "mni/servicos/").replace("ConsultaPublica/listView.seam", "mni/servicos/") if mni else None
        sistemas_list.append(SistemaTribunal(
            sistema=sis, url_consulta=url, url_mni=url_mni,
            suporta_mni=mni, suporta_certificado_a1=mni,
            metodo_acesso=MetodoAcesso.HIBRIDO if mni else MetodoAcesso.SCRAPING,
            grau=grau,
        ))
    TRIBUNAIS[sigla] = TribunalInfo(
        sigla=sigla, nome=nome, tipo="Estadual", uf=uf,
        segmento_cnj=8, codigo_cnj=cod,
        status=StatusIntegracao.IMPLEMENTADO,
        website=f"https://www.{sigla.lower()}.jus.br",
        observacoes="PRODUCAO: MCP Tech Justica via MNI + Scraping fallback",
        sistemas=sistemas_list,
    )

# ======================== JUSTICA DO TRABALHO (TRTs) ========================

_TRTS_DATA = {
    "TRT1":  ("TRT 1a Regiao", "RJ", 1, "https://pje.trt1.jus.br/consultaprocessual/"),
    "TRT2":  ("TRT 2a Regiao", "SP", 2, "https://pje.trt2.jus.br/consultaprocessual/"),
    "TRT3":  ("TRT 3a Regiao", "MG", 3, "https://pje.trt3.jus.br/consultaprocessual/"),
    "TRT4":  ("TRT 4a Regiao", "RS", 4, "https://pje.trt4.jus.br/consultaprocessual/"),
    "TRT5":  ("TRT 5a Regiao", "BA", 5, "https://pje.trt5.jus.br/consultaprocessual/"),
    "TRT6":  ("TRT 6a Regiao", "PE", 6, "https://pje.trt6.jus.br/consultaprocessual/"),
    "TRT7":  ("TRT 7a Regiao", "CE", 7, "https://pje.trt7.jus.br/consultaprocessual/"),
    "TRT8":  ("TRT 8a Regiao", "PA", 8, "https://pje.trt8.jus.br/consultaprocessual/"),
    "TRT9":  ("TRT 9a Regiao", "PR", 9, "https://pje.trt9.jus.br/consultaprocessual/"),
    "TRT10": ("TRT 10a Regiao", "DF", 10, "https://pje.trt10.jus.br/consultaprocessual/"),
    "TRT11": ("TRT 11a Regiao", "AM", 11, "https://pje.trt11.jus.br/consultaprocessual/"),
    "TRT12": ("TRT 12a Regiao", "SC", 12, "https://pje.trt12.jus.br/consultaprocessual/"),
    "TRT13": ("TRT 13a Regiao", "PB", 13, "https://pje.trt13.jus.br/consultaprocessual/"),
    "TRT14": ("TRT 14a Regiao", "RO", 14, "https://pje.trt14.jus.br/consultaprocessual/"),
    "TRT15": ("TRT 15a Regiao", "SP", 15, "https://pje.trt15.jus.br/consultaprocessual/"),
    "TRT16": ("TRT 16a Regiao", "MA", 16, "https://pje.trt16.jus.br/consultaprocessual/"),
    "TRT17": ("TRT 17a Regiao", "ES", 17, "https://pje.trt17.jus.br/consultaprocessual/"),
    "TRT18": ("TRT 18a Regiao", "GO", 18, "https://pje.trt18.jus.br/consultaprocessual/"),
    "TRT19": ("TRT 19a Regiao", "AL", 19, "https://pje.trt19.jus.br/consultaprocessual/"),
    "TRT20": ("TRT 20a Regiao", "SE", 20, "https://pje.trt20.jus.br/consultaprocessual/"),
    "TRT21": ("TRT 21a Regiao", "RN", 21, "https://pje.trt21.jus.br/consultaprocessual/"),
    "TRT22": ("TRT 22a Regiao", "PI", 22, "https://pje.trt22.jus.br/consultaprocessual/"),
    "TRT23": ("TRT 23a Regiao", "MT", 23, "https://pje.trt23.jus.br/consultaprocessual/"),
    "TRT24": ("TRT 24a Regiao", "MS", 24, "https://pje.trt24.jus.br/consultaprocessual/"),
}

for sigla, (nome, uf, cod, url) in _TRTS_DATA.items():
    TRIBUNAIS[sigla] = TribunalInfo(
        sigla=sigla, nome=nome, tipo="Trabalho", uf=uf,
        segmento_cnj=5, codigo_cnj=cod,
        status=StatusIntegracao.IMPLEMENTADO,
        website=f"https://www.{sigla.lower()}.jus.br",
        observacoes="PRODUCAO: MCP Tech Justica via MNI + Scraping fallback",
        sistemas=[
            SistemaTribunal(
                sistema=Sistema.PJE,
                url_consulta=url,
                url_mni=url.replace("consultaprocessual/", "mni/servicos/"),
                suporta_mni=True, suporta_certificado_a1=True,
                metodo_acesso=MetodoAcesso.HIBRIDO, grau="1g",
                tipos_processo=["trabalhista"],
            ),
        ],
    )


# ======================== JUSTICA ELEITORAL (TREs) ========================

_TRES_DATA = {
    "TRE-AC": ("TRE Acre", "AC", 1),
    "TRE-AL": ("TRE Alagoas", "AL", 2),
    "TRE-AM": ("TRE Amazonas", "AM", 4),
    "TRE-AP": ("TRE Amapa", "AP", 3),
    "TRE-BA": ("TRE Bahia", "BA", 5),
    "TRE-CE": ("TRE Ceara", "CE", 6),
    "TRE-DF": ("TRE Distrito Federal", "DF", 7),
    "TRE-ES": ("TRE Espirito Santo", "ES", 8),
    "TRE-GO": ("TRE Goias", "GO", 9),
    "TRE-MA": ("TRE Maranhao", "MA", 10),
    "TRE-MG": ("TRE Minas Gerais", "MG", 13),
    "TRE-MS": ("TRE Mato Grosso do Sul", "MS", 12),
    "TRE-MT": ("TRE Mato Grosso", "MT", 11),
    "TRE-PA": ("TRE Para", "PA", 14),
    "TRE-PB": ("TRE Paraiba", "PB", 15),
    "TRE-PE": ("TRE Pernambuco", "PE", 17),
    "TRE-PI": ("TRE Piaui", "PI", 18),
    "TRE-PR": ("TRE Parana", "PR", 16),
    "TRE-RJ": ("TRE Rio de Janeiro", "RJ", 19),
    "TRE-RN": ("TRE Rio Grande do Norte", "RN", 20),
    "TRE-RO": ("TRE Rondonia", "RO", 22),
    "TRE-RR": ("TRE Roraima", "RR", 23),
    "TRE-RS": ("TRE Rio Grande do Sul", "RS", 21),
    "TRE-SC": ("TRE Santa Catarina", "SC", 24),
    "TRE-SE": ("TRE Sergipe", "SE", 25),
    "TRE-SP": ("TRE Sao Paulo", "SP", 26),
    "TRE-TO": ("TRE Tocantins", "TO", 27),
}

for sigla, (nome, uf, cod) in _TRES_DATA.items():
    sigla_clean = sigla.replace("-", "")
    url_pje = f"https://pje.{sigla_clean.lower()}.jus.br/pje-web/"
    TRIBUNAIS[sigla] = TribunalInfo(
        sigla=sigla, nome=nome, tipo="Eleitoral", uf=uf,
        segmento_cnj=6, codigo_cnj=cod,
        status=StatusIntegracao.IMPLEMENTADO,
        website=f"https://www.{sigla_clean.lower()}.jus.br",
        observacoes="PRODUCAO: MCP Tech Justica via MNI + Scraping fallback",
        sistemas=[
            SistemaTribunal(
                sistema=Sistema.PJE,
                url_consulta=url_pje,
                suporta_mni=True,
                metodo_acesso=MetodoAcesso.HIBRIDO, grau="1g",
                tipos_processo=["eleitoral"],
            ),
        ],
    )

# ======================== JUSTICA MILITAR (TJMs / Auditorias) ========================

TRIBUNAIS["TJMMG"] = TribunalInfo(
    sigla="TJMMG", nome="TJ Militar de Minas Gerais", tipo="Militar Estadual", uf="MG",
    segmento_cnj=9, codigo_cnj=13,
    status=StatusIntegracao.IMPLEMENTADO,
    website="https://www.tjmmg.jus.br",
    observacoes="PRODUCAO: MCP Tech Justica via MNI + Scraping fallback",
    sistemas=[
        SistemaTribunal(
            sistema=Sistema.PJE,
            url_consulta="https://pje.tjmmg.jus.br/consultapublica/",
            suporta_mni=True,
            metodo_acesso=MetodoAcesso.HIBRIDO, grau="1g",
            tipos_processo=["militar"],
        ),
    ],
)

TRIBUNAIS["TJMRS"] = TribunalInfo(
    sigla="TJMRS", nome="TJ Militar do Rio Grande do Sul", tipo="Militar Estadual", uf="RS",
    segmento_cnj=9, codigo_cnj=21,
    status=StatusIntegracao.IMPLEMENTADO,
    website="https://www.tjmrs.jus.br",
    observacoes="PRODUCAO: MCP Tech Justica via MNI + Scraping fallback",
    sistemas=[
        SistemaTribunal(
            sistema=Sistema.PJE,
            url_consulta="https://pje.tjmrs.jus.br/consultapublica/",
            suporta_mni=True,
            metodo_acesso=MetodoAcesso.HIBRIDO, grau="1g",
            tipos_processo=["militar"],
        ),
    ],
)

TRIBUNAIS["TJMSP"] = TribunalInfo(
    sigla="TJMSP", nome="TJ Militar de Sao Paulo", tipo="Militar Estadual", uf="SP",
    segmento_cnj=9, codigo_cnj=26,
    status=StatusIntegracao.IMPLEMENTADO,
    website="https://www.tjmsp.jus.br",
    observacoes="PRODUCAO: MCP Tech Justica via MNI + Scraping fallback",
    sistemas=[
        SistemaTribunal(
            sistema=Sistema.PJE,
            url_consulta="https://pje.tjmsp.jus.br/consultapublica/",
            suporta_mni=True,
            metodo_acesso=MetodoAcesso.HIBRIDO, grau="1g",
            tipos_processo=["militar"],
        ),
    ],
)

# ======================== STATUS UPDATES ========================
# Mark implemented/in-development based on existing scrapers

# ======================== ALL TRIBUNALS NOW IN PRODUCTION ========================
# MCP Tech Justica provides access to ALL 92 tribunals via MNI
# STF uses MNI 2.2.2 (ws.stf.jus.br/servico-intercomunicacao-2.2.2)
# ALL 92 tribunals are now IMPLEMENTADO (production-ready)

for sigla in TRIBUNAIS:
    TRIBUNAIS[sigla].status = StatusIntegracao.IMPLEMENTADO


# ============================================================================
# IMPLEMENTATION PLAN - Tribunal x System Strategy Matrix
# ============================================================================

IMPLEMENTATION_PLAN = {
    "phase_0_mcp_techjustica": {
        "description": "MCP Tech Justica - PRODUCAO - 92 tribunais via MNI (dados completos)",
        "status": "IMPLEMENTADO",
        "tribunais": "STF, STJ, TST, TSE, STM, TRF1-TRF6, 27 TJs, 24 TRTs, 27 TREs, 3 TJMs",
        "total": 92,
        "api": "https://mcp.techjustica.com.br/v1",
        "metodo": "JSON-RPC 2.0 via MNI (Modelo Nacional de Interoperabilidade)",
        "nota": "STF incluido via MNI 2.2.2 (ws.stf.jus.br). Retorna capa, partes, movimentacoes, documentos.",
    },
    "phase_0_stf_mni": {
        "description": "STF MNI 2.2.2 - PRODUCAO - via MCP Tech Justica",
        "status": "IMPLEMENTADO",
        "tribunais": ["STF"],
        "total": 1,
        "metodo": "MNI SOAP 2.2.2 via MCP",
        "endpoints": {
            "producao": "https://ws.stf.jus.br/servico-intercomunicacao-2.2.2/intercomunicacao",
            "wsdl": "https://ws.stf.jus.br/servico-intercomunicacao-2.2.2/intercomunicacao?wsdl",
            "homologacao": "http://wsh.stf.jus.br/servico-intercomunicacao-2.2.2/intercomunicacao",
            "testes": "http://wst.stf.jus.br/servico-intercomunicacao-2.2.2/intercomunicacao",
        },
        "nota": "STF adota MNI como protocolo de comunicacao (Resolucao/STF 693/2020). Contato: g_integracao@stf.jus.br",
    },
    "phase_1_implemented": {
        "description": "Todos os 92 tribunais - PRODUCAO",
        "status": "IMPLEMENTADO",
        "tribunais": list(TRIBUNAIS.keys()),
        "total": len(TRIBUNAIS),
        "cascata": [
            "1. MCP Tech Justica via MNI (92 tribunais - dados completos com partes, capa, movimentacoes)",
            "2. MNI SOAP direto (certificado A1, fallback)",
            "3. Scraping resiliente (Playwright stealth)",
        ],
    },
    "phase_2_esaj": {
        "description": "Tribunais eSAJ (Softplan) - mesmo scraper base",
        "tribunais": ["TJBA", "TJCE", "TJAM", "TJMS", "TJSC"],
        "strategy": "esaj_scraper com anti-detection",
        "fallback": "PJe MNI quando disponivel",
    },
    "phase_3_pje_mni": {
        "description": "Tribunais PJe com MNI SOAP - maior cobertura",
        "tribunais": [
            "TRF1", "TRF3", "TRF5", "TJAL", "TJDFT", "TJES", "TJGO", "TJMA",
            "TJMG", "TJMT", "TJPB", "TJPE", "TJPI", "TJRN", "TJRO", "TJRR",
            "TJSE", "TJTO", "TJAP", "TJAC", "TJBA", "TJCE", "TJPA",
        ],
        "strategy": "MNI mTLS (cert A1) -> MNI publico -> PJe scraping",
        "fallback": "scraping com pje_scraper + anti_detection",
    },
    "phase_4_eproc": {
        "description": "Tribunais eProc/eProc v2",
        "tribunais": ["TRF2", "TRF4", "TJPR", "TJRS", "TJSC"],
        "strategy": "eproc_scraper com anti-detection",
        "fallback": "PJe MNI (TJPR, TJRS, TJSC)",
    },
    "phase_5_trabalho": {
        "description": "Justica do Trabalho - TRTs (PJe)",
        "tribunais": [f"TRT{i}" for i in range(1, 25)] + ["TST"],
        "strategy": "PJe MNI SOAP -> scraping PJe",
        "fallback": "consulta publica",
    },
    "phase_6_eleitoral_militar": {
        "description": "Justica Eleitoral e Militar",
        "tribunais": list(_TRES_DATA.keys()) + ["TSE", "STM", "TJMMG", "TJMRS", "TJMSP"],
        "strategy": "PJe MNI -> scraping portal",
        "fallback": "consulta publica",
    },
}


# ============================================================================
# FUNCOES UTILITARIAS
# ============================================================================

def get_tribunal(sigla: str) -> TribunalInfo | None:
    """Busca tribunal pela sigla"""
    return TRIBUNAIS.get(sigla.upper())


def get_tribunais_por_sistema(sistema: Sistema) -> list[TribunalInfo]:
    """Lista tribunais que usam determinado sistema"""
    result = []
    for t in TRIBUNAIS.values():
        for s in t.sistemas:
            if s.sistema == sistema:
                result.append(t)
                break
    return result


def get_tribunais_com_mni() -> list[TribunalInfo]:
    """Lista tribunais com suporte a MNI"""
    result = []
    for t in TRIBUNAIS.values():
        for s in t.sistemas:
            if s.suporta_mni:
                result.append(t)
                break
    return result


def get_tribunais_por_uf(uf: str) -> list[TribunalInfo]:
    """Lista tribunais de determinada UF"""
    return [t for t in TRIBUNAIS.values() if t.uf == uf.upper()]


def get_tribunais_por_tipo(tipo: str) -> list[TribunalInfo]:
    """Lista tribunais por tipo (Estadual, Federal, etc)"""
    return [t for t in TRIBUNAIS.values() if t.tipo.lower() == tipo.lower()]


def get_sistema_para_tribunal(sigla: str, grau: str = "1g") -> SistemaTribunal | None:
    """Retorna o sistema preferencial para um tribunal+grau"""
    tribunal = get_tribunal(sigla)
    if not tribunal:
        return None
    # Prioridade: MNI > PJe > eSAJ > eProc > outros
    mni_sistemas = [s for s in tribunal.sistemas if s.suporta_mni and s.grau == grau]
    if mni_sistemas:
        return mni_sistemas[0]
    grau_sistemas = [s for s in tribunal.sistemas if s.grau == grau]
    if grau_sistemas:
        return grau_sistemas[0]
    # Fallback: qualquer sistema
    return tribunal.sistemas[0] if tribunal.sistemas else None


def detectar_tribunal_por_cnj(numero_cnj: str) -> TribunalInfo | None:
    """Detecta tribunal a partir do numero CNJ completo"""
    # Formato: NNNNNNN-DD.AAAA.J.TT.OOOO
    limpo = numero_cnj.replace(".", "").replace("-", "").replace(" ", "")
    if len(limpo) != 20:
        return None
    segmento = int(limpo[13])  # J
    tribunal_cod = int(limpo[14:16])  # TT
    
    for t in TRIBUNAIS.values():
        if t.segmento_cnj == segmento and t.codigo_cnj == tribunal_cod:
            return t
    return None


def exportar_mapeamento_json() -> str:
    """Exporta mapeamento completo em JSON"""
    data = {}
    for sigla, t in sorted(TRIBUNAIS.items()):
        data[sigla] = {
            "sigla": t.sigla,
            "nome": t.nome,
            "tipo": t.tipo,
            "uf": t.uf,
            "segmento_cnj": t.segmento_cnj,
            "codigo_cnj": t.codigo_cnj,
            "status": t.status.value,
            "website": t.website,
            "observacoes": t.observacoes,
            "sistemas": [
                {
                    "sistema": s.sistema.value,
                    "url_consulta": s.url_consulta,
                    "url_mni": s.url_mni,
                    "suporta_mni": s.suporta_mni,
                    "suporta_certificado_a1": s.suporta_certificado_a1,
                    "metodo_acesso": s.metodo_acesso.value,
                    "grau": s.grau,
                    "tipos_processo": s.tipos_processo,
                }
                for s in t.sistemas
            ],
        }
    return json.dumps(data, indent=2, ensure_ascii=False)


def resumo_mapeamento() -> dict:
    """Retorna resumo estatistico do mapeamento"""
    total = len(TRIBUNAIS)
    por_tipo = {}
    por_sistema = {}
    com_mni = 0
    for t in TRIBUNAIS.values():
        por_tipo[t.tipo] = por_tipo.get(t.tipo, 0) + 1
        for s in t.sistemas:
            por_sistema[s.sistema.value] = por_sistema.get(s.sistema.value, 0) + 1
            if s.suporta_mni:
                com_mni += 1
    return {
        "total_tribunais": total,
        "por_tipo": por_tipo,
        "por_sistema": por_sistema,
        "com_mni": com_mni,
    }


# CLI
if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "json":
        print(exportar_mapeamento_json())
    elif len(sys.argv) > 1 and sys.argv[1] == "resumo":
        print(json.dumps(resumo_mapeamento(), indent=2, ensure_ascii=False))
    elif len(sys.argv) > 2 and sys.argv[1] == "tribunal":
        t = get_tribunal(sys.argv[2])
        if t:
            print(json.dumps(asdict(t), indent=2, ensure_ascii=False, default=str))
        else:
            print(json.dumps({"error": f"Tribunal {sys.argv[2]} nao encontrado"}))
    elif len(sys.argv) > 2 and sys.argv[1] == "cnj":
        t = detectar_tribunal_por_cnj(sys.argv[2])
        if t:
            print(json.dumps({"sigla": t.sigla, "nome": t.nome, "tipo": t.tipo, "uf": t.uf}, ensure_ascii=False))
        else:
            print(json.dumps({"error": "Nao foi possivel detectar tribunal"}))
    else:
        r = resumo_mapeamento()
        print(f"Total tribunais mapeados: {r['total_tribunais']}")
        print(f"Com MNI: {r['com_mni']} sistemas")
        print(f"Por tipo: {r['por_tipo']}")
        print(f"Por sistema: {r['por_sistema']}")
