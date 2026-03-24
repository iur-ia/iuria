"""
Motor de Prazos Processuais - iuria LexFutura
Calcula prazos automaticamente a partir de andamentos processuais.
Regras baseadas no CPC (Codigo de Processo Civil brasileiro).
"""
from datetime import date, timedelta
from typing import List, Optional, Dict, Tuple
import re
import json
import sys
import os

# Fix imports for both module and standalone execution
try:
    from .feriados import eh_dia_util, proximo_dia_util, obter_feriados_ano
except ImportError:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from prazos.feriados import eh_dia_util, proximo_dia_util, obter_feriados_ano


# ==================== REGRAS DE PRAZOS CPC ====================
# Mapeamento de palavras-chave para tipo de prazo e dias
REGRAS_PRAZOS: List[Dict] = [
    # Contestacao
    {
        "palavras": ["contestação", "contestacao", "contestar", "cite-se", "citação", "citacao", "citado"],
        "tipo": "contestacao",
        "dias": 15,
        "dias_uteis": True,
        "fundamento": "Art. 335 CPC",
        "descricao": "Prazo para contestacao",
        "prioridade": "critica",
    },
    # Recurso de apelacao
    {
        "palavras": ["sentença", "sentenca", "julgou procedente", "julgou improcedente", "julgou parcialmente"],
        "tipo": "recurso",
        "dias": 15,
        "dias_uteis": True,
        "fundamento": "Art. 1.003, par. 5 CPC",
        "descricao": "Prazo para recurso de apelacao",
        "prioridade": "critica",
    },
    # Agravo de instrumento
    {
        "palavras": ["decisão interlocutória", "decisao interlocutoria", "decisão agravável", "indeferiu", "deferiu parcialmente"],
        "tipo": "recurso",
        "dias": 15,
        "dias_uteis": True,
        "fundamento": "Art. 1.015 c/c Art. 1.003 CPC",
        "descricao": "Prazo para agravo de instrumento",
        "prioridade": "alta",
    },
    # Embargos de declaracao
    {
        "palavras": ["embargos de declaração", "embargos de declaracao", "omissão", "contradição", "obscuridade"],
        "tipo": "recurso",
        "dias": 5,
        "dias_uteis": True,
        "fundamento": "Art. 1.023 CPC",
        "descricao": "Prazo para embargos de declaracao",
        "prioridade": "alta",
    },
    # Manifestacao generica
    {
        "palavras": ["manifestar", "manifestação", "manifestacao", "manifeste-se", "vista às partes", "vista as partes", "ciência", "ciencia"],
        "tipo": "manifestacao",
        "dias": 15,
        "dias_uteis": True,
        "fundamento": "Art. 218 CPC",
        "descricao": "Prazo para manifestacao",
        "prioridade": "alta",
    },
    # Cumprimento de sentenca
    {
        "palavras": ["cumpra-se", "cumprimento", "cumprir sentença", "execução de sentença"],
        "tipo": "cumprimento",
        "dias": 15,
        "dias_uteis": True,
        "fundamento": "Art. 523 CPC",
        "descricao": "Prazo para cumprimento voluntario",
        "prioridade": "critica",
    },
    # Impugnacao
    {
        "palavras": ["impugnação", "impugnacao", "impugnar"],
        "tipo": "manifestacao",
        "dias": 15,
        "dias_uteis": True,
        "fundamento": "Art. 525 CPC",
        "descricao": "Prazo para impugnacao",
        "prioridade": "alta",
    },
    # Replica
    {
        "palavras": ["réplica", "replica", "replique"],
        "tipo": "manifestacao",
        "dias": 15,
        "dias_uteis": True,
        "fundamento": "Art. 351 CPC",
        "descricao": "Prazo para replica",
        "prioridade": "alta",
    },
    # Juntada de documentos
    {
        "palavras": ["juntar documentos", "juntada", "documentos complementares"],
        "tipo": "diligencia",
        "dias": 15,
        "dias_uteis": True,
        "fundamento": "Art. 437 CPC",
        "descricao": "Prazo para juntada de documentos",
        "prioridade": "media",
    },
    # Recurso especial / extraordinario
    {
        "palavras": ["recurso especial", "recurso extraordinário", "recurso extraordinario", "resp", "re "],
        "tipo": "recurso",
        "dias": 15,
        "dias_uteis": True,
        "fundamento": "Art. 1.003, par. 5 CPC",
        "descricao": "Prazo para recurso especial/extraordinario",
        "prioridade": "critica",
    },
    # Audiencia
    {
        "palavras": ["audiência designada", "audiencia designada", "designada audiência", "designo audiência"],
        "tipo": "audiencia",
        "dias": 0,
        "dias_uteis": False,
        "fundamento": "CPC",
        "descricao": "Audiencia designada",
        "prioridade": "critica",
    },
    # Intimacao generica (catch-all)
    {
        "palavras": ["intimação", "intimacao", "intimado", "intime-se", "intimem-se"],
        "tipo": "manifestacao",
        "dias": 5,
        "dias_uteis": True,
        "fundamento": "Art. 218 CPC",
        "descricao": "Prazo para atender intimacao",
        "prioridade": "media",
    },
    # Publicacao no DJE
    {
        "palavras": ["publicação", "publicacao", "publicado no dje", "publicado no diário"],
        "tipo": "manifestacao",
        "dias": 15,
        "dias_uteis": True,
        "fundamento": "Art. 1.003 CPC",
        "descricao": "Prazo apos publicacao",
        "prioridade": "alta",
    },
]


