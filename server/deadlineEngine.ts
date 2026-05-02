import { storage } from "./storage";
import type { DeadlineRule, Atividade } from "@shared/schema";

// Maps andamento text patterns to eventoGatilho values used in deadline rules
const EVENTO_PATTERNS: Array<{ pattern: RegExp; evento: string }> = [
  { pattern: /\bcita[çc][aã]o\b|\bcitad[oa]\b/i, evento: "citacao" },
  { pattern: /\bsentença\b|\bsentenciado\b|\bjulgado procedente\b|\bimprocedente\b/i, evento: "sentenca" },
  { pattern: /\bintima[çc][aã]o\b|\bintimad[oa]\b|\bdecis[aã]o interlocut/i, evento: "intimacao_decisao" },
  { pattern: /\baudiência\b|\baud[iî]encia designada\b|\baudiência marcada\b/i, evento: "audiencia" },
  { pattern: /\bdespacho\b/i, evento: "despacho" },
  { pattern: /\bac[oó]rd[aã]o\b|\brecurso julgado\b|\bjulgamento do recurso\b/i, evento: "recurso" },
];

export function detectarEventoGatilho(descricao: string): string | null {
  for (const { pattern, evento } of EVENTO_PATTERNS) {
    if (pattern.test(descricao)) return evento;
  }
  return null;
}

function calcularDataPrazo(dataEvento: Date, dias: number, tipoDia: string): Date {
  const data = new Date(dataEvento);
  if (tipoDia === "util") {
    let diasAdicionados = 0;
    while (diasAdicionados < dias) {
      data.setDate(data.getDate() + 1);
      const diaSemana = data.getDay();
      if (diaSemana !== 0 && diaSemana !== 6) {
        diasAdicionados++;
      }
    }
  } else {
    data.setDate(data.getDate() + dias);
  }
  return data;
}

function mapRiscoToPrioridade(risco: string): string {
  switch (risco) {
    case "CRITICO": return "Alta";
    case "ALTO": return "Alta";
    case "MEDIO": return "Média";
    case "BAIXO": return "Baixa";
    default: return "Média";
  }
}

export async function aplicarRegrasDeadline(params: {
  eventoGatilho: string;
  processoId?: string | null;
  dataEvento: Date;
  sourceEventId?: string;
  area?: string;
}): Promise<{ tasksCreated: number; tasks: Atividade[] }> {
  const { eventoGatilho, processoId, dataEvento, sourceEventId, area } = params;

  const regras = await storage.getDeadlineRules({ ativo: true });
  const regrasAplicaveis = regras.filter((r) => {
    const eventoMatch = r.eventoGatilho === eventoGatilho;
    // When area is explicitly provided: match geral rules + area-specific rules.
    // When area is undefined (unknown): only match geral rules (conservative fallback).
    const areaMatch = area
      ? r.area === "geral" || r.area === area
      : r.area === "geral";
    return eventoMatch && areaMatch;
  });

  const tasks: Atividade[] = [];

  for (const regra of regrasAplicaveis) {
    const dataPrazo = calcularDataPrazo(dataEvento, regra.dias, regra.tipoDia);
    const dataStr = dataPrazo.toISOString().split("T")[0];

    const titulo = `${regra.nome}`;
    const descricao = regra.descricao
      ? `${regra.descricao}${regra.fundamentoLegal ? ` — ${regra.fundamentoLegal}` : ""}`
      : regra.fundamentoLegal || undefined;

    const atividade = await storage.createAtividade({
      titulo,
      descricao: descricao || null,
      tipo: "Tarefa",
      processoId: processoId || null,
      responsavelId: regra.responsavelPadraoId || null,
      data: dataStr,
      hora: null,
      prioridade: mapRiscoToPrioridade(regra.riscoDefault),
      status: "Pendente",
      risco: regra.riscoDefault,
      deadlineRuleId: regra.id,
      sourceEventId: sourceEventId || null,
      fundamentoLegal: regra.fundamentoLegal || null,
      eventoGatilho: eventoGatilho,
    });

    tasks.push(atividade);
  }

  return { tasksCreated: tasks.length, tasks };
}

