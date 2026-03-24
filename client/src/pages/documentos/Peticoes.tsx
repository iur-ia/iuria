import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, FileText, Pencil, Trash2, Eye, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { Template } from "@shared/schema";

const emptyForm = { nome: "", categoria: "Civel", descricao: "", conteudo: "" };

const categoriaBadge: Record<string, string> = {
  "Civel": "bg-blue-100 text-blue-800",
  "Trabalhista": "bg-orange-100 text-orange-800",
  "Criminal": "bg-red-100 text-red-800",
  "Empresarial": "bg-purple-100 text-purple-800",
  "Tributario": "bg-green-100 text-green-800",
  "Previdenciario": "bg-teal-100 text-teal-800",
};

export default function Peticoes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [catFilter, setCatFilter] = useState("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Template | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useQuery<Template[]>({ queryKey: ["/api/templates"] });

  const filtered = useMemo(() => {
    return templates.filter(t => {
      const matchSearch = !searchTerm || t.nome.toLowerCase().includes(searchTerm.toLowerCase()) || (t.descricao || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = catFilter === "todas" || t.categoria === catFilter;
      return matchSearch && matchCat;
    });
  }, [templates, searchTerm, catFilter]);

  const categorias = useMemo(() => {
    const cats = new Set(templates.map(t => t.categoria));
    return Array.from(cats);
  }, [templates]);

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/templates", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/templates"] }); setDialogOpen(false); toast({ title: "Template criado" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => apiRequest("PATCH", `/api/templates/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/templates"] }); setDialogOpen(false); toast({ title: "Template atualizado" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/templates/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/templates"] }); setDeleteDialogOpen(false); toast({ title: "Template excluido" }); },
  });

  const openCreate = () => { setEditingItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (item: Template) => {
    setEditingItem(item);
    setForm({ nome: item.nome, categoria: item.categoria, descricao: item.descricao || "", conteudo: item.conteudo || "" });
    setDialogOpen(true);
  };
  const openDelete = (id: string) => { setDeletingId(id); setDeleteDialogOpen(true); };
  const handleSubmit = () => { editingItem ? updateMutation.mutate({ id: editingItem.id, data: form }) : createMutation.mutate(form); };

  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Conteudo copiado para a area de transferencia" });
  };

  if (isLoading) return <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Peticoes e Templates</h1>
          <p className="text-sm text-muted-foreground">Modelos de peticoes para reutilizacao</p>
        </div>
        <Button className="bg-legal-status-active hover:bg-legal-status-active/90" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Novo Template
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Templates</p>
          <p className="text-3xl font-bold text-foreground">{templates.length}</p>
        </CardContent></Card>
        {categorias.slice(0, 3).map(cat => (
          <Card key={cat} className="border-0 shadow-sm"><CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">{cat}</p>
            <p className="text-3xl font-bold text-blue-600">{templates.filter(t => t.categoria === cat).length}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="search" placeholder="Pesquisar templates..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <Tabs value={catFilter} onValueChange={setCatFilter} className="mb-4">
            <TabsList>
              <TabsTrigger value="todas">Todas</TabsTrigger>
              {categorias.map(cat => <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>)}
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.length === 0 && <p className="text-muted-foreground col-span-3 text-center py-8">Nenhum template encontrado. Crie o primeiro!</p>}
            {filtered.map(template => (
              <Card key={template.id} className="hover-elevate cursor-pointer group" onClick={() => openEdit(template)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <h3 className="font-medium text-sm">{template.nome}</h3>
                    </div>
                    <div className="hidden group-hover:flex gap-1">
                      {template.conteudo && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); setPreviewTemplate(template); }}>
                          <Eye className="w-3 h-3" />
                        </Button>
                      )}
                      {template.conteudo && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); copyContent(template.conteudo!); }}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={e => { e.stopPropagation(); openDelete(template.id); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{template.descricao || "Sem descricao"}</p>
                  <div className="flex items-center gap-2">
                    <Badge className={categoriaBadge[template.categoria] || "bg-gray-100 text-gray-800"}>{template.categoria}</Badge>
                    <Badge variant="secondary">{template.usos} uso{template.usos !== 1 ? "s" : ""}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CRUD Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Template" : "Novo Template"}</DialogTitle>
            <DialogDescription>Preencha os campos abaixo</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Peticao Inicial - Acao de Cobranca" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={v => setForm({ ...form, categoria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Civel">Civel</SelectItem>
                    <SelectItem value="Trabalhista">Trabalhista</SelectItem>
                    <SelectItem value="Criminal">Criminal</SelectItem>
                    <SelectItem value="Empresarial">Empresarial</SelectItem>
                    <SelectItem value="Tributario">Tributario</SelectItem>
                    <SelectItem value="Previdenciario">Previdenciario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2"><Label>Descricao</Label><Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Descricao breve do template" /></div>
            <div className="grid gap-2"><Label>Conteudo do Template</Label>
              <Textarea value={form.conteudo} onChange={e => setForm({ ...form, conteudo: e.target.value })} placeholder="Cole ou escreva o conteudo do template aqui..." rows={12} className="font-mono text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.nome}>{editingItem ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.nome}</DialogTitle>
            <DialogDescription>{previewTemplate?.categoria} - {previewTemplate?.descricao}</DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-muted/30 p-4 rounded font-mono text-sm">{previewTemplate?.conteudo || "Sem conteudo"}</div>
          <DialogFooter>
            {previewTemplate?.conteudo && <Button onClick={() => copyContent(previewTemplate.conteudo!)}><Copy className="w-4 h-4 mr-2" /> Copiar</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
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
