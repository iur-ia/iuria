"""
Parser para números de processo no formato CNJ
Formato: NNNNNNN-DD.AAAA.J.TR.OOOO

N = Número sequencial (7 dígitos)
D = Dígito verificador (2 dígitos)
A = Ano de ajuizamento (4 dígitos)
J = Segmento do Judiciário (1 dígito)
T = Tribunal (2 dígitos)
O = Origem/Vara (4 dígitos)
"""
import re
from typing import Optional, Dict, Tuple

# Mapeamento de segmentos
SEGMENTOS = {
    "1": "STF",
    "2": "CNJ",
    "3": "STJ",
    "4": "Justiça Federal",
    "5": "Justiça do Trabalho",
    "6": "Justiça Eleitoral",
    "7": "Justiça Militar da União",
    "8": "Justiça Estadual",
    "9": "Justiça Militar Estadual",
}

# Mapeamento de tribunais federais (segmento 4)
TRIBUNAIS_FEDERAIS = {
    "01": {"sigla": "TRF1", "nome": "Tribunal Regional Federal da 1ª Região", "url": "https://processual.trf1.jus.br"},
    "02": {"sigla": "TRF2", "nome": "Tribunal Regional Federal da 2ª Região", "url": "https://eproc.jfrj.jus.br"},
    "03": {"sigla": "TRF3", "nome": "Tribunal Regional Federal da 3ª Região", "url": "https://pje1g.trf3.jus.br"},
    "04": {"sigla": "TRF4", "nome": "Tribunal Regional Federal da 4ª Região", "url": "https://www.trf4.jus.br"},
    "05": {"sigla": "TRF5", "nome": "Tribunal Regional Federal da 5ª Região", "url": "https://pje.trf5.jus.br"},
    "06": {"sigla": "TRF6", "nome": "Tribunal Regional Federal da 6ª Região", "url": "https://portal.trf6.jus.br"},
}

# Mapeamento de tribunais estaduais (segmento 8)
TRIBUNAIS_ESTADUAIS = {
    "01": {"sigla": "TJAC", "nome": "Tribunal de Justiça do Acre", "uf": "AC"},
    "02": {"sigla": "TJAL", "nome": "Tribunal de Justiça de Alagoas", "uf": "AL"},
    "03": {"sigla": "TJAP", "nome": "Tribunal de Justiça do Amapá", "uf": "AP"},
    "04": {"sigla": "TJAM", "nome": "Tribunal de Justiça do Amazonas", "uf": "AM"},
    "05": {"sigla": "TJBA", "nome": "Tribunal de Justiça da Bahia", "uf": "BA"},
    "06": {"sigla": "TJCE", "nome": "Tribunal de Justiça do Ceará", "uf": "CE"},
    "07": {"sigla": "TJDFT", "nome": "Tribunal de Justiça do Distrito Federal", "uf": "DF"},
    "08": {"sigla": "TJES", "nome": "Tribunal de Justiça do Espírito Santo", "uf": "ES"},
    "09": {"sigla": "TJGO", "nome": "Tribunal de Justiça de Goiás", "uf": "GO"},
    "10": {"sigla": "TJMA", "nome": "Tribunal de Justiça do Maranhão", "uf": "MA"},
    "11": {"sigla": "TJMT", "nome": "Tribunal de Justiça de Mato Grosso", "uf": "MT"},
    "12": {"sigla": "TJMS", "nome": "Tribunal de Justiça de Mato Grosso do Sul", "uf": "MS"},
    "13": {"sigla": "TJMG", "nome": "Tribunal de Justiça de Minas Gerais", "uf": "MG"},
    "14": {"sigla": "TJPA", "nome": "Tribunal de Justiça do Pará", "uf": "PA"},
    "15": {"sigla": "TJPB", "nome": "Tribunal de Justiça da Paraíba", "uf": "PB"},
    "16": {"sigla": "TJPR", "nome": "Tribunal de Justiça do Paraná", "uf": "PR"},
    "17": {"sigla": "TJPE", "nome": "Tribunal de Justiça de Pernambuco", "uf": "PE"},
    "18": {"sigla": "TJPI", "nome": "Tribunal de Justiça do Piauí", "uf": "PI"},
    "19": {"sigla": "TJRJ", "nome": "Tribunal de Justiça do Rio de Janeiro", "uf": "RJ"},
    "20": {"sigla": "TJRN", "nome": "Tribunal de Justiça do Rio Grande do Norte", "uf": "RN"},
    "21": {"sigla": "TJRS", "nome": "Tribunal de Justiça do Rio Grande do Sul", "uf": "RS"},
    "22": {"sigla": "TJRO", "nome": "Tribunal de Justiça de Rondônia", "uf": "RO"},
    "23": {"sigla": "TJRR", "nome": "Tribunal de Justiça de Roraima", "uf": "RR"},
    "24": {"sigla": "TJSC", "nome": "Tribunal de Justiça de Santa Catarina", "uf": "SC"},
    "25": {"sigla": "TJSE", "nome": "Tribunal de Justiça de Sergipe", "uf": "SE"},
    "26": {"sigla": "TJSP", "nome": "Tribunal de Justiça de São Paulo", "uf": "SP"},
    "27": {"sigla": "TJTO", "nome": "Tribunal de Justiça do Tocantins", "uf": "TO"},
}

