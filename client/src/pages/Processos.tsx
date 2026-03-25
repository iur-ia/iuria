import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Filter, Grid3x3, List, Pencil, Trash2, Eye } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import type { Processo, Cliente, Equipe } from "@shared/schema";

const emptyProcesso = {
  numero: "",
  titulo: "",
  clienteId: "",
  responsavelId: "",
  tipo: "Cível",
  area: "Cível",
  tribunal: "",
  vara: "",
  valorCausa: "",
  status: "Ativo",
  fase: "",
  dataDistribuicao: "",
  dataAtualizacao: "",
  observacoes: "",
};

export default function Processos() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterTab, setFilterTab] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProcesso, setEditingProcesso] = useState<Processo | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProcesso);
  const { toast } = useToast();

  const { data: processos = [], isLoading } = useQuery<Processo[]>({
    queryKey: ["/api/processos"],
  });

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clientes"],
  });

  const { data: equipe = [] } = useQuery<Equipe[]>({
    queryKey: ["/api/equipe"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload = {
        ...data,
        clienteId: data.clienteId || null,
        responsavelId: data.responsavelId || null,
        valorCausa: data.valorCausa || null,
        dataDistribuicao: data.dataDistribuicao || null,
        dataAtualizacao: data.dataAtualizacao || null,
      };
      return apiRequest("POST", "/api/processos", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processos"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Processo criado com sucesso" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao criar processo", description: e.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof form }) => {
      const payload = {
        ...data,
        clienteId: data.clienteId || null,
        responsavelId: data.responsavelId || null,
        valorCausa: data.valorCausa || null,
        dataDistribuicao: data.dataDistribuicao || null,
        dataAtualizacao: data.dataAtualizacao || null,
      };
      return apiRequest("PATCH", `/api/processos/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processos"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Processo atualizado com sucesso" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao atualizar processo", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/processos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processos"] });
      setDeleteDialogOpen(false);
      setDeletingId(null);
      toast({ title: "Processo excluido com sucesso" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao excluir processo", description: e.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setForm(emptyProcesso);
    setEditingProcesso(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (processo: Processo) => {
    setEditingProcesso(processo);
    setForm({
      numero: processo.numero,
      titulo: processo.titulo,
      clienteId: processo.clienteId || "",
      responsavelId: processo.responsavelId || "",
      tipo: processo.tipo,
      area: processo.area,
      tribunal: processo.tribunal || "",
      vara: processo.vara || "",
      valorCausa: processo.valorCausa || "",
      status: processo.status,
      fase: processo.fase || "",
      dataDistribuicao: processo.dataDistribuicao || "",
      dataAtualizacao: processo.dataAtualizacao || "",
      observacoes: processo.observacoes || "",
    });
    setDialogOpen(true);
  };

  const openDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero || !form.titulo || !form.tipo || !form.area) {
      toast({ title: "Preencha os campos obrigatorios", variant: "destructive" });
      return;
    }
    if (editingProcesso) {
      updateMutation.mutate({ id: editingProcesso.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const getClienteNome = (id: string | null) => clientes.find(c => c.id === id)?.nome || "Nao informado";
  const getResponsavelNome = (id: string | null) => equipe.find(m => m.id === id)?.nome || "Nao atribuido";
  const getResponsavelIniciais = (id: string | null) => {
    const m = equipe.find(m => m.id === id);
    if (!m) return "NA";
    return m.nome.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const statusColors: Record<string, string> = {
    Ativo: "bg-green-100 text-green-800",
    Movimentado: "bg-blue-100 text-blue-800",
    Parado: "bg-gray-100 text-gray-800",
    Arquivado: "bg-yellow-100 text-yellow-800",
  };

  const filteredProcessos = processos.filter((p) => {
    const matchSearch = p.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClienteNome(p.clienteId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = filterTab === "todos" || p.status === filterTab;
    return matchSearch && matchFilter;
  });

  const filterCounts = {
    todos: processos.length,
    Ativo: processos.filter(p => p.status === "Ativo").length,
    Movimentado: processos.filter(p => p.status === "Movimentado").length,
    Parado: processos.filter(p => p.status === "Parado").length,
  };

  if (isLoading) {
    return <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando processos...</p></div>;
  }

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Processos</h1>
          <p className="text-sm text-muted-foreground">Gerencie todos os processos do escritorio</p>
        </div>
        <Button className="bg-legal-status-active hover:bg-legal-status-active/90" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Processo
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="search" placeholder="Pesquise por pasta, numero, cliente, assunto..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("grid")}><Grid3x3 className="w-4 h-4" /></Button>
          <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("list")}><List className="w-4 h-4" /></Button>
        </div>
      </div>

      <Tabs value={filterTab} onValueChange={setFilterTab}>
        <TabsList>
          <TabsTrigger value="todos">Todos<Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5">{filterCounts.todos}</Badge></TabsTrigger>
          <TabsTrigger value="Ativo">Ativos<Badge className="ml-2 h-5 min-w-5 px-1.5 bg-green-500 text-white">{filterCounts.Ativo}</Badge></TabsTrigger>
          <TabsTrigger value="Movimentado">Movimentados<Badge className="ml-2 h-5 min-w-5 px-1.5 bg-blue-500 text-white">{filterCounts.Movimentado}</Badge></TabsTrigger>
          <TabsTrigger value="Parado">Parados<Badge className="ml-2 h-5 min-w-5 px-1.5 bg-gray-500 text-white">{filterCounts.Parado}</Badge></TabsTrigger>
        </TabsList>
      </Tabs>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProcessos.map(p => (
            <Card key={p.id} className="hover-elevate cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-primary">{p.numero}</p>
                    <p className="font-semibold mt-1 truncate">{p.titulo}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge className={statusColors[p.status] || "bg-gray-100"}>{p.status}</Badge>
                    <Link href={`/processos/${p.id}`}><Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="w-3.5 h-3.5" /></Button></Link>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(p); }}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openDelete(p.id); }}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-muted-foreground text-xs">Cliente</p><p className="font-medium truncate">{getClienteNome(p.clienteId)}</p></div>
                  <div><p className="text-muted-foreground text-xs">Area</p><p className="font-medium">{p.area || "-"}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-muted-foreground text-xs">Tribunal</p><p className="font-medium">{p.tribunal || "-"}</p></div>
                  <div><p className="text-muted-foreground text-xs">Vara</p><p className="font-medium truncate">{p.vara || "-"}</p></div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6"><AvatarFallback className="text-xs bg-primary text-primary-foreground">{getResponsavelIniciais(p.responsavelId)}</AvatarFallback></Avatar>
                    <span className="text-sm text-muted-foreground">{getResponsavelNome(p.responsavelId)}</span>
                  </div>
                  {p.valorCausa && <span className="text-sm font-semibold text-green-600">R$ {parseFloat(p.valorCausa).toLocaleString("pt-BR")}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Titulo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tribunal</TableHead>
                  <TableHead>Responsavel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcessos.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.numero}</TableCell>
                    <TableCell className="font-medium">{p.titulo}</TableCell>
                    <TableCell>{getClienteNome(p.clienteId)}</TableCell>
                    <TableCell>{p.tribunal || "-"}</TableCell>
                    <TableCell>{getResponsavelNome(p.responsavelId)}</TableCell>
                    <TableCell><Badge className={statusColors[p.status] || "bg-gray-100"}>{p.status}</Badge></TableCell>
                    <TableCell className="font-semibold">{p.valorCausa ? `R$ ${parseFloat(p.valorCausa).toLocaleString("pt-BR")}` : "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link href={`/processos/${p.id}`}><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button></Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDelete(p.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {filteredProcessos.length === 0 && <div className="text-center py-8"><p className="text-muted-foreground">Nenhum processo encontrado</p></div>}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) resetForm(); setDialogOpen(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProcesso ? "Editar Processo" : "Novo Processo"}</DialogTitle>
            <DialogDescription>{editingProcesso ? "Atualize os dados do processo" : "Preencha os dados para cadastrar um novo processo"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Numero do Processo *</Label>
                <Input placeholder="0000000-00.0000.0.00.0000" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Movimentado">Movimentado</SelectItem>
                    <SelectItem value="Parado">Parado</SelectItem>
                    <SelectItem value="Arquivado">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Titulo *</Label>
              <Input placeholder="Titulo do processo" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Civil", "Trabalhista", "Criminal", "Tributario", "Administrativo", "Previdenciario", "Ambiental", "Consumidor", "Familia", "Empresarial"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Area *</Label>
                <Select value={form.area} onValueChange={v => setForm(f => ({ ...f, area: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Civil", "Trabalhista", "Criminal", "Tributario", "Administrativo", "Previdenciario", "Ambiental", "Consumidor", "Familia", "Empresarial"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={form.clienteId} onValueChange={v => setForm(f => ({ ...f, clienteId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsavel</Label>
                <Select value={form.responsavelId} onValueChange={v => setForm(f => ({ ...f, responsavelId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar responsavel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {equipe.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tribunal</Label>
                <Input placeholder="Ex: TJRJ, TRF2, STJ" value={form.tribunal} onChange={e => setForm(f => ({ ...f, tribunal: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Vara</Label>
                <Input placeholder="Ex: 1a Vara Civel" value={form.vara} onChange={e => setForm(f => ({ ...f, vara: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Valor da Causa</Label>
                <Input type="number" step="0.01" placeholder="0,00" value={form.valorCausa} onChange={e => setForm(f => ({ ...f, valorCausa: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Data Distribuicao</Label>
                <Input type="date" value={form.dataDistribuicao} onChange={e => setForm(f => ({ ...f, dataDistribuicao: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fase</Label>
                <Select value={form.fase} onValueChange={v => setForm(f => ({ ...f, fase: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar fase" /></SelectTrigger>
                  <SelectContent>
                    {["Conhecimento", "Recursal", "Execucao", "Cumprimento de Sentenca", "Liquidacao"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observacoes</Label>
              <Textarea placeholder="Observacoes sobre o processo..." value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : editingProcesso ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Processo</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este processo? Esta acao nao pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deletingId && deleteMutation.mutate(deletingId)}>
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
