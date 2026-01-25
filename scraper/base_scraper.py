"""
Base class for all tribunal scrapers
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime
import json


@dataclass
class Movimentacao:
    """Represents a case movement/update"""
    data: str
    descricao: str
    detalhes: Optional[str] = None


@dataclass
class ProcessoInfo:
    """Represents information about a legal case"""
    numero: str
    numero_unico: Optional[str] = None  # CNJ number if available
    classe: Optional[str] = None
    assunto: Optional[str] = None
    relator: Optional[str] = None
    origem: Optional[str] = None
    partes: List[str] = field(default_factory=list)
    movimentacoes: List[Movimentacao] = field(default_factory=list)
    tribunal: str = ""
    url: Optional[str] = None
    data_consulta: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self):
        return {
            "numero": self.numero,
            "numero_unico": self.numero_unico,
            "classe": self.classe,
            "assunto": self.assunto,
            "relator": self.relator,
            "origem": self.origem,
            "partes": self.partes,
            "movimentacoes": [
                {"data": m.data, "descricao": m.descricao, "detalhes": m.detalhes}
                for m in self.movimentacoes
            ],
            "tribunal": self.tribunal,
            "url": self.url,
            "data_consulta": self.data_consulta
        }
    
    def to_json(self):
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)


@dataclass
class ResultadoBusca:
    """Represents search results"""
    tribunal: str
    tipo_busca: str  # "numero" or "nome"
    termo_busca: str
    processos: List[ProcessoInfo] = field(default_factory=list)
    erro: Optional[str] = None
    data_consulta: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self):
        return {
            "tribunal": self.tribunal,
            "tipo_busca": self.tipo_busca,
            "termo_busca": self.termo_busca,
            "processos": [p.to_dict() for p in self.processos],
            "erro": self.erro,
            "data_consulta": self.data_consulta,
            "total_encontrados": len(self.processos)
        }
    
    def to_json(self):
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)


class BaseScraper(ABC):
    """Abstract base class for tribunal scrapers"""
    
    def __init__(self):
        self.tribunal_nome = "Base"
        self.tribunal_sigla = "BASE"
        self.base_url = ""
    
    @abstractmethod
    async def buscar_por_numero(self, numero: str) -> ResultadoBusca:
        """Search for a case by its number"""
        pass
    
    @abstractmethod
    async def buscar_por_nome(self, nome: str) -> ResultadoBusca:
        """Search for cases by party name"""
        pass
    
    async def buscar(self, termo: str, tipo: str = "numero") -> ResultadoBusca:
        """Generic search method"""
        if tipo == "numero":
            return await self.buscar_por_numero(termo)
        elif tipo == "nome":
            return await self.buscar_por_nome(termo)
        else:
            return ResultadoBusca(
                tribunal=self.tribunal_sigla,
                tipo_busca=tipo,
                termo_busca=termo,
                erro=f"Tipo de busca inválido: {tipo}"
            )
