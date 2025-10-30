import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Tarefa {
  id: string;
  titulo: string;
  processo?: string;
  responsavel: string;
  prazo: string;
  prioridade: "Alta" | "Média" | "Baixa";
  status: "a-fazer" | "em-andamento" | "concluido";
}

const mockTarefas: Tarefa[] = [
  {
    id: "1",
    titulo: "Revisar petição inicial",
    processo: "PRO.0000001",
    responsavel: "Thiago Gomes",
    prazo: "2025-10-30",
    prioridade: "Alta",
    status: "a-fazer",
  },
  {
    id: "2",
    titulo: "Análise de contrato",
    processo: "PRO.0000004",
    responsavel: "Maria Costa",
    prazo: "2025-10-31",
    prioridade: "Média",
    status: "a-fazer",
  },
  {
    id: "3",
    titulo: "Elaborar contestação",
    processo: "PRO.0000003",
    responsavel: "Roberto Silva",
    prazo: "2025-11-01",
    prioridade: "Alta",
    status: "em-andamento",
  },
  {
    id: "4",
    titulo: "Preparar documentos para audiência",
    processo: "PRO.0000001",
    responsavel: "Maria Costa",
    prazo: "2025-11-04",
    prioridade: "Alta",
    status: "em-andamento",
  },
  {
    id: "5",
    titulo: "Protocolar recurso",
    processo: "PRO.0000002",
    responsavel: "Thiago Gomes",
    prazo: "2025-10-28",
    prioridade: "Média",
    status: "concluido",
  },
  {
    id: "6",
    titulo: "Reunião de alinhamento",
    responsavel: "Roberto Silva",
    prazo: "2025-10-27",
    prioridade: "Baixa",
    status: "concluido",
  },
];

export default function PainelTarefas() {
  const tarefasPorStatus = {
    "a-fazer": mockTarefas.filter((t) => t.status === "a-fazer"),
    "em-andamento": mockTarefas.filter((t) => t.status === "em-andamento"),
    concluido: mockTarefas.filter((t) => t.status === "concluido"),
  };

  const prioridadeColors = {
    Alta: "text-red-600",
    Média: "text-yellow-600",
    Baixa: "text-green-600",
  };

  const StatusColumn = ({ status, titulo, tarefas, color }: { status: string; titulo: string; tarefas: Tarefa[]; color: string }) => (
    <div className="flex-1">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">{titulo}</h3>
          <Badge variant="secondary">{tarefas.length}</Badge>
        </div>
        <div className={`h-1 rounded-full ${color}`} />
      </div>
      <div className="space-y-3">
        {tarefas.map((tarefa) => (
          <Card key={tarefa.id} className="hover-elevate cursor-pointer" data-testid={`card-task-${tarefa.id}`}>
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">{tarefa.titulo}</h4>
              {tarefa.processo && (
                <p className="text-xs font-mono text-muted-foreground mb-2">
                  {tarefa.processo}
                </p>
              )}
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">{tarefa.responsavel}</span>
                <span className={`font-medium ${prioridadeColors[tarefa.prioridade]}`}>
                  {tarefa.prioridade}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Prazo: {new Date(tarefa.prazo).toLocaleDateString("pt-BR")}
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
            Painel de Tarefas
          </h1>
          <p className="text-sm text-muted-foreground">
            Visualize e organize tarefas por status
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">A Fazer</p>
            <p className="text-3xl font-bold text-gray-600">
              {tarefasPorStatus["a-fazer"].length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Em Andamento</p>
            <p className="text-3xl font-bold text-blue-600">
              {tarefasPorStatus["em-andamento"].length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Concluído</p>
            <p className="text-3xl font-bold text-green-600">
              {tarefasPorStatus["concluido"].length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Pesquisar tarefas..."
                className="pl-9"
                data-testid="input-task-search"
              />
            </div>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-4">
            <StatusColumn
              status="a-fazer"
              titulo="A Fazer"
              tarefas={tarefasPorStatus["a-fazer"]}
              color="bg-gray-400"
            />
            <StatusColumn
              status="em-andamento"
              titulo="Em Andamento"
              tarefas={tarefasPorStatus["em-andamento"]}
              color="bg-blue-500"
            />
            <StatusColumn
              status="concluido"
              titulo="Concluído"
              tarefas={tarefasPorStatus["concluido"]}
              color="bg-green-500"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
