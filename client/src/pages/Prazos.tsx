import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertTriangle, Calendar, Clock, CheckCircle, Search, ChevronLeft, ChevronRight, Plus, Scale, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Prazo {
  id: string;
  processoId: string | null;
  tipo: string;
  descricao: string;
  fundamentoLegal: string | null;
  dataIntimacao: string;
  dataInicio: string;
  dataVencimento: string;
  diasTotais: number;
  diasUteis: boolean;
  status: string;
  prioridade: string;
  andamentoOrigem: string | null;
  responsavelId: string | null;
  observacoes: string | null;
}

const monthNames = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const daysOfWeek = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

const emptyForm = {
  tipo: "contestacao", descricao: "", fundamentoLegal: "", processoId: "", responsavelId: "",
  dataIntimacao: new Date().toISOString().split("T")[0],
  dataInicio: new Date().toISOString().split("T")[0],
  dataVencimento: "",
  diasTotais: 15, diasUteis: true,
  prioridade: "media", status: "pendente", andamentoOrigem: "", observacoes: "",
};

function prioridadeBadge(p: string) {
  if (p === "critica") return "bg-red-500 text-white";
  if (p === "alta") return "bg-orange-500 text-white";
  if (p === "media") return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-800";
}

function statusBadge(s: string) {
  if (s === "vencido") return "bg-red-100 text-red-800";
  if (s === "critico" || s === "proximo") return "bg-orange-100 text-orange-800";
  if (s === "cumprido") return "bg-green-100 text-green-800";
  if (s === "pendente") return "bg-blue-100 text-blue-800";
  return "bg-gray-100 text-gray-800";
}

