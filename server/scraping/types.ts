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

/** Telemetria de qualidade por consulta */
export interface ScrapingTelemetry {
  /** Nome da fonte que respondeu (ex: "DataJud", "Portal e-SAJ (Crawlee)", "MNI SOAP") */
  fonte: string;
  /** Latência da consulta em ms */
  latenciaMs: number;
  /** Quantos campos essenciais foram preenchidos (0–20+) */
  camposPreenchidos: number;
  /** Tribunal consultado */
  tribunal: string;
}

export interface ScrapingResult<T = unknown> {
  source: ScrapingSource;
  sourceLabel: string;
  data: T;
  markdownContent: string;
  durationMs: number;
  logs: ScrapingLog[];
  error?: string;
  /** Telemetria de qualidade — preenchida pelo orquestrador */
  telemetry?: ScrapingTelemetry;
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
  /** Comarca/localidade do processo */
  comarca?: string;
  /** Valor da causa formatado (ex: "50.000,00") */
  valorCausa?: string;
  /** Data de distribuição (DD/MM/YYYY) */
  dataDistribuicao?: string;
  /** Advogados com OAB quando disponível */
  advogados?: string[];
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
  link?: string;
  fonte?: string;
  /** Tema de repercussão geral (STF) */
  tema?: string;
  /** Íntegra do acórdão — preenchida sob demanda (STJ/STF) */
  markdownContent?: string;
}

export interface DoutrinaItem {
  titulo: string;
  autor?: string;
  fonte?: string;
  resumo?: string;
  link?: string;
  data?: string;
  /** Ano de publicação */
  ano?: string;
}

export interface EmpresaData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacaoCadastral?: string;
  /** Alias de situacaoCadastral usado por alguns scrapers */
  situacao?: string;
  dataAbertura?: string;
  cnaePrincipal?: string;
  atividadePrincipal?: string;
  atividadesSecundarias?: string[];
  endereco?: string;
  naturezaJuridica?: string;
  capitalSocial?: string;
  porte?: string;
  telefone?: string;
  email?: string;
  municipio?: string;
  uf?: string;
  socios?: { nome: string; qualificacao?: string; cpfOuCnpj?: string }[];
}

/**
 * Mapa de siglas e configurações dos tribunais suportados.
 * usaEsaj: portais eSAJ (TJSP, TJBA, etc.)
 * usaPje: portais PJe
 * urlConsulta: URL de consulta pública
 * urlPortal: URL base do tribunal
 */
export interface TribunalInfo {
  sigla: string;
  nome: string;
  segmento: "estadual" | "federal" | "trabalhista" | "eleitoral" | "militar" | "superior";
  codigoTR?: string;
  usaEsaj?: boolean;
  usaPje?: boolean;
  urlPortal: string;
  urlConsulta?: string;
}

/**
 * APIKey pública do DataJud CNJ.
 * Preferir a variável de ambiente DATAJUD_API_KEY para facilitar rotação.
 * A chave padrão é a pública divulgada no portal wiki.datajud.cnj.jus.br.
 */
export const DATAJUD_AUTH = process.env.DATAJUD_API_KEY
  ? `APIKey ${process.env.DATAJUD_API_KEY}`
  : "APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

/**
 * Token Bearer para o endpoint autenticado DataJud (api.cnj.jus.br).
 * Quando presente, o orquestrador tenta este endpoint antes do público.
 */
export const DATAJUD_AUTH_TOKEN = process.env.DATAJUD_AUTH_TOKEN
  ? `Bearer ${process.env.DATAJUD_AUTH_TOKEN}`
  : null;

