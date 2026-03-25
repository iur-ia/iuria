"""
Motor de Feriados - iuria LexFutura
Calendário completo de feriados brasileiros para cálculo de prazos processuais.
Inclui feriados nacionais, estaduais, forenses e municipais (via workalendar).

Integracoes:
  - workalendar.america.brazil: feriados oficiais com calculo de datas moveis
  - Tabela propria de feriados estaduais (27 UFs)
  - Recesso forense Art. 220 CPC (20/dez - 20/jan)
  - Feriados de tribunais especificos (pontos facultativos)
"""
from datetime import date, timedelta
from typing import List, Optional, Set, Tuple
import logging

logger = logging.getLogger("iuria.feriados")

# ==================== WORKALENDAR INTEGRATION ====================
# Use workalendar as the authoritative source for national + state holidays

_workalendar_cache = {}

def _get_workalendar_state(estado: Optional[str] = None):
    """Get workalendar state calendar (cached). Returns Brazil national if no state."""
    cache_key = estado or "BR"
    if cache_key in _workalendar_cache:
        return _workalendar_cache[cache_key]

    try:
        if estado:
            # Map UF -> workalendar state class
            from workalendar.america.brazil import (
                BrazilAcre, BrazilAlagoas, BrazilAmapa, BrazilAmazonas,
                BrazilBahia, BrazilCeara, BrazilDistritoFederal,
                BrazilEspiritoSanto, BrazilGoias, BrazilMaranhao,
                BrazilMatoGrosso, BrazilMatoGrossoDoSul, BrazilMinasGerais,
                BrazilPara, BrazilParaiba, BrazilPernambuco, BrazilPiaui,
                BrazilParana, BrazilRioDeJaneiro, BrazilRioGrandeDoNorte,
                BrazilRioGrandeDoSul, BrazilRondonia, BrazilRoraima,
                BrazilSantaCatarina, BrazilSaoPauloState, BrazilSergipe,
                BrazilTocantins,
            )
            STATE_MAP = {
                "AC": BrazilAcre, "AL": BrazilAlagoas, "AP": BrazilAmapa,
                "AM": BrazilAmazonas, "BA": BrazilBahia, "CE": BrazilCeara,
                "DF": BrazilDistritoFederal, "ES": BrazilEspiritoSanto,
                "GO": BrazilGoias, "MA": BrazilMaranhao, "MT": BrazilMatoGrosso,
                "MS": BrazilMatoGrossoDoSul, "MG": BrazilMinasGerais,
                "PA": BrazilPara, "PB": BrazilParaiba, "PE": BrazilPernambuco,
                "PI": BrazilPiaui, "PR": BrazilParana, "RJ": BrazilRioDeJaneiro,
                "RN": BrazilRioGrandeDoNorte, "RS": BrazilRioGrandeDoSul,
                "RO": BrazilRondonia, "RR": BrazilRoraima, "SC": BrazilSantaCatarina,
                "SP": BrazilSaoPauloState, "SE": BrazilSergipe, "TO": BrazilTocantins,
            }
            cls = STATE_MAP.get(estado.upper())
            if cls:
                cal = cls()
                _workalendar_cache[cache_key] = cal
                return cal

        from workalendar.america.brazil import Brazil
        cal = Brazil()
        _workalendar_cache[cache_key] = cal
        return cal
    except ImportError:
        logger.warning("workalendar nao disponivel, usando tabela interna")
        return None

def obter_feriados_workalendar(ano: int, estado: Optional[str] = None) -> Set[date]:
    """Get holidays from workalendar library (authoritative source)"""
    cal = _get_workalendar_state(estado)
    if cal is None:
        return set()
    try:
        holidays = cal.holidays(ano)
        return {dt for dt, _ in holidays}
    except Exception as e:
        logger.warning(f"workalendar error: {e}")
        return set()

# ==================== COURT-SPECIFIC HOLIDAYS ====================
# Pontos facultativos e feriados forenses por tribunal

FERIADOS_TRIBUNAL: dict[str, List[Tuple[int, int, str]]] = {
    "TJRJ": [(10, 28, "Dia do Servidor Publico"), (12, 8, "Dia da Justica")],
    "TJSP": [(1, 25, "Aniversario de Sao Paulo"), (10, 28, "Dia do Servidor Publico")],
    "TRF2": [(10, 28, "Dia do Servidor Publico")],
    "TRF1": [(10, 28, "Dia do Servidor Publico")],
    "TRT1": [(10, 28, "Dia do Servidor Publico")],
}


