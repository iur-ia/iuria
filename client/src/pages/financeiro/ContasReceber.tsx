import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Filter, DollarSign, Pencil, Trash2 } from "lucide-react";
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
import type { ContaReceber, Cliente, Processo } from "@shared/schema";

const emptyConta = {
  clienteId: "", processoId: "", descricao: "", valor: "",
  vencimento: "", status: "Pendente", tipo: "Honorarios", dataPagamento: "",
};

export default function ContasReceberPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaReceber | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyConta);
  const { toast } = useToast();

  const { data: contas = [], isLoading } = useQuery<ContaReceber[]>({ queryKey: ["/api/contas-receber"] });
  const { data: clientes = [] } = useQuery<Cliente[]>({ queryKey: ["/api/clientes"] });
  const { data: processos = [] } = useQuery<Processo[]>({ queryKey: ["/api/processos"] });

  const getClienteNome = (id: string | null) => clientes.find(c => c.id === id)?.nome || "Nao informado";
  const getProcessoNumero = (id: string | null) => processos.find(p => p.id === id)?.numero;

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/contas-receber", {
      ...data, clienteId: data.clienteId || null, processoId: data.processoId || null, dataPagamento: data.dataPagamento || null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/contas-receber"] }); setDialogOpen(false); resetForm(); toast({ title: "Conta criada com sucesso" }); },
    onError: (e: Error) => { toast({ title: "Erro ao criar conta", description: e.message, variant: "destructive" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => apiRequest("PATCH", `/api/contas-receber/${id}`, {
      ...data, clienteId: data.clienteId || null, processoId: data.processoId || null, dataPagamento: data.dataPagamento || null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/contas-receber"] }); setDialogOpen(false); resetForm(); toast({ title: "Conta atualizada" }); },
    onError: (e: Error) => { toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/contas-receber/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/contas-receber"] }); setDeleteDialogOpen(false); toast({ title: "Conta excluida" }); },
    onError: (e: Error) => { toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }); },
  });

  const resetForm = () => { setForm(emptyConta); setEditingConta(null); };
  const openCreate = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (c: ContaReceber) => {
    setEditingConta(c);
    setForm({ clienteId: c.clienteId || "", processoId: c.processoId || "", descricao: c.descricao, valor: String(c.valor), vencimento: c.vencimento, status: c.status, tipo: c.tipo, dataPagamento: c.dataPagamento || "" });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descricao || !form.valor || !form.vencimento) { toast({ title: "Preencha os campos obrigatorios", variant: "destructive" }); return; }
    if (editingConta) updateMutation.mutate({ id: editingConta.id, data: form });
    else createMutation.mutate(form);
  };

  const filteredContas = contas.filter(c =>
    getClienteNome(c.clienteId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getProcessoNumero(c.processoId)?.includes(searchTerm)
  );

  const statusColors: Record<string, string> = { Pago: "bg-green-100 text-green-800", Pendente: "bg-yellow-100 text-yellow-800", Atrasado: "bg-red-100 text-red-800", Parcial: "bg-blue-100 text-blue-800" };
  const totalReceber = contas.filter(c => c.status !== "Pago").reduce((acc, c) => acc + parseFloat(String(c.valor)), 0);
  const totalRecebido = contas.filter(c => c.status === "Pago").reduce((acc, c) => acc + parseFloat(String(c.valor)), 0);
  const totalAtrasado = contas.filter(c => c.status === "Atrasado").reduce((acc, c) => acc + parseFloat(String(c.valor)), 0);

  if (isLoading) return <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando contas...</p></div>;

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Contas a Receber</h1>
          <p className="text-sm text-muted-foreground">Gerencie honorarios e recebiveis</p>
        </div>
        <Button className="bg-legal-status-active hover:bg-legal-status-active/90" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />Nova Conta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "A Receber", value: totalReceber, color: "text-blue-600", icon: <DollarSign className="w-4 h-4 text-blue-600" /> },
          { label: "Recebido", value: totalRecebido, color: "text-green-600", icon: <DollarSign className="w-4 h-4 text-green-600" /> },
          { label: "Atrasado", value: totalAtrasado, color: "text-red-600", icon: <DollarSign className="w-4 h-4 text-red-600" /> },
          { label: "Total de Contas", value: contas.length, color: "text-foreground", icon: null, isCount: true },
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
              <Input type="search" placeholder="Pesquisar por cliente, descricao ou processo..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContas.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{getClienteNome(c.clienteId)}</TableCell>
                  <TableCell>{c.descricao}</TableCell>
                  <TableCell>{c.processoId ? <span className="font-mono text-sm">{getProcessoNumero(c.processoId)}</span> : <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell><Badge variant="outline">{c.tipo}</Badge></TableCell>
                  <TableCell className="font-semibold">R$ {parseFloat(String(c.valor)).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{new Date(c.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell><Badge className={statusColors[c.status] || "bg-gray-100"}>{c.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDeletingId(c.id); setDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredContas.length === 0 && <div className="text-center py-8"><p className="text-muted-foreground">Nenhuma conta encontrada</p></div>}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) resetForm(); setDialogOpen(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingConta ? "Editar Conta" : "Nova Conta a Receber"}</DialogTitle>
            <DialogDescription>{editingConta ? "Atualize os dados da conta" : "Preencha os dados para registrar uma nova conta"}</DialogDescription>
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
                  <SelectContent><SelectItem value="">Nenhum</SelectItem>{processos.map(p => <SelectItem key={p.id} value={p.id}>{p.numero}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Descricao *</Label><Input placeholder="Descricao do recebivel" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor *</Label><Input type="number" step="0.01" placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} required /></div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Honorarios", "Custas", "Sucumbencia", "Acordo", "Outros"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Vencimento *</Label><Input type="date" value={form.vencimento} onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))} required /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Pago">Pago</SelectItem><SelectItem value="Atrasado">Atrasado</SelectItem><SelectItem value="Parcial">Parcial</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            {form.status === "Pago" && (
              <div className="space-y-2"><Label>Data Pagamento</Label><Input type="date" value={form.dataPagamento} onChange={e => setForm(f => ({ ...f, dataPagamento: e.target.value }))} /></div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : editingConta ? "Atualizar" : "Criar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir Conta</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir esta conta a receber?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deletingId && deleteMutation.mutate(deletingId)}>{deleteMutation.isPending ? "Excluindo..." : "Excluir"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
