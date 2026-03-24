import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, FileText, Pencil, Trash2, Clock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Documento, Processo } from "@shared/schema";

const emptyForm = {
  nome: "", tipo: "Contrato", processoId: "", enviadoPor: "",
};

const statusColors: Record<string, string> = {
  Contrato: "bg-purple-100 text-purple-800",
  Minuta: "bg-blue-100 text-blue-800",
  Aditivo: "bg-orange-100 text-orange-800",
};

export default function Contratos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Documento | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Documento | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();

  const { data: documentos = [], isLoading } = useQuery<Documento[]>({ queryKey: ["/api/documentos"] });
  const { data: processos = [] } = useQuery<Processo[]>({ queryKey: ["/api/processos"] });

  // Filter only contract-type documents
  const contratos = useMemo(() => {
    return documentos.filter(d =>
      d.tipo === "Contrato" || d.tipo === "Minuta" || d.tipo === "Aditivo" ||
      d.nome.toLowerCase().includes("contrato") || d.nome.toLowerCase().includes("minuta") ||
      d.nome.toLowerCase().includes("aditivo")
    );
  }, [documentos]);

  const filtered = useMemo(() => {
    if (!searchTerm) return contratos;
    const s = searchTerm.toLowerCase();
    return contratos.filter(d => d.nome.toLowerCase().includes(s) || d.tipo.toLowerCase().includes(s));
  }, [contratos, searchTerm]);

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/documentos", {
      ...data, processoId: data.processoId || null, enviadoPor: data.enviadoPor || null, versao: 1,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/documentos"] }); setDialogOpen(false); toast({ title: "Contrato criado" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => apiRequest("PATCH", `/api/documentos/${id}`, {
      ...data, processoId: data.processoId || null, enviadoPor: data.enviadoPor || null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/documentos"] }); setDialogOpen(false); toast({ title: "Contrato atualizado" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/documentos/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/documentos"] }); setDeleteDialogOpen(false); toast({ title: "Contrato excluido" }); },
  });

  const openCreate = () => { setEditingItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (item: Documento) => {
    setEditingItem(item);
    setForm({ nome: item.nome, tipo: item.tipo, processoId: item.processoId || "", enviadoPor: item.enviadoPor || "" });
    setDialogOpen(true);
  };
  const openDelete = (id: string) => { setDeletingId(id); setDeleteDialogOpen(true); };
  const handleSubmit = () => { editingItem ? updateMutation.mutate({ id: editingItem.id, data: form }) : createMutation.mutate(form); };

  const getProcessoNumero = (id: string | null) => processos.find(p => p.id === id)?.numero || "";

  const stats = useMemo(() => ({
    total: contratos.length,
    contratos: contratos.filter(d => d.tipo === "Contrato").length,
    minutas: contratos.filter(d => d.tipo === "Minuta").length,
    aditivos: contratos.filter(d => d.tipo === "Aditivo").length,
  }), [contratos]);

  if (isLoading) return <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Contratos</h1>
          <p className="text-sm text-muted-foreground">Gerencie minutas e versionamento de contratos</p>
        </div>
        <Button className="bg-legal-status-active hover:bg-legal-status-active/90" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Novo Contrato
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Total</p>
          <p className="text-3xl font-bold text-foreground">{stats.total}</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Contratos</p>
          <p className="text-3xl font-bold text-purple-600">{stats.contratos}</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Minutas</p>
          <p className="text-3xl font-bold text-blue-600">{stats.minutas}</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Aditivos</p>
          <p className="text-3xl font-bold text-orange-600">{stats.aditivos}</p>
        </CardContent></Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Todos os Contratos</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="search" placeholder="Buscar contrato..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum contrato encontrado. Crie o primeiro!</p>}
          {filtered.map(contrato => (
            <Card key={contrato.id} className="hover-elevate cursor-pointer" onClick={() => openEdit(contrato)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <h3 className="font-semibold">{contrato.nome}</h3>
                    </div>
                    {contrato.processoId && <p className="text-sm text-muted-foreground mb-2 font-mono">{getProcessoNumero(contrato.processoId)}</p>}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={statusColors[contrato.tipo] || "bg-gray-100 text-gray-800"}>{contrato.tipo}</Badge>
                      <Badge variant="outline">v{contrato.versao}</Badge>
                      {contrato.tamanho && <Badge variant="secondary">{contrato.tamanho}</Badge>}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>Criado em {contrato.createdAt ? new Date(contrato.createdAt).toLocaleDateString("pt-BR") : "-"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {contrato.conteudoMarkdown && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); setPreviewDoc(contrato); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); openEdit(contrato); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={e => { e.stopPropagation(); openDelete(contrato.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* CRUD Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Contrato" : "Novo Contrato"}</DialogTitle>
            <DialogDescription>Preencha os campos abaixo</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Contrato de Honorarios - Cliente X" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contrato">Contrato</SelectItem>
                    <SelectItem value="Minuta">Minuta</SelectItem>
                    <SelectItem value="Aditivo">Aditivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Processo</Label>
                <Select value={form.processoId} onValueChange={v => setForm({ ...form, processoId: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {processos.map(p => <SelectItem key={p.id} value={p.id}>{p.numero} - {p.titulo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.nome}>{editingItem ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewDoc?.nome}</DialogTitle>
            <DialogDescription>Conteudo extraido ({previewDoc?.metodoExtracao || "N/A"})</DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-muted/30 p-4 rounded">{previewDoc?.conteudoMarkdown || "Sem conteudo extraido"}</div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
            <AlertDialogDescription>Esta acao nao pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && deleteMutation.mutate(deletingId)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
