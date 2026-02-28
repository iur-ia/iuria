"""
Interface base para provedores de Certificado Digital A3 em nuvem ICP-Brasil.

Todos os provedores (Certisign, BirdID, VaultID, SafeSign) implementam OAuth2/OIDC
com PKCE. O fluxo é:
  1. Sistema gera code_verifier + code_challenge (S256)
  2. Sistema redireciona usuário para URL de autorização do provedor
  3. Provedor envia push notification no app mobile do usuário
  4. Usuário aprova no celular
  5. Provedor redireciona de volta com code
  6. Sistema troca code por access_token (com code_verifier)
  7. access_token pode ser usado para assinar documentos ou autenticar em sistemas
"""
import base64
import hashlib
import os
import secrets
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, Dict, Any


@dataclass
class ResultadoAutenticacao:
    """Resultado de um fluxo de autenticação OAuth2 com certificado"""
    sucesso: bool = False
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "Bearer"
    expires_in: int = 3600
    expires_at: Optional[float] = None
    scope: Optional[str] = None
    id_token: Optional[str] = None

    # Dados do certificado
    nome_titular: Optional[str] = None
    cpf_titular: Optional[str] = None
    email_titular: Optional[str] = None
    validade_cert: Optional[str] = None
    emissor: Optional[str] = None
    numero_serie: Optional[str] = None

    # Fluxo OAuth2
    url_autorizacao: Optional[str] = None
    code_verifier: Optional[str] = None
    state: Optional[str] = None

    # Erros
    erro: Optional[str] = None
    erro_descricao: Optional[str] = None

    def is_valido(self) -> bool:
        """Verifica se o token ainda é válido"""
        if not self.access_token:
            return False
        if self.expires_at and time.time() > self.expires_at - 60:
            return False
        return True

    def to_dict(self) -> Dict[str, Any]:
        return {
            'sucesso': self.sucesso,
            'access_token': self.access_token,
            'refresh_token': self.refresh_token,
            'token_type': self.token_type,
            'expires_in': self.expires_in,
            'expires_at': self.expires_at,
            'scope': self.scope,
            'nome_titular': self.nome_titular,
            'cpf_titular': self.cpf_titular,
            'email_titular': self.email_titular,
            'validade_cert': self.validade_cert,
            'emissor': self.emissor,
            'url_autorizacao': self.url_autorizacao,
            'code_verifier': self.code_verifier,
            'state': self.state,
            'erro': self.erro,
            'erro_descricao': self.erro_descricao,
        }


def gerar_pkce() -> tuple[str, str]:
    """
    Gera par (code_verifier, code_challenge) para OAuth2 PKCE.
    RFC 7636: code_verifier é 43-128 chars de [A-Z a-z 0-9 - . _ ~]
    code_challenge = BASE64URL(SHA256(code_verifier))
    """
    code_verifier = base64.urlsafe_b64encode(os.urandom(40)).decode('utf-8').rstrip('=')
    digest = hashlib.sha256(code_verifier.encode('utf-8')).digest()
    code_challenge = base64.urlsafe_b64encode(digest).decode('utf-8').rstrip('=')
    return code_verifier, code_challenge


def gerar_state() -> str:
    """Gera state aleatório para proteção CSRF"""
    return secrets.token_urlsafe(32)