# ==================== FERIADOS NACIONAIS FIXOS ====================
# Fonte: Lei nº 662/1949 e Lei nº 10.607/2002
FERIADOS_NACIONAIS_FIXOS = [
    (1, 1, "Confraternização Universal"),
    (4, 21, "Tiradentes"),
    (5, 1, "Dia do Trabalho"),
    (9, 7, "Independência do Brasil"),
    (10, 12, "Nossa Senhora Aparecida"),
    (11, 2, "Finados"),
    (11, 15, "Proclamação da República"),
    (12, 25, "Natal"),
]

# ==================== FERIADOS ESTADUAIS ====================
# Feriados estaduais mais relevantes por UF
FERIADOS_ESTADUAIS: dict[str, List[Tuple[int, int, str]]] = {
    "AC": [(1, 23, "Dia do Evangélico"), (6, 15, "Aniversário do Acre"), (9, 5, "Dia da Amazônia"), (11, 17, "Tratado de Petrópolis")],
    "AL": [(6, 24, "São João"), (6, 29, "São Pedro"), (9, 16, "Emancipação Política"), (11, 20, "Dia da Consciência Negra")],
    "AP": [(3, 19, "São José"), (7, 25, "São Tiago"), (10, 5, "Criação do Estado"), (11, 20, "Dia da Consciência Negra")],
    "AM": [(9, 5, "Elevação do Amazonas"), (11, 20, "Dia da Consciência Negra")],
    "BA": [(7, 2, "Independência da Bahia")],
    "CE": [(3, 19, "São José"), (3, 25, "Data Magna do Ceará")],
    "DF": [(4, 21, "Fundação de Brasília"), (11, 30, "Dia do Evangélico")],
    "ES": [(10, 28, "Dia do Servidor Público")],
    "GO": [(10, 24, "Pedra Fundamental de Goiânia")],
    "MA": [(7, 28, "Adesão do Maranhão à Independência")],
    "MT": [(11, 20, "Dia da Consciência Negra")],
    "MS": [(10, 11, "Criação do Estado")],
    "MG": [(4, 21, "Data Magna de Minas Gerais")],
    "PA": [(8, 15, "Adesão do Grão-Pará à Independência")],
    "PB": [(8, 5, "Fundação do Estado")],
    "PR": [(12, 19, "Emancipação Política do Paraná")],
    "PE": [(3, 6, "Revolução Pernambucana")],
    "PI": [(10, 19, "Dia do Piauí")],
    "RJ": [(4, 23, "São Jorge"), (11, 20, "Dia da Consciência Negra")],
    "RN": [(10, 3, "Mártires de Cunhaú e Uruaçu")],
    "RS": [(9, 20, "Revolução Farroupilha")],
    "RO": [(1, 4, "Criação do Estado"), (6, 18, "Dia do Evangélico")],
    "RR": [(10, 5, "Criação do Estado")],
    "SC": [(8, 11, "Criação da Capitania")],
    "SP": [(7, 9, "Revolução Constitucionalista"), (11, 20, "Dia da Consciência Negra")],
    "SE": [(7, 8, "Emancipação Política de Sergipe")],
    "TO": [(10, 5, "Criação do Estado")],
}

# ==================== RECESSO FORENSE ====================
# Art. 220 do CPC: 20/dez a 20/jan é recesso forense
RECESSO_FORENSE_INICIO_DIA = 20
RECESSO_FORENSE_INICIO_MES = 12
RECESSO_FORENSE_FIM_DIA = 20
RECESSO_FORENSE_FIM_MES = 1


def calcular_pascoa(ano: int) -> date:
    """
    Calcula a data da Páscoa pelo algoritmo de Meeus/Jones/Butcher.
    Retorna a data do Domingo de Páscoa.
    """
    a = ano % 19
    b = ano // 100
    c = ano % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    mes = (h + l - 7 * m + 114) // 31
    dia = ((h + l - 7 * m + 114) % 31) + 1
    return date(ano, mes, dia)


