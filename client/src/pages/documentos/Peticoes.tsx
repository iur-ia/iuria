import { Plus, Search, FileText, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Template {
  id: string;
  nome: string;
  categoria: "Cível" | "Trabalhista" | "Criminal" | "Empresarial";
  descricao: string;
  usos: number;
}

const mockTemplates: Template[] = [
  {
    id: "1",
    nome: "Petição Inicial - Ação de Cobrança",
    categoria: "Cível",
    descricao: "Template padrão para ação de cobrança",
    usos: 15,
  },
  {
    id: "2",
    nome: "Contestação - Ação Trabalhista",
    categoria: "Trabalhista",
    descricao: "Modelo de contestação em ações trabalhistas",
    usos: 8,
  },
  {
    id: "3",
    nome: "Recurso de Apelação",
    categoria: "Cível",
    descricao: "Template para recurso de apelação",
    usos: 12,
  },
  {
    id: "4",
    nome: "Habeas Corpus",
    categoria: "Criminal",
    descricao: "Modelo de HC preventivo e liberatório",
    usos: 5,
  },
  {
    id: "5",
    nome: "Contrato Social",
    categoria: "Empresarial",
    descricao: "Minuta de contrato social para LTDA",
    usos: 20,
  },
];

const mockPeticoesRecentes = [
  {
    id: "1",
    nome: "Petição Inicial - Silva vs Santos.pdf",
    processo: "PRO.0000001",
    data: "2025-10-28",
  },
  {
    id: "2",
    nome: "Contestação - Processo 002.pdf",
    processo: "PRO.0000002",
    data: "2025-10-25",
  },
  {
    id: "3",
    nome: "Recurso - Processo 003.pdf",
    processo: "PRO.0000003",
    data: "2025-10-20",
  },
];

export default function Peticoes() {
  const categoriaColors = {
    Cível: "bg-blue-100 text-blue-800",
    Trabalhista: "bg-purple-100 text-purple-800",
    Criminal: "bg-red-100 text-red-800",
    Empresarial: "bg-green-100 text-green-800",
  };

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Petições</h1>
          <p className="text-sm text-muted-foreground">
            Templates e documentos jurídicos
          </p>
        </div>
        <Button
          className="bg-legal-status-active hover:bg-legal-status-active/90"
          data-testid="button-new-petition"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Petição
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Templates Disponíveis</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar template..."
                    className="pl-9"
                    data-testid="input-template-search"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="hover-elevate cursor-pointer"
                  data-testid={`card-template-${template.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{template.nome}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {template.descricao}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge className={categoriaColors[template.categoria]}>
                            {template.categoria}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {template.usos} usos
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          data-testid={`button-view-template-${template.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          data-testid={`button-use-template-${template.id}`}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Petições Recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockPeticoesRecentes.map((peticao) => (
                <div
                  key={peticao.id}
                  className="p-3 border rounded-lg hover-elevate cursor-pointer"
                  data-testid={`recent-petition-${peticao.id}`}
                >
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">{peticao.nome}</p>
                      <p className="text-xs font-mono text-muted-foreground mb-1">
                        {peticao.processo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(peticao.data).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total de Templates</p>
                <p className="text-2xl font-bold">{mockTemplates.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Mais Usado</p>
                <p className="text-sm font-medium">Contrato Social</p>
                <p className="text-xs text-muted-foreground">20 usos</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
