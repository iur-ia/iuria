"""
Parser de Andamentos Processuais com NLP - iuria LexFutura
Layer 3: Inteligencia para deteccao de prazos e eventos juridicos.

Componentes:
  - AndamentoParser: regex + NLP (spacy) para classificar andamentos
  - EventoTrigger: mapeia eventos para gatilhos de prazo
  - ClassificadorNLP: classificacao avancada com spacy pt_core_news_sm
  - DateExtractor: extrai datas de textos livres de andamentos

Referencia: tabelas de movimentos processuais CNJ (codigos SGT).
"""
import re
import logging
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Tuple, Any

logger = logging.getLogger("iuria.parser")


# ==================== TABELA DE EVENTOS CNJ ====================
# Codigos SGT (Sistema de Gestao de Tabelas) do CNJ
# Mapeamento de codigo nacional -> tipo de evento -> prazo padrao

EVENTOS_CNJ: Dict[int, Dict] = {
    # DESPACHOS
    11: {"tipo": "despacho", "desc": "Despacho", "gera_prazo": False},
    12: {"tipo": "despacho", "desc": "Despacho de Mero Expediente", "gera_prazo": False},
    # DECISOES
    26: {"tipo": "decisao", "desc": "Decisao", "gera_prazo": True, "dias": 15, "dias_uteis": True},
    27: {"tipo": "liminar", "desc": "Concessao de Liminar/Antecipacao de Tutela", "gera_prazo": True, "dias": 15, "dias_uteis": True},
    # JULGAMENTO
    193: {"tipo": "sentenca", "desc": "Sentenca", "gera_prazo": True, "dias": 15, "dias_uteis": True},
    194: {"tipo": "sentenca", "desc": "Sentenca Estrangeira", "gera_prazo": True, "dias": 15, "dias_uteis": True},
    195: {"tipo": "acordao", "desc": "Acordao", "gera_prazo": True, "dias": 15, "dias_uteis": True},
    # INTIMACOES / CITACOES
    12324: {"tipo": "intimacao", "desc": "Intimacao", "gera_prazo": True, "dias": 5, "dias_uteis": True},
    12325: {"tipo": "citacao", "desc": "Citacao", "gera_prazo": True, "dias": 15, "dias_uteis": True},
    # AUDIENCIA
    970: {"tipo": "audiencia", "desc": "Audiencia Designada", "gera_prazo": True, "dias": 0},
    # PUBLICACAO
    847: {"tipo": "publicacao", "desc": "Publicacao no DJE", "gera_prazo": True, "dias": 15, "dias_uteis": True},
    # TRANSITO EM JULGADO
    848: {"tipo": "transito", "desc": "Transito em Julgado", "gera_prazo": False},
    # REMESSA
    123: {"tipo": "remessa", "desc": "Remessa a Instancia Superior", "gera_prazo": False},
    22: {"tipo": "distribuicao", "desc": "Distribuicao", "gera_prazo": False},
}


# ==================== REGEX PATTERNS ====================

@dataclass
class PatternMatch:
    """Resultado de match de padrao"""
    tipo: str
    subtipo: str
    descricao: str
    confianca: float  # 0.0 - 1.0
    gera_prazo: bool
    dias_prazo: int = 0
    dias_uteis: bool = True
    fundamento_legal: str = ""
    prioridade: str = "media"
    data_extraida: Optional[date] = None
    palavras_chave: list[str] = field(default_factory=list)

