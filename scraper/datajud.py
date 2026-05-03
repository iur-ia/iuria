"""
DataJud API - API Pública do CNJ
Cobre 100% dos tribunais do Brasil
Chave pública disponível em: https://datajud-wiki.cnj.jus.br/api-publica/acesso/
"""
import requests
import json
import sys
import os
from typing import Optional, Dict, List

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from base_scraper import ProcessoInfo, Movimentacao, ResultadoBusca

DATAJUD_API_KEY = os.environ.get(
    "DATAJUD_API_KEY",
    "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==",
)
DATAJUD_BASE_URL = "https://api-publica.datajud.cnj.jus.br"

TRIBUNAL_INDICES = {
    "STF": "api_publica_stf",
    "STJ": "api_publica_stj",
    "TST": "api_publica_tst",
    "TSE": "api_publica_tse",
    "STM": "api_publica_stm",
    "TRF1": "api_publica_trf1",
    "TRF2": "api_publica_trf2",
    "TRF3": "api_publica_trf3",
    "TRF4": "api_publica_trf4",
    "TRF5": "api_publica_trf5",
    "TRF6": "api_publica_trf6",
    "TRT1": "api_publica_trt1",
    "TRT2": "api_publica_trt2",
    "TRT3": "api_publica_trt3",
    "TRT4": "api_publica_trt4",
    "TRT5": "api_publica_trt5",
    "TRT6": "api_publica_trt6",
    "TRT7": "api_publica_trt7",
    "TRT8": "api_publica_trt8",
    "TRT9": "api_publica_trt9",
    "TRT10": "api_publica_trt10",
    "TRT11": "api_publica_trt11",
    "TRT12": "api_publica_trt12",
    "TRT13": "api_publica_trt13",
    "TRT14": "api_publica_trt14",
    "TRT15": "api_publica_trt15",
    "TRT16": "api_publica_trt16",
    "TRT17": "api_publica_trt17",
    "TRT18": "api_publica_trt18",
    "TRT19": "api_publica_trt19",
    "TRT20": "api_publica_trt20",
    "TRT21": "api_publica_trt21",
    "TRT22": "api_publica_trt22",
    "TRT23": "api_publica_trt23",
    "TRT24": "api_publica_trt24",
    "TJAC": "api_publica_tjac",
    "TJAL": "api_publica_tjal",
    "TJAP": "api_publica_tjap",
    "TJAM": "api_publica_tjam",
    "TJBA": "api_publica_tjba",
    "TJCE": "api_publica_tjce",
    "TJDFT": "api_publica_tjdft",
    "TJES": "api_publica_tjes",
    "TJGO": "api_publica_tjgo",
    "TJMA": "api_publica_tjma",
    "TJMT": "api_publica_tjmt",
    "TJMS": "api_publica_tjms",
    "TJMG": "api_publica_tjmg",
    "TJPA": "api_publica_tjpa",
    "TJPB": "api_publica_tjpb",
    "TJPR": "api_publica_tjpr",
    "TJPE": "api_publica_tjpe",
    "TJPI": "api_publica_tjpi",
    "TJRJ": "api_publica_tjrj",
    "TJRN": "api_publica_tjrn",
    "TJRS": "api_publica_tjrs",
    "TJRO": "api_publica_tjro",
    "TJRR": "api_publica_tjrr",
    "TJSC": "api_publica_tjsc",
    "TJSE": "api_publica_tjse",
    "TJSP": "api_publica_tjsp",
    "TJTO": "api_publica_tjto",
}

