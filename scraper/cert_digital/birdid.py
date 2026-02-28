"""
Provedor BirdID (Soluti) — Certificado Digital A3 em Nuvem
Segunda maior AC do Brasil em volume de certificados em nuvem

Endpoints OAuth2:
  - Autorização: https://sign.birdid.com.br/oauth2/authorize
  - Token:       https://sign.birdid.com.br/oauth2/token
  - Userinfo:    https://sign.birdid.com.br/oauth2/userinfo

Documentação: https://docs.birdid.com.br/
"""
from .base import CertificadoDigitalBase
from typing import Optional


class BirdIDProvider(CertificadoDigitalBase):
    """
    Implementação BirdID (Soluti) para certificado A3 em nuvem.
    """

    def __init__(
        self,
        client_id: str,
        redirect_uri: str,
        client_secret: Optional[str] = None,
        ambiente: str = "producao",
    ):
        scopes = ['signature_session', 'openid', 'profile', 'single_signature']
        super().__init__(client_id=client_id, redirect_uri=redirect_uri, scopes=scopes)
        self.client_secret = client_secret

        if ambiente == "sandbox":
            self._base = "https://sign-sandbox.birdid.com.br"
        else:
            self._base = "https://sign.birdid.com.br"

    @property
    def nome_provedor(self) -> str:
        return "BirdID"

    @property
    def authorization_endpoint(self) -> str:
        return f"{self._base}/oauth2/authorize"

    @property
    def token_endpoint(self) -> str:
        return f"{self._base}/oauth2/token"

    @property
    def userinfo_endpoint(self) -> str:
        return f"{self._base}/oauth2/userinfo"

    def _params_autorizacao_extras(self, cpf: Optional[str] = None) -> dict:
        params = {
            'lifetime': '300',
        }
        if cpf:
            cpf_numeros = ''.join(filter(str.isdigit, cpf))
            if len(cpf_numeros) == 11:
                params['cpf'] = cpf_numeros
        return params

    def _payload_token_extras(self) -> dict:
        if self.client_secret:
            return {'client_secret': self.client_secret}
        return {}
