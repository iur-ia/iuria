import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Filter, Calendar, Clock, Bell, Gavel, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertAtividadeSchema } from "@shared/schema";
import type { Atividade, Processo, Equipe } from "@shared/schema";
import { z } from "zod";

const formSchema = insertAtividadeSchema.extend({
  titulo: z.string().min(1, "Título obrigatório"),
  tipo: z.string().min(1, "Tipo obrigatório"),
  data: z.string().min(1, "Data obrigatória"),
  prioridade: z.string().min(1, "Prioridade obrigatória"),
  status: z.string().min(1, "Status obrigatório"),
});

type FormValues = z.infer<typeof formSchema>;

const TIPOS = ["Tarefa", "Intimação", "Audiência", "Compromisso"];
const PRIORIDADES = ["Alta", "Média", "Baixa"];
const STATUS_OPTIONS = ["Pendente", "Em Andamento", "Concluído", "Atrasado"];

const NENHUM = "__nenhum__";

export default function ListaAtividades() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todas");

  // Read drill filter from sessionStorage (set by Dashboard KPI card clicks)
  const [statusFiltro, setStatusFiltro] = useState<string>(() => {
    const drill = sessionStorage.getItem("dashboard_drill_filter");
    if (drill) { sessionStorage.removeItem("dashboard_drill_filter"); return drill; }
    return "todas";
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAtividade, setEditingAtividade] = useState<Atividade | null>(null);
  const { toast } = useToast();

  const { data: atividades = [], isLoading } = useQuery<Atividade[]>({
    queryKey: ["/api/atividades"],
  });

  const { data: processos = [] } = useQuery<Processo[]>({
    queryKey: ["/api/processos"],
  });

  const { data: equipe = [] } = useQuery<Equipe[]>({
    queryKey: ["/api/equipe"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: "",
      descricao: "",
      tipo: "Tarefa",
      data: new Date().toISOString().split("T")[0],
      hora: "",
      prioridade: "Média",
      status: "Pendente",
      processoId: null,
      responsavelId: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/atividades", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/atividades"] });
      toast({ title: "Atividade criada com sucesso!" });
      setDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Erro ao criar atividade", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormValues> }) => {
      const res = await apiRequest("PATCH", `/api/atividades/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/atividades"] });
      toast({ title: "Atividade atualizada com sucesso!" });
      setDialogOpen(false);
      setEditingAtividade(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar atividade", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/atividades/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/atividades"] });
      toast({ title: "Atividade excluída" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir atividade", variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingAtividade(null);
    form.reset({
      titulo: "",
      descricao: "",
      tipo: "Tarefa",
      data: new Date().toISOString().split("T")[0],
      hora: "",
      prioridade: "Média",
      status: "Pendente",
      processoId: null,
      responsavelId: null,
    });
    setDialogOpen(true);
  };

  const openEdit = (atividade: Atividade) => {
    setEditingAtividade(atividade);
    form.reset({
      titulo: atividade.titulo,
      descricao: atividade.descricao || "",
      tipo: atividade.tipo,
      data: atividade.data,
      hora: atividade.hora || "",
      prioridade: atividade.prioridade,
      status: atividade.status,
      processoId: atividade.processoId || null,
      responsavelId: atividade.responsavelId || null,
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      hora: values.hora || null,
      descricao: values.descricao || null,
      processoId: values.processoId || null,
      responsavelId: values.responsavelId || null,
    };
    if (editingAtividade) {
      updateMutation.mutate({ id: editingAtividade.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (atividade: Atividade) => {
    if (window.confirm(`Excluir "${atividade.titulo}"? Esta ação não pode ser desfeita.`)) {
      deleteMutation.mutate(atividade.id);
    }
  };

  const getProcessoNumero = (id: string | null) => {
    const proc = processos.find(p => p.id === id);
    return proc?.numero;
  };

  const getResponsavelNome = (id: string | null) => {
    const membro = equipe.find(m => m.id === id);
    return membro?.nome || "Não atribuído";
  };

  const filteredAtividades = atividades.filter((atividade) => {
    const matchesSearch =
      atividade.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getProcessoNumero(atividade.processoId)?.includes(searchTerm) ||
      getResponsavelNome(atividade.responsavelId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFilter === "todas" || atividade.tipo === tipoFilter;
    // statusFiltro: "todas" = all, "Atrasado" = vencidas e não concluídas, "Vencendo7d" = vencendo nos próximos 7 dias, or exact status match
    const hoje = new Date().toISOString().split("T")[0];
    const em7d = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    const matchesStatus = statusFiltro === "todas" ||
      (statusFiltro === "Atrasado"
        ? (atividade.status !== "Concluído" && atividade.status !== "Cancelado" && atividade.data < hoje)
        : statusFiltro === "Vencendo7d"
          ? (atividade.status !== "Concluído" && atividade.status !== "Cancelado" && atividade.data >= hoje && atividade.data <= em7d)
          : atividade.status === statusFiltro);
    return matchesSearch && matchesTipo && matchesStatus;
  });

  const tipoIcons: Record<string, typeof Clock> = {
    Tarefa: Clock,
    Intimação: Bell,
    Audiência: Gavel,
    Compromisso: Calendar,
  };

  const tipoColors: Record<string, string> = {
    Tarefa: "bg-primary/15 text-primary dark:bg-purple-900/30 dark:text-purple-300",
    Intimação: "bg-orange-500/15 text-orange-400 dark:bg-orange-500/15 dark:text-orange-300 dark:bg-orange-900/30 dark:text-orange-300",
    Audiência: "bg-emerald-500/15 text-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-300 dark:bg-green-900/30 dark:text-green-300",
    Compromisso: "bg-blue-500/15 text-blue-400 dark:bg-blue-500/15 dark:text-blue-300",
  };

  const statusColors: Record<string, string> = {
    Pendente: "bg-muted text-foreground",
    "Em Andamento": "bg-blue-500/15 text-blue-400 dark:bg-blue-500/15 dark:text-blue-300",
    Concluído: "bg-emerald-500/15 text-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-300 dark:bg-green-900/30 dark:text-green-300",
    Atrasado: "bg-rose-500/15 text-rose-400 dark:bg-rose-500/15 dark:text-rose-300 dark:bg-red-900/30 dark:text-red-300",
  };

  const prioridadeColors: Record<string, string> = {
    Alta: "text-red-600",
    Média: "text-yellow-600",
    Baixa: "text-green-600",
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando atividades...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Lista de Atividades
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie todas as atividades do escritório
          </p>
        </div>
        <Button
          className="bg-legal-status-active hover:bg-legal-status-active/90"
          onClick={openCreate}
          data-testid="button-new-activity"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Atividade
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Tarefas</p>
            <p className="text-3xl font-bold text-purple-600">
              {atividades.filter((a) => a.tipo === "Tarefa").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Intimações</p>
            <p className="text-3xl font-bold text-orange-600">
              {atividades.filter((a) => a.tipo === "Intimação").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Audiências</p>
            <p className="text-3xl font-bold text-green-600">
              {atividades.filter((a) => a.tipo === "Audiência").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Compromissos</p>
            <p className="text-3xl font-bold text-blue-600">
              {atividades.filter((a) => a.tipo === "Compromisso").length}
            </p>
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
                placeholder="Pesquisar atividades..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-activity-search"
              />
            </div>
            <Button variant="outline" data-testid="button-filters">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>

          <Tabs value={tipoFilter} onValueChange={setTipoFilter} className="mb-4">
            <TabsList>
              <TabsTrigger value="todas" data-testid="tab-all">Todas</TabsTrigger>
              <TabsTrigger value="Tarefa" data-testid="tab-tasks">Tarefas</TabsTrigger>
              <TabsTrigger value="Intimação" data-testid="tab-intimations">Intimações</TabsTrigger>
              <TabsTrigger value="Audiência" data-testid="tab-hearings">Audiências</TabsTrigger>
              <TabsTrigger value="Compromisso" data-testid="tab-appointments">Compromissos</TabsTrigger>
            </TabsList>
          </Tabs>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atividade</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAtividades.map((atividade) => {
                const Icon = tipoIcons[atividade.tipo] || Clock;
                return (
                  <TableRow key={atividade.id} data-testid={`row-activity-${atividade.id}`}>
                    <TableCell className="font-medium">{atividade.titulo}</TableCell>
                    <TableCell>
                      <Badge className={tipoColors[atividade.tipo] || "bg-muted"}>
                        <Icon className="w-3 h-3 mr-1" />
                        {atividade.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {atividade.processoId ? (
                        <span className="font-mono text-sm">{getProcessoNumero(atividade.processoId)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getResponsavelNome(atividade.responsavelId)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{new Date(atividade.data + "T12:00:00").toLocaleDateString("pt-BR")}</div>
                        {atividade.hora && (
                          <div className="text-muted-foreground">{atividade.hora}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${prioridadeColors[atividade.prioridade] || ""}`}>
                        {atividade.prioridade}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[atividade.status] || "bg-muted"}>
                        {atividade.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(atividade)}
                          data-testid={`button-edit-activity-${atividade.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(atividade)}
                          data-testid={`button-delete-activity-${atividade.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredAtividades.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma atividade encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingAtividade(null); form.reset(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-atividade">
          <DialogHeader>
            <DialogTitle>
              {editingAtividade ? "Editar Atividade" : "Nova Atividade"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="titulo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Descreva a atividade..." {...field} data-testid="input-titulo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-tipo">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIPOS.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prioridade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-prioridade">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRIORIDADES.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-data" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hora"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora (opcional)</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} value={field.value ?? ""} data-testid="input-hora" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="processoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Processo (opcional)</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === NENHUM ? null : v)}
                      value={field.value ?? NENHUM}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-processo">
                          <SelectValue placeholder="Selecione o processo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NENHUM}>— Nenhum —</SelectItem>
                        {processos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.numero}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="responsavelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável (opcional)</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === NENHUM ? null : v)}
                      value={field.value ?? NENHUM}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-responsavel">
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NENHUM}>— Nenhum —</SelectItem>
                        {equipe.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detalhes adicionais sobre a atividade..."
                        {...field}
                        value={field.value ?? ""}
                        data-testid="textarea-descricao"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  data-testid="button-submit-atividade"
                >
                  {isPending ? "Salvando..." : editingAtividade ? "Salvar alterações" : "Criar atividade"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