export async function seedRegrasPreconfigured(): Promise<void> {
  const existentes = await storage.getDeadlineRules({ preConfigurada: true });
  if (existentes.length > 0) return;

  const regras = [
    {
      nome: "Contestação (citação cível)",
      eventoGatilho: "citacao",
      dias: 15,
      tipoDia: "util",
      area: "civel",
      riscoDefault: "CRITICO",
      fundamentoLegal: "Art. 335 CPC — 15 dias para contestar",
      descricao: "Prazo para apresentar contestação após citação em ação cível",
      ativo: true,
      preConfigurada: true,
    },
    {
      nome: "Recurso de Apelação (após sentença)",
      eventoGatilho: "sentenca",
      dias: 15,
      tipoDia: "util",
      area: "civel",
      riscoDefault: "CRITICO",
      fundamentoLegal: "Art. 1.003, §5º CPC — 15 dias para apelação",
      descricao: "Prazo para interpor recurso de apelação após sentença",
      ativo: true,
      preConfigurada: true,
    },
    {
      nome: "Recurso (intimação de decisão interlocutória)",
      eventoGatilho: "intimacao_decisao",
      dias: 15,
      tipoDia: "util",
      area: "civel",
      riscoDefault: "ALTO",
      fundamentoLegal: "Art. 1.015 CPC — Agravo de instrumento",
      descricao: "Prazo para recurso após intimação de decisão interlocutória",
      ativo: true,
      preConfigurada: true,
    },
    {
      nome: "Preparação para Audiência",
      eventoGatilho: "audiencia",
      dias: 5,
      tipoDia: "util",
      area: "geral",
      riscoDefault: "MEDIO",
      fundamentoLegal: "",
      descricao: "Preparar documentos e estratégia para audiência designada",
      ativo: true,
      preConfigurada: true,
    },
    {
      nome: "Manifestação em Despacho",
      eventoGatilho: "despacho",
      dias: 5,
      tipoDia: "util",
      area: "geral",
      riscoDefault: "MEDIO",
      fundamentoLegal: "Art. 218 CPC — prazo de 5 dias quando não fixado",
      descricao: "Prazo para manifestação em despacho sem prazo específico",
      ativo: true,
      preConfigurada: true,
    },
    {
      nome: "Defesa Trabalhista (reclamação trabalhista)",
      eventoGatilho: "citacao",
      dias: 5,
      tipoDia: "util",
      area: "trabalhista",
      riscoDefault: "CRITICO",
      fundamentoLegal: "Art. 847 CLT — defesa oral ou escrita na audiência",
      descricao: "Preparar defesa para reclamação trabalhista — apresentação na audiência",
      ativo: true,
      preConfigurada: true,
    },
    {
      nome: "Recurso Ordinário Trabalhista (após sentença)",
      eventoGatilho: "sentenca",
      dias: 8,
      tipoDia: "util",
      area: "trabalhista",
      riscoDefault: "CRITICO",
      fundamentoLegal: "Art. 895 CLT — 8 dias para recurso ordinário",
      descricao: "Prazo para recurso ordinário trabalhista após sentença",
      ativo: true,
      preConfigurada: true,
    },
    {
      nome: "Embargos de Declaração",
      eventoGatilho: "sentenca",
      dias: 5,
      tipoDia: "util",
      area: "geral",
      riscoDefault: "ALTO",
      fundamentoLegal: "Art. 1.023 CPC — 5 dias para embargos de declaração",
      descricao: "Avaliar necessidade de embargos de declaração após sentença",
      ativo: true,
      preConfigurada: true,
    },
  ];

  for (const regra of regras) {
    await storage.createDeadlineRule(regra);
  }

  console.log("[engine] Regras pré-configuradas criadas:", regras.length);
}
