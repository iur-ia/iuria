import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Filter, TrendingDown, Pencil, Trash2 } from "lucide-react";
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
import { insertContaPagarSchema } from "@shared/schema";
import type { ContaPagar } from "@shared/schema";
import { z } from "zod";

const formSchema = insertContaPagarSchema.extend({
  fornecedor: z.string().min(1, "Fornecedor obrigatório"),
  descricao: z.string().min(1, "Descrição obrigatória"),
  valor: z.string().min(1, "Valor obrigatório"),
  vencimento: z.string().min(1, "Vencimento obrigatório"),
  categoria: z.string().min(1, "Categoria obrigatória"),
  status: z.string().min(1, "Status obrigatório"),
});
type FormValues = z.infer<typeof formSchema>;

const CATEGORIAS = ["Aluguel", "Serviços", "Software", "Despesas", "Impostos", "Outros"];
const STATUS = ["Pendente", "Pago", "Atrasado"];

export default function ContasPagar() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContaPagar | null>(null);
  const { toast } = useToast();

  const { data: contas = [], isLoading } = useQuery<ContaPagar[]>({ queryKey: ["/api/contas-pagar"] });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fornecedor: "", descricao: "", valor: "",
      vencimento: new Date().toISOString().split("T")[0],
      categoria: "Despesas", status: "Pendente", dataPagamento: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => (await apiRequest("POST", "/api/contas-pagar", data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contas-pagar"] });
      toast({ title: "Conta criada!" }); setDialogOpen(false); form.reset();
    },
    onError: () => toast({ title: "Erro ao criar conta", variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormValues> }) =>
      (await apiRequest("PATCH", `/api/contas-pagar/${id}`, data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contas-pagar"] });
      toast({ title: "Conta atualizada!" }); setDialogOpen(false); setEditing(null); form.reset();
    },
    onError: () => toast({ title: "Erro ao atualizar conta", variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/contas-pagar/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contas-pagar"] });
      toast({ title: "Conta excluída" });
    },
    onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      fornecedor: "", descricao: "", valor: "",
      vencimento: new Date().toISOString().split("T")[0],
      categoria: "Despesas", status: "Pendente", dataPagamento: null,
    });
    setDialogOpen(true);
  };
  const openEdit = (c: ContaPagar) => {
    setEditing(c);
    form.reset({
      fornecedor: c.fornecedor, descricao: c.descricao, valor: c.valor,
      vencimento: c.vencimento, categoria: c.categoria, status: c.status,
      dataPagamento: c.dataPagamento || null,
    });
    setDialogOpen(true);
  };
  const handleDelete = (c: ContaPagar) => {
    if (window.confirm(`Excluir "${c.descricao}"?`)) deleteMutation.mutate(c.id);
  };
  const onSubmit = (values: FormValues) => {
    const payload = { ...values, dataPagamento: values.dataPagamento || null };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  const filteredContas = contas.filter((c) =>
    c.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    Pago: "bg-emerald-500/15 text-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-300",
    Pendente: "bg-amber-500/15 text-amber-400 dark:bg-amber-500/15 dark:text-amber-300",
    Atrasado: "bg-rose-500/15 text-rose-400 dark:bg-rose-500/15 dark:text-rose-300",
  };

  const totalPagar = contas.filter((c) => c.status !== "Pago").reduce((acc, c) => acc + parseFloat(c.valor), 0);
  const totalPago = contas.filter((c) => c.status === "Pago").reduce((acc, c) => acc + parseFloat(c.valor), 0);
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
          <h1 className="text-2xl font-semibold text-foreground mb-1">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">Gerencie despesas e fornecedores</p>
        </div>
        <Button onClick={openCreate} data-testid="button-new-payable">
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">A Pagar</p>
              <TrendingDown className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">R$ {(totalPagar / 1000).toFixed(1)}k</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Pago</p>
              <TrendingDown className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">R$ {(totalPago / 1000).toFixed(1)}k</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Atrasado</p>
              <TrendingDown className="w-4 h-4 text-red-600" />
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
                placeholder="Pesquisar por fornecedor ou descrição..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-payable-search"
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
                <TableHead>Fornecedor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContas.map((conta) => (
                <TableRow key={conta.id} data-testid={`row-payable-${conta.id}`}>
                  <TableCell className="font-medium">{conta.fornecedor}</TableCell>
                  <TableCell>{conta.descricao}</TableCell>
                  <TableCell><Badge variant="outline">{conta.categoria}</Badge></TableCell>
                  <TableCell className="font-semibold">R$ {parseFloat(conta.valor).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{new Date(conta.vencimento).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[conta.status] || "bg-muted"}>{conta.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(conta)} data-testid={`button-edit-payable-${conta.id}`}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(conta)} data-testid={`button-delete-payable-${conta.id}`}>
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
            <DialogTitle>{editing ? "Editar conta" : "Nova conta a pagar"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="fornecedor" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor *</FormLabel>
                  <FormControl><Input {...field} data-testid="input-payable-fornecedor" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="descricao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição *</FormLabel>
                  <FormControl><Input {...field} data-testid="input-payable-descricao" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="valor" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" {...field} data-testid="input-payable-valor" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="vencimento" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vencimento *</FormLabel>
                    <FormControl><Input type="date" {...field} data-testid="input-payable-vencimento" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="categoria" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-payable-categoria"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-payable-status"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-payable">Cancelar</Button>
                <Button type="submit" disabled={isPending} data-testid="button-save-payable">
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