def _normalizar_texto(texto: str) -> str:
    """Normaliza texto para comparacao (lowercase, sem acentos extras)."""
    return texto.lower().strip()


def detectar_prazo(texto_andamento: str) -> Optional[Dict]:
    """
    Analisa o texto de um andamento processual e detecta se gera prazo.
    
    Args:
        texto_andamento: Texto do andamento processual
    
    Returns:
        Dict com informacoes do prazo detectado ou None se nao gera prazo
    """
    texto_norm = _normalizar_texto(texto_andamento)
    
    for regra in REGRAS_PRAZOS:
        for palavra in regra["palavras"]:
            if palavra.lower() in texto_norm:
                return {
                    "tipo": regra["tipo"],
                    "dias": regra["dias"],
                    "dias_uteis": regra["dias_uteis"],
                    "fundamento": regra["fundamento"],
                    "descricao": regra["descricao"],
                    "prioridade": regra["prioridade"],
                    "palavra_detectada": palavra,
                }
    
    return None


def calcular_prazo(
    data_intimacao: date,
    dias: int,
    dias_uteis: bool = True,
    estado: Optional[str] = None,
) -> Dict:
    """
    Calcula a data de vencimento de um prazo processual.
    
    Regras CPC:
    - Art. 224: Prazos em dias uteis (excluindo feriados e finais de semana)
    - Art. 224, par.1: Inicio no primeiro dia util seguinte a intimacao
    - Art. 224, par.3: Se vencimento cai em dia nao util, prorroga para proximo util
    
    Args:
        data_intimacao: Data da intimacao/publicacao
        dias: Numero de dias do prazo
        dias_uteis: Se True, conta apenas dias uteis; se False, dias corridos
        estado: UF para feriados estaduais
    
    Returns:
        Dict com data_inicio, data_vencimento, dias_totais
    """
    if dias == 0:
        return {
            "data_intimacao": data_intimacao.isoformat(),
            "data_inicio": data_intimacao.isoformat(),
            "data_vencimento": data_intimacao.isoformat(),
            "dias_totais": 0,
            "dias_uteis": dias_uteis,
        }
    
    # Art. 224, par.1: Inicio no primeiro dia util seguinte
    data_inicio = data_intimacao + timedelta(days=1)
    data_inicio = proximo_dia_util(data_inicio, estado)
    
    if dias_uteis:
        # Contar apenas dias uteis
        data_atual = data_inicio
        dias_contados = 1  # O dia de inicio conta como dia 1
        while dias_contados < dias:
            data_atual += timedelta(days=1)
            if eh_dia_util(data_atual, estado):
                dias_contados += 1
        data_vencimento = data_atual
    else:
        # Dias corridos
        data_vencimento = data_inicio + timedelta(days=dias - 1)
    
    # Art. 224, par.3: Se cai em dia nao util, prorroga
    data_vencimento = proximo_dia_util(data_vencimento, estado)
    
    return {
        "data_intimacao": data_intimacao.isoformat(),
        "data_inicio": data_inicio.isoformat(),
        "data_vencimento": data_vencimento.isoformat(),
        "dias_totais": dias,
        "dias_uteis": dias_uteis,
    }


def analisar_andamentos(
    andamentos: List[Dict],
    estado: Optional[str] = None,
) -> List[Dict]:
    """
    Analisa uma lista de andamentos e gera prazos automaticamente.
    
    Args:
        andamentos: Lista de dicts com 'data' (str ISO) e 'descricao' (str)
        estado: UF para feriados estaduais
    
    Returns:
        Lista de prazos detectados com datas calculadas
    """
    prazos_detectados = []
    
    for andamento in andamentos:
        descricao = andamento.get("descricao", "")
        data_str = andamento.get("data", "")
        
        if not descricao or not data_str:
            continue
        
        # Detectar se gera prazo
        prazo_info = detectar_prazo(descricao)
        if not prazo_info:
            continue
        
        # Parse da data do andamento
        try:
            if "T" in data_str:
                data_str = data_str.split("T")[0]
            partes = data_str.split("-")
            data_andamento = date(int(partes[0]), int(partes[1]), int(partes[2]))
        except (ValueError, IndexError):
            continue
        
        # Calcular prazo
        calculo = calcular_prazo(
            data_intimacao=data_andamento,
            dias=prazo_info["dias"],
            dias_uteis=prazo_info["dias_uteis"],
            estado=estado,
        )
        
        prazos_detectados.append({
            "andamento_origem": descricao,
            "data_andamento": data_str,
            "tipo": prazo_info["tipo"],
            "descricao": prazo_info["descricao"],
            "fundamento_legal": prazo_info["fundamento"],
            "prioridade": prazo_info["prioridade"],
            "palavra_detectada": prazo_info["palavra_detectada"],
            **calculo,
        })
    
    return prazos_detectados