TRIBUNAL_URLS = {
    "STF": "https://portal.stf.jus.br/processos/detalhe.asp?incidente=",
    "STJ": "https://processo.stj.jus.br/processo/deta.asp?num_registro=",
    "TRF1": "https://processual.trf1.jus.br/consultaProcessual/processo.php?proc=",
    "TRF2": "https://eproc.jfrj.jus.br/eproc2trf2/externo_controlador.php?acao=processo_consulta_externa",
    "TRF3": "https://pje1g.trf3.jus.br/consultapublica/#/consulta-publica",
    "TRF4": "https://eproc.trf4.jus.br/eproc2trf4/externo_controlador.php",
    "TRF5": "https://pje.trf5.jus.br/pje/ConsultaPublica/listView.seam",
    "TJSP": "https://esaj.tjsp.jus.br/cpopg/show.do",
    "TJRJ": "https://www3.tjrj.jus.br/consultaprocessual/#/consultapublica",
    "TJMG": "https://pje.tjmg.jus.br/pje/ConsultaPublica/listView.seam",
    "TJRS": "https://www.tjrs.jus.br/site/processos/",
    "TJPR": "https://projudi.tjpr.jus.br/projudi/",
    "TJSC": "https://esaj.tjsc.jus.br/cpopg/open.do",
    "TJBA": "https://esaj.tjba.jus.br/cpopg/open.do",
    "TJPE": "https://pje.tjpe.jus.br/pje/ConsultaPublica/listView.seam",
    "TJGO": "https://projudi.tjgo.jus.br/BuscaProcesso",
    "TJCE": "https://esaj.tjce.jus.br/cpopg/open.do",
    "TJMA": "https://pje.tjma.jus.br/pje/ConsultaPublica/listView.seam",
    "TJMT": "https://pje.tjmt.jus.br/pje/ConsultaPublica/listView.seam",
    "TJMS": "https://esaj.tjms.jus.br/cpopg5/open.do",
    "TJPA": "https://pje.tjpa.jus.br/pje/ConsultaPublica/listView.seam",
    "TJPI": "https://pje.tjpi.jus.br/pje/ConsultaPublica/listView.seam",
    "TJRN": "https://pje.tjrn.jus.br/pje/ConsultaPublica/listView.seam",
    "TJSE": "https://pje.tjse.jus.br/pje/ConsultaPublica/listView.seam",
    "TJTO": "https://pje.tjto.jus.br/pje/ConsultaPublica/listView.seam",
    "TJAM": "https://consultasaj.tjam.jus.br/cpopg/open.do",
    "TJAC": "https://esaj.tjac.jus.br/esaj/",
    "TJES": "https://sistemas.tjes.jus.br/ediario/",
    "TJDFT": "https://www.tjdft.jus.br/servicos/processos/",
    "TJAL": "https://www2.tjal.jus.br/cpopg/open.do",
    "TJPB": "https://pjeinteirotenor.tjpb.jus.br/",
    "TJAP": "https://tucujuris.tjap.jus.br/tucujuris/",
    "TJRO": "https://projudi.tjro.jus.br/",
    "TJRR": "https://webapp.tjrr.jus.br/eJud/",
}


