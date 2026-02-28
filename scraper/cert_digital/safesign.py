"""
Provedor SafeSign (Safeweb) — Certificado Digital A3 em Nuvem
Provedor brasileiro focado em certificação ICP-Brasil

Endpoints OAuth2:
  - Autorização: https://api.safeweb.com.br/oauth2/authorize
  - Token:       https://api.safeweb.com.br/oauth2/token

Documentação: https://docs.safeweb.com.br/
"""
from .base import CertificadoDigitalBase
from typing import Optional


class SafeSignProvider(CertificadoDigitalBase):
    """
    Implementação SafeSign (Safeweb) para certificado A3 em nuvem.
    """

    def __init__(
        self,
        client_id: str,
        redirect_uri: str,
        client_secret: Optional[str] = None,
        ambiente: str = "producao",
    ):
        scopes = ['openid', 'profile', 'sign']
        super().__init__(client_id=client_id, redirect_uri=redirect_uri, scopes=scopes)
        self.client_secret = client_secret

        if ambiente == "sandbox":
            self._base = "https://api-sandbox.safeweb.com.br"
        else:
            self._base = "https://api.safeweb.com.br"

    @property
    def nome_provedor(self) -> str:
        return "SafeSign"

    @property
    def authorization_endpoint(self) -> str:
        return f"{self._base}/oauth2/authorize"

    @property
    def token_endpoint(self) -> str:
        return f"{self._base}/oauth2/token"

    def _params_autorizacao_extras(self, cpf: Optional[str] = None) -> dict:
        if cpf:
            cpf_numeros = ''.join(filter(str.isdigit, cpf))
            if len(cpf_numeros) == 11:
                return {'login_hint': cpf_numeros}
        return {}

    def _payload_token_extras(self) -> dict:
        if self.client_secret:
            return {'client_secret': self.client_secret}
        return {}
