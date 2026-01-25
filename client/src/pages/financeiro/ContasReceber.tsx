import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ContaReceber, Cliente, Processo } from "@shared/schema";

export default function ContasReceberPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: contas = [], isLoading } = useQuery<ContaReceber[]>({
    queryKey: ["/api/contas-receber"],
  });

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clientes"],
  });

  const { data: processos = [] } = useQuery<Processo[]>({
    queryKey: ["/api/processos"],
  });

  const getClienteNome = (id: string | null) => {
    const cliente = clientes.find(c => c.id === id);
    return cliente?.nome || "Não informado";
  };

  const getProcessoNumero = (id: string | null) => {
    const proc = processos.find(p => p.id === id);
    return proc?.numero;
  };

  const filteredContas = contas.filter(
    (conta) =>
      getClienteNome(conta.clienteId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getProcessoNumero(conta.processoId)?.includes(searchTerm)
  );

  const statusColors: Record<string, string> = {
    Pago: "bg-green-100 text-green-800",
    Pendente: "bg-yellow-100 text-yellow-800",
    Atrasado: "bg-red-100 text-red-800",
    Parcial: "bg-blue-100 text-blue-800",
  };

  const totalReceber = contas
    .filter((c) => c.status !== "Pago")
    .reduce((acc, c) => acc + parseFloat(c.valor), 0);

  const totalRecebido = contas
    .filter((c) => c.status === "Pago")
    .reduce((acc, c) => acc + parseFloat(c.valor), 0);

  const totalAtrasado = contas
    .filter((c) => c.status === "Atrasado")
    .reduce((acc, c) => acc + parseFloat(c.valor), 0);

  if (isLoading) {
    return (
      <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando contas...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Contas a Receber
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie honorários e recebíveis
          </p>
        </div>
        <Button
          className="bg-legal-status-active hover:bg-legal-status-active/90"
          data-testid="button-new-receivable"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">A Receber</p>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">
              R$ {(totalReceber / 1000).toFixed(1)}k
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Recebido</p>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              R$ {(totalRecebido / 1000).toFixed(1)}k
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Atrasado</p>
              <DollarSign className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              R$ {(totalAtrasado / 1000).toFixed(1)}k
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total de Contas</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{contas.length}</p>
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
                placeholder="Pesquisar por cliente, descrição ou processo..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-receivable-search"
              />
            </div>
            <Button variant="outline" data-testid="button-filters">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContas.map((conta) => (
                <TableRow key={conta.id} data-testid={`row-receivable-${conta.id}`}>
                  <TableCell className="font-medium">{getClienteNome(conta.clienteId)}</TableCell>
                  <TableCell>{conta.descricao}</TableCell>
                  <TableCell>
                    {conta.processoId ? (
                      <span className="font-mono text-sm">{getProcessoNumero(conta.processoId)}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{conta.tipo}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    R$ {parseFloat(conta.valor).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    {new Date(conta.vencimento).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[conta.status] || "bg-gray-100"}>
                      {conta.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" data-testid={`button-view-receivable-${conta.id}`}>
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredContas.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma conta encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
