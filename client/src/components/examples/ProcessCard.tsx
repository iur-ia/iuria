import { ProcessCard, ProcessCardData } from '../ProcessCard'

const mockProcesses: ProcessCardData[] = [
  {
    id: "1",
    codigo_interno: "PRO.0000001",
    numero_cnj: "0806008-09.2025.8.19.0024",
    cliente: "Maria Silva Comércio LTDA",
    envolvido: { nome: "João Santos", tipo: "Réu" },
    assunto: "Ação de Cobrança",
    orgao: "TJRJ",
    comarca: "Itaguaí",
    orgao_julgador: "2ª Vara Cível",
    instancia: "1ª",
    status: ["incompleto", "movimentado"],
    marcadores: [
      { nome: "Urgente", cor: "#ef4444" },
      { nome: "Cliente Premium", cor: "#8b5cf6" },
    ],
    responsaveis: [
      { iniciais: "TG", nome: "Thiago Gomes", cor: "#8b5cf6" },
      { iniciais: "MC", nome: "Maria Costa", cor: "#ec4899" },
    ],
  },
  {
    id: "2",
    codigo_interno: "PRO.0000002",
    numero_cnj: "0912345-67.2025.8.19.0001",
    cliente: "Pedro Oliveira",
    envolvido: { nome: "Banco XYZ S/A", tipo: "Executado" },
    assunto: "Execução de Título Extrajudicial",
    orgao: "TJRJ",
    comarca: "Rio de Janeiro",
    orgao_julgador: "5ª Vara Empresarial",
    instancia: "1ª",
    status: ["ativo"],
    marcadores: [
      { nome: "Alto Valor", cor: "#10b981" },
    ],
    responsaveis: [
      { iniciais: "TG", nome: "Thiago Gomes", cor: "#8b5cf6" },
    ],
  },
];

export default function ProcessCardExample() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
      {mockProcesses.map((process) => (
        <ProcessCard key={process.id} process={process} />
      ))}
    </div>
  )
}
