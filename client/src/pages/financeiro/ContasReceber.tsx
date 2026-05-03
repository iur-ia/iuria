import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Filter, DollarSign, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertContaReceberSchema } from "@shared/schema";
import type { ContaReceber, Cliente, Processo } from "@shared/schema";
import { z } from "zod";

const NENHUM = "__nenhum__";

const formSchema = insertContaReceberSchema.extend({
  descricao: z.string().min(1, "Descrição obrigatória"),
  valor: z.string().min(1, "Valor obrigatório"),
  vencimento: z.string().min(1, "Vencimento obrigatório"),
  tipo: z.string().min(1, "Tipo obrigatório"),
  status: z.string().min(1, "Status obrigatório"),
});
type FormValues = z.infer<typeof formSchema>;

const TIPOS = ["Honorários", "Êxito", "Reembolso", "Outros"];
const STATUS = ["Pendente", "Pago", "Atrasado", "Parcial"];

export default function ContasReceberPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContaReceber | null>(null);
  const { toast } = useToast();

  const { data: contas = [], isLoading } = useQuery<ContaReceber[]>({ queryKey: ["/api/contas-receber"] });
  const { data: clientes = [] } = useQuery<Cliente[]>({ queryKey: ["/api/clientes"] });
  const { data: processos = [] } = useQuery<Processo[]>({ queryKey: ["/api/processos"] });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      descricao: "", valor: "", vencimento: new Date().toISOString().split("T")[0],
      tipo: "Honorários", status: "Pendente",
      clienteId: null, processoId: null, dataPagamento: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => (await apiRequest("POST", "/api/contas-receber", data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contas-receber"] });
      toast({ title: "Conta criada!" }); setDialogOpen(false); form.reset();
    },
    onError: () => toast({ title: "Erro ao criar conta", variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormValues> }) =>
      (await apiRequest("PATCH", `/api/contas-receber/${id}`, data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contas-receber"] });
      toast({ title: "Conta atualizada!" }); setDialogOpen(false); setEditing(null); form.reset();
    },
    onError: () => toast({ title: "Erro ao atualizar conta", variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/contas-receber/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contas-receber"] });
      toast({ title: "Conta excluída" });
    },
    onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      descricao: "", valor: "", vencimento: new Date().toISOString().split("T")[0],
      tipo: "Honorários", status: "Pendente",
      clienteId: null, processoId: null, dataPagamento: null,
    });
    setDialogOpen(true);
  };
  const openEdit = (c: ContaReceber) => {
    setEditing(c);
    form.reset({
      descricao: c.descricao, valor: c.valor, vencimento: c.vencimento,
      tipo: c.tipo, status: c.status,
      clienteId: c.clienteId || null, processoId: c.processoId || null,
      dataPagamento: c.dataPagamento || null,
    });
    setDialogOpen(true);
  };
  const handleDelete = (c: ContaReceber) => {
    if (window.confirm(`Excluir "${c.descricao}"?`)) deleteMutation.mutate(c.id);
  };
  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      clienteId: values.clienteId || null,
      processoId: values.processoId || null,
      dataPagamento: values.dataPagamento || null,
    };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  const getClienteNome = (id: string | null) => clientes.find(c => c.id === id)?.nome || "Não informado";
  const getProcessoNumero = (id: string | null) => processos.find(p => p.id === id)?.numero;

  const filteredContas = contas.filter((conta) =>
    getClienteNome(conta.clienteId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    conta.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getProcessoNumero(conta.processoId)?.includes(searchTerm)
  );

  const statusColors: Record<string, string> = {
    Pago: "bg-emerald-500/15 text-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-300",
    Pendente: "bg-amber-500/15 text-amber-400 dark:bg-amber-500/15 dark:text-amber-300",
    Atrasado: "bg-rose-500/15 text-rose-400 dark:bg-rose-500/15 dark:text-rose-300",
    Parcial: "bg-blue-500/15 text-blue-400 dark:bg-blue-500/15 dark:text-blue-300",
  };

  const totalReceber = contas.filter((c) => c.status !== "Pago").reduce((acc, c) => acc + parseFloat(c.valor), 0);
  const totalRecebido = contas.filter((c) => c.status === "Pago").reduce((acc, c) => acc + parseFloat(c.valor), 0);
  const totalAtrasado = contas.filter((c) => c.status === "Atrasado").reduce((acc, c) => acc + parseFloat(c.valor), 0);

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando contas...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Contas a Receber</h1>
          <p className="text-sm text-muted-foreground">Gerencie honorários e recebíveis</p>
        </div>
        <Button onClick={openCreate} data-testid="button-new-receivable">
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">A Receber</p>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">R$ {(totalReceber / 1000).toFixed(1)}k</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Recebido</p>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">R$ {(totalRecebido / 1000).toFixed(1)}k</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Atrasado</p>
              <DollarSign className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">R$ {(totalAtrasado / 1000).toFixed(1)}k</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total de Contas</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{contas.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Pesquisar por cliente, descrição ou processo..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-receivable-search"
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
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContas.map((conta) => (
                <TableRow key={conta.id} data-testid={`row-receivable-${conta.id}`}>
                  <TableCell className="font-medium">{getClienteNome(conta.clienteId)}</TableCell>
                  <TableCell>{conta.descricao}</TableCell>
                  <TableCell>
                    {conta.processoId ? (
                      <span className="font-mono text-sm">{getProcessoNumero(conta.processoId)}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell><Badge variant="outline">{conta.tipo}</Badge></TableCell>
                  <TableCell className="font-semibold">R$ {parseFloat(conta.valor).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{new Date(conta.vencimento).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[conta.status] || "bg-muted"}>{conta.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(conta)} data-testid={`button-edit-receivable-${conta.id}`}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(conta)} data-testid={`button-delete-receivable-${conta.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredContas.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma conta encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar conta" : "Nova conta a receber"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="descricao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição *</FormLabel>
                  <FormControl><Input {...field} data-testid="input-receivable-descricao" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="valor" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" {...field} data-testid="input-receivable-valor" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="vencimento" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vencimento *</FormLabel>
                    <FormControl><Input type="date" {...field} data-testid="input-receivable-vencimento" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="tipo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-receivable-tipo"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-receivable-status"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="clienteId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select
                    value={field.value || NENHUM}
                    onValueChange={(v) => field.onChange(v === NENHUM ? null : v)}
                  >
                    <FormControl><SelectTrigger data-testid="select-receivable-cliente"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NENHUM}>Sem cliente</SelectItem>
                      {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="processoId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Processo</FormLabel>
                  <Select
                    value={field.value || NENHUM}
                    onValueChange={(v) => field.onChange(v === NENHUM ? null : v)}
                  >
                    <FormControl><SelectTrigger data-testid="select-receivable-processo"><SelectValue placeholder="Selecione um processo" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NENHUM}>Sem processo</SelectItem>
                      {processos.map(p => <SelectItem key={p.id} value={p.id}>{p.numero}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-receivable">Cancelar</Button>
                <Button type="submit" disabled={isPending} data-testid="button-save-receivable">
                  {isPending ? "Salvando..." : editing ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