# Mapeamento de TRTs (segmento 5)
TRIBUNAIS_TRABALHO = {
    f"{i:02d}": {"sigla": f"TRT{i}", "nome": f"Tribunal Regional do Trabalho da {i}ª Região"}
    for i in range(1, 25)
}

# Classes processuais do STF
CLASSES_STF = [
    "AC", "ACO", "ADC", "ADI", "ADO", "ADPF", "AI", "AImp", "AO", "AOE",
    "AP", "AR", "ARE", "AS", "CC", "Cm", "EI", "EL", "EP", "Ext",
    "HC", "HD", "IF", "Inq", "MI", "MS", "PADM", "Pet", "PPE", "PSV",
    "RC", "Rcl", "RE", "RHC", "RHD", "RMI", "RMS", "RvC", "SE",
    "SIRDR", "SL", "SS", "STA", "STP", "TPA"
]

# Classes processuais do STJ
CLASSES_STJ = [
    "AgInt", "AgRg", "AREsp", "CC", "Ctr", "EAg", "EAREsp", "EDecl", "EDv",
    "EREsp", "ExSusp", "HC", "HD", "HDE", "IF", "MC", "MI", "MS", "PC",
    "Pet", "PSR", "Rcl", "REsp", "RHC", "RMS", "RO", "RPV", "SE", "SEC",
    "SL", "SS", "STA", "STP"
]


def parse_cnj(numero: str) -> Optional[Dict]:
    """
    Parse um número de processo no formato CNJ.
    Retorna um dicionário com os componentes ou None se inválido.
    
    Args:
        numero: Número do processo (ex: "0000001-23.2024.8.19.0001")
    
    Returns:
        Dict com: numero_sequencial, digito, ano, segmento, tribunal, origem, tribunal_info
    """
    # Remove espaços e caracteres extras
    numero = numero.strip()
    
    # Padrão CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
    pattern = r'^(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})$'
    match = re.match(pattern, numero)
    
    if not match:
        return None
    
    numero_seq, digito, ano, segmento, tribunal, origem = match.groups()
    
    # Obter informações do tribunal
    tribunal_info = None
    if segmento == "4":  # Justiça Federal
        tribunal_info = TRIBUNAIS_FEDERAIS.get(tribunal)
    elif segmento == "5":  # Justiça do Trabalho
        tribunal_info = TRIBUNAIS_TRABALHO.get(tribunal)
    elif segmento == "8":  # Justiça Estadual
        tribunal_info = TRIBUNAIS_ESTADUAIS.get(tribunal)
    
    return {
        "numero_original": numero,
        "numero_sequencial": numero_seq,
        "digito_verificador": digito,
        "ano": ano,
        "segmento": segmento,
        "segmento_nome": SEGMENTOS.get(segmento, "Desconhecido"),
        "tribunal_codigo": tribunal,
        "tribunal_info": tribunal_info,
        "origem": origem,
    }


