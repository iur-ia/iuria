"""
Integração com CNJ Painel do Advogado e PJe via Certificado Digital A3
Usa token OAuth2 do provedor de certificado para autenticar nas APIs federais

Fluxo:
  1. Obter token do provedor (Certisign/BirdID/etc) via OAuth2 PKCE
  2. Apresentar token para o CNJ Painel ou PJe (OpenID Connect Federation)
  3. CNJ valida o token ICP-Brasil e cria sessão autenticada
  4. Fazer requisições autenticadas para buscar processos e intimações
"""
import os
import sys
import requests
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field


@dataclass
class IntimacaoCNJ:
    """Representação de uma intimação no Painel CNJ"""
    id: str
    numero_processo: str
    tribunal: str
    data_disponibilizacao: Optional[str] = None
    data_prazo: Optional[str] = None
    texto: Optional[str] = None
    lida: bool = False
    tipo: Optional[str] = None
    url_processo: Optional[str] = None


@dataclass
class ProcessoCNJAutenticado:
    """Dados completos de processo obtidos via sessão autenticada"""
    numero: str
    tribunal: str
    classe: Optional[str] = None
    assunto: Optional[str] = None
    relator: Optional[str] = None
    data_distribuicao: Optional[str] = None
    situacao: Optional[str] = None
    partes: List[dict] = field(default_factory=list)
    movimentacoes: List[dict] = field(default_factory=list)
    intimacoes: List[IntimacaoCNJ] = field(default_factory=list)
    documentos: List[dict] = field(default_factory=list)
    url_portal: Optional[str] = None


