"""
Factory para criação de provedores de certificado digital.
Detecta automaticamente o provedor pelo nome ou configuração do usuário.
"""
import os
from enum import Enum
from typing import Optional
from .base import CertificadoDigitalBase


class ProvedorCertificado(str, Enum):
    CERTISIGN = "certisign"
    BIRDID = "birdid"
    VAULTID = "vaultid"
    SAFESIGN = "safesign"


NOMES_PROVEDORES = {
    ProvedorCertificado.CERTISIGN: "Certisign",
    ProvedorCertificado.BIRDID: "BirdID (Soluti)",
    ProvedorCertificado.VAULTID: "VaultID (Dinamo)",
    ProvedorCertificado.SAFESIGN: "SafeSign (Safeweb)",
}


def detectar_provedor(nome: str) -> Optional[ProvedorCertificado]:
    """
    Detecta o provedor pelo nome informado pelo usuário.
    Aceita nomes parciais (case-insensitive).
    """
    nome_lower = nome.lower().strip()
    mapeamento = {
        'certisign': ProvedorCertificado.CERTISIGN,
        'bird': ProvedorCertificado.BIRDID,
        'birdid': ProvedorCertificado.BIRDID,
        'soluti': ProvedorCertificado.BIRDID,
        'vault': ProvedorCertificado.VAULTID,
        'vaultid': ProvedorCertificado.VAULTID,
        'dinamo': ProvedorCertificado.VAULTID,
        'safe': ProvedorCertificado.SAFESIGN,
        'safesign': ProvedorCertificado.SAFESIGN,
        'safeweb': ProvedorCertificado.SAFESIGN,
    }
    for chave, provedor in mapeamento.items():
        if chave in nome_lower:
            return provedor
    return None


def criar_provedor(
    provedor: ProvedorCertificado | str,
    client_id: Optional[str] = None,
    redirect_uri: Optional[str] = None,
    client_secret: Optional[str] = None,
    ambiente: str = "producao",
) -> CertificadoDigitalBase:
    """
    Cria uma instância do provedor de certificado digital.

    Se client_id não for informado, tenta ler das variáveis de ambiente:
      CERT_{PROVEDOR}_CLIENT_ID
      CERT_{PROVEDOR}_CLIENT_SECRET
      CERT_{PROVEDOR}_REDIRECT_URI

    Args:
        provedor: Nome do provedor (string ou enum ProvedorCertificado)
        client_id: Client ID da aplicação registrada no provedor
        redirect_uri: URI de redirect após autenticação
        client_secret: Client Secret (opcional para PKCE puro)
        ambiente: 'producao' ou 'sandbox'
    """
    if isinstance(provedor, str):
        provedor_detectado = detectar_provedor(provedor)
        if not provedor_detectado:
            try:
                provedor_enum = ProvedorCertificado(provedor.lower())
            except ValueError:
                raise ValueError(
                    f"Provedor '{provedor}' não reconhecido. "
                    f"Opções: {', '.join(p.value for p in ProvedorCertificado)}"
                )
        else:
            provedor_enum = provedor_detectado
    else:
        provedor_enum = provedor

    env_prefix = f"CERT_{provedor_enum.value.upper()}"
    client_id = client_id or os.environ.get(f"{env_prefix}_CLIENT_ID", "")
    client_secret = client_secret or os.environ.get(f"{env_prefix}_CLIENT_SECRET")
    redirect_uri = redirect_uri or os.environ.get(
        f"{env_prefix}_REDIRECT_URI",
        os.environ.get("CERT_REDIRECT_URI", "http://localhost:5000/api/certificado/callback")
    )

    kwargs = dict(
        client_id=client_id,
        redirect_uri=redirect_uri,
        client_secret=client_secret,
        ambiente=ambiente,
    )

    if provedor_enum == ProvedorCertificado.CERTISIGN:
        from .certisign import CertisignProvider
        return CertisignProvider(**kwargs)

    elif provedor_enum == ProvedorCertificado.BIRDID:
        from .birdid import BirdIDProvider
        return BirdIDProvider(**kwargs)

    elif provedor_enum == ProvedorCertificado.VAULTID:
        from .vaultid import VaultIDProvider
        return VaultIDProvider(**kwargs)

    elif provedor_enum == ProvedorCertificado.SAFESIGN:
        from .safesign import SafeSignProvider
        return SafeSignProvider(**kwargs)

    raise ValueError(f"Provedor não implementado: {provedor_enum}")


def listar_provedores() -> list[dict]:
    """Lista todos os provedores disponíveis com seus metadados"""
    return [
        {
            'id': ProvedorCertificado.CERTISIGN.value,
            'nome': 'Certisign',
            'descricao': 'Maior Autoridade Certificadora do Brasil (ICP-Brasil)',
            'website': 'https://www.certisign.com.br',
            'app_android': 'https://play.google.com/store/apps/details?id=br.com.certisign.assina',
            'app_ios': 'https://apps.apple.com/br/app/certisign-assina/id1434788665',
        },
        {
            'id': ProvedorCertificado.BIRDID.value,
            'nome': 'BirdID (Soluti)',
            'descricao': 'Certificado em nuvem da Soluti — maior volume de certificados PF',
            'website': 'https://www.birdid.com.br',
            'app_android': 'https://play.google.com/store/apps/details?id=br.com.soluti.birdid',
            'app_ios': 'https://apps.apple.com/br/app/birdid/id1434788665',
        },
        {
            'id': ProvedorCertificado.VAULTID.value,
            'nome': 'VaultID (Dinamo)',
            'descricao': 'Solução corporativa da Dinamo Networks com HSM em nuvem',
            'website': 'https://www.vaultid.com.br',
            'app_android': 'https://play.google.com/store/apps/details?id=br.com.dinamo.vaultid',
            'app_ios': None,
        },
        {
            'id': ProvedorCertificado.SAFESIGN.value,
            'nome': 'SafeSign (Safeweb)',
            'descricao': 'Certificado digital em nuvem da Safeweb Certificadora',
            'website': 'https://www.safeweb.com.br',
            'app_android': 'https://play.google.com/store/apps/details?id=br.com.safeweb.safesign',
            'app_ios': None,
        },
    ]
