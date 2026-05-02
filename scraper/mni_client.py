"""
Cliente MNI (Modelo Nacional de Interoperabilidade) para o PJe.

Usa o access_token do SSO Nacional CNJ para chamar APIs autenticadas:
  - Busca de processo por número (partes, andamentos, documentos)
  - Listagem de intimações do advogado em todos os tribunais PJe
  - Download de documento por ID

Endpoints consultados (fallback em cadeia):
  1. CNJ Painel API (painel.cnj.jus.br) — dados consolidados de todos os tribunais
  2. PJe REST por tribunal (pje.{sigla}.jus.br) — dados completos com sigilo
  3. DataJud Autenticado (api.cnj.jus.br) — histórico de movimentos
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


class MNIClientAutenticado:
    """
    Cliente REST para acesso autenticado ao PJe via SSO Nacional.

    Aceita o access_token obtido após autenticação com SSO CNJ
    e chama APIs autenticadas dos portais PJe.
    """

    CNJ_PAINEL_BASE = "https://painel.cnj.jus.br"
    CNJ_API_BASE = "https://api.cnj.jus.br"

    # Hosts PJe por tribunal (PJe 2.x)
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
            'User-Agent': 'SistemaGestaoJuridica/1.0 (advogado@example.com)',
        })

    def _get_json(self, url: str, params: dict = None, timeout: int = 20) -> Optional[dict]:
        """GET com tratamento de erros — retorna None em falha."""
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
        """
        Verifica se o token ainda é válido via userinfo do SSO.
        Retorna dict com 'valido' (bool) e dados do usuário.
        """
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
        Busca dados completos do processo via APIs autenticadas.
        Tenta: CNJ Painel → PJe REST do tribunal → DataJud autenticado.
        """
        numero_limpo = numero.replace('-', '').replace('.', '')

        # 1. Tentar CNJ Painel API
        dados = self._get_json(f"{self.CNJ_PAINEL_BASE}/api/v1/processos/{numero_limpo}")
        if not dados:
            # Tentar formato alternativo
            dados = self._get_json(
                f"{self.CNJ_PAINEL_BASE}/api/v1/processos",
                params={'numero': numero_limpo}
            )

        # 2. Tentar PJe REST do tribunal
        if not dados and tribunal.upper() in self.PJE_HOSTS:
            host = self.PJE_HOSTS[tribunal.upper()]
            dados = self._get_json(f"https://{host}/pje/api/v1/processos/{numero_limpo}")
            if not dados:
                dados = self._get_json(
                    f"https://{host}/pjecnj/api/processos",
                    params={'numero': numero_limpo}
                )

        # 3. Tentar DataJud autenticado
        if not dados:
            dados = self._get_json(
                f"{self.CNJ_API_BASE}/v2/processos",
                params={'numero': numero}
            )

        if not dados:
            return None

        # Normalizar estrutura (APIs têm formatos diferentes)
        hits = dados.get('hits', {}).get('hits', [])
        if hits:
            dados = hits[0].get('_source', dados)

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
        )

        # Partes
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

        # Movimentações
        movs_raw = dados.get('movimentos', dados.get('movimentacoes', []))
        if isinstance(movs_raw, list):
            for mov in movs_raw[:50]:  # Limitar a 50 mais recentes
                if isinstance(mov, dict):
                    processo.movimentacoes.append({
                        'data': mov.get('dataHora') or mov.get('data', ''),
                        'descricao': (
                            mov.get('nome') or
                            mov.get('descricao') or
                            (mov.get('complementosTabelados', [{}])[0].get('descricao') if mov.get('complementosTabelados') else '') or
                            ''
                        ),
                        'detalhes': mov.get('complemento') or mov.get('detalhe'),
                    })

        # Documentos (metadados apenas)
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
        """Extrai string de campos aninhados com fallback."""
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
        """Gera URL direta ao processo no portal do tribunal."""
        host = self.PJE_HOSTS.get(tribunal.upper())
        if host:
            return f"https://{host}/pje/Processo/ConsultaDocumento/listView.seam"
        return f"https://pje.cnj.jus.br/pjecnj/Processo/ConsultaDocumento/listView.seam"

    def listar_intimacoes(
        self,
        apenas_nao_lidas: bool = True,
        pagina: int = 1,
        por_pagina: int = 50,
    ) -> List[IntimacaoPJe]:
        """
        Lista intimações pendentes do advogado via CNJ Painel API.
        Retorna intimações de todos os tribunais PJe do país.
        """
        params = {
            'page': pagina - 1,  # CNJ usa 0-indexed
            'size': por_pagina,
            'sort': 'dataDisponibilizacao,desc',
        }
        if apenas_nao_lidas:
            params['lida'] = 'false'

        # Tentar CNJ Painel
        dados = self._get_json(
            f"{self.CNJ_PAINEL_BASE}/api/v1/intimacoes",
            params=params
        )

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
        """Marca intimação como lida no Painel CNJ."""
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
        """
        Baixa o conteúdo de um documento de processo via PJe autenticado.

        Tenta:
          1. PJe REST do tribunal (endpoint de documentos)
          2. CNJ Painel API (documentos consolidados)

        Retorna dict com:
          - 'conteudo_base64': conteúdo do arquivo em base64 (bytes → str)
          - 'nome_arquivo': nome sugerido do arquivo
          - 'mime_type': tipo MIME (application/pdf, etc.)
          - 'tamanho': tamanho em bytes
          - 'erro': mensagem de erro se não encontrado
        """
        import base64

        # 1. Tentar PJe REST do tribunal
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
                            resp.headers.get('Content-Disposition', '').split('filename=')[-1].strip('"\'')
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

        # 2. Tentar CNJ Painel API
        url_painel = f"{self.CNJ_PAINEL_BASE}/api/v1/documentos/{documento_id}/download"
        try:
            resp = self.session.get(url_painel, timeout=30, stream=True)
            if resp.ok and resp.content:
                conteudo = resp.content
                nome = (
                    resp.headers.get('Content-Disposition', '').split('filename=')[-1].strip('"\'')
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
    import sys

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
        # Uso: mni_client.py documento <token> <documento_id> <tribunal> [numero_processo]
        if len(sys.argv) < 5:
            print(json.dumps({'erro': 'Uso: mni_client.py documento <token> <id> <tribunal> [numero]'}))
            sys.exit(1)
        documento_id = sys.argv[3]
        tribunal = sys.argv[4]
        numero_processo = sys.argv[5] if len(sys.argv) > 5 else None
        resultado = client.baixar_documento(documento_id, tribunal, numero_processo)
        print(json.dumps(resultado))

    else:
        print(json.dumps({'erro': f'Ação desconhecida: {acao}'}))
        sys.exit(1)


if __name__ == '__main__':
    main()