# Padroes de regex agrupados por tipo de evento
PATTERNS: List[Tuple[str, dict]] = [
    # === CITACAO ===
    (r"(?i)(cita[çc][ãa]o|citado|cite-se|citar\s)", {
        "tipo": "citacao", "subtipo": "citacao",
        "descricao": "Citacao do reu",
        "gera_prazo": True, "dias": 15, "dias_uteis": True,
        "fundamento": "Art. 335 CPC", "prioridade": "critica",
    }),
    # === INTIMACAO ===
    (r"(?i)(intima[çc][ãa]o|intimado|intime-se|intimem-se)", {
        "tipo": "intimacao", "subtipo": "intimacao_generica",
        "descricao": "Intimacao",
        "gera_prazo": True, "dias": 5, "dias_uteis": True,
        "fundamento": "Art. 218 CPC", "prioridade": "alta",
    }),
    # === SENTENCA ===
    (r"(?i)(senten[çc]a|julgou\s+(im)?procedente|julgou\s+parcialmente)", {
        "tipo": "sentenca", "subtipo": "sentenca",
        "descricao": "Sentenca proferida",
        "gera_prazo": True, "dias": 15, "dias_uteis": True,
        "fundamento": "Art. 1.003, par. 5 CPC", "prioridade": "critica",
    }),
    # === ACORDAO ===
    (r"(?i)(ac[oó]rd[ãa]o|julgamento\s+colegiado|turma\s+julgou)", {
        "tipo": "acordao", "subtipo": "acordao",
        "descricao": "Acordao proferido",
        "gera_prazo": True, "dias": 15, "dias_uteis": True,
        "fundamento": "Art. 1.003 CPC", "prioridade": "critica",
    }),
    # === DECISAO INTERLOCUTORIA ===
    (r"(?i)(decis[ãa]o\s+interlocut[oó]ria|decis[ãa]o\s+agrav[áa]vel|indeferiu|deferiu\s+parcialmente)", {
        "tipo": "decisao", "subtipo": "interlocutoria",
        "descricao": "Decisao interlocutoria",
        "gera_prazo": True, "dias": 15, "dias_uteis": True,
        "fundamento": "Art. 1.015 c/c Art. 1.003 CPC", "prioridade": "alta",
    }),
    # === EMBARGOS ===
    (r"(?i)(embargos\s+de\s+declara[çc][ãa]o|omiss[ãa]o|contradi[çc][ãa]o|obscuridade)", {
        "tipo": "recurso", "subtipo": "embargos_declaracao",
        "descricao": "Embargos de declaracao",
        "gera_prazo": True, "dias": 5, "dias_uteis": True,
        "fundamento": "Art. 1.023 CPC", "prioridade": "alta",
    }),
    # === MANIFESTACAO ===
    (r"(?i)(manifeste?-se|manifesta[çc][ãa]o|vista\s+[àa]s?\s+partes?|ci[êe]ncia)", {
        "tipo": "manifestacao", "subtipo": "manifestacao",
        "descricao": "Manifestacao requerida",
        "gera_prazo": True, "dias": 15, "dias_uteis": True,
        "fundamento": "Art. 218 CPC", "prioridade": "alta",
    }),
    # === CONTESTACAO ===
    (r"(?i)(contesta[çc][ãa]o|contestar|prazo\s+para\s+contest)", {
        "tipo": "contestacao", "subtipo": "contestacao",
        "descricao": "Prazo para contestacao",
        "gera_prazo": True, "dias": 15, "dias_uteis": True,
        "fundamento": "Art. 335 CPC", "prioridade": "critica",
    }),
    # === CUMPRIMENTO DE SENTENCA ===
    (r"(?i)(cumpra-se|cumprimento\s+(de\s+)?senten[çc]a|execu[çc][ãa]o\s+de\s+senten[çc]a)", {
        "tipo": "cumprimento", "subtipo": "cumprimento_sentenca",
        "descricao": "Cumprimento voluntario de sentenca",
        "gera_prazo": True, "dias": 15, "dias_uteis": True,
        "fundamento": "Art. 523 CPC", "prioridade": "critica",
    }),
    # === REPLICA ===
    (r"(?i)(r[ée]plica|replique)", {
        "tipo": "manifestacao", "subtipo": "replica",
        "descricao": "Replica",
        "gera_prazo": True, "dias": 15, "dias_uteis": True,
        "fundamento": "Art. 351 CPC", "prioridade": "alta",
    }),
    # === IMPUGNACAO ===
    (r"(?i)(impugna[çc][ãa]o|impugnar)", {
        "tipo": "manifestacao", "subtipo": "impugnacao",
        "descricao": "Impugnacao",
        "gera_prazo": True, "dias": 15, "dias_uteis": True,
        "fundamento": "Art. 525 CPC", "prioridade": "alta",
    }),
    # === RECURSO ESPECIAL / EXTRAORDINARIO ===
    (r"(?i)(recurso\s+especial|recurso\s+extraordin[áa]rio|resp\b|re\s+\d)", {
        "tipo": "recurso", "subtipo": "resp_re",
        "descricao": "Recurso especial/extraordinario",
        "gera_prazo": True, "dias": 15, "dias_uteis": True,
        "fundamento": "Art. 1.003 CPC", "prioridade": "critica",
    }),
    # === AUDIENCIA ===
    (r"(?i)(audi[êe]ncia\s+designada|design[oa]\s+audi[êe]ncia|pauta\s+de\s+julgamento)", {
        "tipo": "audiencia", "subtipo": "audiencia",
        "descricao": "Audiencia designada",
        "gera_prazo": True, "dias": 0,
        "fundamento": "CPC", "prioridade": "critica",
    }),
    # === PUBLICACAO DJE ===
    (r"(?i)(publica[çc][ãa]o|publicado\s+no\s+d[ji]e?|publicado\s+no\s+di[áa]rio)", {
        "tipo": "publicacao", "subtipo": "publicacao_dje",
        "descricao": "Publicacao no DJe",
        "gera_prazo": True, "dias": 15, "dias_uteis": True,
        "fundamento": "Art. 1.003 CPC", "prioridade": "alta",
    }),
    # === JUNTADA ===
    (r"(?i)(juntada?\s+de?\s+document|documentos?\s+complementar)", {
        "tipo": "diligencia", "subtipo": "juntada",
        "descricao": "Juntada de documentos",
        "gera_prazo": True, "dias": 15, "dias_uteis": True,
        "fundamento": "Art. 437 CPC", "prioridade": "media",
    }),
    # === DESPACHO ===
    (r"(?i)(despacho|despacho\s+de\s+mero\s+expediente)", {
        "tipo": "despacho", "subtipo": "despacho",
        "descricao": "Despacho",
        "gera_prazo": False, "dias": 0,
        "fundamento": "", "prioridade": "baixa",
    }),
    # === TRANSITO EM JULGADO ===
    (r"(?i)(tr[âa]nsito\s+em\s+julgado|transitou)", {
        "tipo": "transito", "subtipo": "transito_julgado",
        "descricao": "Transito em julgado",
        "gera_prazo": False, "dias": 0,
        "fundamento": "", "prioridade": "informativa",
    }),
    # === DISTRIBUICAO ===
    (r"(?i)(distribui[çc][ãa]o|distribu[íi]do)", {
        "tipo": "distribuicao", "subtipo": "distribuicao",
        "descricao": "Distribuicao",
        "gera_prazo": False, "dias": 0,
        "fundamento": "", "prioridade": "informativa",
    }),
    # === PENHORA / BLOQUEIO ===
    (r"(?i)(penhora|bloqueio|arresto|sequestro)", {
        "tipo": "constricao", "subtipo": "penhora",
        "descricao": "Constricao patrimonial",
        "gera_prazo": True, "dias": 15, "dias_uteis": True,
        "fundamento": "Art. 525 CPC", "prioridade": "critica",
    }),
]


