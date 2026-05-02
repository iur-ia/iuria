import type { AnyNode } from "domhandler";
import type { EmpresaData, ScrapingResult } from "./types";
import { fetchJson, makeLogger, withRetry } from "./utils";
import { crawlUrl } from "./crawler";

interface BrasilApiCnpj {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  descricao_situacao_cadastral?: string;
  descricao_tipo_de_logradouro?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  ddd_telefone_1?: string;
  email?: string;
  descricao_natureza_juridica?: string;
  capital_social?: number;
  porte?: string;
  data_inicio_atividade?: string;
  cnae_fiscal_descricao?: string;
  cnaes_secundarios?: { descricao: string }[];
  qsa?: { nome_socio: string; qualificacao_socio?: string; cnpj_cpf_do_socio?: string }[];
  descricao_motivo_situacao_cadastral?: string;
}

function formatarEndereco(d: BrasilApiCnpj): string {
  const parts = [
    d.descricao_tipo_de_logradouro,
    d.logradouro,
    d.numero ? `nº ${d.numero}` : null,
    d.complemento || null,
    d.bairro || null,
    d.municipio && d.uf ? `${d.municipio} – ${d.uf}` : (d.municipio || null),
    d.cep ? `CEP ${d.cep}` : null,
  ].filter(Boolean);
  return parts.join(", ");
}

function brasilApiToEmpresa(d: BrasilApiCnpj): EmpresaData {
  return {
    cnpj: d.cnpj,
    razaoSocial: d.razao_social,
    nomeFantasia: d.nome_fantasia || undefined,
    situacao: d.descricao_situacao_cadastral || undefined,
    situacaoCadastral: d.descricao_situacao_cadastral || undefined,
    atividadePrincipal: d.cnae_fiscal_descricao || undefined,
    atividadesSecundarias: (d.cnaes_secundarios || []).map(c => c.descricao).filter(Boolean),
    endereco: formatarEndereco(d) || undefined,
    municipio: d.municipio || undefined,
    uf: d.uf || undefined,
    telefone: d.ddd_telefone_1 || undefined,
    email: d.email || undefined,
    naturezaJuridica: d.descricao_natureza_juridica || undefined,
    capitalSocial: d.capital_social != null ? `R$ ${Number(d.capital_social).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : undefined,
    porte: d.porte || undefined,
    dataAbertura: d.data_inicio_atividade || undefined,
    socios: (d.qsa || []).map(s => ({
      nome: s.nome_socio,
      qualificacao: s.qualificacao_socio || undefined,
      cpfOuCnpj: s.cnpj_cpf_do_socio || undefined,
    })),
  };
}

function empresaToMarkdown(e: EmpresaData): string {
  const lines: string[] = [
    `# ${e.razaoSocial}`,
    e.nomeFantasia ? `**Nome Fantasia:** ${e.nomeFantasia}` : "",
    `**CNPJ:** ${e.cnpj}`,
    e.situacao ? `**Situação:** ${e.situacao}` : "",
    e.naturezaJuridica ? `**Natureza Jurídica:** ${e.naturezaJuridica}` : "",
    e.porte ? `**Porte:** ${e.porte}` : "",
    e.dataAbertura ? `**Data de Abertura:** ${e.dataAbertura}` : "",
    e.capitalSocial ? `**Capital Social:** ${e.capitalSocial}` : "",
    "",
    "## Atividade",
    e.atividadePrincipal ? `**Principal:** ${e.atividadePrincipal}` : "",
    (e.atividadesSecundarias || []).length > 0 ? `**Secundárias:** ${e.atividadesSecundarias!.join("; ")}` : "",
    "",
    "## Localização",
    e.endereco || "",
    e.telefone ? `**Telefone:** ${e.telefone}` : "",
    e.email ? `**E-mail:** ${e.email}` : "",
    "",
  ];

  if ((e.socios || []).length > 0) {
    lines.push("## Quadro Societário");
    for (const s of e.socios!) {
      lines.push(`- **${s.nome}**${s.qualificacao ? ` (${s.qualificacao})` : ""}${s.cpfOuCnpj ? ` — CPF/CNPJ: ${s.cpfOuCnpj}` : ""}`);
    }
  }

  return lines.filter(l => l.trim()).join("\n");
}

/**
 * Scraping direto do portal servicos.receita.fazenda.gov.br/Servicos/cnpjreva/
 * Usado como terceiro fallback após BrasilAPI e ReceitaWS.
 * O portal exige CAPTCHA na consulta completa, mas a rota de validação
 * retorna dados básicos sem autenticação.
 */
