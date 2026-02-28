"""
Provedor VaultID — Certificado Digital A3 em Nuvem
Solução de assinatura digital em nuvem da Dinamo Networks / VaultID

Endpoints OAuth2:
  - Autorização: https://cloud.vaultid.com.br/ouath2/authorize
  - Token:       https://cloud.vaultid.com.br/oauth2/token
  - Userinfo:    https://cloud.vaultid.com.br/oauth2/userinfo

Documentação: https://developer.vaultid.com.br/
"""
from .base import CertificadoDigitalBase
from typing import Optional


class VaultIDProvider(CertificadoDigitalBase):
    """
    Implementação VaultID para certificado A3 em nuvem.
    """

    def __init__(
        self,
        client_id: str,
        redirect_uri: str,
        client_secret: Optional[str] = None,
        ambiente: str = "producao",
    ):
        scopes = ['openid', 'profile', 'signature_session']
        super().__init__(client_id=client_id, redirect_uri=redirect_uri, scopes=scopes)
        self.client_secret = client_secret

        if ambiente == "sandbox":
            self._base = "https://sandbox.vaultid.com.br"
        else:
            self._base = "https://cloud.vaultid.com.br"

    @property
    def nome_provedor(self) -> str:
        return "VaultID"

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
        if cpf:
            cpf_numeros = ''.join(filter(str.isdigit, cpf))
            if len(cpf_numeros) == 11:
                return {'login_hint': cpf_numeros}
        return {}

    def _payload_token_extras(self) -> dict:
        if self.client_secret:
            return {'client_secret': self.client_secret}
        return {}