function diasRestantes(dataVencimento: string) {
  const diff = Math.ceil((new Date(dataVencimento).getTime() - Date.now()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d atrasado`;
  if (diff === 0) return "Vence HOJE";
  if (diff === 1) return "Vence amanha";
  return `${diff} dias`;
}

export default function Prazos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [viewMode, setViewMode] = useState<"lista" | "calendario">("lista");
  const [calDate, setCalDate] = useState(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Prazo | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();

  const { data: prazos = [], isLoading } = useQuery<Prazo[]>({ queryKey: ["/api/prazos"] });
  const { data: processos = [] } = useQuery<any[]>({ queryKey: ["/api/processos"] });
  const { data: equipe = [] } = useQuery<any[]>({ queryKey: ["/api/equipe"] });
  const { data: feriados = [] } = useQuery<any[]>({ queryKey: ["/api/feriados"] });

  const getProcessoNumero = (id: string | null) => processos.find((p) => p.id === id)?.numero || "";
  const getResponsavel = (id: string | null) => equipe.find((e) => e.id === id)?.nome || "";

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/prazos", {
      ...data, processoId: data.processoId || null, responsavelId: data.responsavelId || null,
      diasTotais: Number(data.diasTotais), andamentoOrigem: data.andamentoOrigem || null,
      observacoes: data.observacoes || null, fundamentoLegal: data.fundamentoLegal || null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/prazos"] }); setDialogOpen(false); toast({ title: "Prazo criado" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => apiRequest("PATCH", `/api/prazos/${id}`, {
      ...data, processoId: data.processoId || null, responsavelId: data.responsavelId || null,
      diasTotais: Number(data.diasTotais), andamentoOrigem: data.andamentoOrigem || null,
      observacoes: data.observacoes || null, fundamentoLegal: data.fundamentoLegal || null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/prazos"] }); setDialogOpen(false); toast({ title: "Prazo atualizado" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/prazos/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/prazos"] }); setDeleteDialogOpen(false); toast({ title: "Prazo excluido" }); },
  });

  const marcarCumprido = useMutation({
    mutationFn: async (id: string) => { await apiRequest("PATCH", `/api/prazos/${id}`, { status: "cumprido" }); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/prazos"] }),
  });

  const openCreate = () => { setEditingItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (item: Prazo) => {
    setEditingItem(item);
    setForm({
      tipo: item.tipo, descricao: item.descricao, fundamentoLegal: item.fundamentoLegal || "",
      processoId: item.processoId || "", responsavelId: item.responsavelId || "",
      dataIntimacao: item.dataIntimacao, dataInicio: item.dataInicio, dataVencimento: item.dataVencimento,
      diasTotais: item.diasTotais, diasUteis: item.diasUteis,
      prioridade: item.prioridade, status: item.status,
      andamentoOrigem: item.andamentoOrigem || "", observacoes: item.observacoes || "",
    });
    setDialogOpen(true);
  };
  const openDelete = (id: string) => { setDeletingId(id); setDeleteDialogOpen(true); };
  const handleSubmit = () => { editingItem ? updateMutation.mutate({ id: editingItem.id, data: form }) : createMutation.mutate(form); };

  const filtered = useMemo(() => {
    return prazos.filter((p) => {
      const matchSearch = !searchTerm || p.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || getProcessoNumero(p.processoId).includes(searchTerm) || (p.fundamentoLegal || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "todos" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [prazos, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const hoje = new Date().toISOString().split("T")[0];
    return {
      total: prazos.length,
      vencidos: prazos.filter((p) => p.dataVencimento < hoje && p.status !== "cumprido").length,
      proximos: prazos.filter((p) => { const d = Math.ceil((new Date(p.dataVencimento).getTime() - Date.now()) / 86400000); return d >= 0 && d <= 5 && p.status !== "cumprido"; }).length,
      cumpridos: prazos.filter((p) => p.status === "cumprido").length,
    };
  }, [prazos]);

  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startDow = new Date(calYear, calMonth, 1).getDay();

  const calEvents = useMemo(() => {
    const map: Record<number, Prazo[]> = {};
    for (const p of prazos) {
      const d = new Date(p.dataVencimento);
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(p);
      }
    }
    return map;
  }, [prazos, calYear, calMonth]);

  const feriadosDays = useMemo(() => {
    const set = new Set<number>();
    for (const f of feriados) {
      const d = new Date(f.data || f.date || "");
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) set.add(d.getDate());
    }
    return set;
  }, [feriados, calYear, calMonth]);

  if (isLoading) return <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando prazos...</p></div>;

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Prazos Processuais</h1>
          <p className="text-sm text-muted-foreground">Controle automatico de prazos com calculo CPC</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "lista" ? "default" : "outline"} size="sm" onClick={() => setViewMode("lista")}>Lista</Button>
          <Button variant={viewMode === "calendario" ? "default" : "outline"} size="sm" onClick={() => setViewMode("calendario")}>Calendario</Button>
          <Button className="bg-legal-status-active hover:bg-legal-status-active/90" size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Novo Prazo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Scale className="w-4 h-4 text-blue-600" /><span className="text-sm text-muted-foreground">Total</span></div><p className="text-3xl font-bold text-blue-600">{stats.total}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-sm text-muted-foreground">Vencidos</span></div><p className="text-3xl font-bold text-red-600">{stats.vencidos}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-orange-600" /><span className="text-sm text-muted-foreground">Proximos (5d)</span></div><p className="text-3xl font-bold text-orange-600">{stats.proximos}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-sm text-muted-foreground">Cumpridos</span></div><p className="text-3xl font-bold text-green-600">{stats.cumpridos}</p></CardContent></Card>
      </div>

      {viewMode === "lista" ? (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="search" placeholder="Pesquisar prazos..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
              <TabsList>
                <TabsTrigger value="todos">Todos</TabsTrigger>
                <TabsTrigger value="pendente">Pendentes</TabsTrigger>
                <TabsTrigger value="proximo">Proximos</TabsTrigger>
                <TabsTrigger value="cumprido">Cumpridos</TabsTrigger>
              </TabsList>
            </Tabs>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Prazo</TableHead><TableHead>Fundamento</TableHead><TableHead>Processo</TableHead>
                <TableHead>Intimacao</TableHead><TableHead>Vencimento</TableHead><TableHead>Restante</TableHead>
                <TableHead>Prioridade</TableHead><TableHead>Status</TableHead><TableHead>Acoes</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((prazo) => (
                  <TableRow key={prazo.id}>
                    <TableCell>
                      <div><p className="font-medium text-sm">{prazo.descricao}</p>
                        {prazo.andamentoOrigem && <p className="text-xs text-muted-foreground truncate max-w-48">{prazo.andamentoOrigem}</p>}
                      </div>
                    </TableCell>
                    <TableCell><span className="font-mono text-xs">{prazo.fundamentoLegal}</span></TableCell>
                    <TableCell><span className="font-mono text-xs">{getProcessoNumero(prazo.processoId) || "-"}</span></TableCell>
                    <TableCell className="text-sm">{new Date(prazo.dataIntimacao).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-sm font-medium">{new Date(prazo.dataVencimento).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium ${prazo.dataVencimento < new Date().toISOString().split("T")[0] ? "text-red-600" : "text-green-600"}`}>{diasRestantes(prazo.dataVencimento)}</span>
                    </TableCell>
                    <TableCell><Badge className={prioridadeBadge(prazo.prioridade)}>{prazo.prioridade}</Badge></TableCell>
                    <TableCell><Badge className={statusBadge(prazo.status)}>{prazo.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {prazo.status !== "cumprido" && (
                          <Button variant="ghost" size="sm" onClick={() => marcarCumprido.mutate(prazo.id)}><CheckCircle className="w-3 h-3 mr-1" /> Cumprido</Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(prazo)}><Pencil className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => openDelete(prazo.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length === 0 && <div className="text-center py-8"><p className="text-muted-foreground">Nenhum prazo encontrado</p></div>}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Calendario de Prazos</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setCalDate(new Date())}>Hoje</Button>
                <Button variant="outline" size="sm" onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="text-center mb-4"><h3 className="text-xl font-semibold">{monthNames[calMonth]} de {calYear}</h3></div>
            <div className="grid grid-cols-7 border-t border-l">
              {daysOfWeek.map((d, i) => <div key={i} className="border-r border-b bg-muted p-2 text-center text-xs font-medium">{d}</div>)}
              {Array.from({ length: startDow }).map((_, i) => <div key={`e-${i}`} className="border-r border-b bg-muted/30 min-h-24" />)}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const dayPrazos = calEvents[day] || [];
                const isToday = new Date().getMonth() === calMonth && new Date().getFullYear() === calYear && day === new Date().getDate();
                return (
                  <div key={day} className={`border-r border-b min-h-24 p-1.5 bg-white ${isToday ? 'ring-2 ring-blue-400 ring-inset bg-blue-50' : ''}`}>
                    <div className={`text-xs font-medium mb-0.5 ${isToday ? 'text-blue-600 font-bold' : ''} ${feriadosDays.has(day) ? 'text-red-500' : ''}`}>{day}{feriadosDays.has(day) && <span className="ml-0.5 text-[8px] text-red-400" title="Feriado">F</span>}</div>
                    {dayPrazos.map((p, i) => (
                      <div key={i} className={`text-[10px] px-1 py-0.5 rounded mb-0.5 text-white truncate cursor-pointer ${p.prioridade === "critica" ? "bg-red-500" : p.prioridade === "alta" ? "bg-orange-500" : "bg-amber-500"}`} title={`${p.descricao} (${p.fundamentoLegal})`} onClick={() => openEdit(p)}>
                        {p.descricao}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500" /> Critica</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-orange-500" /> Alta</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-500" /> Media/Baixa</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CRUD Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Prazo" : "Novo Prazo"}</DialogTitle>
            <DialogDescription>Preencha os campos do prazo processual</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Descricao *</Label><Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Contestacao - Acao de Cobranca" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recurso">Recurso</SelectItem>
                    <SelectItem value="contestacao">Contestacao</SelectItem>
                    <SelectItem value="manifestacao">Manifestacao</SelectItem>
                    <SelectItem value="cumprimento">Cumprimento</SelectItem>
                    <SelectItem value="diligencia">Diligencia</SelectItem>
                    <SelectItem value="audiencia">Audiencia</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Fundamento Legal</Label><Input value={form.fundamentoLegal} onChange={e => setForm({ ...form, fundamentoLegal: e.target.value })} placeholder="Art. 335 CPC" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Data Intimacao *</Label><Input type="date" value={form.dataIntimacao} onChange={e => setForm({ ...form, dataIntimacao: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Data Inicio *</Label><Input type="date" value={form.dataInicio} onChange={e => setForm({ ...form, dataInicio: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2"><Label>Data Vencimento *</Label><Input type="date" value={form.dataVencimento} onChange={e => setForm({ ...form, dataVencimento: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Dias</Label><Input type="number" value={form.diasTotais} onChange={e => setForm({ ...form, diasTotais: Number(e.target.value) })} /></div>
              <div className="flex items-end gap-2 pb-2">
                <Checkbox checked={form.diasUteis} onCheckedChange={v => setForm({ ...form, diasUteis: !!v })} id="dias-uteis" />
                <Label htmlFor="dias-uteis" className="text-sm">Dias uteis</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={v => setForm({ ...form, prioridade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critica">Critica</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingItem && (
                <div className="grid gap-2"><Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="proximo">Proximo</SelectItem>
                      <SelectItem value="cumprido">Cumprido</SelectItem>
                      <SelectItem value="prorrogado">Prorrogado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
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
            <div className="grid gap-2"><Label>Observacoes</Label><Input value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.descricao || !form.dataIntimacao || !form.dataInicio || !form.dataVencimento}>{editingItem ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir prazo?</AlertDialogTitle><AlertDialogDescription>Esta acao nao pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && deleteMutation.mutate(deletingId)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