async function buscarViaReceitaFederalPortal(
  cnpj: string,
  log: (l: "info" | "warn" | "error", m: string) => void
): Promise<EmpresaData | null> {
  log("info", `Tentando portal Receita Federal diretamente para CNPJ ${cnpj}`);

  try {
    const url = `https://servicos.receita.fazenda.gov.br/Servicos/cnpjreva/valida.asp?cnpj=${cnpj}`;
    const { $ } = await crawlUrl(url, {
      maxRequestsPerMinute: 5,
      maxConcurrency: 1,
      timeoutSecs: 30,
      maxRetries: 1,
    });

    // Extração de campos do portal RF
    const razaoSocial = $("td:contains('Nome Empresarial')").next().text().trim()
      || $(".razao-social, #razaoSocial").text().trim()
      || $("input[name='nomeEmpresarial']").val() as string || "";

    const situacao = $("td:contains('Situação Cadastral')").next().text().trim()
      || $(".situacao, #situacao").text().trim() || "";

    const uf = $("td:contains('UF')").next().text().trim().slice(0, 2) || "";
    const municipio = $("td:contains('Município')").next().text().trim() || "";

    const atividades: string[] = [];
    $("td:contains('Atividade Econômica')").each((_: number, el: AnyNode) => {
      const val = $(el).next().text().trim();
      if (val) atividades.push(val);
    });

    if (!razaoSocial && !situacao) {
      log("warn", `Portal RF: campos esperados não encontrados para CNPJ ${cnpj}`);
      return null;
    }

    log("info", `Portal RF: dados básicos extraídos para CNPJ ${cnpj} — ${razaoSocial || "sem nome"}`);

    return {
      cnpj,
      razaoSocial: razaoSocial || cnpj,
      situacao: situacao || undefined,
      uf: uf || undefined,
      municipio: municipio || undefined,
      atividadePrincipal: atividades[0] || undefined,
      atividadesSecundarias: atividades.slice(1),
      socios: [],
    };
  } catch (err) {
    log("warn", `Portal Receita Federal falhou: ${err}`);
    return null;
  }
}

export async function buscarCnpj(cnpjRaw: string): Promise<ScrapingResult<EmpresaData>> {
  const t0 = Date.now();
  const { logs, log } = makeLogger();
  const cnpj = cnpjRaw.replace(/\D/g, "");

  log("info", `Consultando CNPJ ${cnpj} via BrasilAPI`);

  // ── Tentativa 1: BrasilAPI ────────────────────────────────────────────────
  try {
    const data = await withRetry(() =>
      fetchJson<BrasilApiCnpj>(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { timeoutMs: 15000 })
    );

    const empresa = brasilApiToEmpresa(data);
    const md = empresaToMarkdown(empresa);

    log("info", `CNPJ ${cnpj} encontrado via BrasilAPI: ${empresa.razaoSocial}`);

    return {
      source: "brasilapi",
      sourceLabel: "BrasilAPI (Receita Federal)",
      data: empresa,
      markdownContent: md,
      durationMs: Date.now() - t0,
      logs,
    };
  } catch (err) {
    log("warn", `BrasilAPI falhou: ${err}. Tentando ReceitaWS...`);
  }

  // ── Tentativa 2: ReceitaWS API ────────────────────────────────────────────
  try {
    const fallback = await withRetry(() =>
      fetchJson<{
        status: string;
        message?: string;
        nome?: string;
        fantasia?: string;
        situacao?: string;
        cnpj?: string;
        atividade_principal?: { text: string }[];
        qsa?: { nome: string; qual: string }[];
        logradouro?: string;
        municipio?: string;
        uf?: string;
        abertura?: string;
      }>(
        `https://receitaws.com.br/v1/cnpj/${cnpj}`,
        { timeoutMs: 15000 }
      )
    );

    if (fallback.status === "ERROR") throw new Error(fallback.message || "Erro ReceitaWS");

    const empresa: EmpresaData = {
      cnpj,
      razaoSocial: fallback.nome || cnpj,
      nomeFantasia: fallback.fantasia || undefined,
      situacao: fallback.situacao || undefined,
      atividadePrincipal: fallback.atividade_principal?.[0]?.text || undefined,
      endereco: [fallback.logradouro, fallback.municipio, fallback.uf].filter(Boolean).join(", ") || undefined,
      dataAbertura: fallback.abertura || undefined,
      socios: (fallback.qsa || []).map(s => ({ nome: s.nome, qualificacao: s.qual })),
    };

    log("info", `CNPJ ${cnpj} encontrado via ReceitaWS: ${empresa.razaoSocial}`);

    return {
      source: "receita_federal",
      sourceLabel: "ReceitaWS (Receita Federal)",
      data: empresa,
      markdownContent: empresaToMarkdown(empresa),
      durationMs: Date.now() - t0,
      logs,
    };
  } catch (err2) {
    log("warn", `ReceitaWS falhou: ${err2}. Tentando portal Receita Federal diretamente...`);
  }

  // ── Tentativa 3: Scraping direto do portal servicos.receita.fazenda.gov.br ─
  const rfEmpresa = await buscarViaReceitaFederalPortal(cnpj, log);
  if (rfEmpresa) {
    return {
      source: "receita_federal",
      sourceLabel: "Portal Receita Federal (scraping direto)",
      data: rfEmpresa,
      markdownContent: empresaToMarkdown(rfEmpresa),
      durationMs: Date.now() - t0,
      logs,
    };
  }

  throw new Error(`Não foi possível consultar o CNPJ ${cnpj} em nenhuma das fontes disponíveis`);
}