# ==================== DATE EXTRACTION ====================

class DateExtractor:
    """Extrai datas de textos de andamentos"""

    # Padroes de data comuns em andamentos
    PATTERNS = [
        # DD/MM/YYYY ou DD-MM-YYYY
        (r"(\d{2})[/\-](\d{2})[/\-](\d{4})", "dmy"),
        # YYYY-MM-DD (ISO)
        (r"(\d{4})-(\d{2})-(\d{2})", "ymd"),
        # DD de MES de YYYY
        (r"(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})", "dmy_ext"),
        # DD.MM.YYYY
        (r"(\d{2})\.(\d{2})\.(\d{4})", "dmy"),
    ]

    MESES = {
        "janeiro": 1, "fevereiro": 2, "março": 3, "marco": 3,
        "abril": 4, "maio": 5, "junho": 6,
        "julho": 7, "agosto": 8, "setembro": 9,
        "outubro": 10, "novembro": 11, "dezembro": 12,
    }

    @classmethod
    def extrair(cls, texto: str) -> List[date]:
        """Extrai todas as datas encontradas no texto"""
        datas = []
        for pattern, fmt in cls.PATTERNS:
            for match in re.finditer(pattern, texto):
                try:
                    if fmt == "dmy":
                        d = date(int(match.group(3)), int(match.group(2)), int(match.group(1)))
                    elif fmt == "ymd":
                        d = date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
                    elif fmt == "dmy_ext":
                        mes_str = match.group(2).lower()
                        mes = cls.MESES.get(mes_str)
                        if mes:
                            d = date(int(match.group(3)), mes, int(match.group(1)))
                        else:
                            continue
                    else:
                        continue
                    datas.append(d)
                except (ValueError, IndexError):
                    continue
        return datas

    @classmethod
    def extrair_data_audiencia(cls, texto: str) -> Optional[date]:
        """Extrai data especifica de audiencia do texto"""
        # Padrao: "audiencia designada para DD/MM/YYYY"
        match = re.search(
            r"(?i)(?:designad[ao]|marcad[ao]|agendad[ao])\s+para\s+(?:o\s+dia\s+)?(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})",
            texto
        )
        if match:
            try:
                return date(int(match.group(3)), int(match.group(2)), int(match.group(1)))
            except ValueError:
                pass

        # Tenta extrair qualquer data futura do texto
        datas = cls.extrair(texto)
        hoje = date.today()
        futuras = [d for d in datas if d > hoje]
        return futuras[0] if futuras else None


