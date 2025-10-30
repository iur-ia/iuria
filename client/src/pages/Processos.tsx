import { useState } from "react";
import { Plus, Search, Filter, Grid3x3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProcessCard, ProcessCardData } from "@/components/ProcessCard";

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
  {
    id: "3",
    codigo_interno: "PRO.0000003",
    numero_cnj: "1234567-89.2025.8.19.0002",
    cliente: "Ana Paula Rodrigues",
    envolvido: { nome: "Construtora ABC LTDA", tipo: "Autor" },
    assunto: "Rescisão Contratual c/c Indenização",
    orgao: "TJRJ",
    comarca: "Niterói",
    instancia: "2ª",
    status: ["parado"],
    marcadores: [],
    responsaveis: [
      { iniciais: "MC", nome: "Maria Costa", cor: "#ec4899" },
    ],
  },
  {
    id: "4",
    codigo_interno: "PRO.0000004",
    numero_cnj: "5678901-23.2025.8.19.0003",
    cliente: "Comércio Central S/A",
    envolvido: { nome: "Fornecedor Delta LTDA", tipo: "Réu" },
    assunto: "Ação de Indenização por Danos Materiais",
    orgao: "TJRJ",
    comarca: "Petrópolis",
    orgao_julgador: "1ª Vara Cível",
    instancia: "1ª",
    status: ["movimentado"],
    marcadores: [
      { nome: "Complexo", cor: "#f97316" },
    ],
    responsaveis: [
      { iniciais: "TG", nome: "Thiago Gomes", cor: "#8b5cf6" },
      { iniciais: "RS", nome: "Roberto Silva", cor: "#3b82f6" },
    ],
  },
];

export default function Processos() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterTab, setFilterTab] = useState("todos");

  const filterCounts = {
    todos: mockProcesses.length,
    incompletos: mockProcesses.filter(p => p.status.includes("incompleto")).length,
    movimentados: mockProcesses.filter(p => p.status.includes("movimentado")).length,
    parados: mockProcesses.filter(p => p.status.includes("parado")).length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Processos</h1>
          <p className="text-sm text-muted-foreground">Gerencie todos os processos do escritório</p>
        </div>
        <Button className="bg-legal-status-active hover:bg-legal-status-active/90" data-testid="button-new-process" onClick={() => console.log('New process clicked')}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Processo
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Pesquise por pasta, nº processo, marcador, assunto..."
            className="pl-9"
            data-testid="input-process-search"
          />
        </div>
        <Button variant="outline" data-testid="button-filters" onClick={() => console.log('Filters clicked')}>
          <Filter className="w-4 h-4 mr-2" />
          Filtros
          <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5">0</Badge>
        </Button>
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("grid")}
            data-testid="button-view-grid"
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("list")}
            data-testid="button-view-list"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <Tabs value={filterTab} onValueChange={setFilterTab}>
          <TabsList>
            <TabsTrigger value="todos" data-testid="tab-all">
              Todos
              <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5">{filterCounts.todos}</Badge>
            </TabsTrigger>
            <TabsTrigger value="incompletos" data-testid="tab-incomplete">
              Incompletos
              <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-legal-status-incomplete text-white">{filterCounts.incompletos}</Badge>
            </TabsTrigger>
            <TabsTrigger value="movimentados" data-testid="tab-moved">
              Movimentados
              <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-legal-status-moved text-white">{filterCounts.movimentados}</Badge>
            </TabsTrigger>
            <TabsTrigger value="parados" data-testid="tab-stopped">
              Parados
              <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-legal-status-stopped text-white">{filterCounts.parados}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Select defaultValue="recent">
          <SelectTrigger className="w-56" data-testid="select-sort">
            <SelectValue placeholder="Ordenar por..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Últimos cadastrados</SelectItem>
            <SelectItem value="moved">Últimos movimentados</SelectItem>
            <SelectItem value="updated">Últimos atualizados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={viewMode === "grid" ? "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-4"}>
        {mockProcesses.map((process) => (
          <ProcessCard key={process.id} process={process} />
        ))}
      </div>
    </div>
  );
}
