import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Filter, TrendingUp, Pencil, Trash2 } from "lucide-react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Honorario, Cliente, Processo } from "@shared/schema";

const emptyHonorario = {
  clienteId: "", processoId: "", tipo: "Fixo", valorContratado: "",
  valorRecebido: "0", percentualExito: "", dataContrato: "", status: "Ativo",
};

export default function HonorariosPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingHonorario, setEditingHonorario] = useState<Honorario | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyHonorario);
  const { toast } = useToast();

  const { data: honorarios = [], isLoading } = useQuery<Honorario[]>({ queryKey: ["/api/honorarios"] });
  const { data: clientes = [] } = useQuery<Cliente[]>({ queryKey: ["/api/clientes"] });
  const { data: processos = [] } = useQuery<Processo[]>({ queryKey: ["/api/processos"] });

  const getClienteNome = (id: string | null) => clientes.find(c => c.id === id)?.nome || "-";
  const getProcessoNumero = (id: string | null) => processos.find(p => p.id === id)?.numero || "-";

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/honorarios", {
      ...data,
      clienteId: data.clienteId || null,
      processoId: data.processoId || null,
      valorContratado: data.valorContratado || null,
      valorRecebido: data.valorRecebido || "0",
      percentualExito: data.percentualExito ? parseInt(data.percentualExito) : null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/honorarios"] }); setDialogOpen(false); resetForm(); toast({ title: "Honorario criado com sucesso" }); },
    onError: (e: Error) => { toast({ title: "Erro ao criar honorario", description: e.message, variant: "destructive" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => apiRequest("PATCH", `/api/honorarios/${id}`, {
      ...data,
      clienteId: data.clienteId || null,
      processoId: data.processoId || null,
      valorContratado: data.valorContratado || null,
      valorRecebido: data.valorRecebido || "0",
      percentualExito: data.percentualExito ? parseInt(data.percentualExito) : null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/honorarios"] }); setDialogOpen(false); resetForm(); toast({ title: "Honorario atualizado" }); },
    onError: (e: Error) => { toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/honorarios/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/honorarios"] }); setDeleteDialogOpen(false); toast({ title: "Honorario excluido" }); },
    onError: (e: Error) => { toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }); },
  });

  const resetForm = () => { setForm(emptyHonorario); setEditingHonorario(null); };
  const openCreate = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (h: Honorario) => {
    setEditingHonorario(h);
    setForm({
      clienteId: h.clienteId || "", processoId: h.processoId || "",
      tipo: h.tipo, valorContratado: String(h.valorContratado || ""),
      valorRecebido: String(h.valorRecebido || "0"),
      percentualExito: h.percentualExito ? String(h.percentualExito) : "",
      dataContrato: h.dataContrato, status: h.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tipo || !form.dataContrato) { toast({ title: "Preencha os campos obrigatorios", variant: "destructive" }); return; }
    if (editingHonorario) updateMutation.mutate({ id: editingHonorario.id, data: form });
    else createMutation.mutate(form);
  };

  const filteredHonorarios = honorarios.filter(h =>
    getClienteNome(h.clienteId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getProcessoNumero(h.processoId).includes(searchTerm)
  );

  const statusColors: Record<string, string> = { Ativo: "bg-green-100 text-green-800", Finalizado: "bg-gray-100 text-gray-800", Suspenso: "bg-yellow-100 text-yellow-800" };
  const tipoColors: Record<string, string> = { Fixo: "bg-blue-100 text-blue-800", Exito: "bg-purple-100 text-purple-800", Hora: "bg-orange-100 text-orange-800", Misto: "bg-pink-100 text-pink-800" };

  const totalContratado = honorarios.reduce((acc, h) => acc + parseFloat(String(h.valorContratado || "0")), 0);
  const totalRecebido = honorarios.reduce((acc, h) => acc + parseFloat(String(h.valorRecebido || "0")), 0);
  const totalAtivos = honorarios.filter(h => h.status === "Ativo").length;

  if (isLoading) return <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando honorarios...</p></div>;

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Honorarios</h1>
          <p className="text-sm text-muted-foreground">Gerencie contratos de honorarios e valores</p>
        </div>
        <Button className="bg-legal-status-active hover:bg-legal-status-active/90" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />Novo Contrato
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Contratado", value: totalContratado, color: "text-blue-600", icon: <TrendingUp className="w-4 h-4 text-blue-600" /> },
          { label: "Total Recebido", value: totalRecebido, color: "text-green-600", icon: <TrendingUp className="w-4 h-4 text-green-600" /> },
          { label: "A Receber", value: totalContratado - totalRecebido, color: "text-orange-600", icon: <TrendingUp className="w-4 h-4 text-orange-600" /> },
          { label: "Contratos Ativos", value: totalAtivos, color: "text-foreground", icon: null, isCount: true },
        ].map((s, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2"><p className="text-sm text-muted-foreground">{s.label}</p>{s.icon}</div>
              <p className={`text-2xl font-bold ${s.color}`}>{(s as any).isCount ? s.value : `R$ ${((s.value as number) / 1000).toFixed(1)}k`}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="search" placeholder="Pesquisar por cliente ou processo..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor Contratado</TableHead>
                <TableHead>Valor Recebido</TableHead>
                <TableHead>% Exito</TableHead>
                <TableHead>Data Contrato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHonorarios.map(h => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{getClienteNome(h.clienteId)}</TableCell>
                  <TableCell><span className="font-mono text-sm">{getProcessoNumero(h.processoId)}</span></TableCell>
                  <TableCell><Badge className={tipoColors[h.tipo] || "bg-gray-100"}>{h.tipo}</Badge></TableCell>
                  <TableCell className="font-semibold">{h.valorContratado && parseFloat(String(h.valorContratado)) > 0 ? `R$ ${parseFloat(String(h.valorContratado)).toLocaleString("pt-BR")}` : "-"}</TableCell>
                  <TableCell className="font-semibold text-green-600">R$ {parseFloat(String(h.valorRecebido || "0")).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{h.percentualExito ? `${h.percentualExito}%` : "-"}</TableCell>
                  <TableCell>{new Date(h.dataContrato + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell><Badge className={statusColors[h.status] || "bg-gray-100"}>{h.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(h)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDeletingId(h.id); setDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredHonorarios.length === 0 && <div className="text-center py-8"><p className="text-muted-foreground">Nenhum honorario encontrado</p></div>}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) resetForm(); setDialogOpen(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingHonorario ? "Editar Honorario" : "Novo Contrato de Honorario"}</DialogTitle>
            <DialogDescription>{editingHonorario ? "Atualize os dados do honorario" : "Preencha os dados para registrar um novo contrato"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={form.clienteId} onValueChange={v => setForm(f => ({ ...f, clienteId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                  <SelectContent><SelectItem value="">Nenhum</SelectItem>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Processo</Label>
                <Select value={form.processoId} onValueChange={v => setForm(f => ({ ...f, processoId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar processo" /></SelectTrigger>
                  <SelectContent><SelectItem value="">Nenhum</SelectItem>{processos.map(p => <SelectItem key={p.id} value={p.id}>{p.numero} - {p.titulo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Fixo">Fixo</SelectItem><SelectItem value="Exito">Exito</SelectItem><SelectItem value="Hora">Hora</SelectItem><SelectItem value="Misto">Misto</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Finalizado">Finalizado</SelectItem><SelectItem value="Suspenso">Suspenso</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Valor Contratado</Label><Input type="number" step="0.01" placeholder="0,00" value={form.valorContratado} onChange={e => setForm(f => ({ ...f, valorContratado: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Valor Recebido</Label><Input type="number" step="0.01" placeholder="0,00" value={form.valorRecebido} onChange={e => setForm(f => ({ ...f, valorRecebido: e.target.value }))} /></div>
              <div className="space-y-2"><Label>% Exito</Label><Input type="number" min="0" max="100" placeholder="0" value={form.percentualExito} onChange={e => setForm(f => ({ ...f, percentualExito: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Data do Contrato *</Label><Input type="date" value={form.dataContrato} onChange={e => setForm(f => ({ ...f, dataContrato: e.target.value }))} required /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : editingHonorario ? "Atualizar" : "Criar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir Honorario</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este contrato de honorario?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deletingId && deleteMutation.mutate(deletingId)}>{deleteMutation.isPending ? "Excluindo..." : "Excluir"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
