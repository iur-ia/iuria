import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import type { Documento, Processo, Equipe } from "@shared/schema";

export default function TodosDocumentos() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: documentos = [], isLoading } = useQuery<Documento[]>({
    queryKey: ["/api/documentos"],
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

  const getEnviadoPorNome = (id: string | null) => {
    const membro = equipe.find(m => m.id === id);
    return membro?.nome || "Sistema";
  };

  const filteredDocumentos = documentos.filter(
    (doc) =>
      doc.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getProcessoNumero(doc.processoId)?.includes(searchTerm) ||
      doc.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tipoColors: Record<string, string> = {
    Petição: "bg-purple-100 text-purple-800",
    Contrato: "bg-blue-100 text-blue-800",
    Procuração: "bg-green-100 text-green-800",
    Sentença: "bg-orange-100 text-orange-800",
    Outro: "bg-gray-100 text-gray-800",
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando documentos...</p>
      </div>
    );
  }

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
            <p className="text-3xl font-bold text-foreground">{documentos.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Petições</p>
            <p className="text-3xl font-bold text-purple-600">
              {documentos.filter((d) => d.tipo === "Petição").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Contratos</p>
            <p className="text-3xl font-bold text-blue-600">
              {documentos.filter((d) => d.tipo === "Contrato").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Procurações</p>
            <p className="text-3xl font-bold text-green-600">
              {documentos.filter((d) => d.tipo === "Procuração").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Sentenças</p>
            <p className="text-3xl font-bold text-orange-600">
              {documentos.filter((d) => d.tipo === "Sentença").length}
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
                    <Badge className={tipoColors[doc.tipo] || "bg-gray-100"}>{doc.tipo}</Badge>
                  </TableCell>
                  <TableCell>
                    {doc.processoId ? (
                      <span className="font-mono text-sm">{getProcessoNumero(doc.processoId)}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{doc.tamanho || "-"}</TableCell>
                  <TableCell>
                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("pt-BR") : "-"}
                  </TableCell>
                  <TableCell className="text-sm">{getEnviadoPorNome(doc.enviadoPor)}</TableCell>
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

          {filteredDocumentos.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum documento encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
