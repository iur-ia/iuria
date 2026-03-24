import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Filter, FileText, Download, Eye, Trash2, Upload, FileCode2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import type { Documento, Processo, Equipe } from "@shared/schema";

export default function TodosDocumentos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({ nome: "", tipo: "", processoId: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: documentos = [], isLoading } = useQuery<Documento[]>({ queryKey: ["/api/documentos"] });
  const { data: processos = [] } = useQuery<Processo[]>({ queryKey: ["/api/processos"] });
  const { data: equipe = [] } = useQuery<Equipe[]>({ queryKey: ["/api/equipe"] });

  const getProcessoNumero = (id: string | null) => processos.find(p => p.id === id)?.numero;
  const getEnviadoPorNome = (id: string | null) => equipe.find(m => m.id === id)?.nome || "Sistema";

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/documentos/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/documentos"] }); setDeleteDialogOpen(false); toast({ title: "Documento excluido" }); },
    onError: (e: Error) => { toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }); },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadForm.nome) {
        setUploadForm(f => ({ ...f, nome: file.name }));
      }
      const ext = file.name.split('.').pop()?.toUpperCase() || "";
      if (!uploadForm.tipo) {
        setUploadForm(f => ({ ...f, tipo: ext }));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { toast({ title: "Selecione um arquivo", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (uploadForm.nome) formData.append("nome", uploadForm.nome);
      if (uploadForm.tipo) formData.append("tipo", uploadForm.tipo);
      if (uploadForm.processoId) formData.append("processoId", uploadForm.processoId);

      const res = await fetch("/api/documentos/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro no upload");
      }
      const doc = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadForm({ nome: "", tipo: "", processoId: "" });
      
      const hasMarkdown = doc.conteudoMarkdown && doc.conteudoMarkdown.length > 10;
      toast({
        title: "Documento enviado com sucesso",
        description: hasMarkdown
          ? `Texto extraido automaticamente via ${doc.metodoExtracao} (${doc.conteudoMarkdown.length} caracteres)`
          : "Texto nao pode ser extraido deste arquivo",
      });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const openPreview = async (doc: Documento) => {
    // Fetch full doc with markdown content
    try {
      const res = await fetch(`/api/documentos/${doc.id}`, { credentials: "include" });
      const fullDoc = await res.json();
      setPreviewDoc(fullDoc);
      setPreviewDialogOpen(true);
    } catch {
      toast({ title: "Erro ao carregar documento", variant: "destructive" });
    }
  };

  const filteredDocumentos = documentos.filter(doc =>
    doc.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getProcessoNumero(doc.processoId)?.includes(searchTerm) ||
    doc.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tipoColors: Record<string, string> = {
    PDF: "bg-red-100 text-red-800",
    DOCX: "bg-blue-100 text-blue-800",
    DOC: "bg-blue-100 text-blue-800",
    PNG: "bg-green-100 text-green-800",
    JPG: "bg-green-100 text-green-800",
    JPEG: "bg-green-100 text-green-800",
    XLS: "bg-emerald-100 text-emerald-800",
    XLSX: "bg-emerald-100 text-emerald-800",
  };

  if (isLoading) return <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando documentos...</p></div>;

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Documentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie todos os documentos do escritorio - upload automatico com OCR</p>
        </div>
        <Button className="bg-legal-status-active hover:bg-legal-status-active/90" onClick={() => setUploadDialogOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />Upload Documento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: "Total", value: documentos.length, color: "text-foreground" },
          { label: "PDF", value: documentos.filter(d => d.tipo.toUpperCase() === "PDF").length, color: "text-red-600" },
          { label: "DOCX", value: documentos.filter(d => ["DOCX", "DOC"].includes(d.tipo.toUpperCase())).length, color: "text-blue-600" },
          { label: "Imagens", value: documentos.filter(d => ["PNG", "JPG", "JPEG"].includes(d.tipo.toUpperCase())).length, color: "text-green-600" },
          { label: "Com texto extraido", value: documentos.filter(d => (d as any).conteudoMarkdown).length, color: "text-purple-600" },
        ].map((s, i) => (
          <Card key={i} className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-muted-foreground mb-1">{s.label}</p><p className={`text-3xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="search" placeholder="Pesquisar documentos..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Data Upload</TableHead>
                <TableHead>OCR</TableHead>
                <TableHead>Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocumentos.map(doc => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{doc.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge className={tipoColors[doc.tipo.toUpperCase()] || "bg-gray-100 text-gray-800"}>{doc.tipo.toUpperCase()}</Badge></TableCell>
                  <TableCell>{doc.processoId ? <span className="font-mono text-sm">{getProcessoNumero(doc.processoId)}</span> : <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell className="text-sm">{doc.tamanho || "-"}</TableCell>
                  <TableCell>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("pt-BR") : "-"}</TableCell>
                  <TableCell>
                    {(doc as any).metodoExtracao ? (
                      <Badge className="bg-purple-100 text-purple-800"><FileCode2 className="w-3 h-3 mr-1" />{(doc as any).metodoExtracao}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openPreview(doc)} title="Ver conteudo"><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDeletingId(doc.id); setDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredDocumentos.length === 0 && <div className="text-center py-8"><p className="text-muted-foreground">Nenhum documento encontrado</p></div>}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={v => { if (!v) { setSelectedFile(null); setUploadForm({ nome: "", tipo: "", processoId: "" }); } setUploadDialogOpen(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload de Documento</DialogTitle>
            <DialogDescription>O texto sera automaticamente extraido usando OCR (Tesseract, pdfplumber, PyPDF2) e salvo em Markdown para facilitar leitura por IA.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label>Arquivo *</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors" onClick={() => fileInputRef.current?.click()}>
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-8 h-8 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); setSelectedFile(null); }}><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Clique para selecionar ou arraste um arquivo</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, JPG, PNG, XLS, XLSX, RTF, ODT (max 50MB)</p>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png,.rtf,.odt,.jpeg,.tiff,.tif,.bmp,.webp" className="hidden" onChange={handleFileSelect} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nome</Label><Input placeholder="Nome do documento" value={uploadForm.nome} onChange={e => setUploadForm(f => ({ ...f, nome: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={uploadForm.tipo} onValueChange={v => setUploadForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Auto-detectado" /></SelectTrigger>
                  <SelectContent>
                    {["PDF", "DOCX", "DOC", "XLS", "XLSX", "JPG", "PNG", "RTF", "ODT", "Peticao", "Contrato", "Procuracao", "Sentenca", "Outro"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Processo (opcional)</Label>
              <Select value={uploadForm.processoId} onValueChange={v => setUploadForm(f => ({ ...f, processoId: v }))}>
                <SelectTrigger><SelectValue placeholder="Vincular a um processo" /></SelectTrigger>
                <SelectContent><SelectItem value="">Nenhum</SelectItem>{processos.map(p => <SelectItem key={p.id} value={p.id}>{p.numero} - {p.titulo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <strong>Extracao automatica:</strong> Ao enviar, o texto sera extraido via pipeline multi-estrategia:
              pdfplumber → PyPDF2 → pdftotext → Tesseract OCR (para scans). O resultado e armazenado em Markdown.
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={uploading || !selectedFile}>{uploading ? "Enviando e extraindo texto..." : "Enviar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Markdown Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {previewDoc?.nome}
            </DialogTitle>
            <DialogDescription>
              {previewDoc?.metodoExtracao ? `Texto extraido via ${previewDoc.metodoExtracao}` : "Sem texto extraido"}
              {previewDoc?.tamanho && ` | ${previewDoc.tamanho}`}
            </DialogDescription>
          </DialogHeader>
          {previewDoc?.conteudoMarkdown ? (
            <div className="bg-white border rounded-lg p-4 prose prose-sm max-w-none overflow-auto max-h-[60vh] whitespace-pre-wrap font-mono text-xs leading-relaxed">
              {previewDoc.conteudoMarkdown}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileCode2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum texto foi extraido deste documento.</p>
              <p className="text-xs mt-1">Isso pode ocorrer com PDFs protegidos ou imagens de baixa qualidade.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir Documento</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este documento?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deletingId && deleteMutation.mutate(deletingId)}>{deleteMutation.isPending ? "Excluindo..." : "Excluir"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
