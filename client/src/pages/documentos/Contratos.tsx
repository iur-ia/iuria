import { Plus, Search, FileText, Download, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Contrato {
  id: string;
  nome: string;
  cliente: string;
  tipo: "Honorários" | "Prestação de Serviços" | "Social" | "Outro";
  versao: number;
  status: "Ativo" | "Vencido" | "Rascunho";
  data_criacao: string;
  data_vencimento?: string;
}

const mockContratos: Contrato[] = [
  {
    id: "1",
    nome: "Contrato de Honorários - Maria Silva",
    cliente: "Maria Silva Comércio LTDA",
    tipo: "Honorários",
    versao: 2,
    status: "Ativo",
    data_criacao: "2025-08-15",
  },
  {
    id: "2",
    nome: "Contrato de Prestação de Serviços - Pedro",
    cliente: "Pedro Oliveira",
    tipo: "Prestação de Serviços",
    versao: 1,
    status: "Ativo",
    data_criacao: "2025-09-01",
    data_vencimento: "2026-09-01",
  },
  {
    id: "3",
    nome: "Contrato Social - Comércio Central",
    cliente: "Comércio Central S/A",
    tipo: "Social",
    versao: 3,
    status: "Ativo",
    data_criacao: "2025-05-20",
  },
  {
    id: "4",
    nome: "Minuta - Acordo Trabalhista",
    cliente: "Ana Paula Rodrigues",
    tipo: "Outro",
    versao: 1,
    status: "Rascunho",
    data_criacao: "2025-10-28",
  },
];

export default function Contratos() {
  const statusColors = {
    Ativo: "bg-green-100 text-green-800",
    Vencido: "bg-red-100 text-red-800",
    Rascunho: "bg-gray-100 text-gray-800",
  };

  const tipoColors = {
    Honorários: "bg-purple-100 text-purple-800",
    "Prestação de Serviços": "bg-blue-100 text-blue-800",
    Social: "bg-orange-100 text-orange-800",
    Outro: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Contratos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie minutas e versionamento de contratos
          </p>
        </div>
        <Button
          className="bg-legal-status-active hover:bg-legal-status-active/90"
          data-testid="button-new-contract"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total</p>
            <p className="text-3xl font-bold text-foreground">{mockContratos.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Ativos</p>
            <p className="text-3xl font-bold text-green-600">
              {mockContratos.filter((c) => c.status === "Ativo").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Rascunhos</p>
            <p className="text-3xl font-bold text-gray-600">
              {mockContratos.filter((c) => c.status === "Rascunho").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Vencidos</p>
            <p className="text-3xl font-bold text-red-600">
              {mockContratos.filter((c) => c.status === "Vencido").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Todos os Contratos</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar contrato..."
                className="pl-9"
                data-testid="input-contract-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockContratos.map((contrato) => (
            <Card
              key={contrato.id}
              className="hover-elevate cursor-pointer"
              data-testid={`card-contract-${contrato.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <h3 className="font-semibold">{contrato.nome}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {contrato.cliente}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={tipoColors[contrato.tipo]}>
                        {contrato.tipo}
                      </Badge>
                      <Badge className={statusColors[contrato.status]}>
                        {contrato.status}
                      </Badge>
                      <Badge variant="outline">v{contrato.versao}</Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          Criado em{" "}
                          {new Date(contrato.data_criacao).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {contrato.data_vencimento && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>
                            Vence em{" "}
                            {new Date(contrato.data_vencimento).toLocaleDateString(
                              "pt-BR"
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      data-testid={`button-view-contract-${contrato.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      data-testid={`button-download-contract-${contrato.id}`}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Histórico de Versões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">Contrato Social - Comércio Central</p>
                <p className="text-xs text-muted-foreground">Versão 3 (Atual)</p>
              </div>
              <Badge variant="outline">15/10/2025</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg opacity-70">
              <div>
                <p className="font-medium text-sm">Contrato Social - Comércio Central</p>
                <p className="text-xs text-muted-foreground">Versão 2</p>
              </div>
              <Badge variant="outline">10/08/2025</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg opacity-70">
              <div>
                <p className="font-medium text-sm">Contrato Social - Comércio Central</p>
                <p className="text-xs text-muted-foreground">Versão 1</p>
              </div>
              <Badge variant="outline">20/05/2025</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
