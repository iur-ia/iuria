import { useState } from "react";
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

interface ContaReceber {
  id: string;
  cliente: string;
  processo?: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: "Pago" | "Pendente" | "Atrasado" | "Parcial";
  tipo: "Honorários" | "Sucumbência" | "Consultoria";
}

const mockContas: ContaReceber[] = [
  {
    id: "1",
    cliente: "Maria Silva Comércio LTDA",
    processo: "PRO.0000001",
    descricao: "Honorários - Ação de Cobrança",
    valor: 15000,
    vencimento: "2025-11-05",
    status: "Pendente",
    tipo: "Honorários",
  },
  {
    id: "2",
    cliente: "Pedro Oliveira",
    processo: "PRO.0000002",
    descricao: "Honorários - Execução de Título",
    valor: 8500,
    vencimento: "2025-10-28",
    status: "Atrasado",
    tipo: "Honorários",
  },
  {
    id: "3",
    cliente: "Comércio Central S/A",
    processo: "PRO.0000004",
    descricao: "Consultoria Jurídica - Outubro",
    valor: 12000,
    vencimento: "2025-11-01",
    status: "Pago",
    tipo: "Consultoria",
  },
  {
    id: "4",
    cliente: "Ana Paula Rodrigues",
    processo: "PRO.0000003",
    descricao: "Sucumbência - Rescisão Contratual",
    valor: 5000,
    vencimento: "2025-11-10",
    status: "Pendente",
    tipo: "Sucumbência",
  },
  {
    id: "5",
    cliente: "Maria Silva Comércio LTDA",
    descricao: "Consultoria Tributária",
    valor: 7500,
    vencimento: "2025-10-30",
    status: "Parcial",
    tipo: "Consultoria",
  },
];

export default function ContasReceber() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredContas = mockContas.filter(
    (conta) =>
      conta.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conta.processo?.includes(searchTerm)
  );

  const statusColors = {
    Pago: "bg-green-100 text-green-800",
    Pendente: "bg-yellow-100 text-yellow-800",
    Atrasado: "bg-red-100 text-red-800",
    Parcial: "bg-blue-100 text-blue-800",
  };

  const totalReceber = mockContas
    .filter((c) => c.status !== "Pago")
    .reduce((acc, c) => acc + c.valor, 0);

  const totalRecebido = mockContas
    .filter((c) => c.status === "Pago")
    .reduce((acc, c) => acc + c.valor, 0);

  const totalAtrasado = mockContas
    .filter((c) => c.status === "Atrasado")
    .reduce((acc, c) => acc + c.valor, 0);

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
            <p className="text-2xl font-bold text-foreground">{mockContas.length}</p>
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
                  <TableCell className="font-medium">{conta.cliente}</TableCell>
                  <TableCell>{conta.descricao}</TableCell>
                  <TableCell>
                    {conta.processo ? (
                      <span className="font-mono text-sm">{conta.processo}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{conta.tipo}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    R$ {conta.valor.toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    {new Date(conta.vencimento).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[conta.status]}>
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
        </CardContent>
      </Card>
    </div>
  );
}
