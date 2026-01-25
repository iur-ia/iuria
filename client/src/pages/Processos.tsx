import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter, Grid3x3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Processo, Cliente, Equipe } from "@shared/schema";

export default function Processos() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterTab, setFilterTab] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: processos = [], isLoading } = useQuery<Processo[]>({
    queryKey: ["/api/processos"],
  });

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clientes"],
  });

  const { data: equipe = [] } = useQuery<Equipe[]>({
    queryKey: ["/api/equipe"],
  });

  const getClienteNome = (id: string | null) => {
    const cliente = clientes.find(c => c.id === id);
    return cliente?.nome || "Não informado";
  };

  const getResponsavelNome = (id: string | null) => {
    const membro = equipe.find(m => m.id === id);
    return membro?.nome || "Não atribuído";
  };

  const getResponsavelIniciais = (id: string | null) => {
    const membro = equipe.find(m => m.id === id);
    if (!membro) return "NA";
    return membro.nome.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const statusColors: Record<string, string> = {
    Ativo: "bg-green-100 text-green-800",
    Movimentado: "bg-blue-100 text-blue-800",
    Parado: "bg-gray-100 text-gray-800",
    Arquivado: "bg-yellow-100 text-yellow-800",
  };

  const filteredProcessos = processos.filter((processo) => {
    const matchesSearch =
      processo.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      processo.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClienteNome(processo.clienteId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterTab === "todos" || processo.status === filterTab;
    return matchesSearch && matchesFilter;
  });

  const filterCounts = {
    todos: processos.length,
    Ativo: processos.filter(p => p.status === "Ativo").length,
    Movimentado: processos.filter(p => p.status === "Movimentado").length,
    Parado: processos.filter(p => p.status === "Parado").length,
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando processos...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Processos</h1>
          <p className="text-sm text-muted-foreground">Gerencie todos os processos do escritório</p>
        </div>
        <Button className="bg-legal-status-active hover:bg-legal-status-active/90" data-testid="button-new-process">
          <Plus className="w-4 h-4 mr-2" />
          Novo Processo
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Pesquise por pasta, nº processo, cliente, assunto..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-process-search"
          />
        </div>
        <Button variant="outline" data-testid="button-filters">
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
            <TabsTrigger value="Ativo" data-testid="tab-active">
              Ativos
              <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-green-500 text-white">{filterCounts.Ativo}</Badge>
            </TabsTrigger>
            <TabsTrigger value="Movimentado" data-testid="tab-moved">
              Movimentados
              <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-blue-500 text-white">{filterCounts.Movimentado}</Badge>
            </TabsTrigger>
            <TabsTrigger value="Parado" data-testid="tab-stopped">
              Parados
              <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-gray-500 text-white">{filterCounts.Parado}</Badge>
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

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProcessos.map((processo) => (
            <Card key={processo.id} className="hover-elevate cursor-pointer" data-testid={`card-process-${processo.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm text-primary">{processo.numero}</p>
                    <p className="font-semibold mt-1">{processo.titulo}</p>
                  </div>
                  <Badge className={statusColors[processo.status] || "bg-gray-100"}>
                    {processo.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Cliente</p>
                    <p className="font-medium truncate">{getClienteNome(processo.clienteId)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Área</p>
                    <p className="font-medium">{processo.area || "-"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Tribunal</p>
                    <p className="font-medium">{processo.tribunal || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Vara</p>
                    <p className="font-medium truncate">{processo.vara || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {getResponsavelIniciais(processo.responsavelId)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{getResponsavelNome(processo.responsavelId)}</span>
                  </div>
                  {processo.valorCausa && (
                    <span className="text-sm font-semibold text-green-600">
                      R$ {parseFloat(processo.valorCausa).toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Tribunal</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcessos.map((processo) => (
                  <TableRow key={processo.id} data-testid={`row-process-${processo.id}`}>
                    <TableCell className="font-mono text-sm">{processo.numero}</TableCell>
                    <TableCell className="font-medium">{processo.titulo}</TableCell>
                    <TableCell>{getClienteNome(processo.clienteId)}</TableCell>
                    <TableCell>{processo.area || "-"}</TableCell>
                    <TableCell>{processo.tribunal || "-"}</TableCell>
                    <TableCell>{getResponsavelNome(processo.responsavelId)}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[processo.status] || "bg-gray-100"}>
                        {processo.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {processo.valorCausa ? `R$ ${parseFloat(processo.valorCausa).toLocaleString("pt-BR")}` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {filteredProcessos.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Nenhum processo encontrado</p>
        </div>
      )}
    </div>
  );
}
