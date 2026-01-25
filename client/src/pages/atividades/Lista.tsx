import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import type { Atividade, Processo, Equipe } from "@shared/schema";

export default function ListaAtividades() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todas");

  const { data: atividades = [], isLoading } = useQuery<Atividade[]>({
    queryKey: ["/api/atividades"],
  });

  const { data: processos = [] } = useQuery<Processo[]>({
    queryKey: ["/api/processos"],
  });

  const { data: equipe = [] } = useQuery<Equipe[]>({
    queryKey: ["/api/equipe"],
  });

  const getProcessoNumero = (id: string | null) => {
    const proc = processos.find(p => p.id === id);
    return proc?.numero;
  };

  const getResponsavelNome = (id: string | null) => {
    const membro = equipe.find(m => m.id === id);
    return membro?.nome || "Não atribuído";
  };

  const filteredAtividades = atividades.filter((atividade) => {
    const matchesSearch =
      atividade.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getProcessoNumero(atividade.processoId)?.includes(searchTerm) ||
      getResponsavelNome(atividade.responsavelId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo =
      tipoFilter === "todas" || atividade.tipo === tipoFilter;
    return matchesSearch && matchesTipo;
  });

  const tipoIcons: Record<string, typeof Clock> = {
    Tarefa: Clock,
    Intimação: Bell,
    Audiência: Gavel,
    Compromisso: Calendar,
  };

  const tipoColors: Record<string, string> = {
    Tarefa: "bg-purple-100 text-purple-800",
    Intimação: "bg-orange-100 text-orange-800",
    Audiência: "bg-green-100 text-green-800",
    Compromisso: "bg-blue-100 text-blue-800",
  };

  const statusColors: Record<string, string> = {
    Pendente: "bg-gray-100 text-gray-800",
    "Em Andamento": "bg-blue-100 text-blue-800",
    Concluído: "bg-green-100 text-green-800",
    Atrasado: "bg-red-100 text-red-800",
  };

  const prioridadeColors: Record<string, string> = {
    Alta: "text-red-600",
    Média: "text-yellow-600",
    Baixa: "text-green-600",
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando atividades...</p>
      </div>
    );
  }

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
              {atividades.filter((a) => a.tipo === "Tarefa").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Intimações</p>
            <p className="text-3xl font-bold text-orange-600">
              {atividades.filter((a) => a.tipo === "Intimação").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Audiências</p>
            <p className="text-3xl font-bold text-green-600">
              {atividades.filter((a) => a.tipo === "Audiência").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Compromissos</p>
            <p className="text-3xl font-bold text-blue-600">
              {atividades.filter((a) => a.tipo === "Compromisso").length}
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
                const Icon = tipoIcons[atividade.tipo] || Clock;
                return (
                  <TableRow key={atividade.id} data-testid={`row-activity-${atividade.id}`}>
                    <TableCell className="font-medium">{atividade.titulo}</TableCell>
                    <TableCell>
                      <Badge className={tipoColors[atividade.tipo] || "bg-gray-100"}>
                        <Icon className="w-3 h-3 mr-1" />
                        {atividade.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {atividade.processoId ? (
                        <span className="font-mono text-sm">{getProcessoNumero(atividade.processoId)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getResponsavelNome(atividade.responsavelId)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{new Date(atividade.data).toLocaleDateString("pt-BR")}</div>
                        {atividade.hora && (
                          <div className="text-muted-foreground">{atividade.hora}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${prioridadeColors[atividade.prioridade] || ""}`}>
                        {atividade.prioridade}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[atividade.status] || "bg-gray-100"}>
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

          {filteredAtividades.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma atividade encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
