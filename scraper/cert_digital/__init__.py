"""
Módulo de Certificado Digital A3 em Nuvem - ICP-Brasil
Suporta todos os provedores principais: Certisign, BirdID, VaultID, SafeSign
"""
from .factory import criar_provedor, detectar_provedor, ProvedorCertificado
from .base import CertificadoDigitalBase, ResultadoAutenticacao

__all__ = [
    'criar_provedor',
    'detectar_provedor',
    'ProvedorCertificado',
    'CertificadoDigitalBase',
    'ResultadoAutenticacao',
]
