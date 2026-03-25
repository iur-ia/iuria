import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Clock, Bell, Gavel, Calendar, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export default function ListaAtividades() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Atividade | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();

  const { data: atividades = [], isLoading } = useQuery<Atividade[]>({ queryKey: ["/api/atividades"] });
  const { data: processos = [] } = useQuery<Processo[]>({ queryKey: ["/api/processos"] });
  const { data: equipe = [] } = useQuery<Equipe[]>({ queryKey: ["/api/equipe"] });

  const getProcessoNumero = (id: string | null) => processos.find(p => p.id === id)?.numero;
  const getResponsavelNome = (id: string | null) => equipe.find(m => m.id === id)?.nome || "Nao atribuido";

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

  const filteredAtividades = useMemo(() => {
    return atividades.filter((a) => {
      const matchesSearch = !searchTerm ||
        a.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getProcessoNumero(a.processoId)?.includes(searchTerm) ||
        getResponsavelNome(a.responsavelId).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTipo = tipoFilter === "todas" || a.tipo === tipoFilter;
      return matchesSearch && matchesTipo;
    });
  }, [atividades, searchTerm, tipoFilter, processos, equipe]);

  const tipoIcons: Record<string, typeof Clock> = { Tarefa: Clock, Intimacao: Bell, Audiencia: Gavel, Compromisso: Calendar };
  const tipoColors: Record<string, string> = { Tarefa: "bg-purple-100 text-purple-800", Intimacao: "bg-orange-100 text-orange-800", Audiencia: "bg-green-100 text-green-800", Compromisso: "bg-blue-100 text-blue-800" };
  const statusColors: Record<string, string> = { Pendente: "bg-gray-100 text-gray-800", "Em Andamento": "bg-blue-100 text-blue-800", Concluida: "bg-green-100 text-green-800", Cancelada: "bg-red-100 text-red-800" };
  const prioridadeColors: Record<string, string> = { Alta: "text-red-600", Media: "text-yellow-600", Baixa: "text-green-600" };

  if (isLoading) return <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando atividades...</p></div>;

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Lista de Atividades</h1>
          <p className="text-sm text-muted-foreground">Gerencie todas as atividades do escritorio</p>
        </div>
        <Button className="bg-legal-status-active hover:bg-legal-status-active/90" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Nova Atividade
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-muted-foreground mb-1">Tarefas</p><p className="text-3xl font-bold text-purple-600">{atividades.filter(a => a.tipo === "Tarefa").length}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-muted-foreground mb-1">Intimacoes</p><p className="text-3xl font-bold text-orange-600">{atividades.filter(a => a.tipo === "Intimacao").length}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-muted-foreground mb-1">Audiencias</p><p className="text-3xl font-bold text-green-600">{atividades.filter(a => a.tipo === "Audiencia").length}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-muted-foreground mb-1">Compromissos</p><p className="text-3xl font-bold text-blue-600">{atividades.filter(a => a.tipo === "Compromisso").length}</p></CardContent></Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="search" placeholder="Pesquisar atividades..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <Tabs value={tipoFilter} onValueChange={setTipoFilter} className="mb-4">
            <TabsList>
              <TabsTrigger value="todas">Todas</TabsTrigger>
              <TabsTrigger value="Tarefa">Tarefas</TabsTrigger>
              <TabsTrigger value="Intimacao">Intimacoes</TabsTrigger>
              <TabsTrigger value="Audiencia">Audiencias</TabsTrigger>
              <TabsTrigger value="Compromisso">Compromissos</TabsTrigger>
            </TabsList>
          </Tabs>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Atividade</TableHead><TableHead>Tipo</TableHead><TableHead>Processo</TableHead>
              <TableHead>Responsavel</TableHead><TableHead>Data/Hora</TableHead><TableHead>Prioridade</TableHead>
              <TableHead>Status</TableHead><TableHead>Acoes</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filteredAtividades.map((atividade) => {
                const Icon = tipoIcons[atividade.tipo] || Clock;
                return (
                  <TableRow key={atividade.id}>
                    <TableCell className="font-medium">{atividade.titulo}</TableCell>
                    <TableCell><Badge className={tipoColors[atividade.tipo] || "bg-gray-100"}><Icon className="w-3 h-3 mr-1" />{atividade.tipo}</Badge></TableCell>
                    <TableCell>{atividade.processoId ? <span className="font-mono text-sm">{getProcessoNumero(atividade.processoId)}</span> : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>{getResponsavelNome(atividade.responsavelId)}</TableCell>
                    <TableCell><div className="text-sm"><div>{new Date(atividade.data).toLocaleDateString("pt-BR")}</div>{atividade.hora && <div className="text-muted-foreground">{atividade.hora}</div>}</div></TableCell>
                    <TableCell><span className={`font-medium ${prioridadeColors[atividade.prioridade] || ""}`}>{atividade.prioridade}</span></TableCell>
                    <TableCell><Badge className={statusColors[atividade.status] || "bg-gray-100"}>{atividade.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(atividade)}><Pencil className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => openDelete(atividade.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filteredAtividades.length === 0 && <div className="text-center py-8"><p className="text-muted-foreground">Nenhuma atividade encontrada</p></div>}
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
          <AlertDialogHeader><AlertDialogTitle>Excluir atividade?</AlertDialogTitle><AlertDialogDescription>Esta acao nao pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && deleteMutation.mutate(deletingId)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
