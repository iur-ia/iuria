import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Filter, TrendingDown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { ContaPagar } from "@shared/schema";

const emptyConta = {
  fornecedor: "", descricao: "", valor: "", vencimento: "",
  status: "Pendente", categoria: "Despesas", dataPagamento: "",
};

export default function ContasPagarPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaPagar | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyConta);
  const { toast } = useToast();

  const { data: contas = [], isLoading } = useQuery<ContaPagar[]>({ queryKey: ["/api/contas-pagar"] });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/contas-pagar", { ...data, dataPagamento: data.dataPagamento || null }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/contas-pagar"] }); setDialogOpen(false); resetForm(); toast({ title: "Conta criada com sucesso" }); },
    onError: (e: Error) => { toast({ title: "Erro ao criar conta", description: e.message, variant: "destructive" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => apiRequest("PATCH", `/api/contas-pagar/${id}`, { ...data, dataPagamento: data.dataPagamento || null }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/contas-pagar"] }); setDialogOpen(false); resetForm(); toast({ title: "Conta atualizada" }); },
    onError: (e: Error) => { toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/contas-pagar/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/contas-pagar"] }); setDeleteDialogOpen(false); toast({ title: "Conta excluida" }); },
    onError: (e: Error) => { toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }); },
  });

  const resetForm = () => { setForm(emptyConta); setEditingConta(null); };
  const openCreate = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (c: ContaPagar) => {
    setEditingConta(c);
    setForm({ fornecedor: c.fornecedor, descricao: c.descricao, valor: String(c.valor), vencimento: c.vencimento, status: c.status, categoria: c.categoria, dataPagamento: c.dataPagamento || "" });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fornecedor || !form.descricao || !form.valor || !form.vencimento || !form.categoria) {
      toast({ title: "Preencha os campos obrigatorios", variant: "destructive" }); return;
    }
    if (editingConta) updateMutation.mutate({ id: editingConta.id, data: form });
    else createMutation.mutate(form);
  };

  const filteredContas = contas.filter(c =>
    c.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    Pago: "bg-green-100 text-green-800",
    Pendente: "bg-yellow-100 text-yellow-800",
    Atrasado: "bg-red-100 text-red-800",
  };

  const totalPagar = contas.filter(c => c.status !== "Pago").reduce((acc, c) => acc + parseFloat(String(c.valor || "0")), 0);
  const totalPago = contas.filter(c => c.status === "Pago").reduce((acc, c) => acc + parseFloat(String(c.valor || "0")), 0);
  const totalAtrasado = contas.filter(c => c.status === "Atrasado").reduce((acc, c) => acc + parseFloat(String(c.valor || "0")), 0);

  if (isLoading) return <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando contas...</p></div>;

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">Gerencie despesas e fornecedores</p>
        </div>
        <Button className="bg-legal-status-active hover:bg-legal-status-active/90" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />Nova Conta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "A Pagar", value: totalPagar, color: "text-orange-600", icon: <TrendingDown className="w-4 h-4 text-orange-600" /> },
          { label: "Pago", value: totalPago, color: "text-green-600", icon: <TrendingDown className="w-4 h-4 text-green-600" /> },
          { label: "Atrasado", value: totalAtrasado, color: "text-red-600", icon: <TrendingDown className="w-4 h-4 text-red-600" /> },
          { label: "Total de Contas", value: contas.length, color: "text-foreground", icon: null, isCount: true },
        ].map((s, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2"><p className="text-sm text-muted-foreground">{s.label}</p>{s.icon}</div>
              <p className={`text-2xl font-bold ${s.color}`}>{(s as any).isCount ? s.value : `R$ ${(s.value as number / 1000).toFixed(1)}k`}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="search" placeholder="Pesquisar por fornecedor ou descricao..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContas.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.fornecedor}</TableCell>
                  <TableCell>{c.descricao}</TableCell>
                  <TableCell><Badge variant="outline">{c.categoria}</Badge></TableCell>
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
            <DialogTitle>{editingConta ? "Editar Conta" : "Nova Conta a Pagar"}</DialogTitle>
            <DialogDescription>{editingConta ? "Atualize os dados da conta" : "Preencha os dados para registrar uma nova conta"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Fornecedor *</Label><Input placeholder="Nome do fornecedor" value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>Descricao *</Label><Input placeholder="Descricao da despesa" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor *</Label><Input type="number" step="0.01" placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} required /></div>
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Aluguel", "Servicos", "Software", "Despesas", "Impostos", "Salarios", "Materiais", "Outros"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                  <SelectContent><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Pago">Pago</SelectItem><SelectItem value="Atrasado">Atrasado</SelectItem></SelectContent>
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
          <AlertDialogHeader><AlertDialogTitle>Excluir Conta</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir esta conta a pagar?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deletingId && deleteMutation.mutate(deletingId)}>{deleteMutation.isPending ? "Excluindo..." : "Excluir"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
