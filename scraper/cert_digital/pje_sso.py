"""
Implementação do SSO Nacional PJe para autenticação no sistema federal.

O SSO CNJ usa Keycloak em:
  https://sso.cloud.pje.jus.br/auth/realms/pje/protocol/openid-connect/

client_id público: 'jusbr' (não requer client_secret — PKCE público)
scopes: openid profile email

Após a autenticação, o access_token pode ser usado para:
  1. Acessar o CNJ Painel do Advogado
  2. Chamar APIs MNI de tribunais PJe 2.x
  3. Autenticar em sistemas federados via OpenID Connect Federation ICP-Brasil
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cert_digital.base import CertificadoDigitalBase, ResultadoAutenticacao, gerar_pkce, gerar_state
from typing import Optional


class PJeSSOProvider(CertificadoDigitalBase):
    """
    Provedor SSO Nacional do PJe (CNJ).
    Usa fluxo Authorization Code com PKCE — sem client_secret.
    """

    SSO_BASE = "https://sso.cloud.pje.jus.br/auth/realms/pje/protocol/openid-connect"

    def __init__(
        self,
        client_id: str = "jusbr",
        redirect_uri: str = "http://localhost:5000/api/pje/callback",
        client_secret: Optional[str] = None,
        ambiente: str = "producao",
        **kwargs,
    ):
        super().__init__(
            client_id=client_id or "jusbr",
            redirect_uri=redirect_uri,
            scopes=["openid", "profile", "email"],
        )
        # PJe SSO é público — não usa client_secret
        self.client_secret = None
        self.ambiente = ambiente

    @property
    def nome_provedor(self) -> str:
        return "PJe SSO Nacional (CNJ)"

    @property
    def authorization_endpoint(self) -> str:
        return f"{self.SSO_BASE}/auth"

    @property
    def token_endpoint(self) -> str:
        return f"{self.SSO_BASE}/token"

    @property
    def userinfo_endpoint(self) -> str:
        return f"{self.SSO_BASE}/userinfo"

    def _params_autorizacao_extras(self, cpf: Optional[str] = None) -> dict:
        """PJe SSO suporta kc_idp_hint para forçar provedor de identidade ICP-Brasil"""
        params = {}
        if cpf:
            params['login_hint'] = cpf
        return params

    def iniciar_autorizacao(self, cpf: Optional[str] = None) -> ResultadoAutenticacao:
        """Gera URL de autorização para o SSO Nacional PJe."""
        code_verifier, code_challenge = gerar_pkce()
        state = gerar_state()

        from urllib.parse import urlencode
        params = {
            'response_type': 'code',
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'scope': 'openid profile email',
            'state': state,
            'code_challenge': code_challenge,
            'code_challenge_method': 'S256',
        }
        if cpf:
            params['login_hint'] = cpf

        url = f"{self.authorization_endpoint}?{urlencode(params)}"

        return ResultadoAutenticacao(
            sucesso=False,
            url_autorizacao=url,
            code_verifier=code_verifier,
            state=state,
        )

    def trocar_code_por_token(self, code: str, code_verifier: str) -> ResultadoAutenticacao:
        """Troca authorization code por access_token via PKCE."""
        import requests
        import time

        payload = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': self.redirect_uri,
            'client_id': self.client_id,
            'code_verifier': code_verifier,
        }

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

            # Extrair claims do id_token JWT sem verificação (dados públicos do SSO)
            if resultado.id_token:
                self._extrair_claims_jwt(resultado)

            # Tentar userinfo se não temos nome
            if resultado.access_token and not resultado.nome_titular:
                self._enriquecer_com_userinfo(resultado)

            self._token_cache = resultado
            return resultado

        except requests.HTTPError as e:
            corpo = ""
            try:
                corpo = e.response.json().get('error_description', str(e))
            except Exception:
                corpo = str(e)
            return ResultadoAutenticacao(
                sucesso=False,
                erro='Erro de autenticação SSO PJe',
                erro_descricao=corpo,
            )
        except Exception as e:
            return ResultadoAutenticacao(
                sucesso=False,
                erro='Erro ao conectar ao SSO PJe',
                erro_descricao=str(e),
            )

    def _extrair_claims_jwt(self, resultado: ResultadoAutenticacao):
        """Extrai claims do JWT id_token (sem verificar assinatura — dados de UI apenas)."""
        try:
            import base64
            import json
            parts = resultado.id_token.split('.')
            if len(parts) < 2:
                return
            payload_b64 = parts[1]
            # Adicionar padding se necessário
            payload_b64 += '=' * (-len(payload_b64) % 4)
            claims = json.loads(base64.urlsafe_b64decode(payload_b64))
            resultado.nome_titular = (
                claims.get('name') or
                claims.get('nome') or
                claims.get('preferred_username')
            )
            resultado.cpf_titular = claims.get('cpf') or claims.get('document')
            resultado.email_titular = claims.get('email')
        except Exception:
            pass

    def renovar_token(self, refresh_token: str) -> ResultadoAutenticacao:
        """Renova via refresh_token (PJe SSO suporta refresh padrão)."""
        import requests
        import time
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
                id_token=data.get('id_token'),
            )
            if resultado.id_token:
                self._extrair_claims_jwt(resultado)
            self._token_cache = resultado
            return resultado
        except Exception as e:
            return ResultadoAutenticacao(sucesso=False, erro=str(e))


if __name__ == "__main__":
    import json
    import sys as _sys

    cmd = _sys.argv[1] if len(_sys.argv) > 1 else "iniciar-auth"
    redirect_uri = _sys.argv[2] if len(_sys.argv) > 2 else "http://localhost:5000/api/pje/callback"

    provider = PJeSSOProvider(redirect_uri=redirect_uri)

    if cmd == "iniciar-auth":
        # argv[3] = cpf (optional, already sanitized by caller — passed as argument, not interpolated)
        cpf = _sys.argv[3] if len(_sys.argv) > 3 else None
        resultado = provider.iniciar_autorizacao(cpf=cpf)
        print(json.dumps({
            'url_autorizacao': resultado.url_autorizacao,
            'code_verifier': resultado.code_verifier,
            'state': resultado.state,
            'provedor': provider.nome_provedor,
        }))

    elif cmd == "trocar-token":
        # argv[3] = code, argv[4] = code_verifier (both passed as safe arguments, no interpolation)
        if len(_sys.argv) < 5:
            print(json.dumps({'erro': 'code e code_verifier são obrigatórios', 'sucesso': False}))
            _sys.exit(1)
        code = _sys.argv[3]
        code_verifier = _sys.argv[4]
        resultado = provider.trocar_code_por_token(code=code, code_verifier=code_verifier)
        print(json.dumps(resultado.to_dict()))

    else:
        print(json.dumps({'erro': f'Comando desconhecido: {cmd}', 'sucesso': False}))
        _sys.exit(1)
