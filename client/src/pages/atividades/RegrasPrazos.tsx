import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, Search, AlertTriangle, BookOpen, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Textarea } from "@/components/ui/textarea";
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
import { insertDeadlineRuleSchema } from "@shared/schema";
import type { DeadlineRule, Equipe } from "@shared/schema";
import { z } from "zod";

const formSchema = insertDeadlineRuleSchema.extend({
  nome: z.string().min(1, "Nome obrigatório"),
  eventoGatilho: z.string().min(1, "Evento gatilho obrigatório"),
  dias: z.number().min(1, "Deve ser ao menos 1 dia"),
});

type FormValues = z.infer<typeof formSchema>;

const EVENTOS_GATILHO = [
  { value: "citacao", label: "Citação" },
  { value: "intimacao_decisao", label: "Intimação de Decisão" },
  { value: "sentenca", label: "Sentença" },
  { value: "audiencia", label: "Designação de Audiência" },
  { value: "despacho", label: "Despacho" },
  { value: "recurso", label: "Acórdão / Decisão Recursal" },
  { value: "outro", label: "Outro" },
];

const AREAS = [
  { value: "geral", label: "Geral (qualquer área)" },
  { value: "civel", label: "Cível" },
  { value: "trabalhista", label: "Trabalhista" },
  { value: "tributario", label: "Tributário" },
  { value: "criminal", label: "Criminal" },
];

