import { useState } from "react";
import { Plus, Search, Filter, Calendar, Clock, Bell, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Atividade {
  id: string;
  titulo: string;
  tipo: "Tarefa" | "Intimação" | "Audiência" | "Compromisso";
  processo?: string;
  responsavel: string;
  data: string;
  hora?: string;
  prioridade: "Alta" | "Média" | "Baixa";
  status: "Pendente" | "Em Andamento" | "Concluído" | "Atrasado";
}

const mockAtividades: Atividade[] = [
  {
    id: "1",
    titulo: "Revisar petição inicial",
    tipo: "Tarefa",
    processo: "PRO.0000001",
    responsavel: "Thiago Gomes",
    data: "2025-10-30",
    hora: "14:00",
    prioridade: "Alta",
    status: "Pendente",
  },
  {
    id: "2",
    titulo: "Prazo recurso - Processo Silva",
    tipo: "Intimação",
    processo: "PRO.0000002",
    responsavel: "Maria Costa",
    data: "2025-11-02",
    prioridade: "Alta",
    status: "Pendente",
  },
  {
    id: "3",
    titulo: "Audiência de instrução",
    tipo: "Audiência",
    processo: "PRO.0000001",
    responsavel: "Thiago Gomes",
    data: "2025-11-05",
    hora: "10:30",
    prioridade: "Alta",
    status: "Pendente",
  },
  {
    id: "4",
    titulo: "Reunião com cliente - Comércio Central",
    tipo: "Compromisso",
    responsavel: "Roberto Silva",
    data: "2025-10-31",
    hora: "15:00",
    prioridade: "Média",
    status: "Pendente",
  },
  {
    id: "5",
    titulo: "Análise de contrato",
    tipo: "Tarefa",
    processo: "PRO.0000004",
    responsavel: "Maria Costa",
    data: "2025-10-29",
    hora: "09:00",
    prioridade: "Média",
    status: "Atrasado",
  },
  {
    id: "6",
    titulo: "Elaborar contestação",
    tipo: "Tarefa",
    processo: "PRO.0000003",
    responsavel: "Roberto Silva",
    data: "2025-11-01",
    hora: "11:00",
    prioridade: "Alta",
    status: "Em Andamento",
  },
];

export default function ListaAtividades() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todas");

  const filteredAtividades = mockAtividades.filter((atividade) => {
    const matchesSearch =
      atividade.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      atividade.processo?.includes(searchTerm) ||
      atividade.responsavel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo =
      tipoFilter === "todas" || atividade.tipo === tipoFilter;
    return matchesSearch && matchesTipo;
  });

  const tipoIcons = {
    Tarefa: Clock,
    Intimação: Bell,
    Audiência: Gavel,
    Compromisso: Calendar,
  };

  const tipoColors = {
    Tarefa: "bg-purple-100 text-purple-800",
    Intimação: "bg-orange-100 text-orange-800",
    Audiência: "bg-green-100 text-green-800",
    Compromisso: "bg-blue-100 text-blue-800",
  };

  const statusColors = {
    Pendente: "bg-gray-100 text-gray-800",
    "Em Andamento": "bg-blue-100 text-blue-800",
    Concluído: "bg-green-100 text-green-800",
    Atrasado: "bg-red-100 text-red-800",
  };

  const prioridadeColors = {
    Alta: "text-red-600",
    Média: "text-yellow-600",
    Baixa: "text-green-600",
  };

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Lista de Atividades
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie todas as atividades do escritório
          </p>
        </div>
        <Button
          className="bg-legal-status-active hover:bg-legal-status-active/90"
          data-testid="button-new-activity"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Atividade
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Tarefas</p>
            <p className="text-3xl font-bold text-purple-600">
              {mockAtividades.filter((a) => a.tipo === "Tarefa").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Intimações</p>
            <p className="text-3xl font-bold text-orange-600">
              {mockAtividades.filter((a) => a.tipo === "Intimação").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Audiências</p>
            <p className="text-3xl font-bold text-green-600">
              {mockAtividades.filter((a) => a.tipo === "Audiência").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Compromissos</p>
            <p className="text-3xl font-bold text-blue-600">
              {mockAtividades.filter((a) => a.tipo === "Compromisso").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Pesquisar atividades..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-activity-search"
              />
            </div>
            <Button variant="outline" data-testid="button-filters">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>

          <Tabs value={tipoFilter} onValueChange={setTipoFilter} className="mb-4">
            <TabsList>
              <TabsTrigger value="todas" data-testid="tab-all">
                Todas
              </TabsTrigger>
              <TabsTrigger value="Tarefa" data-testid="tab-tasks">
                Tarefas
              </TabsTrigger>
              <TabsTrigger value="Intimação" data-testid="tab-intimations">
                Intimações
              </TabsTrigger>
              <TabsTrigger value="Audiência" data-testid="tab-hearings">
                Audiências
              </TabsTrigger>
              <TabsTrigger value="Compromisso" data-testid="tab-appointments">
                Compromissos
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atividade</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAtividades.map((atividade) => {
                const Icon = tipoIcons[atividade.tipo];
                return (
                  <TableRow key={atividade.id} data-testid={`row-activity-${atividade.id}`}>
                    <TableCell className="font-medium">{atividade.titulo}</TableCell>
                    <TableCell>
                      <Badge className={tipoColors[atividade.tipo]}>
                        <Icon className="w-3 h-3 mr-1" />
                        {atividade.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {atividade.processo ? (
                        <span className="font-mono text-sm">{atividade.processo}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{atividade.responsavel}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{new Date(atividade.data).toLocaleDateString("pt-BR")}</div>
                        {atividade.hora && (
                          <div className="text-muted-foreground">{atividade.hora}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${prioridadeColors[atividade.prioridade]}`}>
                        {atividade.prioridade}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[atividade.status]}>
                        {atividade.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" data-testid={`button-view-activity-${atividade.id}`}>
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