class DataJudClient:
    """Cliente para a API Pública do DataJud (CNJ)"""
    
    def __init__(self):
        self.api_key = DATAJUD_API_KEY
        self.base_url = DATAJUD_BASE_URL
        self.headers = {
            "Authorization": f"APIKey {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def _get_indice(self, tribunal: str) -> Optional[str]:
        """Retorna o índice ElasticSearch para o tribunal"""
        tribunal_upper = tribunal.upper()
        return TRIBUNAL_INDICES.get(tribunal_upper)
    
    def _get_url_portal(self, tribunal: str, numero: str) -> str:
        """Retorna URL do portal do tribunal"""
        tribunal_upper = tribunal.upper()
        base = TRIBUNAL_URLS.get(tribunal_upper, "")
        if base:
            return f"{base}?processo={numero}"
        return ""
    
    def buscar_por_numero(self, tribunal: str, numero_cnj: str) -> ResultadoBusca:
        """
        Busca processo por número CNJ no DataJud
        
        Args:
            tribunal: Sigla do tribunal (ex: TJSP, TRF2, STJ)
            numero_cnj: Número CNJ formatado (ex: 0000001-23.2024.8.19.0001)
        
        Returns:
            ResultadoBusca com os dados do processo
        """
        resultado = ResultadoBusca(
            tribunal=tribunal,
            tipo_busca="numero",
            termo_busca=numero_cnj
        )
        
        indice = self._get_indice(tribunal)
        if not indice:
            resultado.erro = f"Tribunal {tribunal} não suportado pelo DataJud"
            return resultado
        
        url = f"{self.base_url}/{indice}/_search"
        
        import re as _re
        numero_sem_mascara = _re.sub(r'[.\-]', '', numero_cnj.strip())
        
        query = {
            "query": {
                "bool": {
                    "should": [
                        {"term": {"numeroProcesso": numero_sem_mascara}},
                        {"match": {"numeroProcesso": numero_cnj}},
                    ],
                    "minimum_should_match": 1
                }
            }
        }
        
        try:
            response = requests.post(
                url,
                headers=self.headers,
                json=query,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                hits = data.get("hits", {}).get("hits", [])
                
                if hits:
                    for hit in hits[:5]:
                        processo = self._parse_hit(hit, tribunal, numero_cnj)
                        if processo:
                            resultado.processos.append(processo)
                else:
                    resultado.erro = f"Processo {numero_cnj} não encontrado no DataJud"
            elif response.status_code == 401:
                resultado.erro = "Chave DataJud inválida ou expirada"
            elif response.status_code == 404:
                resultado.erro = f"Índice {indice} não encontrado - tribunal pode não estar no DataJud"
            else:
                resultado.erro = f"Erro DataJud: {response.status_code}"
                
        except requests.RequestException as e:
            resultado.erro = f"Erro de conexão com DataJud: {str(e)}"
        
        return resultado
    
    def buscar_em_todos(self, numero_cnj: str) -> ResultadoBusca:
        """
        Busca em todos os tribunais usando o número CNJ
        Detecta automaticamente o tribunal pelo número
        """
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from cnj_parser import detectar_tribunal, parse_cnj
        
        tribunal, formato = detectar_tribunal(numero_cnj)
        
        if tribunal:
            return self.buscar_por_numero(tribunal, numero_cnj)
        
        resultado = ResultadoBusca(
            tribunal="DESCONHECIDO",
            tipo_busca="numero",
            termo_busca=numero_cnj,
            erro="Não foi possível detectar o tribunal pelo número do processo"
        )
        return resultado
    
    def _formatar_numero_cnj(self, numero_raw: str) -> str:
        """
        Formata numero sem mascara para o formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
        40005082620258260025 -> 4000508-26.2025.8.26.0025
        """
        if not numero_raw or len(numero_raw) != 20:
            return numero_raw
        try:
            nnnnnnn = numero_raw[0:7]
            dd = numero_raw[7:9]
            aaaa = numero_raw[9:13]
            j = numero_raw[13:14]
            tr = numero_raw[14:16]
            oooo = numero_raw[16:20]
            return f"{nnnnnnn}-{dd}.{aaaa}.{j}.{tr}.{oooo}"
        except:
            return numero_raw

    def _parse_hit(self, hit: dict, tribunal: str, numero: str) -> Optional[ProcessoInfo]:
        """Converte um hit do ElasticSearch em ProcessoInfo"""
        try:
            source = hit.get("_source", {})
            
            numero_raw = source.get("numeroProcesso", numero)
            numero_formatado = self._formatar_numero_cnj(numero_raw) if len(str(numero_raw)) == 20 else numero_raw
            
            processo = ProcessoInfo(
                numero=numero_formatado,
                numero_unico=numero_formatado,
                tribunal=tribunal
            )
            
            processo.classe = self._extract_descricao(source.get("classe"))
            processo.assunto = self._extract_assuntos(source.get("assuntos", []))
            processo.relator = self._extract_relator(source)
            processo.origem = self._extract_descricao(source.get("orgaoJulgador"))
            
            partes = source.get("partes", [])
            processo.partes = self._extract_partes(partes)
            
            movimentos = source.get("movimentos", [])
            processo.movimentacoes = self._extract_movimentos(movimentos)
            
            processo.url = self._get_url_portal(tribunal, processo.numero)
            
            return processo
            
        except Exception as e:
            print(f"Erro ao parsear hit DataJud: {e}", file=sys.stderr)
            return None
    
    def _extract_descricao(self, obj) -> Optional[str]:
        """Extrai nome legivel de objeto DataJud (usa 'nome' como preferencia, depois 'descricao')"""
        if not obj:
            return None
        if isinstance(obj, dict):
            return obj.get("nome") or obj.get("descricao") or str(obj)
        return str(obj)
    
    def _extract_assuntos(self, assuntos: list) -> Optional[str]:
        """Extrai lista de assuntos e retorna como string"""
        if not assuntos:
            return None
        descricoes = []
        for a in assuntos[:3]:
            if isinstance(a, dict):
                desc = a.get("nome") or a.get("descricao", "")
                if desc:
                    descricoes.append(desc)
        return " / ".join(descricoes) if descricoes else None
    
    def _extract_relator(self, source: dict) -> Optional[str]:
        """Extrai nome do relator"""
        relator = source.get("relator")
        if relator:
            if isinstance(relator, dict):
                return relator.get("nome")
            return str(relator)
        
        orgao = source.get("orgaoJulgador")
        if orgao and isinstance(orgao, dict):
            return orgao.get("descricao")
        
        return None
    
    def _extract_partes(self, partes: list) -> List[str]:
        """Extrai lista de partes"""
        result = []
        for parte in partes[:15]:
            if isinstance(parte, dict):
                nome = parte.get("nome", "")
                polo = parte.get("polo", "")
                tipo = parte.get("tipoPessoa", "")
                
                if nome:
                    if polo:
                        result.append(f"{polo}: {nome}")
                    else:
                        result.append(nome)
        return result
    
    def _extract_movimentos(self, movimentos: list) -> List[Movimentacao]:
        """Extrai lista de movimentações"""
        result = []
        for mov in movimentos[:30]:
            if isinstance(mov, dict):
                data_hora = mov.get("dataHora", "")
                
                if data_hora and len(data_hora) >= 10:
                    data = data_hora[:10]
                    try:
                        from datetime import datetime
                        dt = datetime.fromisoformat(data_hora[:19].replace("T", " "))
                        data = dt.strftime("%d/%m/%Y")
                    except:
                        pass
                else:
                    data = data_hora
                
                descricao = mov.get("nome") or self._extract_descricao(mov.get("codigo")) or "Movimentacao"
                
                complementos = mov.get("complementosTabelados", [])
                detalhes = None
                if complementos:
                    partes_detalhe = []
                    for c in complementos[:3]:
                        if isinstance(c, dict):
                            desc = c.get("nome") or c.get("descricao", "")
                            if desc:
                                partes_detalhe.append(desc)
                    if partes_detalhe:
                        detalhes = " | ".join(partes_detalhe)
                
                if data and descricao:
                    result.append(Movimentacao(
                        data=data,
                        descricao=descricao,
                        detalhes=detalhes
                    ))
        
        return result
    
    def listar_tribunais(self) -> list:
        """Retorna lista de todos os tribunais suportados pelo DataJud"""
        return [
            {"sigla": sigla, "indice": indice}
            for sigla, indice in TRIBUNAL_INDICES.items()
        ]


def buscar_datajud(tribunal: str, numero: str) -> dict:
    """Função de conveniência para busca no DataJud"""
    client = DataJudClient()
    resultado = client.buscar_por_numero(tribunal, numero)
    return resultado.to_dict()


def buscar_datajud_auto(numero: str) -> dict:
    """Detecta tribunal e busca automaticamente no DataJud"""
    client = DataJudClient()
    resultado = client.buscar_em_todos(numero)
    return resultado.to_dict()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print(json.dumps({"erro": "Uso: python datajud.py <tribunal> <numero_cnj>"}))
        sys.exit(1)
    
    tribunal = sys.argv[1].upper()
    numero = sys.argv[2]
    
    resultado = buscar_datajud(tribunal, numero)
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