def feriados_moveis(ano: int) -> List[Tuple[date, str]]:
    """
    Calcula os feriados móveis (baseados na Páscoa) para um dado ano.
    """
    pascoa = calcular_pascoa(ano)
    return [
        (pascoa - timedelta(days=47), "Carnaval (segunda)"),
        (pascoa - timedelta(days=46), "Carnaval (terça)"),
        (pascoa - timedelta(days=2), "Sexta-feira Santa"),
        (pascoa, "Páscoa"),
        (pascoa + timedelta(days=60), "Corpus Christi"),
    ]


def obter_feriados_ano(ano: int, estado: Optional[str] = None, tribunal: Optional[str] = None) -> Set[date]:
    """
    Retorna o conjunto de todas as datas de feriado para um ano específico.
    Uses workalendar as primary source, falls back to internal table.
    
    Args:
        ano: Ano para calcular
        estado: UF para incluir feriados estaduais (ex: "RJ", "SP")
        tribunal: Sigla do tribunal para feriados especificos
    
    Returns:
        Set de datas que são feriados
    """
    feriados_set: Set[date] = set()
    
    # 1. Try workalendar first (most authoritative)
    wk_holidays = obter_feriados_workalendar(ano, estado)
    if wk_holidays:
        feriados_set.update(wk_holidays)
    else:
        # Fallback to internal table
        for mes, dia, _ in FERIADOS_NACIONAIS_FIXOS:
            try:
                feriados_set.add(date(ano, mes, dia))
            except ValueError:
                pass
        
        for dt, _ in feriados_moveis(ano):
            if dt.year == ano:
                feriados_set.add(dt)
        
        if estado and estado.upper() in FERIADOS_ESTADUAIS:
            for mes, dia, _ in FERIADOS_ESTADUAIS[estado.upper()]:
                try:
                    feriados_set.add(date(ano, mes, dia))
                except ValueError:
                    pass
    
    # 2. Always add our state table (supplements workalendar gaps)
    if estado and estado.upper() in FERIADOS_ESTADUAIS:
        for mes, dia, _ in FERIADOS_ESTADUAIS[estado.upper()]:
            try:
                feriados_set.add(date(ano, mes, dia))
            except ValueError:
                pass
    
    # 3. Court-specific holidays
    if tribunal and tribunal.upper() in FERIADOS_TRIBUNAL:
        for mes, dia, _ in FERIADOS_TRIBUNAL[tribunal.upper()]:
            try:
                feriados_set.add(date(ano, mes, dia))
            except ValueError:
                pass
    
    return feriados_set