const RISCOS = [
  { value: "BAIXO", label: "Baixo", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  { value: "MEDIO", label: "Médio", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  { value: "ALTO", label: "Alto", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  { value: "CRITICO", label: "Crítico", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
];

const NENHUM = "__nenhum__";

function getRiscoInfo(risco: string) {
  return RISCOS.find((r) => r.value === risco) || RISCOS[1];
}

function getEventoLabel(evento: string) {
  return EVENTOS_GATILHO.find((e) => e.value === evento)?.label || evento;
}

function getAreaLabel(area: string) {
  return AREAS.find((a) => a.value === area)?.label || area;
}

export default function RegrasPrazos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [triggerDialogOpen, setTriggerDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DeadlineRule | null>(null);
  const { toast } = useToast();

  const [triggerForm, setTriggerForm] = useState({
    eventoGatilho: "",
    dataEvento: new Date().toISOString().split("T")[0],
    area: "",
  });

  const { data: rules = [], isLoading } = useQuery<DeadlineRule[]>({
    queryKey: ["/api/deadline-rules"],
  });

  const { data: equipe = [] } = useQuery<Equipe[]>({
    queryKey: ["/api/equipe"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      eventoGatilho: "citacao",
      dias: 15,
      tipoDia: "util",
      area: "geral",
      riscoDefault: "MEDIO",
      fundamentoLegal: "",
      descricao: "",
      responsavelPadraoId: null,
      ativo: true,
      preConfigurada: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/deadline-rules", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deadline-rules"] });
      toast({ title: "Regra criada com sucesso!" });
      setDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Erro ao criar regra", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormValues> }) => {
      const res = await apiRequest("PATCH", `/api/deadline-rules/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deadline-rules"] });
      toast({ title: "Regra atualizada com sucesso!" });
      setDialogOpen(false);
      setEditingRule(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar regra", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/deadline-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deadline-rules"] });
      toast({ title: "Regra excluída" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir regra", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const res = await apiRequest("PATCH", `/api/deadline-rules/${id}`, { ativo });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deadline-rules"] });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: async (data: typeof triggerForm) => {
      const res = await apiRequest("POST", "/api/deadline-rules/aplicar", {
        ...data,
        processoId: null,
        area: data.area || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/atividades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prazos-criticos"] });
      toast({ title: `${data.tasksCreated} tarefa(s) gerada(s) com sucesso!` });
      setTriggerDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Erro ao aplicar regras", variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingRule(null);
    form.reset({
      nome: "",
      eventoGatilho: "citacao",
      dias: 15,
      tipoDia: "util",
      area: "geral",
      riscoDefault: "MEDIO",
      fundamentoLegal: "",
      descricao: "",
      responsavelPadraoId: null,
      ativo: true,
      preConfigurada: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (rule: DeadlineRule) => {
    setEditingRule(rule);
    form.reset({
      nome: rule.nome,
      eventoGatilho: rule.eventoGatilho,
      dias: rule.dias,
      tipoDia: rule.tipoDia,
      area: rule.area,
      riscoDefault: rule.riscoDefault,
      fundamentoLegal: rule.fundamentoLegal || "",
      descricao: rule.descricao || "",
      responsavelPadraoId: rule.responsavelPadraoId || null,
      ativo: rule.ativo,
      preConfigurada: rule.preConfigurada,
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      fundamentoLegal: values.fundamentoLegal || null,
      descricao: values.descricao || null,
      responsavelPadraoId: values.responsavelPadraoId || null,
    };
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (rule: DeadlineRule) => {
    if (window.confirm(`Excluir regra "${rule.nome}"? Tarefas já geradas não serão afetadas.`)) {
      deleteMutation.mutate(rule.id);
    }
  };

  const filtered = rules.filter((r) =>
    r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getEventoLabel(r.eventoGatilho).toLowerCase().includes(searchTerm.toLowerCase()) ||
    getAreaLabel(r.area).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = rules.filter((r) => r.ativo).length;
  const preConfigCount = rules.filter((r) => r.preConfigurada).length;
  const criticoCount = rules.filter((r) => r.riscoDefault === "CRITICO" && r.ativo).length;

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando regras...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Regras de Prazos</h1>
          <p className="text-sm text-muted-foreground">
            Configure regras automáticas de prazo para eventos processuais
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setTriggerDialogOpen(true)}
            data-testid="button-trigger-engine"
          >
            <Zap className="w-4 h-4 mr-2" />
            Disparar Engine
          </Button>
          <Button
            className="bg-legal-status-active hover:bg-legal-status-active/90"
            onClick={openCreate}
            data-testid="button-new-rule"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Regra
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Regras Ativas</p>
            <p className="text-3xl font-bold text-green-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Pré-configuradas</p>
            <p className="text-3xl font-bold text-blue-600">{preConfigCount}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Risco Crítico</p>
            <p className="text-3xl font-bold text-red-600">{criticoCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-4 flex-wrap">
            <CardTitle className="text-base">Regras Cadastradas</CardTitle>
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Pesquisar regras..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-rule-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome / Fundamento</TableHead>
                <TableHead>Evento Gatilho</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((rule) => {
                const riscoInfo = getRiscoInfo(rule.riscoDefault);
                return (
                  <TableRow key={rule.id} data-testid={`row-rule-${rule.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {rule.nome}
                          {rule.preConfigurada && (
                            <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                              padrão
                            </Badge>
                          )}
                        </div>
                        {rule.fundamentoLegal && (
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {rule.fundamentoLegal}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {getEventoLabel(rule.eventoGatilho)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{rule.dias}</span>
                      <span className="text-muted-foreground text-sm ml-1">
                        dias {rule.tipoDia === "util" ? "úteis" : "corridos"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getAreaLabel(rule.area)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={riscoInfo.color}>
                        {riscoInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.ativo}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: rule.id, ativo: checked })
                        }
                        data-testid={`switch-rule-active-${rule.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(rule)}
                          data-testid={`button-edit-rule-${rule.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {!rule.preConfigurada && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(rule)}
                            data-testid={`button-delete-rule-${rule.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <div className="text-center py-8">
              <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhuma regra encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Nova/Editar Regra */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingRule(null); form.reset(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-rule">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Editar Regra de Prazo" : "Nova Regra de Prazo"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Regra</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Contestação — Citação Cível" {...field} data-testid="input-rule-nome" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="eventoGatilho"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Evento Gatilho</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-evento">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EVENTOS_GATILHO.map((e) => (
                            <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Área de Prática</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-area">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AREAS.map((a) => (
                            <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
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
                  name="dias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dias</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          data-testid="input-rule-dias"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tipoDia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Dia</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-tipo-dia">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="util">Dias Úteis</SelectItem>
                          <SelectItem value="corrido">Dias Corridos</SelectItem>
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
                  name="riscoDefault"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nível de Risco</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-risco">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RISCOS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="responsavelPadraoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável Padrão</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(v === NENHUM ? null : v)}
                        value={field.value || NENHUM}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-responsavel">
                            <SelectValue placeholder="Nenhum" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NENHUM}>Nenhum</SelectItem>
                          {equipe.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="fundamentoLegal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fundamento Legal</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Art. 335 CPC — 15 dias para contestar"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-rule-fundamento"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o prazo e suas implicações..."
                        {...field}
                        value={field.value || ""}
                        data-testid="textarea-rule-descricao"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-rule-ativo"
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Regra ativa</FormLabel>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending} data-testid="button-save-rule">
                  {isPending ? "Salvando..." : editingRule ? "Salvar" : "Criar Regra"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Disparar Engine */}
      <Dialog open={triggerDialogOpen} onOpenChange={setTriggerDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-trigger-engine">
          <DialogHeader>
            <DialogTitle>Disparar Engine de Prazos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Registre um evento processual para gerar automaticamente as tarefas com prazos calculados.
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium">Evento</label>
              <Select
                value={triggerForm.eventoGatilho}
                onValueChange={(v) => setTriggerForm({ ...triggerForm, eventoGatilho: v })}
              >
                <SelectTrigger data-testid="select-trigger-evento">
                  <SelectValue placeholder="Selecione o evento" />
                </SelectTrigger>
                <SelectContent>
                  {EVENTOS_GATILHO.map((e) => (
                    <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data do Evento</label>
              <Input
                type="date"
                value={triggerForm.dataEvento}
                onChange={(e) => setTriggerForm({ ...triggerForm, dataEvento: e.target.value })}
                data-testid="input-trigger-data"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Área (opcional)</label>
              <Select
                value={triggerForm.area || NENHUM}
                onValueChange={(v) => setTriggerForm({ ...triggerForm, area: v === NENHUM ? "" : v })}
              >
                <SelectTrigger data-testid="select-trigger-area">
                  <SelectValue placeholder="Todas as áreas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>Todas as áreas</SelectItem>
                  {AREAS.filter((a) => a.value !== "geral").map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTriggerDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => triggerMutation.mutate(triggerForm)}
              disabled={!triggerForm.eventoGatilho || triggerMutation.isPending}
              data-testid="button-confirm-trigger"
            >
              {triggerMutation.isPending ? "Gerando..." : "Gerar Tarefas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