export const TRIBUNAIS: Record<string, TribunalInfo> = {
  STF: { sigla: "STF", nome: "Supremo Tribunal Federal", segmento: "superior", urlPortal: "https://portal.stf.jus.br" },
  STJ: { sigla: "STJ", nome: "Superior Tribunal de Justiça", segmento: "superior", urlPortal: "https://processo.stj.jus.br" },
  TST: { sigla: "TST", nome: "Tribunal Superior do Trabalho", segmento: "trabalhista", urlPortal: "https://www.tst.jus.br" },
  TSE: { sigla: "TSE", nome: "Tribunal Superior Eleitoral", segmento: "eleitoral", urlPortal: "https://www.tse.jus.br" },
  TRF1: { sigla: "TRF1", nome: "TRF 1ª Região", segmento: "federal", codigoTR: "01", urlPortal: "https://processual.trf1.jus.br", urlConsulta: "https://processual.trf1.jus.br/consultaProcessual/processo.php" },
  TRF2: { sigla: "TRF2", nome: "TRF 2ª Região", segmento: "federal", codigoTR: "02", urlPortal: "https://eproc.jfrj.jus.br" },
  TRF3: { sigla: "TRF3", nome: "TRF 3ª Região", segmento: "federal", codigoTR: "03", urlPortal: "https://pje1g.trf3.jus.br" },
  TRF4: { sigla: "TRF4", nome: "TRF 4ª Região", segmento: "federal", codigoTR: "04", urlPortal: "https://eproc.trf4.jus.br" },
  TRF5: { sigla: "TRF5", nome: "TRF 5ª Região", segmento: "federal", codigoTR: "05", urlPortal: "https://pje.trf5.jus.br" },
  TRF6: { sigla: "TRF6", nome: "TRF 6ª Região", segmento: "federal", codigoTR: "06", urlPortal: "https://pje.trf6.jus.br" },
  TJSP: { sigla: "TJSP", nome: "TJSP", segmento: "estadual", codigoTR: "26", usaEsaj: true, urlPortal: "https://esaj.tjsp.jus.br", urlConsulta: "https://esaj.tjsp.jus.br/cpopg/show.do" },
  TJRJ: { sigla: "TJRJ", nome: "TJRJ", segmento: "estadual", codigoTR: "19", urlPortal: "https://www3.tjrj.jus.br" },
  TJMG: { sigla: "TJMG", nome: "TJMG", segmento: "estadual", codigoTR: "13", usaPje: true, urlPortal: "https://pje.tjmg.jus.br" },
  TJRS: { sigla: "TJRS", nome: "TJRS", segmento: "estadual", codigoTR: "21", urlPortal: "https://www.tjrs.jus.br" },
  TJBA: { sigla: "TJBA", nome: "TJBA", segmento: "estadual", codigoTR: "05", usaEsaj: true, urlPortal: "https://esaj.tjba.jus.br", urlConsulta: "https://esaj.tjba.jus.br/cpopg/show.do" },
  TJSC: { sigla: "TJSC", nome: "TJSC", segmento: "estadual", codigoTR: "24", usaEsaj: true, urlPortal: "https://esaj.tjsc.jus.br", urlConsulta: "https://esaj.tjsc.jus.br/cpopg/show.do" },
  TJCE: { sigla: "TJCE", nome: "TJCE", segmento: "estadual", codigoTR: "06", usaEsaj: true, urlPortal: "https://esaj.tjce.jus.br", urlConsulta: "https://esaj.tjce.jus.br/cpopg/show.do" },
  TJPE: { sigla: "TJPE", nome: "TJPE", segmento: "estadual", codigoTR: "17", usaPje: true, urlPortal: "https://pje.tjpe.jus.br" },
  TJMA: { sigla: "TJMA", nome: "TJMA", segmento: "estadual", codigoTR: "10", usaPje: true, urlPortal: "https://pje.tjma.jus.br" },
  TJMS: { sigla: "TJMS", nome: "TJMS", segmento: "estadual", codigoTR: "12", usaEsaj: true, urlPortal: "https://esaj.tjms.jus.br", urlConsulta: "https://esaj.tjms.jus.br/cpopg5/show.do" },
  TJAL: { sigla: "TJAL", nome: "TJAL", segmento: "estadual", codigoTR: "02", usaEsaj: true, urlPortal: "https://www2.tjal.jus.br", urlConsulta: "https://www2.tjal.jus.br/cpopg/show.do" },
  TJRN: { sigla: "TJRN", nome: "TJRN", segmento: "estadual", codigoTR: "20", usaPje: true, urlPortal: "https://pje.tjrn.jus.br" },
};

/**
 * Identifica tribunal pelo número CNJ.
 * Formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
 * J=8 → estadual, J=4 → federal, J=5 → trabalhista, etc.
 */
export function identificarTribunalCNJ(numero: string): TribunalInfo | null {
  const clean = numero.replace(/\s/g, "");
  const cnj = clean.match(/^(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})$/);
  if (!cnj) return null;

  const j = cnj[4];
  const tr = cnj[5];

  if (j === "8") {
    const estadualMap: Record<string, string> = {
      "01": "TJAC", "02": "TJAL", "03": "TJAM", "04": "TJAP", "05": "TJBA",
      "06": "TJCE", "07": "TJDF", "08": "TJES", "09": "TJGO", "10": "TJMA",
      "11": "TJMT", "12": "TJMS", "13": "TJMG", "14": "TJPA", "15": "TJPB",
      "16": "TJPR", "17": "TJPE", "18": "TJPI", "19": "TJRJ", "20": "TJRN",
      "21": "TJRS", "22": "TJRO", "23": "TJRR", "24": "TJSC", "25": "TJSE",
      "26": "TJSP", "27": "TJTO", "00": "TJDFT",
    };
    const sigla = estadualMap[tr];
    if (sigla) return TRIBUNAIS[sigla] ?? { sigla, nome: sigla, segmento: "estadual", urlPortal: "", codigoTR: tr };
  }

  if (j === "4") {
    const federalMap: Record<string, string> = {
      "01": "TRF1", "02": "TRF2", "03": "TRF3", "04": "TRF4", "05": "TRF5", "06": "TRF6",
    };
    const sigla = federalMap[tr];
    if (sigla) return TRIBUNAIS[sigla] ?? null;
  }

  if (j === "5") {
    return { sigla: `TRT${parseInt(tr, 10)}`, nome: `TRT ${parseInt(tr, 10)}ª Região`, segmento: "trabalhista", urlPortal: "" };
  }

  if (j === "1") return TRIBUNAIS["STF"] ?? null;
  if (j === "3") return TRIBUNAIS["STJ"] ?? null;
  if (j === "6") return { sigla: "TRT_MILITAR", nome: "Tribunal Militar", segmento: "militar", urlPortal: "" };
  if (j === "7") return { sigla: "TRE", nome: "Tribunal Regional Eleitoral", segmento: "eleitoral", urlPortal: "" };

  return null;
}
