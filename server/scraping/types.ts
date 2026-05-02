export type ScrapingSource =
  | "datajud"
  | "esaj"
  | "stj"
  | "stf"
  | "trf"
  | "brasilapi"
  | "receita_federal"
  | "cnj_biblioteca"
  | "senado"
  | "scraper_api";

export interface ScrapingLog {
  ts: string;
  level: "info" | "warn" | "error";
  msg: string;
}

export interface ScrapingResult<T = unknown> {
  source: ScrapingSource;
  sourceLabel: string;
  data: T;
  markdownContent: string;
  durationMs: number;
  logs: ScrapingLog[];
  error?: string;
}

export interface Movimentacao {
  data: string;
  descricao: string;
  detalhes?: string;
}

export interface Documento {
  titulo: string;
  link?: string;
  tipo?: string;
}

export interface ProcessoScrapeData {
  numero: string;
  tribunal: string;
  classe?: string;
  assunto?: string;
  relator?: string;
  vara?: string;
  partes: string[];
  movimentacoes: Movimentacao[];
  documentos: Documento[];
  urlPortal?: string;
  situacao?: string;
}

export interface JurisprudenciaItem {
  id?: string;
  tribunal: string;
  numero?: string;
  ementa: string;
  relator?: string;
  data?: string;
  tema?: string;
  link?: string;
  markdownContent?: string;
}

export interface DoutrinaItem {
  titulo: string;
  autor?: string;
  resumo?: string;
  link?: string;
  fonte?: string;
  ano?: string;
  tipo?: string;
}

export interface EmpresaData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacao?: string;
  situacaoCadastral?: string;
  atividadePrincipal?: string;
  atividadesSecundarias?: string[];
  endereco?: string;
  municipio?: string;
  uf?: string;
  telefone?: string;
  email?: string;
  naturezaJuridica?: string;
  capitalSocial?: string;
  porte?: string;
  dataAbertura?: string;
  socios?: { nome: string; qualificacao?: string; cpfOuCnpj?: string }[];
}

export interface TribunalInfo {
  sigla: string;
  nome: string;
  segmento: number;
  codigoTR: number;
  usaEsaj: boolean;
  urlPortal: string;
  urlConsulta?: string;
}