def obter_feriados_detalhados(ano: int, estado: Optional[str] = None, tribunal: Optional[str] = None) -> List[dict]:
    """
    Retorna lista detalhada de feriados com nome e tipo.
    Uses workalendar as primary source with our supplementary data.
    """
    resultado = []
    seen_dates = set()
    
    # 1. Workalendar holidays (authoritative)
    cal = _get_workalendar_state(estado)
    if cal:
        try:
            for dt, nome in cal.holidays(ano):
                if dt not in seen_dates:
                    seen_dates.add(dt)
                    resultado.append({
                        "data": dt.isoformat(),
                        "nome": nome,
                        "tipo": "nacional" if not estado else "estadual",
                        "estado": estado.upper() if estado else None,
                        "recorrente": True,
                        "fonte": "workalendar",
                    })
        except Exception:
            pass
    
    # 2. Fallback / supplement: internal tables
    for mes, dia, nome in FERIADOS_NACIONAIS_FIXOS:
        try:
            dt = date(ano, mes, dia)
            if dt not in seen_dates:
                seen_dates.add(dt)
                resultado.append({
                    "data": dt.isoformat(),
                    "nome": nome,
                    "tipo": "nacional",
                    "estado": None,
                    "recorrente": True,
                    "fonte": "interno",
                })
        except ValueError:
            pass
    
    for dt, nome in feriados_moveis(ano):
        if dt.year == ano and dt not in seen_dates:
            seen_dates.add(dt)
            resultado.append({
                "data": dt.isoformat(),
                "nome": nome,
                "tipo": "nacional",
                "estado": None,
                "recorrente": False,
                "fonte": "interno",
            })
    
    if estado and estado.upper() in FERIADOS_ESTADUAIS:
        for mes, dia, nome in FERIADOS_ESTADUAIS[estado.upper()]:
            try:
                dt = date(ano, mes, dia)
                if dt not in seen_dates:
                    seen_dates.add(dt)
                    resultado.append({
                        "data": dt.isoformat(),
                        "nome": nome,
                        "tipo": "estadual",
                        "estado": estado.upper(),
                        "recorrente": True,
                        "fonte": "interno",
                    })
            except ValueError:
                pass
    
    # 3. Court-specific holidays
    if tribunal and tribunal.upper() in FERIADOS_TRIBUNAL:
        for mes, dia, nome in FERIADOS_TRIBUNAL[tribunal.upper()]:
            try:
                dt = date(ano, mes, dia)
                if dt not in seen_dates:
                    seen_dates.add(dt)
                    resultado.append({
                        "data": dt.isoformat(),
                        "nome": nome,
                        "tipo": "forense",
                        "estado": estado.upper() if estado else None,
                        "recorrente": True,
                        "fonte": "tribunal",
                        "tribunal": tribunal.upper(),
                    })
            except ValueError:
                pass
    
    # 4. Recesso forense (20/dez - 20/jan)
    for d in range(RECESSO_FORENSE_INICIO_DIA, 32):
        try:
            dt = date(ano, RECESSO_FORENSE_INICIO_MES, d)
            if dt not in seen_dates:
                seen_dates.add(dt)
                resultado.append({
                    "data": dt.isoformat(),
                    "nome": "Recesso Forense",
                    "tipo": "forense",
                    "estado": None,
                    "recorrente": True,
                    "fonte": "CPC Art. 220",
                })
        except ValueError:
            pass
    
    for d in range(1, RECESSO_FORENSE_FIM_DIA + 1):
        dt = date(ano + 1, RECESSO_FORENSE_FIM_MES, d)
        if dt not in seen_dates:
            seen_dates.add(dt)
            resultado.append({
                "data": dt.isoformat(),
                "nome": "Recesso Forense",
                "tipo": "forense",
                "estado": None,
                "recorrente": True,
                "fonte": "CPC Art. 220",
            })
    
    # Sort by date
    resultado.sort(key=lambda x: x["data"])
    return resultado


def eh_dia_util(dt: date, estado: Optional[str] = None, feriados_extra: Optional[Set[date]] = None) -> bool:
    """
    Verifica se uma data é dia útil (não é fim de semana nem feriado).
    
    Args:
        dt: Data a verificar
        estado: UF para considerar feriados estaduais
        feriados_extra: Feriados adicionais personalizados
    """
    # Fim de semana (5=sábado, 6=domingo)
    if dt.weekday() >= 5:
        return False
    
    # Feriados do ano
    feriados_ano = obter_feriados_ano(dt.year, estado)
    if dt in feriados_ano:
        return False
    
    # Feriados extras
    if feriados_extra and dt in feriados_extra:
        return False
    
    # Recesso forense (20/dez - 20/jan)
    if (dt.month == 12 and dt.day >= RECESSO_FORENSE_INICIO_DIA) or \
       (dt.month == 1 and dt.day <= RECESSO_FORENSE_FIM_DIA):
        return False
    
    return True


def proximo_dia_util(dt: date, estado: Optional[str] = None) -> date:
    """Retorna o próximo dia útil a partir de uma data (inclusive)."""
    while not eh_dia_util(dt, estado):
        dt += timedelta(days=1)
    return dt


def dia_util_anterior(dt: date, estado: Optional[str] = None) -> date:
    """Retorna o dia útil anterior a partir de uma data (inclusive)."""
    while not eh_dia_util(dt, estado):
        dt -= timedelta(days=1)
    return dt


if __name__ == "__main__":
    # Testes
    print("=== Feriados 2026 (Nacional) ===")
    for f in obter_feriados_detalhados(2026):
        if f["tipo"] == "nacional":
            print(f"  {f['data']} - {f['nome']}")
    
    print("\n=== Feriados 2026 (RJ) ===")
    for f in obter_feriados_detalhados(2026, "RJ"):
        if f["tipo"] == "estadual":
            print(f"  {f['data']} - {f['nome']}")
    
    print("\n=== Teste dia útil ===")
    from datetime import date as dt
    for d in [dt(2026, 1, 1), dt(2026, 3, 12), dt(2026, 4, 3), dt(2026, 12, 25)]:
        print(f"  {d} -> útil: {eh_dia_util(d, 'RJ')}")
