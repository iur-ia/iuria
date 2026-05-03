import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Filter, TrendingUp, Pencil, Trash2 } from "lucide-react";
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
import { insertHonorarioSchema } from "@shared/schema";
import type { Honorario, Cliente, Processo } from "@shared/schema";
import { z } from "zod";

const NENHUM = "__nenhum__";

const formSchema = insertHonorarioSchema.extend({
  tipo: z.string().min(1, "Tipo obrigatório"),
  dataContrato: z.string().min(1, "Data do contrato obrigatória"),
  status: z.string().min(1, "Status obrigatório"),
});
type FormValues = z.infer<typeof formSchema>;

const TIPOS = ["Fixo", "Êxito", "Hora", "Misto"];
const STATUS = ["Ativo", "Finalizado", "Suspenso"];

export default function Honorarios() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Honorario | null>(null);
  const { toast } = useToast();

  const { data: honorarios = [], isLoading } = useQuery<Honorario[]>({ queryKey: ["/api/honorarios"] });
  const { data: clientes = [] } = useQuery<Cliente[]>({ queryKey: ["/api/clientes"] });
  const { data: processos = [] } = useQuery<Processo[]>({ queryKey: ["/api/processos"] });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo: "Fixo",
      dataContrato: new Date().toISOString().split("T")[0],
      status: "Ativo",
      valorContratado: null, valorRecebido: "0", percentualExito: null,
      clienteId: null, processoId: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => (await apiRequest("POST", "/api/honorarios", data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/honorarios"] });
      toast({ title: "Contrato criado!" }); setDialogOpen(false); form.reset();
    },
    onError: () => toast({ title: "Erro ao criar contrato", variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormValues> }) =>
      (await apiRequest("PATCH", `/api/honorarios/${id}`, data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/honorarios"] });
      toast({ title: "Contrato atualizado!" }); setDialogOpen(false); setEditing(null); form.reset();
    },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/honorarios/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/honorarios"] });
      toast({ title: "Contrato excluído" });
    },
    onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      tipo: "Fixo",
      dataContrato: new Date().toISOString().split("T")[0],
      status: "Ativo",
      valorContratado: null, valorRecebido: "0", percentualExito: null,
      clienteId: null, processoId: null,
    });
    setDialogOpen(true);
  };
  const openEdit = (h: Honorario) => {
    setEditing(h);
    form.reset({
      tipo: h.tipo, dataContrato: h.dataContrato, status: h.status,
      valorContratado: h.valorContratado || null,
      valorRecebido: h.valorRecebido || "0",
      percentualExito: h.percentualExito || null,
      clienteId: h.clienteId || null, processoId: h.processoId || null,
    });
    setDialogOpen(true);
  };
  const handleDelete = (h: Honorario) => {
    const cli = clientes.find(c => c.id === h.clienteId)?.nome || "contrato";
    if (window.confirm(`Excluir contrato de "${cli}"?`)) deleteMutation.mutate(h.id);
  };
  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      valorContratado: values.valorContratado || null,
      percentualExito: values.percentualExito === null || values.percentualExito === undefined ? null : Number(values.percentualExito),
      clienteId: values.clienteId || null,
      processoId: values.processoId || null,
    };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  const getClienteNome = (id: string | null) => clientes.find(c => c.id === id)?.nome || "Sem cliente";
  const getProcessoNumero = (id: string | null) => processos.find(p => p.id === id)?.numero || "-";

  const filteredHonorarios = honorarios.filter((h) =>
    getClienteNome(h.clienteId).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getProcessoNumero(h.processoId).includes(searchTerm)
  );

  const statusColors: Record<string, string> = {
    Ativo: "bg-emerald-500/15 text-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-300",
    Finalizado: "bg-muted text-foreground",
    Suspenso: "bg-amber-500/15 text-amber-400 dark:bg-amber-500/15 dark:text-amber-300",
  };
  const tipoColors: Record<string, string> = {
    Fixo: "bg-blue-500/15 text-blue-400 dark:bg-blue-500/15 dark:text-blue-300",
    Êxito: "bg-primary/15 text-primary",
    Hora: "bg-orange-500/15 text-orange-400 dark:bg-orange-500/15 dark:text-orange-300",
    Misto: "bg-pink-500/15 text-pink-400",
  };

  const totalContratado = honorarios.reduce((acc, h) => acc + parseFloat(h.valorContratado || "0"), 0);
  const totalRecebido = honorarios.reduce((acc, h) => acc + parseFloat(h.valorRecebido || "0"), 0);
  const totalAtivos = honorarios.filter((h) => h.status === "Ativo").length;

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando honorários...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Honorários</h1>
          <p className="text-sm text-muted-foreground">Gerencie contratos de honorários e valores</p>
        </div>
        <Button onClick={openCreate} data-testid="button-new-fee">
          <Plus className="w-4 h-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Contratado</p>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">R$ {(totalContratado / 1000).toFixed(0)}k</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Recebido</p>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">R$ {(totalRecebido / 1000).toFixed(1)}k</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">A Receber</p>
              <TrendingUp className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">R$ {((totalContratado - totalRecebido) / 1000).toFixed(1)}k</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Contratos Ativos</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalAtivos}</p>
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
                placeholder="Pesquisar por cliente ou processo..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-fee-search"
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
                <TableHead>Processo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor Contratado</TableHead>
                <TableHead>Valor Recebido</TableHead>
                <TableHead>% Êxito</TableHead>
                <TableHead>Data Contrato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHonorarios.map((h) => (
                <TableRow key={h.id} data-testid={`row-fee-${h.id}`}>
                  <TableCell className="font-medium">{getClienteNome(h.clienteId)}</TableCell>
                  <TableCell><span className="font-mono text-sm">{getProcessoNumero(h.processoId)}</span></TableCell>
                  <TableCell><Badge className={tipoColors[h.tipo] || "bg-muted"}>{h.tipo}</Badge></TableCell>
                  <TableCell className="font-semibold">
                    {h.valorContratado && parseFloat(h.valorContratado) > 0
                      ? `R$ ${parseFloat(h.valorContratado).toLocaleString("pt-BR")}`
                      : "-"}
                  </TableCell>
                  <TableCell className="font-semibold text-green-600">
                    R$ {parseFloat(h.valorRecebido || "0").toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>{h.percentualExito ? `${h.percentualExito}%` : "-"}</TableCell>
                  <TableCell>{new Date(h.dataContrato).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell><Badge className={statusColors[h.status] || "bg-muted"}>{h.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(h)} data-testid={`button-edit-fee-${h.id}`}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(h)} data-testid={`button-delete-fee-${h.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredHonorarios.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum contrato encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar contrato" : "Novo contrato de honorários"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="tipo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-fee-tipo"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dataContrato" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do Contrato *</FormLabel>
                    <FormControl><Input type="date" {...field} data-testid="input-fee-data" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="clienteId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select value={field.value || NENHUM} onValueChange={(v) => field.onChange(v === NENHUM ? null : v)}>
                    <FormControl><SelectTrigger data-testid="select-fee-cliente"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger></FormControl>
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
                  <Select value={field.value || NENHUM} onValueChange={(v) => field.onChange(v === NENHUM ? null : v)}>
                    <FormControl><SelectTrigger data-testid="select-fee-processo"><SelectValue placeholder="Selecione um processo" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NENHUM}>Sem processo</SelectItem>
                      {processos.map(p => <SelectItem key={p.id} value={p.id}>{p.numero}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="valorContratado" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Contratado (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        data-testid="input-fee-valor-contratado" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="valorRecebido" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Recebido (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field}
                        value={field.value ?? "0"}
                        data-testid="input-fee-valor-recebido" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="percentualExito" render={({ field }) => (
                  <FormItem>
                    <FormLabel>% Êxito</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" step="1" {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                        data-testid="input-fee-percentual" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger data-testid="select-fee-status"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-fee">Cancelar</Button>
                <Button type="submit" disabled={isPending} data-testid="button-save-fee">
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