class CNJPainelClient:
    """
    Cliente para o CNJ Painel do Advogado.
    Requer token OAuth2 válido de um provedor ICP-Brasil credenciado.

    O Painel CNJ (painel.cnj.jus.br) usa OpenID Connect Federation
    para aceitar tokens de todas as ACs credenciadas.
    """

    CNJ_PAINEL_BASE = "https://painel.cnj.jus.br"
    CNJ_API_BASE = "https://api.cnj.jus.br"

    def __init__(self, access_token: str, token_type: str = "Bearer"):
        self.access_token = access_token
        self.token_type = token_type
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'{token_type} {access_token}',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'SistemaGestaoJuridica/1.0',
        })

    def _get(self, url: str, params: dict = None, timeout: int = 30) -> Optional[dict]:
        try:
            resp = self.session.get(url, params=params, timeout=timeout)
            resp.raise_for_status()
            return resp.json()
        except requests.HTTPError as e:
            print(f"HTTP {e.response.status_code} ao acessar {url}", file=sys.stderr)
            return None
        except Exception as e:
            print(f"Erro ao acessar {url}: {e}", file=sys.stderr)
            return None

    def verificar_autenticacao(self) -> dict:
        """Verifica se o token é válido consultando endpoint userinfo"""
        try:
            resp = self.session.get(
                f"{self.CNJ_PAINEL_BASE}/api/v1/userinfo",
                timeout=15
            )
            if resp.ok:
                return {'autenticado': True, 'dados': resp.json()}
            return {'autenticado': False, 'erro': f'HTTP {resp.status_code}'}
        except Exception as e:
            return {'autenticado': False, 'erro': str(e)}

    def listar_intimacoes(
        self,
        oab_numero: Optional[str] = None,
        oab_estado: Optional[str] = None,
        apenas_nao_lidas: bool = False,
        pagina: int = 1,
        por_pagina: int = 20,
    ) -> List[IntimacaoCNJ]:
        """
        Lista intimações do advogado no Painel CNJ.
        Retorna intimações de todos os tribunais cadastrados no Painel.
        """
        params = {
            'page': pagina,
            'size': por_pagina,
        }
        if oab_numero:
            params['numeroOab'] = oab_numero
        if oab_estado:
            params['estadoOab'] = oab_estado
        if apenas_nao_lidas:
            params['lida'] = 'false'

        data = self._get(
            f"{self.CNJ_PAINEL_BASE}/api/v1/intimacoes",
            params=params
        )

        if not data:
            return []

        intimacoes = []
        for item in data.get('content', data if isinstance(data, list) else []):
            intimacoes.append(IntimacaoCNJ(
                id=str(item.get('id', '')),
                numero_processo=item.get('numeroProcesso', ''),
                tribunal=item.get('tribunal', ''),
                data_disponibilizacao=item.get('dataDisponibilizacao'),
                data_prazo=item.get('dataPrazo'),
                texto=item.get('texto', '')[:500] if item.get('texto') else None,
                lida=item.get('lida', False),
                tipo=item.get('tipo'),
                url_processo=item.get('urlProcesso'),
            ))

        return intimacoes

    def buscar_processo_autenticado(
        self,
        numero: str,
        tribunal: str,
    ) -> Optional[ProcessoCNJAutenticado]:
        """
        Busca dados completos de processo usando autenticação de certificado.
        Acessa dados que não estão disponíveis na consulta pública (sigilo parcial,
        documentos, intimações específicas, partes com dados completos).
        """
        numero_limpo = numero.replace('-', '').replace('.', '')

        endpoints = [
            f"{self.CNJ_PAINEL_BASE}/api/v1/processos/{numero_limpo}",
            f"{self.CNJ_API_BASE}/v2/processos/{numero_limpo}",
        ]

        data = None
        for endpoint in endpoints:
            data = self._get(endpoint)
            if data:
                break

        if not data:
            return None

        processo = ProcessoCNJAutenticado(
            numero=numero,
            tribunal=tribunal,
            classe=data.get('classe', {}).get('nome') if isinstance(data.get('classe'), dict) else data.get('classe'),
            assunto=data.get('assunto', {}).get('nome') if isinstance(data.get('assunto'), dict) else data.get('assunto'),
            relator=data.get('relator', {}).get('nome') if isinstance(data.get('relator'), dict) else data.get('relator'),
            data_distribuicao=data.get('dataDistribuicao') or data.get('dataAjuizamento'),
            situacao=data.get('situacao') or data.get('status'),
            url_portal=data.get('url') or f"https://pje.cnj.jus.br/pjecnj/Processo/ConsultaDocumento/listView.seam?nd={numero_limpo}",
        )

        processo.partes = data.get('partes', [])
        processo.movimentacoes = data.get('movimentos', data.get('movimentacoes', []))

        return processo

    def marcar_intimacao_lida(self, intimacao_id: str) -> bool:
        """Marca uma intimação como lida no Painel CNJ"""
        try:
            resp = self.session.patch(
                f"{self.CNJ_PAINEL_BASE}/api/v1/intimacoes/{intimacao_id}",
                json={'lida': True},
                timeout=15,
            )
            return resp.ok
        except Exception:
            return False


class PJeClientAutenticado:
    """
    Cliente PJe autenticado via certificado digital.
    Acessa o PJe de tribunais específicos usando token ICP-Brasil.

    Cada tribunal tem sua instância PJe própria:
      - TRF1: pje1g.trf1.jus.br
      - TRF2: pje.trf2.jus.br
      - TJMG: pje.tjmg.jus.br
      - etc.
    """

    PJE_HOSTS = {
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
    }

    def __init__(self, tribunal: str, access_token: str):
        self.tribunal = tribunal.upper()
        self.access_token = access_token
        host = self.PJE_HOSTS.get(self.tribunal)
        if not host:
            raise ValueError(f"PJe não configurado para {tribunal}")
        self.base_url = f"https://{host}"
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/json',
        })

    def buscar_processo(self, numero: str) -> Optional[dict]:
        """Busca processo autenticado no PJe do tribunal"""
        numero_limpo = numero.replace('-', '').replace('.', '')
        endpoints = [
            f"{self.base_url}/pje/api/v1/processos/{numero_limpo}",
            f"{self.base_url}/pjecnj/api/processos?numero={numero_limpo}",
        ]
        for endpoint in endpoints:
            try:
                resp = self.session.get(endpoint, timeout=30)
                if resp.ok:
                    return resp.json()
            except Exception:
                continue
        return None
