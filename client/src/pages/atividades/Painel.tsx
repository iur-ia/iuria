import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import type { Atividade, Processo, Equipe } from "@shared/schema";

const emptyForm = {
  titulo: "", descricao: "", tipo: "Tarefa", processoId: "", responsavelId: "",
  data: new Date().toISOString().split("T")[0], hora: "", prioridade: "Media", status: "Pendente",
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  "Pendente":   { label: "A Fazer", color: "bg-gray-400" },
  "Em Andamento": { label: "Em Andamento", color: "bg-blue-500" },
  "Concluida":  { label: "Concluido", color: "bg-green-500" },
  "Cancelada":  { label: "Cancelada", color: "bg-red-400" },
};

function prioridadeColor(p: string) {
  if (p === "Alta" || p === "critica") return "text-red-600";
  if (p === "Media" || p === "media") return "text-yellow-600";
  return "text-green-600";
}

export default function PainelTarefas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Atividade | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();

  const { data: atividades = [], isLoading } = useQuery<Atividade[]>({ queryKey: ["/api/atividades"] });
  const { data: processos = [] } = useQuery<Processo[]>({ queryKey: ["/api/processos"] });
  const { data: equipe = [] } = useQuery<Equipe[]>({ queryKey: ["/api/equipe"] });

  const getProcessoNumero = (id: string | null) => processos.find(p => p.id === id)?.numero || "";
  const getResponsavel = (id: string | null) => equipe.find(e => e.id === id)?.nome || "Nao atribuido";

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/atividades", {
      ...data, processoId: data.processoId || null, responsavelId: data.responsavelId || null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/atividades"] }); setDialogOpen(false); toast({ title: "Atividade criada" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => apiRequest("PATCH", `/api/atividades/${id}`, {
      ...data, processoId: data.processoId || null, responsavelId: data.responsavelId || null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/atividades"] }); setDialogOpen(false); toast({ title: "Atividade atualizada" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/atividades/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/atividades"] }); setDeleteDialogOpen(false); toast({ title: "Atividade excluida" }); },
  });

  const openCreate = () => { setEditingItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (item: Atividade) => {
    setEditingItem(item);
    setForm({
      titulo: item.titulo, descricao: item.descricao || "", tipo: item.tipo,
      processoId: item.processoId || "", responsavelId: item.responsavelId || "",
      data: item.data, hora: item.hora || "", prioridade: item.prioridade, status: item.status,
    });
    setDialogOpen(true);
  };
  const openDelete = (id: string) => { setDeletingId(id); setDeleteDialogOpen(true); };
  const handleSubmit = () => { editingItem ? updateMutation.mutate({ id: editingItem.id, data: form }) : createMutation.mutate(form); };

  const filtered = useMemo(() => {
    if (!searchTerm) return atividades;
    const s = searchTerm.toLowerCase();
    return atividades.filter(a =>
      a.titulo.toLowerCase().includes(s) || getResponsavel(a.responsavelId).toLowerCase().includes(s) || getProcessoNumero(a.processoId).includes(s)
    );
  }, [atividades, searchTerm, processos, equipe]);

  const byStatus = useMemo(() => ({
    "Pendente": filtered.filter(a => a.status === "Pendente"),
    "Em Andamento": filtered.filter(a => a.status === "Em Andamento"),
    "Concluida": filtered.filter(a => a.status === "Concluida" || a.status === "Concluída"),
  }), [filtered]);

  const StatusColumn = ({ statusKey, titulo, items, color }: { statusKey: string; titulo: string; items: Atividade[]; color: string }) => (
    <div className="flex-1 min-w-72">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">{titulo}</h3>
          <Badge variant="secondary">{items.length}</Badge>
        </div>
        <div className={`h-1 rounded-full ${color}`} />
      </div>
      <div className="space-y-3">
        {items.map(a => (
          <Card key={a.id} className="hover-elevate cursor-pointer group" onClick={() => openEdit(a)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <h4 className="font-medium mb-1 flex-1">{a.titulo}</h4>
                <div className="hidden group-hover:flex gap-1 ml-2">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openEdit(a); }}><Pencil className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); openDelete(a.id); }}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
              {a.processoId && <p className="text-xs font-mono text-muted-foreground mb-1">{getProcessoNumero(a.processoId)}</p>}
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground text-xs">{getResponsavel(a.responsavelId)}</span>
                <span className={`font-medium text-xs ${prioridadeColor(a.prioridade)}`}>{a.prioridade}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{a.tipo}</span>
                <span>Prazo: {new Date(a.data).toLocaleDateString("pt-BR")}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhuma atividade</p>}
      </div>
    </div>
  );

  if (isLoading) return <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Painel de Tarefas</h1>
          <p className="text-sm text-muted-foreground">Visualize e organize tarefas por status</p>
        </div>
        <Button className="bg-legal-status-active hover:bg-legal-status-active/90" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Nova Atividade
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(byStatus).map(([key, items]) => (
          <Card key={key} className="border-0 shadow-sm"><CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">{STATUS_MAP[key]?.label || key}</p>
            <p className={`text-3xl font-bold ${key === "Pendente" ? "text-gray-600" : key === "Em Andamento" ? "text-blue-600" : "text-green-600"}`}>{items.length}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="search" placeholder="Pesquisar atividades..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-4">
            <StatusColumn statusKey="Pendente" titulo="A Fazer" items={byStatus["Pendente"]} color="bg-gray-400" />
            <StatusColumn statusKey="Em Andamento" titulo="Em Andamento" items={byStatus["Em Andamento"]} color="bg-blue-500" />
            <StatusColumn statusKey="Concluida" titulo="Concluido" items={byStatus["Concluida"]} color="bg-green-500" />
          </div>
        </CardContent>
      </Card>

      {/* CRUD Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Atividade" : "Nova Atividade"}</DialogTitle>
            <DialogDescription>Preencha os campos abaixo</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Titulo *</Label><Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Descricao</Label><Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tarefa">Tarefa</SelectItem>
                    <SelectItem value="Audiencia">Audiencia</SelectItem>
                    <SelectItem value="Intimacao">Intimacao</SelectItem>
                    <SelectItem value="Compromisso">Compromisso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={v => setForm({ ...form, prioridade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Media">Media</SelectItem>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Data *</Label><Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Hora</Label><Input type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Processo</Label>
                <Select value={form.processoId} onValueChange={v => setForm({ ...form, processoId: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {processos.map(p => <SelectItem key={p.id} value={p.id}>{p.numero}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Responsavel</Label>
                <Select value={form.responsavelId} onValueChange={v => setForm({ ...form, responsavelId: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {equipe.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editingItem && (
              <div className="grid gap-2"><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                    <SelectItem value="Concluida">Concluida</SelectItem>
                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.titulo || !form.data}>{editingItem ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
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
