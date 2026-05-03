"""
Cliente MNI (Modelo Nacional de Interoperabilidade) para o PJe.

Suporte a dois modos:
1. SOAP/zeep — quando o tribunal expõe o endpoint MNI WSDL e o usuário tem
   certificado/SSO ativo. Operações: consultarProcesso, consultarAvisosPendentes.
2. REST autenticado — CNJ Painel API / PJe REST / DataJud autenticado (fallback).

Hierarquia de tentativa para busca de processo:
  1. MNI SOAP (zeep) — via SSO token como WS-Security UsernameToken
  2. CNJ Painel API — dados consolidados de todos os tribunais
  3. PJe REST por tribunal — dados completos com sigilo
  4. DataJud autenticado — histórico de movimentos
"""
import sys
import os
import json
import requests
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field


@dataclass
class IntimacaoPJe:
    """Intimação recebida via SSO PJe / Painel CNJ."""
    id: str
    numero_processo: str
    tribunal: str
    data_disponibilizacao: Optional[str] = None
    data_prazo: Optional[str] = None
    texto: Optional[str] = None
    lida: bool = False
    tipo: Optional[str] = None
    url_processo: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'numero_processo': self.numero_processo,
            'tribunal': self.tribunal,
            'data_disponibilizacao': self.data_disponibilizacao,
            'data_prazo': self.data_prazo,
            'texto': self.texto,
            'lida': self.lida,
            'tipo': self.tipo,
            'url_processo': self.url_processo,
        }


@dataclass
class ProcessoPJeAutenticado:
    """Dados de processo retornados via acesso autenticado PJe/MNI."""
    numero: str
    tribunal: str
    classe: Optional[str] = None
    assunto: Optional[str] = None
    relator: Optional[str] = None
    data_distribuicao: Optional[str] = None
    situacao: Optional[str] = None
    segredo_justica: bool = False
    partes: List[Dict] = field(default_factory=list)
    movimentacoes: List[Dict] = field(default_factory=list)
    documentos: List[Dict] = field(default_factory=list)
    url_portal: Optional[str] = None
    fonte: str = "pje_autenticado"

    def to_dict(self) -> Dict[str, Any]:
        return {
            'numero': self.numero,
            'tribunal': self.tribunal,
            'classe': self.classe,
            'assunto': self.assunto,
            'relator': self.relator,
            'data_distribuicao': self.data_distribuicao,
            'situacao': self.situacao,
            'segredo_justica': self.segredo_justica,
            'partes': self.partes,
            'movimentacoes': self.movimentacoes,
            'documentos': self.documentos,
            'url_portal': self.url_portal,
            'fonte': self.fonte,
        }


