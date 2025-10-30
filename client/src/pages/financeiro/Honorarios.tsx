import { useState } from "react";
import { Plus, Search, Filter, TrendingUp } from "lucide-react";
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

interface Honorario {
  id: string;
  cliente: string;
  processo: string;
  tipo: "Fixo" | "Êxito" | "Hora" | "Misto";
  valor_contratado: number;
  valor_recebido: number;
  percentual_exito?: number;
  data_contrato: string;
  status: "Ativo" | "Finalizado" | "Suspenso";
}

const mockHonorarios: Honorario[] = [
  {
    id: "1",
    cliente: "Maria Silva Comércio LTDA",
    processo: "PRO.0000001",
    tipo: "Misto",
    valor_contratado: 20000,
    valor_recebido: 10000,
    percentual_exito: 15,
    data_contrato: "2025-08-15",
    status: "Ativo",
  },
  {
    id: "2",
    cliente: "Pedro Oliveira",
    processo: "PRO.0000002",
    tipo: "Êxito",
    valor_contratado: 0,
    valor_recebido: 0,
    percentual_exito: 20,
    data_contrato: "2025-09-01",
    status: "Ativo",
  },
  {
    id: "3",
    cliente: "Comércio Central S/A",
    processo: "PRO.0000004",
    tipo: "Fixo",
    valor_contratado: 35000,
    valor_recebido: 35000,
    data_contrato: "2025-05-20",
    status: "Finalizado",
  },
  {
    id: "4",
    cliente: "Ana Paula Rodrigues",
    processo: "PRO.0000003",
    tipo: "Hora",
    valor_contratado: 0,
    valor_recebido: 12500,
    data_contrato: "2025-07-10",
    status: "Ativo",
  },
];

export default function Honorarios() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredHonorarios = mockHonorarios.filter(
    (honorario) =>
      honorario.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      honorario.processo.includes(searchTerm)
  );

  const statusColors = {
    Ativo: "bg-green-100 text-green-800",
    Finalizado: "bg-gray-100 text-gray-800",
    Suspenso: "bg-yellow-100 text-yellow-800",
  };

  const tipoColors = {
    Fixo: "bg-blue-100 text-blue-800",
    Êxito: "bg-purple-100 text-purple-800",
    Hora: "bg-orange-100 text-orange-800",
    Misto: "bg-pink-100 text-pink-800",
  };

  const totalContratado = mockHonorarios.reduce(
    (acc, h) => acc + h.valor_contratado,
    0
  );

  const totalRecebido = mockHonorarios.reduce(
    (acc, h) => acc + h.valor_recebido,
    0
  );

  const totalAtivos = mockHonorarios.filter((h) => h.status === "Ativo").length;

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Honorários
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie contratos de honorários e valores
          </p>
        </div>
        <Button
          className="bg-legal-status-active hover:bg-legal-status-active/90"
          data-testid="button-new-fee"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Contratado</p>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">
              R$ {(totalContratado / 1000).toFixed(0)}k
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Recebido</p>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              R$ {(totalRecebido / 1000).toFixed(1)}k
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">A Receber</p>
              <TrendingUp className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">
              R$ {((totalContratado - totalRecebido) / 1000).toFixed(1)}k
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Contratos Ativos</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalAtivos}</p>
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
                placeholder="Pesquisar por cliente ou processo..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-fee-search"
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
                <TableHead>Processo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor Contratado</TableHead>
                <TableHead>Valor Recebido</TableHead>
                <TableHead>% Êxito</TableHead>
                <TableHead>Data Contrato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHonorarios.map((honorario) => (
                <TableRow key={honorario.id} data-testid={`row-fee-${honorario.id}`}>
                  <TableCell className="font-medium">{honorario.cliente}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{honorario.processo}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={tipoColors[honorario.tipo]}>
                      {honorario.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {honorario.valor_contratado > 0
                      ? `R$ ${honorario.valor_contratado.toLocaleString("pt-BR")}`
                      : "-"}
                  </TableCell>
                  <TableCell className="font-semibold text-green-600">
                    R$ {honorario.valor_recebido.toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    {honorario.percentual_exito
                      ? `${honorario.percentual_exito}%`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {new Date(honorario.data_contrato).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[honorario.status]}>
                      {honorario.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" data-testid={`button-view-fee-${honorario.id}`}>
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
