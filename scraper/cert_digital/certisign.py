"""
Provedor Certisign — Certificado Digital A3 em Nuvem
Maior AC do Brasil, integrada ao Serpro/Gov.br

Endpoints OAuth2:
  - Autorização: https://api.certisign.com.br/oauth/authorize
  - Token:       https://api.certisign.com.br/oauth/token
  - Userinfo:    https://api.certisign.com.br/oauth/userinfo

Para usar com sistemas Gov.br / PJe:
  - Certisign é reconhecida como AC credenciada ICP-Brasil
  - Token gerado pode ser apresentado ao Tribunal via SAML/OIDC

Documentação: https://docs.certisign.com.br/
"""
from .base import CertificadoDigitalBase, ResultadoAutenticacao
from typing import Optional

CERTISIGN_API_BASE = "https://api.certisign.com.br"


class CertisignProvider(CertificadoDigitalBase):
    """
    Implementação do provedor Certisign para certificado A3 em nuvem.
    """

    def __init__(
        self,
        client_id: str,
        redirect_uri: str,
        client_secret: Optional[str] = None,
        ambiente: str = "producao",
    ):
        scopes = ['signature_session', 'openid', 'profile', 'cpf', 'email']
        super().__init__(client_id=client_id, redirect_uri=redirect_uri, scopes=scopes)
        self.client_secret = client_secret
        self.ambiente = ambiente

        if ambiente == "sandbox":
            self._base = "https://api-sandbox.certisign.com.br"
        else:
            self._base = CERTISIGN_API_BASE

    @property
    def nome_provedor(self) -> str:
        return "Certisign"

    @property
    def authorization_endpoint(self) -> str:
        return f"{self._base}/oauth/authorize"

    @property
    def token_endpoint(self) -> str:
        return f"{self._base}/oauth/token"

    @property
    def userinfo_endpoint(self) -> str:
        return f"{self._base}/oauth/userinfo"

    def _params_autorizacao_extras(self, cpf: Optional[str] = None) -> dict:
        params = {
            'acr_values': 'urn:certisign:loa:3',
        }
        if cpf:
            cpf_numeros = ''.join(filter(str.isdigit, cpf))
            if len(cpf_numeros) == 11:
                params['login_hint'] = cpf_numeros
        return params

    def _payload_token_extras(self) -> dict:
        if self.client_secret:
            return {'client_secret': self.client_secret}
        return {}

    def assinar_pdf(self, pdf_bytes: bytes, token: str) -> bytes:
        """
        Assina um PDF usando a API de assinatura da Certisign.
        Requer token OAuth2 válido do usuário.
        """
        import requests
        import base64

        pdf_b64 = base64.b64encode(pdf_bytes).decode()
        payload = {
            'documents': [{
                'content': pdf_b64,
                'contentType': 'application/pdf',
                'signatureType': 'PAdES-B',
            }]
        }

        resp = requests.post(
            f"{self._base}/api/v1/documents/sign",
            json=payload,
            headers={
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json',
            },
            timeout=60,
        )
        resp.raise_for_status()
        result = resp.json()
        signed_b64 = result['documents'][0]['content']
        return base64.b64decode(signed_b64)

    def verificar_status_api(self) -> dict:
        """Verifica se a API Certisign está acessível"""
        import requests
        try:
            resp = requests.get(f"{self._base}/", timeout=10)
            return {
                'online': resp.status_code < 500,
                'status_code': resp.status_code,
                'provedor': 'Certisign',
            }
        except Exception as e:
            return {'online': False, 'erro': str(e), 'provedor': 'Certisign'}
