"""
DataJud API - API Pública do CNJ
Cobre 100% dos tribunais do Brasil
Chave pública disponível em: https://datajud-wiki.cnj.jus.br/api-publica/acesso/

Comportamento educado:
- Header de identificação do sistema
- Espera mínima entre requests no índice público
- Sem paralelismo agressivo no mesmo índice
- Retry exponencial em 429/503
- Cache curto (TTL configurável) por número CNJ
"""
import requests
import json
import sys
import os
import time
import threading
from typing import Optional, Dict, List

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from base_scraper import ProcessoInfo, Movimentacao, ResultadoBusca

DATAJUD_API_KEY = "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=="
DATAJUD_BASE_URL = "https://api-publica.datajud.cnj.jus.br"
DATAJUD_AUTH_URL = "https://api.cnj.jus.br"

DATAJUD_CACHE_TTL = int(os.environ.get("DATAJUD_CACHE_TTL", "300"))

_cache: Dict[str, tuple] = {}
_cache_lock = threading.Lock()

_last_request_time: float = 0.0
_request_lock = threading.Lock()
MIN_INTERVAL_PUBLICO = float(os.environ.get("DATAJUD_MIN_INTERVAL", "1.5"))

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


def _cache_get(key: str):
    with _cache_lock:
        entry = _cache.get(key)
        if entry and (time.time() - entry[1]) < DATAJUD_CACHE_TTL:
            return entry[0]
        return None


def _cache_set(key: str, value):
    with _cache_lock:
        _cache[key] = (value, time.time())


def _polite_wait():
    """Garante intervalo mínimo entre requests ao endpoint público."""
    global _last_request_time
    with _request_lock:
        now = time.time()
        elapsed = now - _last_request_time
        if elapsed < MIN_INTERVAL_PUBLICO:
            time.sleep(MIN_INTERVAL_PUBLICO - elapsed)
        _last_request_time = time.time()


def _post_with_retry(session: requests.Session, url: str, json_body: dict,
                     max_retries: int = 3) -> Optional[requests.Response]:
    """POST com retry exponencial em 429/503."""
    delay = 2.0
    for attempt in range(max_retries):
        try:
            _polite_wait()
            resp = session.post(url, json=json_body, timeout=30)
            if resp.status_code in (429, 503):
                wait = delay * (2 ** attempt)
                print(f"[datajud] {resp.status_code} — aguardando {wait:.1f}s (tentativa {attempt+1}/{max_retries})",
                      file=sys.stderr)
                time.sleep(wait)
                continue
            return resp
        except requests.RequestException as e:
            if attempt < max_retries - 1:
                time.sleep(delay * (2 ** attempt))
            else:
                raise
    return None


