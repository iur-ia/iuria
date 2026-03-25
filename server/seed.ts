import { db } from "./db";
import { 
  clientes, equipe, processos, atividades, documentos, 
  contasReceber, contasPagar, honorarios, templates, tribunais 
} from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  // Seed Tribunais (Courts) - All 92 tribunals active via MCP Tech Justica MNI
  await db.insert(tribunais).values([
    {
      sigla: "STF",
      nome: "Supremo Tribunal Federal",
      tipo: "Superior",
      url: "https://portal.stf.jus.br/processos/",
      ativo: true,
    },
    {
      sigla: "STJ",
      nome: "Superior Tribunal de Justiça",
      tipo: "Superior",
      url: "https://processo.stj.jus.br/processo/pesquisa/",
      ativo: true,
    },
    {
      sigla: "TST",
      nome: "Tribunal Superior do Trabalho",
      tipo: "Trabalhista",
      url: "https://pje.tst.jus.br/consultaprocessual/",
      ativo: true,
    },
    {
      sigla: "TSE",
      nome: "Tribunal Superior Eleitoral",
      tipo: "Eleitoral",
      url: "https://pje.tse.jus.br/pje-web/",
      ativo: true,
    },
    {
      sigla: "STM",
      nome: "Superior Tribunal Militar",
      tipo: "Militar",
      url: "https://www.stm.jus.br/servicos-stm/processos",
      ativo: true,
    },
    {
      sigla: "TJSP",
      nome: "Tribunal de Justiça de São Paulo",
      tipo: "Estadual",
      url: "https://esaj.tjsp.jus.br/cpopg/open.do",
      ativo: true,
    },
    {
      sigla: "TJRJ",
      nome: "Tribunal de Justiça do Rio de Janeiro",
      tipo: "Estadual",
      url: "https://www3.tjrj.jus.br",
      ativo: true,
    },
    {
      sigla: "TJMG",
      nome: "Tribunal de Justiça de Minas Gerais",
      tipo: "Estadual",
      url: "https://pje.tjmg.jus.br",
      ativo: true,
    },
    {
      sigla: "TRF1",
      nome: "Tribunal Regional Federal da 1ª Região",
      tipo: "Federal",
      url: "https://processual.trf1.jus.br/consultaProcessual/",
      ativo: true,
    },
    {
      sigla: "TRF2",
      nome: "Tribunal Regional Federal da 2ª Região",
      tipo: "Federal",
      url: "https://eproc.jfrj.jus.br",
      ativo: true,
    },
    {
      sigla: "TRF3",
      nome: "Tribunal Regional Federal da 3ª Região",
      tipo: "Federal",
      url: "https://pje1g.trf3.jus.br/pje/ConsultaPublica/listView.seam",
      ativo: true,
    },
    {
      sigla: "TRF4",
      nome: "Tribunal Regional Federal da 4ª Região",
      tipo: "Federal",
      url: "https://www.trf4.jus.br",
      ativo: true,
    },
    {
      sigla: "TRF5",
      nome: "Tribunal Regional Federal da 5ª Região",
      tipo: "Federal",
      url: "https://pje.trf5.jus.br",
      ativo: true,
    },
    {
      sigla: "TRF6",
      nome: "Tribunal Regional Federal da 6ª Região",
      tipo: "Federal",
      url: "https://portal.trf6.jus.br",
      ativo: true,
    },
  ]).onConflictDoNothing();

  console.log("Tribunais seeded");

  // Seed Equipe (Team members)
  const [thiago, maria, roberto] = await db.insert(equipe).values([
    {
      nome: "Thiago Gomes",
      email: "thiago@legalsys.com.br",
      telefone: "(11) 99999-0001",
      cargo: "Advogado Sênior",
      oab: "SP 123.456",
      especialidade: "Direito Civil",
      status: "Ativo",
    },
    {
      nome: "Maria Costa",
      email: "maria@legalsys.com.br",
      telefone: "(11) 99999-0002",
      cargo: "Advogada",
      oab: "SP 234.567",
      especialidade: "Direito Trabalhista",
      status: "Ativo",
    },
    {
      nome: "Roberto Silva",
      email: "roberto@legalsys.com.br",
      telefone: "(11) 99999-0003",
      cargo: "Advogado",
      oab: "SP 345.678",
      especialidade: "Direito Empresarial",
      status: "Ativo",
    },
  ]).returning();

  console.log("Equipe seeded");

  // Seed Clientes
  const [clienteSilva, clientePedro, clienteComercio, clienteAna] = await db.insert(clientes).values([
    {
      nome: "Maria Silva Comércio LTDA",
      tipo: "Pessoa Jurídica",
      cpfCnpj: "12.345.678/0001-99",
      email: "contato@mariasilva.com.br",
      telefone: "(11) 3333-1111",
      endereco: "Av. Paulista, 1000",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01310-100",
      status: "Ativo",
    },
    {
      nome: "Pedro Oliveira",
      tipo: "Pessoa Física",
      cpfCnpj: "123.456.789-00",
      email: "pedro.oliveira@email.com",
      telefone: "(11) 99888-1234",
      endereco: "Rua Augusta, 500",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01305-000",
      status: "Ativo",
    },
    {
      nome: "Comércio Central S/A",
      tipo: "Pessoa Jurídica",
      cpfCnpj: "98.765.432/0001-11",
      email: "juridico@comerciocentral.com.br",
      telefone: "(11) 4444-2222",
      endereco: "Rua Direita, 200",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01002-000",
      status: "Ativo",
    },
    {
      nome: "Ana Paula Rodrigues",
      tipo: "Pessoa Física",
      cpfCnpj: "987.654.321-00",
      email: "ana.rodrigues@email.com",
      telefone: "(11) 97777-5678",
      endereco: "Rua Oscar Freire, 100",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01426-000",
      status: "Ativo",
    },
  ]).returning();

  console.log("Clientes seeded");

  // Seed Processos
  const [proc1, proc2, proc3, proc4] = await db.insert(processos).values([
    {
      numero: "PRO.0000001",
      titulo: "Ação de Cobrança - Contrato de Serviços",
      clienteId: clienteSilva.id,
      responsavelId: thiago.id,
      tipo: "Ação de Cobrança",
      area: "Cível",
      tribunal: "TJSP",
      vara: "5ª Vara Cível",
      valorCausa: "150000.00",
      status: "Ativo",
      fase: "Instrução",
      dataDistribuicao: "2025-08-15",
    },
    {
      numero: "PRO.0000002",
      titulo: "Execução de Título Extrajudicial",
      clienteId: clientePedro.id,
      responsavelId: maria.id,
      tipo: "Execução",
      area: "Cível",
      tribunal: "TJSP",
      vara: "2ª Vara de Execuções",
      valorCausa: "85000.00",
      status: "Ativo",
      fase: "Execução",
      dataDistribuicao: "2025-09-01",
    },
    {
      numero: "PRO.0000003",
      titulo: "Rescisão Contratual c/ Indenização",
      clienteId: clienteAna.id,
      responsavelId: roberto.id,
      tipo: "Rescisão Contratual",
      area: "Trabalhista",
      tribunal: "TRT-2",
      vara: "10ª Vara do Trabalho",
      valorCausa: "75000.00",
      status: "Movimentado",
      fase: "Recursal",
      dataDistribuicao: "2025-07-10",
    },
    {
      numero: "PRO.0000004",
      titulo: "Consultoria Empresarial",
      clienteId: clienteComercio.id,
      responsavelId: thiago.id,
      tipo: "Consultoria",
      area: "Empresarial",
      valorCausa: "50000.00",
      status: "Ativo",
      fase: "Em andamento",
      dataDistribuicao: "2025-05-20",
    },
  ]).returning();

  console.log("Processos seeded");

  // Seed Atividades
  await db.insert(atividades).values([
    {
      titulo: "Revisar petição inicial",
      tipo: "Tarefa",
      processoId: proc1.id,
      responsavelId: thiago.id,
      data: "2025-10-30",
      hora: "14:00",
      prioridade: "Alta",
      status: "Pendente",
    },
    {
      titulo: "Prazo recurso - Processo Silva",
      tipo: "Intimação",
      processoId: proc2.id,
      responsavelId: maria.id,
      data: "2025-11-02",
      prioridade: "Alta",
      status: "Pendente",
    },
    {
      titulo: "Audiência de instrução",
      tipo: "Audiência",
      processoId: proc1.id,
      responsavelId: thiago.id,
      data: "2025-11-05",
      hora: "10:30",
      prioridade: "Alta",
      status: "Pendente",
    },
    {
      titulo: "Reunião com cliente - Comércio Central",
      tipo: "Compromisso",
      responsavelId: roberto.id,
      data: "2025-10-31",
      hora: "15:00",
      prioridade: "Média",
      status: "Pendente",
    },
    {
      titulo: "Análise de contrato",
      tipo: "Tarefa",
      processoId: proc4.id,
      responsavelId: maria.id,
      data: "2025-10-29",
      hora: "09:00",
      prioridade: "Média",
      status: "Atrasado",
    },
    {
      titulo: "Elaborar contestação",
      tipo: "Tarefa",
      processoId: proc3.id,
      responsavelId: roberto.id,
      data: "2025-11-01",
      hora: "11:00",
      prioridade: "Alta",
      status: "Em Andamento",
    },
  ]);

  console.log("Atividades seeded");

  // Seed Documentos
  await db.insert(documentos).values([
    {
      nome: "Petição Inicial - Ação de Cobrança.pdf",
      tipo: "Petição",
      processoId: proc1.id,
      tamanho: "2.5 MB",
      enviadoPor: thiago.id,
    },
    {
      nome: "Contrato de Honorários - Maria Silva.pdf",
      tipo: "Contrato",
      processoId: proc1.id,
      tamanho: "850 KB",
      enviadoPor: maria.id,
    },
    {
      nome: "Procuração - Pedro Oliveira.pdf",
      tipo: "Procuração",
      processoId: proc2.id,
      tamanho: "450 KB",
      enviadoPor: roberto.id,
    },
    {
      nome: "Sentença - 1ª Instância.pdf",
      tipo: "Sentença",
      processoId: proc3.id,
      tamanho: "1.2 MB",
      enviadoPor: thiago.id,
    },
    {
      nome: "Contestação - Processo 004.pdf",
      tipo: "Petição",
      processoId: proc4.id,
      tamanho: "3.1 MB",
      enviadoPor: maria.id,
    },
  ]);

  console.log("Documentos seeded");

  // Seed Contas a Receber
  await db.insert(contasReceber).values([
    {
      clienteId: clienteSilva.id,
      processoId: proc1.id,
      descricao: "Honorários - Ação de Cobrança",
      valor: "15000.00",
      vencimento: "2025-11-05",
      status: "Pendente",
      tipo: "Honorários",
    },
    {
      clienteId: clientePedro.id,
      processoId: proc2.id,
      descricao: "Honorários - Execução de Título",
      valor: "8500.00",
      vencimento: "2025-10-28",
      status: "Atrasado",
      tipo: "Honorários",
    },
    {
      clienteId: clienteComercio.id,
      processoId: proc4.id,
      descricao: "Consultoria Jurídica - Outubro",
      valor: "12000.00",
      vencimento: "2025-11-01",
      status: "Pago",
      tipo: "Consultoria",
      dataPagamento: "2025-10-30",
    },
    {
      clienteId: clienteAna.id,
      processoId: proc3.id,
      descricao: "Sucumbência - Rescisão Contratual",
      valor: "5000.00",
      vencimento: "2025-11-10",
      status: "Pendente",
      tipo: "Sucumbência",
    },
  ]);

  console.log("Contas a Receber seeded");

  // Seed Contas a Pagar
  await db.insert(contasPagar).values([
    {
      fornecedor: "Imobiliária Delta",
      descricao: "Aluguel do escritório - Novembro",
      valor: "8500.00",
      vencimento: "2025-11-05",
      status: "Pendente",
      categoria: "Aluguel",
    },
    {
      fornecedor: "Light S/A",
      descricao: "Conta de luz - Outubro",
      valor: "650.00",
      vencimento: "2025-10-28",
      status: "Atrasado",
      categoria: "Despesas",
    },
    {
      fornecedor: "Software SaaS LTDA",
      descricao: "Licença Projuris - Anual",
      valor: "15000.00",
      vencimento: "2025-10-25",
      status: "Pago",
      categoria: "Software",
      dataPagamento: "2025-10-24",
    },
    {
      fornecedor: "Receita Federal",
      descricao: "DARF - Impostos sobre serviços",
      valor: "4500.00",
      vencimento: "2025-11-10",
      status: "Pendente",
      categoria: "Impostos",
    },
  ]);

  console.log("Contas a Pagar seeded");

  // Seed Honorários
  await db.insert(honorarios).values([
    {
      clienteId: clienteSilva.id,
      processoId: proc1.id,
      tipo: "Misto",
      valorContratado: "20000.00",
      valorRecebido: "10000.00",
      percentualExito: 15,
      dataContrato: "2025-08-15",
      status: "Ativo",
    },
    {
      clienteId: clientePedro.id,
      processoId: proc2.id,
      tipo: "Êxito",
      percentualExito: 20,
      dataContrato: "2025-09-01",
      status: "Ativo",
    },
    {
      clienteId: clienteComercio.id,
      processoId: proc4.id,
      tipo: "Fixo",
      valorContratado: "35000.00",
      valorRecebido: "35000.00",
      dataContrato: "2025-05-20",
      status: "Finalizado",
    },
    {
      clienteId: clienteAna.id,
      processoId: proc3.id,
      tipo: "Hora",
      valorRecebido: "12500.00",
      dataContrato: "2025-07-10",
      status: "Ativo",
    },
  ]);

  console.log("Honorários seeded");

  // Seed Templates
  await db.insert(templates).values([
    {
      nome: "Petição Inicial - Ação de Cobrança",
      categoria: "Cível",
      descricao: "Template padrão para ação de cobrança",
      usos: 15,
    },
    {
      nome: "Contestação - Ação Trabalhista",
      categoria: "Trabalhista",
      descricao: "Modelo de contestação em ações trabalhistas",
      usos: 8,
    },
    {
      nome: "Recurso de Apelação",
      categoria: "Cível",
      descricao: "Template para recurso de apelação",
      usos: 12,
    },
    {
      nome: "Habeas Corpus",
      categoria: "Criminal",
      descricao: "Modelo de HC preventivo e liberatório",
      usos: 5,
    },
    {
      nome: "Contrato Social",
      categoria: "Empresarial",
      descricao: "Minuta de contrato social para LTDA",
      usos: 20,
    },
  ]);

  console.log("Templates seeded");

  console.log("Database seeded successfully!");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error seeding database:", err);
    process.exit(1);
  });