class CertificadoDigitalBase(ABC):
    """
    Interface abstrata para provedores de certificado digital A3 em nuvem.
    Todos os provedores ICP-Brasil seguem esta interface.
    """

    def __init__(self, client_id: str, redirect_uri: str, scopes: list[str] = None):
        self.client_id = client_id
        self.redirect_uri = redirect_uri
        self.scopes = scopes or ['signature_session', 'openid', 'profile']
        self._token_cache: Optional[ResultadoAutenticacao] = None

    @property
    @abstractmethod
    def nome_provedor(self) -> str:
        """Nome legível do provedor (ex: 'Certisign', 'BirdID')"""
        pass

    @property
    @abstractmethod
    def authorization_endpoint(self) -> str:
        """URL do endpoint de autorização OAuth2"""
        pass

    @property
    @abstractmethod
    def token_endpoint(self) -> str:
        """URL do endpoint de troca de token OAuth2"""
        pass

    @property
    def userinfo_endpoint(self) -> Optional[str]:
        """URL do endpoint userinfo OIDC (opcional)"""
        return None

    def iniciar_autorizacao(self, cpf: Optional[str] = None) -> ResultadoAutenticacao:
        """
        Inicia o fluxo OAuth2 PKCE.
        Retorna objeto com url_autorizacao, code_verifier e state.
        O usuário deve ser redirecionado para url_autorizacao.
        """
        code_verifier, code_challenge = gerar_pkce()
        state = gerar_state()

        params = {
            'response_type': 'code',
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'scope': ' '.join(self.scopes),
            'state': state,
            'code_challenge': code_challenge,
            'code_challenge_method': 'S256',
        }

        if cpf:
            params['login_hint'] = cpf

        params_extras = self._params_autorizacao_extras(cpf)
        params.update(params_extras)

        from urllib.parse import urlencode
        url = f"{self.authorization_endpoint}?{urlencode(params)}"

        return ResultadoAutenticacao(
            sucesso=False,
            url_autorizacao=url,
            code_verifier=code_verifier,
            state=state,
            erro=None,
        )

    def _params_autorizacao_extras(self, cpf: Optional[str] = None) -> dict:
        """Parâmetros extras específicos do provedor (override nas subclasses)"""
        return {}

    def trocar_code_por_token(self, code: str, code_verifier: str) -> ResultadoAutenticacao:
        """
        Troca o authorization code por access_token.
        Chamado após o usuário autorizar no app do provedor.
        """
        import requests

        payload = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': self.redirect_uri,
            'client_id': self.client_id,
            'code_verifier': code_verifier,
        }

        payload_extra = self._payload_token_extras()
        payload.update(payload_extra)

        try:
            resp = requests.post(
                self.token_endpoint,
                data=payload,
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()

            resultado = ResultadoAutenticacao(
                sucesso=True,
                access_token=data.get('access_token'),
                refresh_token=data.get('refresh_token'),
                token_type=data.get('token_type', 'Bearer'),
                expires_in=data.get('expires_in', 3600),
                expires_at=time.time() + data.get('expires_in', 3600),
                scope=data.get('scope'),
                id_token=data.get('id_token'),
            )

            if resultado.access_token and self.userinfo_endpoint:
                self._enriquecer_com_userinfo(resultado)

            self._token_cache = resultado
            return resultado

        except Exception as e:
            return ResultadoAutenticacao(
                sucesso=False,
                erro='Erro ao trocar code por token',
                erro_descricao=str(e),
            )

    def _payload_token_extras(self) -> dict:
        """Payload extra para o token endpoint (override nas subclasses)"""
        return {}

    def _enriquecer_com_userinfo(self, resultado: ResultadoAutenticacao):
        """Busca dados do usuário via endpoint userinfo OIDC"""
        import requests
        try:
            resp = requests.get(
                self.userinfo_endpoint,
                headers={'Authorization': f'Bearer {resultado.access_token}'},
                timeout=15,
            )
            if resp.ok:
                info = resp.json()
                resultado.nome_titular = info.get('name') or info.get('nome')
                resultado.cpf_titular = info.get('cpf') or info.get('document')
                resultado.email_titular = info.get('email')
        except Exception:
            pass

    def renovar_token(self, refresh_token: str) -> ResultadoAutenticacao:
        """Renova o token usando refresh_token"""
        import requests
        payload = {
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token,
            'client_id': self.client_id,
        }
        try:
            resp = requests.post(self.token_endpoint, data=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            resultado = ResultadoAutenticacao(
                sucesso=True,
                access_token=data.get('access_token'),
                refresh_token=data.get('refresh_token', refresh_token),
                expires_in=data.get('expires_in', 3600),
                expires_at=time.time() + data.get('expires_in', 3600),
                scope=data.get('scope'),
            )
            self._token_cache = resultado
            return resultado
        except Exception as e:
            return ResultadoAutenticacao(sucesso=False, erro=str(e))

    def get_token_cache(self) -> Optional[ResultadoAutenticacao]:
        """Retorna token em cache se ainda válido"""
        if self._token_cache and self._token_cache.is_valido():
            return self._token_cache
        return None

    def revogar_token(self, token: str) -> bool:
        """Revoga o token (override nas subclasses que suportam)"""
        return False

    def status(self) -> dict:
        """Retorna status atual do provedor e token"""
        cache = self.get_token_cache()
        return {
            'provedor': self.nome_provedor,
            'configurado': bool(self.client_id),
            'autenticado': cache is not None,
            'nome_titular': cache.nome_titular if cache else None,
            'cpf_titular': cache.cpf_titular if cache else None,
            'validade_token': cache.expires_at if cache else None,
        }