export const TRIBUNAIS: Record<string, TribunalInfo> = {
  STF: { sigla: "STF", nome: "Supremo Tribunal Federal", segmento: 1, codigoTR: 0, usaEsaj: false, urlPortal: "https://portal.stf.jus.br" },
  STJ: { sigla: "STJ", nome: "Superior Tribunal de Justiça", segmento: 3, codigoTR: 0, usaEsaj: false, urlPortal: "https://www.stj.jus.br" },
  TRF1: { sigla: "TRF1", nome: "Tribunal Regional Federal da 1ª Região", segmento: 4, codigoTR: 1, usaEsaj: false, urlPortal: "https://www.trf1.jus.br" },
  TRF2: { sigla: "TRF2", nome: "Tribunal Regional Federal da 2ª Região", segmento: 4, codigoTR: 2, usaEsaj: false, urlPortal: "https://www.trf2.jus.br" },
  TRF3: { sigla: "TRF3", nome: "Tribunal Regional Federal da 3ª Região", segmento: 4, codigoTR: 3, usaEsaj: false, urlPortal: "https://www.trf3.jus.br" },
  TRF4: { sigla: "TRF4", nome: "Tribunal Regional Federal da 4ª Região", segmento: 4, codigoTR: 4, usaEsaj: false, urlPortal: "https://www.trf4.jus.br" },
  TRF5: { sigla: "TRF5", nome: "Tribunal Regional Federal da 5ª Região", segmento: 4, codigoTR: 5, usaEsaj: false, urlPortal: "https://www.trf5.jus.br" },
  TRF6: { sigla: "TRF6", nome: "Tribunal Regional Federal da 6ª Região", segmento: 4, codigoTR: 6, usaEsaj: false, urlPortal: "https://www.trf6.jus.br" },
  TJSP: { sigla: "TJSP", nome: "Tribunal de Justiça de São Paulo", segmento: 8, codigoTR: 26, usaEsaj: true, urlPortal: "https://www.tjsp.jus.br", urlConsulta: "https://esaj.tjsp.jus.br/cpopg/open.do" },
  TJRJ: { sigla: "TJRJ", nome: "Tribunal de Justiça do Rio de Janeiro", segmento: 8, codigoTR: 19, usaEsaj: false, urlPortal: "https://www.tjrj.jus.br" },
  TJMG: { sigla: "TJMG", nome: "Tribunal de Justiça de Minas Gerais", segmento: 8, codigoTR: 13, usaEsaj: false, urlPortal: "https://www.tjmg.jus.br" },
  TJRS: { sigla: "TJRS", nome: "Tribunal de Justiça do Rio Grande do Sul", segmento: 8, codigoTR: 21, usaEsaj: false, urlPortal: "https://www.tjrs.jus.br" },
  TJBA: { sigla: "TJBA", nome: "Tribunal de Justiça da Bahia", segmento: 8, codigoTR: 5, usaEsaj: true, urlPortal: "https://www.tjba.jus.br", urlConsulta: "https://esaj.tjba.jus.br/cpopg/open.do" },
  TJSC: { sigla: "TJSC", nome: "Tribunal de Justiça de Santa Catarina", segmento: 8, codigoTR: 24, usaEsaj: true, urlPortal: "https://www.tjsc.jus.br", urlConsulta: "https://esaj.tjsc.jus.br/cpopg/open.do" },
  TJCE: { sigla: "TJCE", nome: "Tribunal de Justiça do Ceará", segmento: 8, codigoTR: 6, usaEsaj: true, urlPortal: "https://www.tjce.jus.br", urlConsulta: "https://esaj.tjce.jus.br/cpopg/open.do" },
  TJPE: { sigla: "TJPE", nome: "Tribunal de Justiça de Pernambuco", segmento: 8, codigoTR: 17, usaEsaj: true, urlPortal: "https://www.tjpe.jus.br", urlConsulta: "https://esaj.tjpe.jus.br/cpopg/open.do" },
  TJMA: { sigla: "TJMA", nome: "Tribunal de Justiça do Maranhão", segmento: 8, codigoTR: 10, usaEsaj: true, urlPortal: "https://www.tjma.jus.br", urlConsulta: "https://esaj.tjma.jus.br/cpopg/open.do" },
  TJMS: { sigla: "TJMS", nome: "Tribunal de Justiça do Mato Grosso do Sul", segmento: 8, codigoTR: 12, usaEsaj: true, urlPortal: "https://www.tjms.jus.br", urlConsulta: "https://esaj.tjms.jus.br/cpopg/open.do" },
  TJAL: { sigla: "TJAL", nome: "Tribunal de Justiça de Alagoas", segmento: 8, codigoTR: 2, usaEsaj: true, urlPortal: "https://www.tjal.jus.br", urlConsulta: "https://esaj.tjal.jus.br/cpopg/open.do" },
  TJRN: { sigla: "TJRN", nome: "Tribunal de Justiça do Rio Grande do Norte", segmento: 8, codigoTR: 20, usaEsaj: true, urlPortal: "https://www.tjrn.jus.br", urlConsulta: "https://esaj.tjrn.jus.br/cpopg/open.do" },
};

export function identificarTribunalCNJ(numero: string): TribunalInfo | null {
  const match = numero.match(/\d{7}-\d{2}\.\d{4}\.(\d)\.(\d{2})\.\d{4}/);
  if (!match) return null;
  const segmento = parseInt(match[1]);
  const codigoTR = parseInt(match[2]);

  if (segmento === 1 && codigoTR === 0) return TRIBUNAIS.STF;
  if (segmento === 3 && codigoTR === 0) return TRIBUNAIS.STJ;
  if (segmento === 4) {
    const trf = `TRF${codigoTR}`;
    return TRIBUNAIS[trf] || null;
  }
  if (segmento === 8) {
    return Object.values(TRIBUNAIS).find(t => t.segmento === 8 && t.codigoTR === codigoTR) || null;
  }
  return null;
}
