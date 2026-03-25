"""
MNI - Modelo Nacional de Interoperabilidade
Cliente SOAP/XML para comunicacao com tribunais via PJe.
Inclui: cliente SOAP basico + gateway avancado com mTLS/fallback/identity proxy.
"""
from .mni_client import MNIClient, MNIConfig, MNIProcesso, MNIDocumento, get_mni_client, listar_tribunais_mni, MNI_ENDPOINTS
from .mni_gateway import MNIGateway, CertificadoA1, IdentityProxyConfig, TLSSessionFactory, criar_mni_gateway
