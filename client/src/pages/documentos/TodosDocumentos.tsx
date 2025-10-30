import { useState } from "react";
import { Plus, Search, Filter, FileText, Download, Eye } from "lucide-react";
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

interface Documento {
  id: string;
  nome: string;
  tipo: "Petição" | "Contrato" | "Procuração" | "Sentença" | "Outro";
  processo?: string;
  tamanho: string;
  data_upload: string;
  enviado_por: string;
}

const mockDocumentos: Documento[] = [
  {
    id: "1",
    nome: "Petição Inicial - Ação de Cobrança.pdf",
    tipo: "Petição",
    processo: "PRO.0000001",
    tamanho: "2.5 MB",
    data_upload: "2025-10-25",
    enviado_por: "Thiago Gomes",
  },
  {
    id: "2",
    nome: "Contrato de Honorários - Maria Silva.pdf",
    tipo: "Contrato",
    processo: "PRO.0000001",
    tamanho: "850 KB",
    data_upload: "2025-08-15",
    enviado_por: "Maria Costa",
  },
  {
    id: "3",
    nome: "Procuração - Pedro Oliveira.pdf",
    tipo: "Procuração",
    processo: "PRO.0000002",
    tamanho: "450 KB",
    data_upload: "2025-09-01",
    enviado_por: "Roberto Silva",
  },
  {
    id: "4",
    nome: "Sentença - 1ª Instância.pdf",
    tipo: "Sentença",
    processo: "PRO.0000003",
    tamanho: "1.2 MB",
    data_upload: "2025-10-20",
    enviado_por: "Sistema",
  },
  {
    id: "5",
    nome: "Contestação - Processo 004.pdf",
    tipo: "Petição",
    processo: "PRO.0000004",
    tamanho: "3.1 MB",
    data_upload: "2025-10-28",
    enviado_por: "Maria Costa",
  },
  {
    id: "6",
    nome: "Acordo Trabalhista - Empresa XYZ.pdf",
    tipo: "Contrato",
    tamanho: "1.8 MB",
    data_upload: "2025-10-15",
    enviado_por: "Thiago Gomes",
  },
];

export default function TodosDocumentos() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDocumentos = mockDocumentos.filter(
    (doc) =>
      doc.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.processo?.includes(searchTerm) ||
      doc.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tipoColors = {
    Petição: "bg-purple-100 text-purple-800",
    Contrato: "bg-blue-100 text-blue-800",
    Procuração: "bg-green-100 text-green-800",
    Sentença: "bg-orange-100 text-orange-800",
    Outro: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Documentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie todos os documentos do escritório
          </p>
        </div>
        <Button
          className="bg-legal-status-active hover:bg-legal-status-active/90"
          data-testid="button-upload-document"
        >
          <Plus className="w-4 h-4 mr-2" />
          Upload Documento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total</p>
            <p className="text-3xl font-bold text-foreground">{mockDocumentos.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Petições</p>
            <p className="text-3xl font-bold text-purple-600">
              {mockDocumentos.filter((d) => d.tipo === "Petição").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Contratos</p>
            <p className="text-3xl font-bold text-blue-600">
              {mockDocumentos.filter((d) => d.tipo === "Contrato").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Procurações</p>
            <p className="text-3xl font-bold text-green-600">
              {mockDocumentos.filter((d) => d.tipo === "Procuração").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Sentenças</p>
            <p className="text-3xl font-bold text-orange-600">
              {mockDocumentos.filter((d) => d.tipo === "Sentença").length}
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
                placeholder="Pesquisar documentos..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-document-search"
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
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Data Upload</TableHead>
                <TableHead>Enviado por</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocumentos.map((doc) => (
                <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{doc.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={tipoColors[doc.tipo]}>{doc.tipo}</Badge>
                  </TableCell>
                  <TableCell>
                    {doc.processo ? (
                      <span className="font-mono text-sm">{doc.processo}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{doc.tamanho}</TableCell>
                  <TableCell>
                    {new Date(doc.data_upload).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-sm">{doc.enviado_por}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-view-${doc.id}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-download-${doc.id}`}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
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