class DataJudClient:
    """Cliente polido para a API Pública do DataJud (CNJ)"""

    SYSTEM_UA = (
        "SistemaGestaoJuridica/2.0 "
        "(+https://lexos.app; contato@lexos.app)"
    )

    def __init__(self, auth_token: Optional[str] = None):
        self.api_key = DATAJUD_API_KEY
        self.auth_token = auth_token or os.environ.get("DATAJUD_AUTH_TOKEN")
        self.base_url = DATAJUD_BASE_URL

        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"APIKey {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": self.SYSTEM_UA,
            "X-App-Name": "LexOS-GestaoJuridica",
        })

        if self.auth_token:
            self.auth_session = requests.Session()
            self.auth_session.headers.update({
                "Authorization": f"Bearer {self.auth_token}",
                "Content-Type": "application/json",
                "User-Agent": self.SYSTEM_UA,
            })
        else:
            self.auth_session = None

    def _get_indice(self, tribunal: str) -> Optional[str]:
        return TRIBUNAL_INDICES.get(tribunal.upper())

    def _get_url_portal(self, tribunal: str, numero: str) -> str:
        base = TRIBUNAL_URLS.get(tribunal.upper(), "")
        if base:
            return f"{base}?processo={numero}"
        return ""

    def buscar_por_numero(self, tribunal: str, numero_cnj: str) -> ResultadoBusca:
        """
        Busca processo por número CNJ no DataJud.

        Tenta primeiro DataJud autenticado (api.cnj.jus.br) se houver token,
        depois cai para o endpoint público com comportamento educado.

        Args:
            tribunal: Sigla do tribunal (ex: TJSP, TRF2, STJ)
            numero_cnj: Número CNJ formatado (ex: 0000001-23.2024.8.19.0001)
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

        cache_key = f"{indice}:{numero_cnj}"
        cached = _cache_get(cache_key)
        if cached is not None:
            print(f"[datajud] Cache hit: {cache_key}", file=sys.stderr)
            return cached

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

        # Tenta endpoint autenticado primeiro quando token disponível
        if self.auth_session:
            resultado = self._buscar_autenticado(tribunal, indice, numero_cnj, query, resultado)
            if resultado.processos:
                _cache_set(cache_key, resultado)
                return resultado
            # Fallback para público se autenticado falhar
            print(
                f"[datajud] Autenticado sem resultado para {numero_cnj} — tentando público",
                file=sys.stderr
            )
            resultado.erro = None

        resultado = self._buscar_publico(tribunal, indice, numero_cnj, query, resultado)

        _cache_set(cache_key, resultado)
        return resultado

    def _buscar_autenticado(self, tribunal: str, indice: str,
                            numero_cnj: str, query: dict,
                            resultado: ResultadoBusca) -> ResultadoBusca:
        """
        Consulta no endpoint autenticado (api.cnj.jus.br) usando Bearer token.
        Chamado antes do endpoint público quando DATAJUD_AUTH_TOKEN está definido.
        """
        url = f"{DATAJUD_AUTH_URL}/{indice}/_search"
        try:
            response = _post_with_retry(self.auth_session, url, query)
            if response is None:
                resultado.erro = "Esgotadas as tentativas no endpoint autenticado DataJud"
                return resultado

            if response.status_code == 200:
                data = response.json()
                hits = data.get("hits", {}).get("hits", [])
                if hits:
                    for hit in hits[:5]:
                        processo = self._parse_hit(hit, tribunal, numero_cnj)
                        if processo:
                            resultado.processos.append(processo)
                    campos = self._contar_campos(resultado.processos[0]) if resultado.processos else 0
                    print(
                        f"[datajud] fonte=DataJud-Autenticado tribunal={tribunal} campos={campos}",
                        file=sys.stderr
                    )
            elif response.status_code in (401, 403):
                print(f"[datajud] Token inválido/expirado ({response.status_code}) — usando público",
                      file=sys.stderr)
            else:
                resultado.erro = f"Erro endpoint autenticado: {response.status_code}"
        except Exception as e:
            print(f"[datajud] Falha no endpoint autenticado: {e} — usando público", file=sys.stderr)

        return resultado

    def _buscar_publico(self, tribunal: str, indice: str,
                        numero_cnj: str, query: dict,
                        resultado: ResultadoBusca) -> ResultadoBusca:
        """Consulta no endpoint público com retry educado."""
        url = f"{self.base_url}/{indice}/_search"

        try:
            response = _post_with_retry(self.session, url, query)
            if response is None:
                resultado.erro = "Esgotadas as tentativas de acesso ao DataJud (429/503)"
                return resultado

            if response.status_code == 200:
                data = response.json()
                hits = data.get("hits", {}).get("hits", [])
                if hits:
                    for hit in hits[:5]:
                        processo = self._parse_hit(hit, tribunal, numero_cnj)
                        if processo:
                            resultado.processos.append(processo)
                    print(
                        f"[datajud] fonte=DataJud tribunal={tribunal} "
                        f"campos={self._contar_campos(resultado.processos[0]) if resultado.processos else 0}",
                        file=sys.stderr
                    )
                else:
                    resultado.erro = f"Processo {numero_cnj} não encontrado no DataJud"
            elif response.status_code == 401:
                resultado.erro = "Chave DataJud inválida ou expirada"
            elif response.status_code == 404:
                resultado.erro = f"Índice {indice} não encontrado"
            else:
                resultado.erro = f"Erro DataJud: {response.status_code}"

        except requests.RequestException as e:
            resultado.erro = f"Erro de conexão com DataJud: {str(e)}"

        return resultado

    def _contar_campos(self, processo: "ProcessoInfo") -> int:
        """Conta campos preenchidos no processo para telemetria."""
        campos = [
            processo.classe, processo.assunto, processo.relator,
            processo.origem, processo.numero_unico,
        ]
        count = sum(1 for c in campos if c)
        count += min(len(processo.partes or []), 5)
        count += min(len(processo.movimentacoes or []), 10)
        return count

    def buscar_em_todos(self, numero_cnj: str) -> ResultadoBusca:
        """Busca em todos os tribunais usando o número CNJ — detecta tribunal automaticamente."""
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from cnj_parser import detectar_tribunal

        tribunal, formato = detectar_tribunal(numero_cnj)
        if tribunal:
            return self.buscar_por_numero(tribunal, numero_cnj)

        return ResultadoBusca(
            tribunal="DESCONHECIDO",
            tipo_busca="numero",
            termo_busca=numero_cnj,
            erro="Não foi possível detectar o tribunal pelo número do processo"
        )

    def _formatar_numero_cnj(self, numero_raw: str) -> str:
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
        except Exception:
            return numero_raw

    def _parse_hit(self, hit: dict, tribunal: str, numero: str) -> Optional["ProcessoInfo"]:
        try:
            source = hit.get("_source", {})

            numero_raw = source.get("numeroProcesso", numero)
            numero_formatado = (
                self._formatar_numero_cnj(numero_raw)
                if len(str(numero_raw)) == 20
                else numero_raw
            )

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
        if not obj:
            return None
        if isinstance(obj, dict):
            return obj.get("nome") or obj.get("descricao") or str(obj)
        return str(obj)

    def _extract_assuntos(self, assuntos: list) -> Optional[str]:
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
        result = []
        for parte in partes[:15]:
            if isinstance(parte, dict):
                nome = parte.get("nome", "")
                polo = parte.get("polo", "")
                if nome:
                    result.append(f"{polo}: {nome}" if polo else nome)
        return result

    def _extract_movimentos(self, movimentos: list) -> List["Movimentacao"]:
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
                    except Exception:
                        pass
                else:
                    data = data_hora

                descricao = (
                    mov.get("nome")
                    or self._extract_descricao(mov.get("codigo"))
                    or "Movimentacao"
                )

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
                    result.append(Movimentacao(data=data, descricao=descricao, detalhes=detalhes))

        return result

    def listar_tribunais(self) -> list:
        return [
            {"sigla": sigla, "indice": indice}
            for sigla, indice in TRIBUNAL_INDICES.items()
        ]


def buscar_datajud(tribunal: str, numero: str) -> dict:
    client = DataJudClient()
    resultado = client.buscar_por_numero(tribunal, numero)
    return resultado.to_dict()


def buscar_datajud_auto(numero: str) -> dict:
    client = DataJudClient()
    resultado = client.buscar_em_todos(numero)
    return resultado.to_dict()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"erro": "Uso: python datajud.py <tribunal> <numero_cnj>"}))
        sys.exit(1)

    tribunal = sys.argv[1].upper()
    numero = sys.argv[2]
    resultado = buscar_datajud(tribunal, numero)
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
