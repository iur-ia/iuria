import { Plus, Search, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Tarefa {
  id: string;
  titulo: string;
  processo?: string;
  responsavel: string;
  prazo: string;
  prioridade: "Alta" | "Média" | "Baixa";
  status: "backlog" | "a-fazer" | "em-andamento" | "revisao" | "concluido";
}

const mockTarefas: Tarefa[] = [
  {
    id: "1",
    titulo: "Revisar petição inicial",
    processo: "PRO.0000001",
    responsavel: "TG",
    prazo: "2025-10-30",
    prioridade: "Alta",
    status: "backlog",
  },
  {
    id: "2",
    titulo: "Análise de contrato",
    processo: "PRO.0000004",
    responsavel: "MC",
    prazo: "2025-10-31",
    prioridade: "Média",
    status: "a-fazer",
  },
  {
    id: "3",
    titulo: "Elaborar contestação",
    processo: "PRO.0000003",
    responsavel: "RS",
    prazo: "2025-11-01",
    prioridade: "Alta",
    status: "em-andamento",
  },
  {
    id: "4",
    titulo: "Preparar documentos para audiência",
    processo: "PRO.0000001",
    responsavel: "MC",
    prazo: "2025-11-04",
    prioridade: "Alta",
    status: "em-andamento",
  },
  {
    id: "5",
    titulo: "Protocolar recurso",
    processo: "PRO.0000002",
    responsavel: "TG",
    prazo: "2025-10-28",
    prioridade: "Média",
    status: "revisao",
  },
  {
    id: "6",
    titulo: "Reunião de alinhamento",
    responsavel: "RS",
    prazo: "2025-10-27",
    prioridade: "Baixa",
    status: "concluido",
  },
  {
    id: "7",
    titulo: "Minutar acordo trabalhista",
    processo: "PRO.0000005",
    responsavel: "MC",
    prazo: "2025-11-03",
    prioridade: "Alta",
    status: "backlog",
  },
];

export default function KanbanTarefas() {
  const tarefasPorStatus = {
    backlog: mockTarefas.filter((t) => t.status === "backlog"),
    "a-fazer": mockTarefas.filter((t) => t.status === "a-fazer"),
    "em-andamento": mockTarefas.filter((t) => t.status === "em-andamento"),
    revisao: mockTarefas.filter((t) => t.status === "revisao"),
    concluido: mockTarefas.filter((t) => t.status === "concluido"),
  };

  const prioridadeColors = {
    Alta: "border-l-red-500",
    Média: "border-l-yellow-500",
    Baixa: "border-l-green-500",
  };

  const KanbanColumn = ({
    status,
    titulo,
    tarefas,
    color,
  }: {
    status: string;
    titulo: string;
    tarefas: Tarefa[];
    color: string;
  }) => (
    <div className="flex-1 min-w-80">
      <div className={`rounded-t-lg p-3 ${color} text-white`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{titulo}</h3>
          <Badge className="bg-white/20 text-white border-0">{tarefas.length}</Badge>
        </div>
      </div>
      <div className="bg-gray-100 rounded-b-lg p-3 min-h-96 space-y-3">
        {tarefas.map((tarefa) => (
          <Card
            key={tarefa.id}
            className={`hover-elevate cursor-move border-l-4 ${prioridadeColors[tarefa.prioridade]}`}
            data-testid={`kanban-card-${tarefa.id}`}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-sm flex-1">{tarefa.titulo}</h4>
                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </div>
              {tarefa.processo && (
                <p className="text-xs font-mono text-muted-foreground mb-2">
                  {tarefa.processo}
                </p>
              )}
              <div className="flex items-center justify-between">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
                  {tarefa.responsavel}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(tarefa.prazo).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Kanban de Tarefas
          </h1>
          <p className="text-sm text-muted-foreground">
            Arraste e solte tarefas entre as colunas
          </p>
        </div>
        <Button
          className="bg-legal-status-active hover:bg-legal-status-active/90"
          data-testid="button-new-task"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Pesquisar tarefas..."
            className="pl-9 bg-white"
            data-testid="input-kanban-search"
          />
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        <KanbanColumn
          status="backlog"
          titulo="Backlog"
          tarefas={tarefasPorStatus.backlog}
          color="bg-gray-500"
        />
        <KanbanColumn
          status="a-fazer"
          titulo="A Fazer"
          tarefas={tarefasPorStatus["a-fazer"]}
          color="bg-slate-600"
        />
        <KanbanColumn
          status="em-andamento"
          titulo="Em Andamento"
          tarefas={tarefasPorStatus["em-andamento"]}
          color="bg-blue-600"
        />
        <KanbanColumn
          status="revisao"
          titulo="Em Revisão"
          tarefas={tarefasPorStatus.revisao}
          color="bg-purple-600"
        />
        <KanbanColumn
          status="concluido"
          titulo="Concluído"
          tarefas={tarefasPorStatus.concluido}
          color="bg-green-600"
        />
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-l-4 border-l-red-500" />
              <span>Alta prioridade</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-l-4 border-l-yellow-500" />
              <span>Média prioridade</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-l-4 border-l-green-500" />
              <span>Baixa prioridade</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
