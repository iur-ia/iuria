import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Filter, FileText, Download, Eye, CheckCircle, Clock, AlertTriangle, RefreshCw, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Documento, Processo, Equipe } from "@shared/schema";

const STATUS_EXTRACAO = {
  ok: { icon: CheckCircle, label: "Extraído", color: "text-green-600" },
  parcial: { icon: AlertTriangle, label: "Parcial", color: "text-yellow-600" },
  pendente: { icon: Clock, label: "Pendente", color: "text-gray-400" },
  erro: { icon: AlertTriangle, label: "Erro", color: "text-red-500" },
};

const TIPO_COLORS: Record<string, string> = {
  Petição: "bg-primary/15 text-primary",
  Contrato: "bg-blue-500/15 text-blue-400 dark:bg-blue-500/15 dark:text-blue-300",
  Procuração: "bg-emerald-500/15 text-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-300",
  Sentença: "bg-orange-500/15 text-orange-400 dark:bg-orange-500/15 dark:text-orange-300",
  Outro: "bg-muted text-foreground",
};

function ExtracaoStatusIcon({ status }: { status: string }) {
  const cfg = STATUS_EXTRACAO[status as keyof typeof STATUS_EXTRACAO] ?? STATUS_EXTRACAO.pendente;
  const Icon = cfg.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Icon className={`w-4 h-4 ${cfg.color}`} />
      </TooltipTrigger>
      <TooltipContent>{cfg.label}</TooltipContent>
    </Tooltip>
  );
}