class MNISoapClient:
    """
    Cliente SOAP para o endpoint MNI dos tribunais PJe.

    O MNI usa SOAP 1.1. O WSDL dos tribunais PJe 2.x geralmente está em:
      https://pje.{tribunal}.jus.br/pje/intercomunicacao?wsdl

    Usa zeep com o access_token do SSO como WS-Security UsernameToken.
    Cai silenciosamente se o tribunal não expuser MNI ou zeep não estiver instalado.
    """

    WSDL_PATHS = [
        "/pje/intercomunicacao?wsdl",
        "/pjecnj/intercomunicacao?wsdl",
        "/pje1g/intercomunicacao?wsdl",
    ]

    PJE_HOSTS: Dict[str, str] = {
        'TRF1': 'pje1g.trf1.jus.br',
        'TRF2': 'pje.trf2.jus.br',
        'TRF3': 'pje.trf3.jus.br',
        'TRF4': 'pje.trf4.jus.br',
        'TRF5': 'pje.trf5.jus.br',
        'TJMG': 'pje.tjmg.jus.br',
        'TJPE': 'pje.tjpe.jus.br',
        'TJRS': 'pje.tjrs.jus.br',
        'TJPR': 'pje.tjpr.jus.br',
        'TJGO': 'pje.tjgo.jus.br',
        'TJMA': 'pje.tjma.jus.br',
        'TJPI': 'pje.tjpi.jus.br',
        'TJRN': 'pje.tjrn.jus.br',
        'TJSE': 'pje.tjse.jus.br',
        'TJTO': 'pje.tjto.jus.br',
        'TJDFT': 'pje.tjdft.jus.br',
        'TJAL': 'pje.tjal.jus.br',
        'TJAM': 'pje.tjam.jus.br',
        'TJBA': 'pje2.tjba.jus.br',
        'TJCE': 'pje.tjce.jus.br',
        'TJMS': 'pje.tjms.jus.br',
        'TJMT': 'pje.tjmt.jus.br',
        'TJPA': 'pje.tjpa.jus.br',
        'TJPB': 'pje.tjpb.jus.br',
        'TJRJ': 'pje.tjrj.jus.br',
        'TJSC': 'pje.tjsc.jus.br',
        'TJSP': 'pje.tjsp.jus.br',
    }

    def __init__(self, access_token: str, token_type: str = "Bearer"):
        self.access_token = access_token
        self.token_type = token_type
        self._zeep_available = self._check_zeep()

    def _check_zeep(self) -> bool:
        try:
            import zeep  # noqa: F401
            return True
        except ImportError:
            print("[mni_soap] zeep não instalado — SOAP MNI desabilitado", file=sys.stderr)
            return False

    def _get_wsdl_url(self, tribunal: str) -> Optional[str]:
        """
        Descobre a URL do WSDL MNI do tribunal via GET (mais compatível que HEAD,
        já que alguns servidores Java retornam 405 para HEAD no WSDL endpoint).
        """
        host = self.PJE_HOSTS.get(tribunal.upper())
        if not host:
            return None
        for path in self.WSDL_PATHS:
            url = f"https://{host}{path}"
            try:
                resp = requests.get(
                    url,
                    timeout=8,
                    headers={"User-Agent": "MNIClient/2.0"},
                    stream=True,  # evita baixar o WSDL inteiro
                )
                # Qualquer 2xx ou redirect indica que o WSDL existe
                if resp.status_code in (200, 301, 302, 307, 308):
                    # Verificação leve: WSDL deve conter "wsdl" ou "definitions"
                    content_start = next(resp.iter_content(512), b"")
                    if b"wsdl" in content_start.lower() or b"definitions" in content_start.lower():
                        return url
            except Exception:
                continue
        return None

    def _build_client(self, wsdl_url: str, username: Optional[str] = None):
        """
        Constrói cliente zeep com WS-Security UsernameToken no envelope SOAP.

        PJe MNI 2.x aceita UsernameToken com:
          - Username = OAB/CPF do usuário (ou vazio para modo token-only)
          - Password = access_token Bearer do SSO

        Adicionalmente propaga o token no header HTTP Authorization como
        Bearer para compatibilidade com servidores que verificam ambos.
        """
        from zeep import Client
        from zeep.transports import Transport
        from zeep.wsse import UsernameToken

        session = requests.Session()
        session.headers.update({
            "Authorization": f"{self.token_type} {self.access_token}",
            "User-Agent": "MNIClient/2.0 (LexOS-GestaoJuridica)",
            "Content-Type": "text/xml; charset=utf-8",
        })
        transport = Transport(session=session, timeout=30, operation_timeout=60)

        # WS-Security UsernameToken: username = OAB/CPF, password = access_token
        # PasswordText (use_digest=False) — compatível com PJe MNI 2.x.
        # timestamp_token deve ser None (padrão); True/False quebra em runtime
        # porque zeep espera um XML Element, não bool.
        wsse_username = username or os.environ.get("MNI_USERNAME", "")
        wsse = UsernameToken(
            username=wsse_username,
            password=self.access_token,
            use_digest=False,
        )

        return Client(wsdl_url, transport=transport, wsse=wsse)

    def consultar_processo(self, numero: str, tribunal: str) -> Optional[ProcessoPJeAutenticado]:
        """
        Chama consultarProcesso no endpoint MNI do tribunal.
        Retorna None se o tribunal não expuser MNI ou se zeep não estiver instalado.
        """
        if not self._zeep_available:
            return None

        wsdl_url = self._get_wsdl_url(tribunal)
        if not wsdl_url:
            print(f"[mni_soap] Tribunal {tribunal} não tem WSDL MNI acessível", file=sys.stderr)
            return None

        try:
            client = self._build_client(wsdl_url)
            service = client.service

            numero_limpo = numero.replace('-', '').replace('.', '')

            if hasattr(service, 'consultarProcesso'):
                resp = service.consultarProcesso(
                    numProcesso=numero_limpo,
                    movimentoCompleto=True,
                )
            elif hasattr(service, 'consultaProcesso'):
                resp = service.consultaProcesso(
                    numProcesso=numero_limpo,
                )
            else:
                print(f"[mni_soap] Operação consultarProcesso não encontrada em {wsdl_url}", file=sys.stderr)
                return None

            return self._parse_soap_processo(resp, numero, tribunal)

        except Exception as e:
            print(f"[mni_soap] Erro ao chamar consultarProcesso {tribunal}: {e}", file=sys.stderr)
            return None

    def consultar_avisos_pendentes(
        self,
        tribunal: str,
        numero_oab: Optional[str] = None,
        estado_oab: Optional[str] = None,
        cpf: Optional[str] = None,
    ) -> List[IntimacaoPJe]:
        """
        Chama consultarAvisosPendentes no endpoint MNI do tribunal.
        Retorna lista vazia se não disponível.
        """
        if not self._zeep_available:
            return []

        wsdl_url = self._get_wsdl_url(tribunal)
        if not wsdl_url:
            return []

        try:
            client = self._build_client(wsdl_url)
            service = client.service

            kwargs: Dict[str, Any] = {}
            if numero_oab:
                kwargs['numeroOAB'] = numero_oab
            if estado_oab:
                kwargs['estadoOAB'] = estado_oab
            if cpf:
                kwargs['cpf'] = cpf

            if hasattr(service, 'consultarAvisosPendentes'):
                resp = service.consultarAvisosPendentes(**kwargs)
            elif hasattr(service, 'consultaAvisosPendentes'):
                resp = service.consultaAvisosPendentes(**kwargs)
            else:
                return []

            return self._parse_soap_avisos(resp, tribunal)

        except Exception as e:
            print(f"[mni_soap] Erro ao chamar consultarAvisosPendentes {tribunal}: {e}", file=sys.stderr)
            return []

    def _parse_soap_processo(self, resp, numero: str, tribunal: str) -> Optional[ProcessoPJeAutenticado]:
        """Parseia resposta SOAP de consultarProcesso para ProcessoPJeAutenticado."""
        try:
            if resp is None:
                return None

            resp_dict = {}
            if hasattr(resp, '__dict__'):
                resp_dict = {k: v for k, v in resp.__dict__.items() if not k.startswith('_')}
            elif isinstance(resp, dict):
                resp_dict = resp

            processo = ProcessoPJeAutenticado(
                numero=numero,
                tribunal=tribunal,
                fonte="mni_soap",
            )

            processo.classe = (
                self._soap_str(resp_dict.get('classeProcessual'))
                or self._soap_str(resp_dict.get('classe'))
            )
            processo.assunto = self._soap_str(resp_dict.get('assunto'))
            processo.relator = self._soap_str(resp_dict.get('magistrado') or resp_dict.get('relator'))
            processo.data_distribuicao = self._soap_str(resp_dict.get('dataAjuizamento') or resp_dict.get('dataDistribuicao'))
            processo.situacao = self._soap_str(resp_dict.get('fase') or resp_dict.get('situacao'))

            partes_raw = resp_dict.get('polo') or resp_dict.get('partes') or []
            if not isinstance(partes_raw, list):
                partes_raw = [partes_raw]
            for polo in partes_raw:
                if polo is None:
                    continue
                polo_dict = polo.__dict__ if hasattr(polo, '__dict__') else (polo if isinstance(polo, dict) else {})
                for participante in (polo_dict.get('participante') or []):
                    p_dict = participante.__dict__ if hasattr(participante, '__dict__') else (participante if isinstance(participante, dict) else {})
                    nome = self._soap_str(p_dict.get('nomeParticipante') or p_dict.get('nome'))
                    if nome:
                        processo.partes.append({
                            'nome': nome,
                            'tipo': self._soap_str(p_dict.get('tipoParticipante') or polo_dict.get('tipoPolo', '')),
                            'cpf_cnpj': self._soap_str(p_dict.get('cpf') or p_dict.get('cnpj') or ''),
                        })

            movs_raw = resp_dict.get('movimento') or resp_dict.get('movimentos') or []
            if not isinstance(movs_raw, list):
                movs_raw = [movs_raw]
            for mov in movs_raw[:50]:
                if mov is None:
                    continue
                m_dict = mov.__dict__ if hasattr(mov, '__dict__') else (mov if isinstance(mov, dict) else {})
                data = self._soap_str(m_dict.get('dataHora') or m_dict.get('data') or '')
                descricao = self._soap_str(m_dict.get('nome') or m_dict.get('descricao') or '')
                if data or descricao:
                    processo.movimentacoes.append({
                        'data': data,
                        'descricao': descricao,
                        'detalhes': self._soap_str(m_dict.get('complemento')),
                    })

            host = MNISoapClient.PJE_HOSTS.get(tribunal.upper(), '')
            if host:
                numero_limpo = numero.replace('-', '').replace('.', '')
                processo.url_portal = f"https://{host}/pje/Processo/ConsultaDocumento/listView.seam"

            return processo

        except Exception as e:
            print(f"[mni_soap] Erro ao parsear resposta SOAP: {e}", file=sys.stderr)
            return None

    def _parse_soap_avisos(self, resp, tribunal: str) -> List[IntimacaoPJe]:
        intimacoes = []
        try:
            if resp is None:
                return intimacoes
            avisos_raw = []
            if hasattr(resp, 'aviso'):
                avisos_raw = resp.aviso if isinstance(resp.aviso, list) else [resp.aviso]
            elif isinstance(resp, list):
                avisos_raw = resp

            for aviso in avisos_raw:
                if aviso is None:
                    continue
                d = aviso.__dict__ if hasattr(aviso, '__dict__') else (aviso if isinstance(aviso, dict) else {})
                intimacoes.append(IntimacaoPJe(
                    id=str(d.get('idAviso', d.get('id', ''))),
                    numero_processo=self._soap_str(d.get('numeroProcesso', '')),
                    tribunal=tribunal,
                    data_disponibilizacao=self._soap_str(d.get('dataDisponibilizacao')),
                    data_prazo=self._soap_str(d.get('dataPrazo')),
                    texto=(self._soap_str(d.get('texto', '')) or '')[:500],
                    lida=bool(d.get('lida', False)),
                    tipo=self._soap_str(d.get('tipo')),
                ))
        except Exception as e:
            print(f"[mni_soap] Erro ao parsear avisos SOAP: {e}", file=sys.stderr)
        return intimacoes

    def _soap_str(self, val) -> Optional[str]:
        if val is None:
            return None
        if isinstance(val, str):
            return val or None
        return str(val) or None