# ==================== NLP CLASSIFIER ====================

class ClassificadorNLP:
    """
    Classificador de andamentos usando spaCy.
    Usa NER e similarity para classificar textos complexos.
    """

    def __init__(self):
        self._nlp = None
        self._loaded = False

    def _load_model(self):
        """Carrega modelo spaCy pt_core_news_sm (lazy loading)"""
        if self._loaded:
            return self._nlp

        try:
            import spacy
            try:
                self._nlp = spacy.load("pt_core_news_sm")
                self._loaded = True
                logger.info("spaCy model pt_core_news_sm carregado")
            except OSError:
                logger.warning("pt_core_news_sm nao disponivel - usando regex only")
                self._nlp = None
                self._loaded = True
        except ImportError:
            logger.warning("spaCy nao disponivel - usando regex only")
            self._nlp = None
            self._loaded = True

        return self._nlp

    def extrair_entidades(self, texto: str) -> Dict[str, List[str]]:
        """Extrai entidades nomeadas do texto (nomes, orgs, datas)"""
        nlp = self._load_model()
        if not nlp:
            return {}

        doc = nlp(texto)
        entidades = {}
        for ent in doc.ents:
            label = ent.label_
            if label not in entidades:
                entidades[label] = []
            entidades[label].append(ent.text)
        return entidades

    def classificar_complexo(self, texto: str) -> Optional[str]:
        """
        Classificacao avancada para textos ambiguos.
        Usa similaridade semantica com textos de referencia.
        """
        nlp = self._load_model()
        if not nlp:
            return None

        doc = nlp(texto.lower())

        # Textos de referencia por categoria
        referencias = {
            "sentenca": "julgou procedente o pedido sentenca proferida",
            "intimacao": "intimacao da parte para manifestacao prazo",
            "citacao": "citacao do reu para contestar a acao",
            "recurso": "interposicao de recurso de apelacao",
            "audiencia": "audiencia de instrucao e julgamento designada",
            "despacho": "despacho de mero expediente proferido pelo juiz",
            "publicacao": "publicacao no diario de justica eletronico",
        }

        melhor_score = 0.0
        melhor_tipo = None

        for tipo, ref_text in referencias.items():
            ref_doc = nlp(ref_text)
            if doc.has_vector and ref_doc.has_vector:
                score = doc.similarity(ref_doc)
                if score > melhor_score:
                    melhor_score = score
                    melhor_tipo = tipo

        if melhor_score > 0.6:  # Threshold de confianca
            return melhor_tipo
        return None


# ==================== MAIN PARSER ====================