function ConteudoMD({ markdown }: { markdown: string | null }) {
  if (!markdown) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground font-medium">Nenhum conteúdo extraído ainda</p>
        <p className="text-sm text-muted-foreground mt-1">
          Use o botão "Reextrair" ou aguarde o processamento automático.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-muted/30 rounded-md p-4 overflow-auto max-h-[60vh]">
      <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:rounded">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}

export default function TodosDocumentos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<Documento | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: documentos = [], isLoading } = useQuery<Documento[]>({
    queryKey: ["/api/documentos"],
  });

  const { data: processos = [] } = useQuery<Processo[]>({
    queryKey: ["/api/processos"],
  });

  const { data: equipe = [] } = useQuery<Equipe[]>({
    queryKey: ["/api/equipe"],
  });

  const extracaoMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/documentos/${id}/extrair-texto`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      toast({ title: "Extração concluída", description: "Conteúdo Markdown atualizado." });
    },
    onError: () => {
      toast({ title: "Erro na extração", description: "Não foi possível extrair o texto.", variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("arquivo", file);
      formData.append("nome", file.name);
      formData.append("tipo", detectarTipo(file.name));
      formData.append("tamanho", formatarTamanho(file.size));
      const res = await fetch("/api/documentos/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Erro no upload");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      toast({ title: "Upload realizado", description: "Extração de texto iniciada em background." });
      setUploading(false);
    },
    onError: () => {
      toast({ title: "Erro no upload", description: "Não foi possível enviar o arquivo.", variant: "destructive" });
      setUploading(false);
    },
  });

  const detectarTipo = (nome: string): string => {
    const ext = nome.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "PDF";
    if (["doc", "docx"].includes(ext ?? "")) return "Petição";
    if (["jpg", "jpeg", "png", "tiff"].includes(ext ?? "")) return "Imagem";
    return "Outro";
  };

  const formatarTamanho = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getProcessoNumero = (id: string | null) =>
    processos.find((p) => p.id === id)?.numero;

  const getEnviadoPorNome = (id: string | null) =>
    equipe.find((m) => m.id === id)?.nome ?? "Sistema";

  const filteredDocumentos = documentos.filter(
    (doc) =>
      doc.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getProcessoNumero(doc.processoId)?.includes(searchTerm) ||
      doc.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const extracaoOk = documentos.filter((d) => d.extracaoStatus === "ok").length;
  const extracaoPendente = documentos.filter((d) => d.extracaoStatus === "pendente").length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      uploadMutation.mutate(file);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando documentos...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie todos os documentos — extração automática para Markdown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.tiff,.bmp,.webp"
            className="hidden"
            onChange={handleFileChange}
            data-testid="input-file-upload"
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || uploadMutation.isPending}
            data-testid="button-upload-document"
          >
            <Plus className="w-4 h-4 mr-2" />
            {uploading ? "Enviando..." : "Upload Documento"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total", value: documentos.length, color: "text-foreground" },
          { label: "Petições", value: documentos.filter((d) => d.tipo === "Petição").length, color: "text-primary" },
          { label: "Contratos", value: documentos.filter((d) => d.tipo === "Contrato").length, color: "text-blue-600" },
          { label: "MD Extraído", value: extracaoOk, color: "text-green-600" },
          { label: "Pendentes", value: extracaoPendente, color: "text-yellow-600" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">{kpi.label}</p>
              <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
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
                <TableHead>MD</TableHead>
                <TableHead>Enviado por</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocumentos.map((doc) => (
                <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate max-w-52">{doc.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={TIPO_COLORS[doc.tipo] ?? "bg-muted text-foreground"}>
                      {doc.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {doc.processoId ? (
                      <span className="font-mono text-xs">{getProcessoNumero(doc.processoId)}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{doc.tamanho ?? "-"}</TableCell>
                  <TableCell className="text-sm">
                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("pt-BR") : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" data-testid={`status-md-${doc.id}`}>
                      <ExtracaoStatusIcon status={doc.extracaoStatus ?? "pendente"} />
                      {doc.conteudoMarkdown && (
                        <span className="text-xs text-muted-foreground">
                          {doc.conteudoMarkdown.length.toLocaleString()} c
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{getEnviadoPorNome(doc.enviadoPor)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedDoc(doc)}
                        data-testid={`button-view-${doc.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => extracaoMutation.mutate(doc.id)}
                        disabled={extracaoMutation.isPending}
                        data-testid={`button-reextract-${doc.id}`}
                      >
                        <RefreshCw className={`w-4 h-4 ${extracaoMutation.isPending ? "animate-spin" : ""}`} />
                      </Button>
                      <Button variant="ghost" size="icon" data-testid={`button-download-${doc.id}`}>
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
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum documento encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de visualização de documento */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {selectedDoc?.nome}
            </DialogTitle>
          </DialogHeader>

          {selectedDoc && (
            <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="shrink-0">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="conteudo" data-testid="tab-md-content">
                  Conteúdo MD
                  {selectedDoc.extracaoStatus === "ok" && (
                    <CheckCircle className="w-3 h-3 ml-1 text-green-600" />
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="flex-1 overflow-auto">
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Tipo", value: selectedDoc.tipo },
                      { label: "Tamanho", value: selectedDoc.tamanho ?? "-" },
                      { label: "Versão", value: selectedDoc.versao ?? 1 },
                      { label: "Status MD", value: selectedDoc.extracaoStatus ?? "pendente" },
                      { label: "Chars extraídos", value: selectedDoc.conteudoMarkdown?.length.toLocaleString() ?? "0" },
                      { label: "Upload em", value: selectedDoc.createdAt ? new Date(selectedDoc.createdAt).toLocaleDateString("pt-BR") : "-" },
                    ].map((field) => (
                      <div key={field.label} className="bg-muted/40 rounded-md p-3">
                        <p className="text-xs text-muted-foreground mb-1">{field.label}</p>
                        <p className="font-medium text-sm">{String(field.value)}</p>
                      </div>
                    ))}
                  </div>

                  {selectedDoc.extracaoStatus !== "ok" && (
                    <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-yellow-200 rounded-md">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
                      <p className="text-sm text-yellow-800">
                        {selectedDoc.extracaoStatus === "pendente"
                          ? "Extração ainda não executada. Clique em Reextrair."
                          : "Extração parcial — verifique o original."}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-auto"
                        onClick={() => { extracaoMutation.mutate(selectedDoc.id); setSelectedDoc(null); }}
                        data-testid="button-reextract-dialog"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Reextrair
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="conteudo" className="flex-1 overflow-auto">
                <ConteudoMD markdown={selectedDoc.conteudoMarkdown ?? null} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
