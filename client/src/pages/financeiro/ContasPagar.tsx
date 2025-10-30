import { useState } from "react";
import { Plus, Search, Filter, TrendingDown } from "lucide-react";
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

interface ContaPagar {
  id: string;
  fornecedor: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: "Pago" | "Pendente" | "Atrasado";
  categoria: "Aluguel" | "Serviços" | "Software" | "Despesas" | "Impostos";
}

const mockContas: ContaPagar[] = [
  {
    id: "1",
    fornecedor: "Imobiliária Delta",
    descricao: "Aluguel do escritório - Novembro",
    valor: 8500,
    vencimento: "2025-11-05",
    status: "Pendente",
    categoria: "Aluguel",
  },
  {
    id: "2",
    fornecedor: "Light S/A",
    descricao: "Conta de luz - Outubro",
    valor: 650,
    vencimento: "2025-10-28",
    status: "Atrasado",
    categoria: "Despesas",
  },
  {
    id: "3",
    fornecedor: "Software SaaS LTDA",
    descricao: "Licença Projuris - Anual",
    valor: 15000,
    vencimento: "2025-10-25",
    status: "Pago",
    categoria: "Software",
  },
  {
    id: "4",
    fornecedor: "Receita Federal",
    descricao: "DARF - Impostos sobre serviços",
    valor: 4500,
    vencimento: "2025-11-10",
    status: "Pendente",
    categoria: "Impostos",
  },
  {
    id: "5",
    fornecedor: "Empresa de Limpeza ABC",
    descricao: "Serviços de limpeza - Outubro",
    valor: 1200,
    vencimento: "2025-11-01",
    status: "Pendente",
    categoria: "Serviços",
  },
  {
    id: "6",
    fornecedor: "TIM S/A",
    descricao: "Telefonia e Internet",
    valor: 450,
    vencimento: "2025-11-08",
    status: "Pendente",
    categoria: "Despesas",
  },
];

export default function ContasPagar() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredContas = mockContas.filter(
    (conta) =>
      conta.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conta.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors = {
    Pago: "bg-green-100 text-green-800",
    Pendente: "bg-yellow-100 text-yellow-800",
    Atrasado: "bg-red-100 text-red-800",
  };

  const totalPagar = mockContas
    .filter((c) => c.status !== "Pago")
    .reduce((acc, c) => acc + c.valor, 0);

  const totalPago = mockContas
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
            Contas a Pagar
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie despesas e fornecedores
          </p>
        </div>
        <Button
          className="bg-legal-status-active hover:bg-legal-status-active/90"
          data-testid="button-new-payable"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">A Pagar</p>
              <TrendingDown className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">
              R$ {(totalPagar / 1000).toFixed(1)}k
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Pago</p>
              <TrendingDown className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              R$ {(totalPago / 1000).toFixed(1)}k
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Atrasado</p>
              <TrendingDown className="w-4 h-4 text-red-600" />
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
                placeholder="Pesquisar por fornecedor ou descrição..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-payable-search"
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
                <TableHead>Fornecedor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContas.map((conta) => (
                <TableRow key={conta.id} data-testid={`row-payable-${conta.id}`}>
                  <TableCell className="font-medium">{conta.fornecedor}</TableCell>
                  <TableCell>{conta.descricao}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{conta.categoria}</Badge>
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
                    <Button variant="ghost" size="sm" data-testid={`button-view-payable-${conta.id}`}>
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