def detectar_tribunal(numero: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Detecta automaticamente o tribunal pelo número do processo.
    
    Args:
        numero: Número do processo em qualquer formato
    
    Returns:
        Tupla (sigla_tribunal, formato) onde formato é 'cnj' ou 'classe'
    """
    numero = numero.strip().upper()
    
    # Tentar formato CNJ primeiro
    cnj_result = parse_cnj(numero.lower())
    if cnj_result:
        segmento = cnj_result["segmento"]
        tribunal_codigo = cnj_result["tribunal_codigo"]
        
        if segmento == "1":
            return ("STF", "cnj")
        elif segmento == "3":
            return ("STJ", "cnj")
        elif segmento == "4":
            info = TRIBUNAIS_FEDERAIS.get(tribunal_codigo)
            if info:
                return (info["sigla"], "cnj")
        elif segmento == "5":
            if tribunal_codigo == "00":
                return ("TST", "cnj")
            info = TRIBUNAIS_TRABALHO.get(tribunal_codigo)
            if info:
                return (info["sigla"], "cnj")
        elif segmento == "6":
            return ("TSE", "cnj")
        elif segmento == "7" or segmento == "9":
            return ("STM", "cnj")
        elif segmento == "8":
            info = TRIBUNAIS_ESTADUAIS.get(tribunal_codigo)
            if info:
                return (info["sigla"], "cnj")
        
        return (None, "cnj")
    
    # Tentar formato de classe do STF (ex: ADI 1, HC 123456)
    for classe in sorted(CLASSES_STF, key=len, reverse=True):
        pattern = rf'^{classe}\s*\d+$'
        if re.match(pattern, numero, re.IGNORECASE):
            return ("STF", "classe")
    
    # Tentar formato de classe do STJ (ex: REsp 1234567, HC 654321)
    for classe in sorted(CLASSES_STJ, key=len, reverse=True):
        pattern = rf'^{classe}\s*\d+$'
        if re.match(pattern, numero, re.IGNORECASE):
            return ("STJ", "classe")
    
    return (None, None)


def get_tribunal_info(sigla: str) -> Optional[Dict]:
    """
    Retorna informações completas do tribunal pela sigla.
    """
    sigla = sigla.upper()
    
    if sigla == "STF":
        return {
            "sigla": "STF",
            "nome": "Supremo Tribunal Federal",
            "url": "https://portal.stf.jus.br/processos",
            "sistema": "MNI 2.2.2 via MCP Tech Justica",
            "ativo": True
        }
    elif sigla == "STJ":
        return {
            "sigla": "STJ",
            "nome": "Superior Tribunal de Justiça",
            "url": "https://processo.stj.jus.br/processo/pesquisa",
            "sistema": "MNI via MCP Tech Justica",
            "ativo": True
        }
    elif sigla == "TST":
        return {
            "sigla": "TST",
            "nome": "Tribunal Superior do Trabalho",
            "url": "https://pje.tst.jus.br/consultaprocessual/",
            "sistema": "PJe MNI via MCP Tech Justica",
            "ativo": True
        }
    elif sigla == "TSE":
        return {
            "sigla": "TSE",
            "nome": "Tribunal Superior Eleitoral",
            "url": "https://pje.tse.jus.br/pje-web/",
            "sistema": "PJe MNI via MCP Tech Justica",
            "ativo": True
        }
    elif sigla == "STM":
        return {
            "sigla": "STM",
            "nome": "Superior Tribunal Militar",
            "url": "https://www.stm.jus.br/servicos-stm/processos",
            "sistema": "MNI via MCP Tech Justica",
            "ativo": True
        }
    
    # Buscar em TRFs
    for codigo, info in TRIBUNAIS_FEDERAIS.items():
        if info["sigla"] == sigla:
            return {**info, "sistema": "PJe/eProc MNI via MCP Tech Justica", "ativo": True}
    
    # Buscar em TRTs
    for codigo, info in TRIBUNAIS_TRABALHO.items():
        if info["sigla"] == sigla:
            return {**info, "sistema": "PJe MNI via MCP Tech Justica", "ativo": True}
    
    # Buscar em TJs
    for codigo, info in TRIBUNAIS_ESTADUAIS.items():
        if info["sigla"] == sigla:
            return {**info, "sistema": "PJe/eSAJ/eProc MNI via MCP Tech Justica", "ativo": True}
    
    return None


def listar_tribunais_ativos() -> list:
    """
    Retorna lista de tribunais com scraper implementado.
    Todos os 92 tribunais estão ativos via MCP Tech Justica.
    """
    return listar_todos_tribunais()


def listar_todos_tribunais() -> list:
    """
    Retorna lista de todos os tribunais mapeados.
    """
    tribunais = []
    
    # Superiores
    tribunais.append({"sigla": "STF", "nome": "Supremo Tribunal Federal", "segmento": "Superior", "ativo": True})
    tribunais.append({"sigla": "STJ", "nome": "Superior Tribunal de Justiça", "segmento": "Superior", "ativo": True})
    tribunais.append({"sigla": "TST", "nome": "Tribunal Superior do Trabalho", "segmento": "Superior", "ativo": True})
    tribunais.append({"sigla": "TSE", "nome": "Tribunal Superior Eleitoral", "segmento": "Superior", "ativo": True})
    tribunais.append({"sigla": "STM", "nome": "Superior Tribunal Militar", "segmento": "Superior", "ativo": True})
    
    # TRFs
    for codigo, info in TRIBUNAIS_FEDERAIS.items():
        tribunais.append({
            "sigla": info["sigla"],
            "nome": info["nome"],
            "segmento": "Federal",
            "codigo_cnj": f"4.{codigo}",
            "ativo": True
        })
    
    # TRTs
    for codigo, info in TRIBUNAIS_TRABALHO.items():
        tribunais.append({
            "sigla": info["sigla"],
            "nome": info["nome"],
            "segmento": "Trabalho",
            "codigo_cnj": f"5.{codigo}",
            "ativo": True
        })
    
    # TJs
    for codigo, info in TRIBUNAIS_ESTADUAIS.items():
        tribunais.append({
            "sigla": info["sigla"],
            "nome": info["nome"],
            "segmento": "Estadual",
            "uf": info["uf"],
            "codigo_cnj": f"8.{codigo}",
            "ativo": True
        })
    
    return tribunais


if __name__ == "__main__":
    # Testes
    print("=== Testes do Parser CNJ ===\n")
    
    # Teste formato CNJ
    numeros_cnj = [
        "0000001-23.2024.8.19.0001",  # TJRJ
        "1234567-89.2023.4.02.5101",  # TRF2
        "0001234-56.2022.8.26.0100",  # TJSP
    ]
    
    for num in numeros_cnj:
        result = parse_cnj(num)
        if result:
            print(f"Número: {num}")
            print(f"  Tribunal: {result['tribunal_info']['sigla'] if result['tribunal_info'] else 'Desconhecido'}")
            print(f"  Segmento: {result['segmento_nome']}")
            print()
    
    # Teste detecção automática
    print("=== Detecção Automática ===\n")
    
    numeros_teste = [
        "ADI 1",
        "PET 13350",
        "HC 123456",
        "REsp 1234567",
        "0000001-23.2024.8.19.0001",
        "1234567-89.2023.4.02.5101",
    ]
    
    for num in numeros_teste:
        tribunal, formato = detectar_tribunal(num)
        print(f"{num} -> Tribunal: {tribunal}, Formato: {formato}")
