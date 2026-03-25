"""
Scrapers organizados por SISTEMA processual (1 bot por sistema)
Cada sistema pode ser usado por multiplos tribunais.

Arquitetura:
  - SistemaScraperBase: classe base com anti-deteccao integrada
  - PJeScraper: PJe (59 tribunais MNI + consulta publica)
  - ESAJScraper: eSAJ Softplan (TJSP, TJSC, TJMS, TJCE, TJAM, TJBA)
  - EProcScraper: eProc (TRF2, TRF4, TJPR, TJSC, TJRS)
  - PROJUDIScraper: PROJUDI legado (TJAC, TJGO, TJMG, TJPA, TJPR)
  - STFPortalScraper: Portal STF (unico)
  - STJPortalScraper: Portal STJ (unico)
  - DCPScraper: DCP TJRJ legado
  - TucujurisScraper: TUCUJURIS TJAP
  - ThemisScraper: THEMIS TJRS legado
"""

from .base_sistema import SistemaScraperBase