class AndamentoParser:
    """
    Parser principal de andamentos processuais.
    Combina regex + NLP para classificacao robusta.
    """

    def __init__(self, usar_nlp: bool = True):
        self.usar_nlp = usar_nlp
        self.nlp_classifier = ClassificadorNLP() if usar_nlp else None
        self.date_extractor = DateExtractor()
        self._stats = {"total": 0, "regex_match": 0, "nlp_match": 0, "sem_match": 0}

    def parse(self, texto: str, data_andamento: Optional[str] = None, codigo_cnj: Optional[int] = None) -> PatternMatch:
        """
        Analisa texto de andamento e retorna classificacao.

        Estrategia:
        1. Se tem codigo CNJ, usa tabela direta
        2. Tenta regex patterns
        3. Se ambiguo, usa NLP
        """
        self._stats["total"] += 1

        # 1. Codigo CNJ direto
        if codigo_cnj and codigo_cnj in EVENTOS_CNJ:
            evt = EVENTOS_CNJ[codigo_cnj]
            return PatternMatch(
                tipo=evt["tipo"],
                subtipo=evt.get("desc", ""),
                descricao=evt["desc"],
                confianca=1.0,
                gera_prazo=evt["gera_prazo"],
                dias_prazo=evt.get("dias", 0),
                dias_uteis=evt.get("dias_uteis", True),
                prioridade="alta" if evt["gera_prazo"] else "baixa",
            )

        # 2. Regex patterns
        for pattern_str, info in PATTERNS:
            if re.search(pattern_str, texto):
                self._stats["regex_match"] += 1

                # Extrai data de audiencia se aplicavel
                data_extraida = None
                if info["tipo"] == "audiencia":
                    data_extraida = self.date_extractor.extrair_data_audiencia(texto)

                return PatternMatch(
                    tipo=info["tipo"],
                    subtipo=info["subtipo"],
                    descricao=info["descricao"],
                    confianca=0.85,
                    gera_prazo=info["gera_prazo"],
                    dias_prazo=info["dias"],
                    dias_uteis=info.get("dias_uteis", True),
                    fundamento_legal=info.get("fundamento", ""),
                    prioridade=info["prioridade"],
                    data_extraida=data_extraida,
                    palavras_chave=[p for p in info["subtipo"].split("_")],
                )

        # 3. NLP para textos ambiguos
        if self.usar_nlp and self.nlp_classifier:
            tipo_nlp = self.nlp_classifier.classificar_complexo(texto)
            if tipo_nlp:
                self._stats["nlp_match"] += 1
                # Busca info do tipo
                for _, info in PATTERNS:
                    if info["tipo"] == tipo_nlp:
                        return PatternMatch(
                            tipo=tipo_nlp,
                            subtipo=f"{tipo_nlp}_nlp",
                            descricao=f"{info['descricao']} (NLP)",
                            confianca=0.65,
                            gera_prazo=info["gera_prazo"],
                            dias_prazo=info["dias"],
                            dias_uteis=info.get("dias_uteis", True),
                            fundamento_legal=info.get("fundamento", ""),
                            prioridade=info["prioridade"],
                        )

        # 4. Sem match
        self._stats["sem_match"] += 1
        return PatternMatch(
            tipo="desconhecido",
            subtipo="nao_classificado",
            descricao="Andamento nao classificado",
            confianca=0.0,
            gera_prazo=False,
        )

    def parse_batch(self, andamentos: List[Dict]) -> List[Dict]:
        """
        Analisa lote de andamentos e retorna classificacoes + prazos.

        Cada andamento deve ter: 'data', 'descricao', opcionalmente 'codigo_cnj'
        """
        resultados = []
        for and_item in andamentos:
            texto = and_item.get("descricao", "")
            data_str = and_item.get("data", "")
            codigo = and_item.get("codigo_cnj")

            if not texto:
                continue

            match = self.parse(texto, data_str, int(codigo) if codigo else None)

            resultado = {
                "texto_original": texto,
                "data_andamento": data_str,
                "classificacao": {
                    "tipo": match.tipo,
                    "subtipo": match.subtipo,
                    "descricao": match.descricao,
                    "confianca": match.confianca,
                    "prioridade": match.prioridade,
                },
                "gera_prazo": match.gera_prazo,
            }

            if match.gera_prazo and match.dias_prazo > 0:
                resultado["prazo"] = {
                    "dias": match.dias_prazo,
                    "dias_uteis": match.dias_uteis,
                    "fundamento_legal": match.fundamento_legal,
                }

            if match.data_extraida:
                resultado["data_evento"] = match.data_extraida.isoformat()

            # Extrai entidades NLP
            if self.usar_nlp and self.nlp_classifier:
                entidades = self.nlp_classifier.extrair_entidades(texto)
                if entidades:
                    resultado["entidades_nlp"] = entidades

            resultados.append(resultado)

        return resultados

    def get_stats(self) -> dict:
        return dict(self._stats)