class MNIClientAutenticado:
    """
    Cliente REST/SOAP para acesso autenticado ao PJe via SSO Nacional.

    Aceita o access_token obtido após autenticação com SSO CNJ e:
    1. Tenta SOAP MNI (via zeep) se o tribunal expuser o WSDL
    2. Cai para APIs REST autenticadas (Painel CNJ / PJe REST / DataJud)
    """

    CNJ_PAINEL_BASE = "https://painel.cnj.jus.br"
    CNJ_API_BASE = "https://api.cnj.jus.br"

    PJE_HOSTS: Dict[str, str] = {
        'TRF1': 'pje1g.trf1.jus.br',
        'TRF2': 'pje.trf2.jus.br',
        'TRF3': 'pje.trf3.jus.br',
        'TRF4': 'pje.trf4.jus.br',
        'TRF5': 'pje.trf5.jus.br',
        'TJMG': 'pje.tjmg.jus.br',
        'TJPE': 'pje.tjpe.jus.br',
        'TJRS': 'pje.tjrs.jus.br',
        'TJPR': 'pje.tjpr.jus.br',
        'TJGO': 'pje.tjgo.jus.br',
        'TJMA': 'pje.tjma.jus.br',
        'TJPI': 'pje.tjpi.jus.br',
        'TJRN': 'pje.tjrn.jus.br',
        'TJSE': 'pje.tjse.jus.br',
        'TJTO': 'pje.tjto.jus.br',
        'TJDFT': 'pje.tjdft.jus.br',
        'TJAL': 'pje.tjal.jus.br',
        'TJAM': 'pje.tjam.jus.br',
        'TJBA': 'pje2.tjba.jus.br',
        'TJCE': 'pje.tjce.jus.br',
        'TJMS': 'pje.tjms.jus.br',
        'TJMT': 'pje.tjmt.jus.br',
        'TJPA': 'pje.tjpa.jus.br',
        'TJPB': 'pje.tjpb.jus.br',
        'TJRJ': 'pje.tjrj.jus.br',
        'TJSC': 'pje.tjsc.jus.br',
        'TJSP': 'pje.tjsp.jus.br',
    }

    def __init__(self, access_token: str, token_type: str = "Bearer"):
        self.access_token = access_token
        self.token_type = token_type
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'{token_type} {access_token}',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'SistemaGestaoJuridica/2.0 (LexOS; contato@lexos.app)',
        })
        self._soap_client = MNISoapClient(access_token, token_type)

    def _get_json(self, url: str, params: dict = None, timeout: int = 20) -> Optional[dict]:
        try:
            resp = self.session.get(url, params=params, timeout=timeout)
            if resp.status_code == 401:
                print(f"[mni] Token expirado ou inválido ao acessar {url}", file=sys.stderr)
                return None
            if resp.status_code == 403:
                print(f"[mni] Acesso negado (403) a {url}", file=sys.stderr)
                return None
            resp.raise_for_status()
            return resp.json()
        except requests.Timeout:
            print(f"[mni] Timeout ao acessar {url}", file=sys.stderr)
            return None
        except requests.ConnectionError:
            print(f"[mni] Erro de conexão ao acessar {url}", file=sys.stderr)
            return None
        except Exception as e:
            print(f"[mni] Erro ao acessar {url}: {e}", file=sys.stderr)
            return None

    def verificar_token(self) -> Dict[str, Any]:
        try:
            resp = self.session.get(
                "https://sso.cloud.pje.jus.br/auth/realms/pje/protocol/openid-connect/userinfo",
                timeout=10,
            )
            if resp.ok:
                info = resp.json()
                return {
                    'valido': True,
                    'nome': info.get('name') or info.get('preferred_username'),
                    'email': info.get('email'),
                    'cpf': info.get('cpf'),
                    'sub': info.get('sub'),
                }
            return {'valido': False, 'erro': f'HTTP {resp.status_code}'}
        except Exception as e:
            return {'valido': False, 'erro': str(e)}

    def buscar_processo(self, numero: str, tribunal: str) -> Optional[ProcessoPJeAutenticado]:
        """
        Busca dados completos do processo.
        Tenta: MNI SOAP → CNJ Painel → PJe REST → DataJud autenticado.
        """
        numero_limpo = numero.replace('-', '').replace('.', '')

        print(f"[mni] Buscando processo {numero} no {tribunal}", file=sys.stderr)

        # 1. Tentar MNI SOAP (zeep) se tribunal suportar
        proc_soap = self._soap_client.consultar_processo(numero, tribunal)
        if proc_soap:
            print(f"[mni] fonte=MNI_SOAP tribunal={tribunal}", file=sys.stderr)
            return proc_soap

        # 2. Tentar CNJ Painel API
        dados = self._get_json(f"{self.CNJ_PAINEL_BASE}/api/v1/processos/{numero_limpo}")
        if not dados:
            dados = self._get_json(
                f"{self.CNJ_PAINEL_BASE}/api/v1/processos",
                params={'numero': numero_limpo}
            )

        # 3. Tentar PJe REST do tribunal
        if not dados and tribunal.upper() in self.PJE_HOSTS:
            host = self.PJE_HOSTS[tribunal.upper()]
            dados = self._get_json(f"https://{host}/pje/api/v1/processos/{numero_limpo}")
            if not dados:
                dados = self._get_json(
                    f"https://{host}/pjecnj/api/processos",
                    params={'numero': numero_limpo}
                )

        # 4. Tentar DataJud autenticado
        if not dados:
            dados = self._get_json(
                f"{self.CNJ_API_BASE}/v2/processos",
                params={'numero': numero}
            )

        if not dados:
            return None

        fonte = "mni_rest"
        hits = dados.get('hits', {}).get('hits', [])
        if hits:
            dados = hits[0].get('_source', dados)
            fonte = "datajud_autenticado"

        print(f"[mni] fonte={fonte} tribunal={tribunal}", file=sys.stderr)

        processo = ProcessoPJeAutenticado(
            numero=numero,
            tribunal=tribunal,
            classe=self._extrair_str(dados, ['classe', 'classeProcessual'], ['nome', 'descricao']),
            assunto=self._extrair_str(dados, ['assunto', 'assuntos'], ['nome', 'descricao']),
            relator=self._extrair_str(dados, ['relator', 'magistrado'], ['nome']),
            data_distribuicao=dados.get('dataDistribuicao') or dados.get('dataAjuizamento'),
            situacao=dados.get('situacao') or dados.get('status') or dados.get('fase'),
            segredo_justica=bool(dados.get('segredoJustica') or dados.get('sigilo')),
            url_portal=dados.get('url') or self._gerar_url_portal(numero_limpo, tribunal),
            fonte=fonte,
        )

        partes_raw = dados.get('partes', dados.get('polo', []))
        if isinstance(partes_raw, list):
            for parte in partes_raw:
                if isinstance(parte, dict):
                    processo.partes.append({
                        'nome': parte.get('nome') or parte.get('nomeParticipante', ''),
                        'tipo': parte.get('tipo') or parte.get('polo', ''),
                        'cpf_cnpj': parte.get('cpf') or parte.get('cnpj') or '',
                    })
                elif isinstance(parte, str):
                    processo.partes.append({'nome': parte, 'tipo': '', 'cpf_cnpj': ''})

        movs_raw = dados.get('movimentos', dados.get('movimentacoes', []))
        if isinstance(movs_raw, list):
            for mov in movs_raw[:50]:
                if isinstance(mov, dict):
                    processo.movimentacoes.append({
                        'data': mov.get('dataHora') or mov.get('data', ''),
                        'descricao': (
                            mov.get('nome') or
                            mov.get('descricao') or
                            (mov.get('complementosTabelados', [{}])[0].get('descricao')
                             if mov.get('complementosTabelados') else '') or ''
                        ),
                        'detalhes': mov.get('complemento') or mov.get('detalhe'),
                    })

        docs_raw = dados.get('documentos', [])
        if isinstance(docs_raw, list):
            for doc in docs_raw[:20]:
                if isinstance(doc, dict):
                    processo.documentos.append({
                        'id': doc.get('id', ''),
                        'tipo': doc.get('tipo') or doc.get('descricao', ''),
                        'data': doc.get('dataJuntada') or doc.get('data', ''),
                        'descricao': doc.get('descricao', ''),
                    })

        return processo

    def _extrair_str(self, dados: dict, campos: list, subcampos: list = None) -> Optional[str]:
        for campo in campos:
            val = dados.get(campo)
            if val is None:
                continue
            if isinstance(val, str) and val:
                return val
            if isinstance(val, dict) and subcampos:
                for sub in subcampos:
                    if val.get(sub):
                        return str(val[sub])
            if isinstance(val, list) and val:
                primeiro = val[0]
                if isinstance(primeiro, str):
                    return primeiro
                if isinstance(primeiro, dict) and subcampos:
                    for sub in subcampos:
                        if primeiro.get(sub):
                            return str(primeiro[sub])
        return None

    def _gerar_url_portal(self, numero_limpo: str, tribunal: str) -> str:
        host = self.PJE_HOSTS.get(tribunal.upper())
        if host:
            return f"https://{host}/pje/Processo/ConsultaDocumento/listView.seam"
        return "https://pje.cnj.jus.br/pjecnj/Processo/ConsultaDocumento/listView.seam"

    def listar_intimacoes(
        self,
        apenas_nao_lidas: bool = True,
        pagina: int = 1,
        por_pagina: int = 50,
    ) -> List[IntimacaoPJe]:
        """Lista intimações pendentes via CNJ Painel API."""
        params = {
            'page': pagina - 1,
            'size': por_pagina,
            'sort': 'dataDisponibilizacao,desc',
        }
        if apenas_nao_lidas:
            params['lida'] = 'false'

        dados = self._get_json(f"{self.CNJ_PAINEL_BASE}/api/v1/intimacoes", params=params)

        intimacoes = []
        if not dados:
            return intimacoes

        itens = dados if isinstance(dados, list) else dados.get('content', [])
        for item in itens:
            if not isinstance(item, dict):
                continue
            intimacoes.append(IntimacaoPJe(
                id=str(item.get('id', '')),
                numero_processo=item.get('numeroProcesso', ''),
                tribunal=item.get('tribunal', item.get('siglaTribunal', '')),
                data_disponibilizacao=item.get('dataDisponibilizacao'),
                data_prazo=item.get('dataPrazo') or item.get('dataLimite'),
                texto=(item.get('texto', '') or '')[:500],
                lida=bool(item.get('lida', False)),
                tipo=item.get('tipo') or item.get('tipoIntimacao'),
                url_processo=item.get('urlProcesso'),
            ))

        return intimacoes

    def marcar_intimacao_lida(self, intimacao_id: str) -> bool:
        try:
            resp = self.session.patch(
                f"{self.CNJ_PAINEL_BASE}/api/v1/intimacoes/{intimacao_id}",
                json={'lida': True},
                timeout=15,
            )
            return resp.ok
        except Exception:
            return False

    def baixar_documento(
        self,
        documento_id: str,
        tribunal: str,
        numero_processo: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Baixa conteúdo de documento via PJe autenticado."""
        import base64

        host = self.PJE_HOSTS.get(tribunal.upper())
        if host:
            urls_tentar = [
                f"https://{host}/pje/api/v1/documentos/{documento_id}/download",
                f"https://{host}/pjecnj/api/documentos/{documento_id}/conteudo",
            ]
            for url in urls_tentar:
                try:
                    resp = self.session.get(url, timeout=30, stream=True)
                    if resp.ok and resp.content:
                        conteudo = resp.content
                        nome = (
                            resp.headers.get('Content-Disposition', '')
                            .split('filename=')[-1].strip('"\'')
                            or f"documento_{documento_id}.pdf"
                        )
                        return {
                            'documento_id': documento_id,
                            'conteudo_base64': base64.b64encode(conteudo).decode('utf-8'),
                            'nome_arquivo': nome,
                            'mime_type': resp.headers.get('Content-Type', 'application/pdf').split(';')[0].strip(),
                            'tamanho': len(conteudo),
                            'fonte': 'pje_tribunal',
                        }
                except Exception as e:
                    print(f"[mni] Falha ao baixar de {url}: {e}", file=sys.stderr)

        url_painel = f"{self.CNJ_PAINEL_BASE}/api/v1/documentos/{documento_id}/download"
        try:
            resp = self.session.get(url_painel, timeout=30, stream=True)
            if resp.ok and resp.content:
                conteudo = resp.content
                nome = (
                    resp.headers.get('Content-Disposition', '')
                    .split('filename=')[-1].strip('"\'')
                    or f"documento_{documento_id}.pdf"
                )
                return {
                    'documento_id': documento_id,
                    'conteudo_base64': base64.b64encode(conteudo).decode('utf-8'),
                    'nome_arquivo': nome,
                    'mime_type': resp.headers.get('Content-Type', 'application/pdf').split(';')[0].strip(),
                    'tamanho': len(conteudo),
                    'fonte': 'cnj_painel',
                }
        except Exception as e:
            print(f"[mni] Falha ao baixar do painel CNJ: {e}", file=sys.stderr)

        return {
            'documento_id': documento_id,
            'erro': f'Documento {documento_id} não encontrado no tribunal {tribunal} ou no Painel CNJ',
        }


def main():
    """CLI: python mni_client.py <acao> <access_token> [args...]"""
    if len(sys.argv) < 3:
        print(json.dumps({'erro': 'Uso: mni_client.py <acao> <access_token> [args]'}))
        sys.exit(1)

    acao = sys.argv[1]
    access_token = sys.argv[2]
    client = MNIClientAutenticado(access_token)

    if acao == 'verificar':
        resultado = client.verificar_token()
        print(json.dumps(resultado))

    elif acao == 'processo':
        if len(sys.argv) < 5:
            print(json.dumps({'erro': 'Uso: mni_client.py processo <token> <numero> <tribunal>'}))
            sys.exit(1)
        numero = sys.argv[3]
        tribunal = sys.argv[4]
        proc = client.buscar_processo(numero, tribunal)
        if proc:
            print(json.dumps(proc.to_dict()))
        else:
            print(json.dumps({'erro': 'Processo não encontrado via acesso autenticado'}))

    elif acao == 'intimacoes':
        apenas_nao_lidas = (sys.argv[3].lower() == 'true') if len(sys.argv) > 3 else True
        intimacoes = client.listar_intimacoes(apenas_nao_lidas=apenas_nao_lidas)
        print(json.dumps([i.to_dict() for i in intimacoes]))

    elif acao == 'documento':
        if len(sys.argv) < 5:
            print(json.dumps({'erro': 'Uso: mni_client.py documento <token> <id> <tribunal> [numero]'}))
            sys.exit(1)
        documento_id = sys.argv[3]
        tribunal = sys.argv[4]
        numero_processo = sys.argv[5] if len(sys.argv) > 5 else None
        resultado = client.baixar_documento(documento_id, tribunal, numero_processo)
        print(json.dumps(resultado))

    elif acao == 'avisos':
        if len(sys.argv) < 4:
            print(json.dumps({'erro': 'Uso: mni_client.py avisos <token> <tribunal> [oab] [estado_oab]'}))
            sys.exit(1)
        tribunal = sys.argv[3]
        numero_oab = sys.argv[4] if len(sys.argv) > 4 else None
        estado_oab = sys.argv[5] if len(sys.argv) > 5 else None
        soap = MNISoapClient(access_token)
        avisos = soap.consultar_avisos_pendentes(tribunal, numero_oab, estado_oab)
        print(json.dumps([a.to_dict() for a in avisos]))

    else:
        print(json.dumps({'erro': f'Ação desconhecida: {acao}'}))
        sys.exit(1)


if __name__ == '__main__':
    main()