def classificar_status_prazo(data_vencimento: date, hoje: Optional[date] = None) -> str:
    """
    Classifica o status de um prazo baseado na data de vencimento.
    
    Returns:
        "vencido", "critico" (ate 2 dias), "proximo" (ate 5 dias), "normal", "futuro" (>15 dias)
    """
    if hoje is None:
        hoje = date.today()
    
    diff = (data_vencimento - hoje).days
    
    if diff < 0:
        return "vencido"
    elif diff <= 2:
        return "critico"
    elif diff <= 5:
        return "proximo"
    elif diff <= 15:
        return "normal"
    else:
        return "futuro"


def obter_calendario_prazos(
    prazos: List[Dict],
    mes: int,
    ano: int,
    estado: Optional[str] = None,
) -> Dict:
    """
    Gera dados de calendario para um mes, incluindo prazos e feriados.
    """
    feriados = obter_feriados_ano(ano, estado)
    
    # Dias do mes
    if mes == 12:
        ultimo_dia = date(ano + 1, 1, 1) - timedelta(days=1)
    else:
        ultimo_dia = date(ano, mes + 1, 1) - timedelta(days=1)
    
    dias = []
    for d in range(1, ultimo_dia.day + 1):
        dt = date(ano, mes, d)
        dia_info = {
            "data": dt.isoformat(),
            "dia": d,
            "dia_semana": dt.weekday(),  # 0=seg, 6=dom
            "eh_util": eh_dia_util(dt, estado),
            "eh_feriado": dt in feriados,
            "eh_fim_semana": dt.weekday() >= 5,
            "prazos": [],
            "eventos": [],
        }
        
        # Adicionar prazos que vencem neste dia
        for prazo in prazos:
            venc = prazo.get("data_vencimento", "")
            if venc == dt.isoformat():
                dia_info["prazos"].append(prazo)
        
        dias.append(dia_info)
    
    return {
        "mes": mes,
        "ano": ano,
        "estado": estado,
        "dias": dias,
        "total_prazos": sum(len(d["prazos"]) for d in dias),
    }


# CLI interface
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print(json.dumps({"erro": "Uso: motor_prazos.py <comando> [args]"}))
        sys.exit(1)
    
    comando = sys.argv[1]
    
    if comando == "detectar":
        # Detectar prazo a partir de texto
        texto = sys.argv[2] if len(sys.argv) > 2 else ""
        resultado = detectar_prazo(texto)
        print(json.dumps(resultado or {"detectado": False}))
    
    elif comando == "calcular":
        # Calcular prazo: motor_prazos.py calcular 2026-03-13 15 true RJ
        data_str = sys.argv[2] if len(sys.argv) > 2 else ""
        dias = int(sys.argv[3]) if len(sys.argv) > 3 else 15
        dias_uteis = sys.argv[4].lower() == "true" if len(sys.argv) > 4 else True
        estado = sys.argv[5] if len(sys.argv) > 5 else None
        
        try:
            partes = data_str.split("-")
            dt = date(int(partes[0]), int(partes[1]), int(partes[2]))
            resultado = calcular_prazo(dt, dias, dias_uteis, estado)
            print(json.dumps(resultado))
        except Exception as e:
            print(json.dumps({"erro": str(e)}))
    
    elif comando == "analisar":
        # Recebe JSON de andamentos via stdin
        dados = json.loads(sys.stdin.read())
        andamentos = dados.get("andamentos", [])
        estado = dados.get("estado", None)
        resultado = analisar_andamentos(andamentos, estado)
        print(json.dumps(resultado, ensure_ascii=False))
    
    elif comando == "calendario":
        # Gerar calendario: motor_prazos.py calendario 3 2026 RJ
        mes = int(sys.argv[2]) if len(sys.argv) > 2 else date.today().month
        ano = int(sys.argv[3]) if len(sys.argv) > 3 else date.today().year
        estado = sys.argv[4] if len(sys.argv) > 4 else None
        resultado = obter_calendario_prazos([], mes, ano, estado)
        print(json.dumps(resultado, ensure_ascii=False))
    
    else:
        print(json.dumps({"erro": f"Comando desconhecido: {comando}"}))
