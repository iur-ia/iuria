import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus, Briefcase, ChevronRight, Calendar, User,
  MoveRight, Trash2, Building2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AcervoProcesso } from "@shared/schema";

const FASES = [
  { id: "criacao", label: "Criação", color: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300" },
  { id: "instrucao", label: "Instrução", color: "bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-300" },
  { id: "decisao", label: "Decisão", color: "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300" },
  { id: "arquivamento", label: "Arquivamento", color: "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300" },
];

const TIPOS_ADMIN = [
  { value: "habilitacao", label: "Habilitação" },
  { value: "recurso", label: "Recurso" },
  { value: "contrato", label: "Contrato" },
  { value: "sindicancia", label: "Sindicância" },
  { value: "outro", label: "Outro" },
];

const FASE_LABEL: Record<string, string> = {
  criacao: "Criação",
  instrucao: "Instrução",
  decisao: "Decisão",
  arquivamento: "Arquivamento",
};

function KanbanCard({
  processo,
  onMover,
  onAbrir,
  onExcluir,
}: {
  processo: AcervoProcesso;
  onMover: (id: string, novaFase: string) => void;
  onAbrir: (p: AcervoProcesso) => void;
  onExcluir: (id: string) => void;
}) {
  const faseIdx = FASES.findIndex((f) => f.id === processo.fase);
  const proximaFase = FASES[faseIdx + 1];
  const tipoLabel = TIPOS_ADMIN.find((t) => t.value === processo.tipoAdministrativo)?.label || processo.tipoAdministrativo || "Outro";

  return (
    <Card
      className="cursor-pointer hover-elevate"
      onClick={() => onAbrir(processo)}
      data-testid={`kanban-card-${processo.id}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate" data-testid={`kanban-titulo-${processo.id}`}>
              {processo.titulo || processo.numero}
            </p>
            <Badge variant="outline" className="text-xs mt-1">{tipoLabel}</Badge>
          </div>
        </div>

        {processo.interessado && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" />
            {processo.interessado}
          </p>
        )}
        {processo.prazo && (
          <p className="text-xs flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <Calendar className="h-3 w-3" />
            Prazo: {new Date(processo.prazo).toLocaleDateString("pt-BR")}
          </p>
        )}

        <div className="flex items-center gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
          {proximaFase && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 flex-1"
              onClick={() => onMover(processo.id, proximaFase.id)}
              data-testid={`button-avancar-${processo.id}`}
            >
              <MoveRight className="h-3 w-3 mr-1" />
              {proximaFase.label}
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onExcluir(processo.id)}
            data-testid={`button-excluir-kanban-${processo.id}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProcessoAdministrativo() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [processoAberto, setProcessoAberto] = useState<AcervoProcesso | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    numero: `ADM-${Date.now()}`,
    tipoAdministrativo: "outro",
    interessado: "",
    prazo: "",
    observacoes: "",
    fase: "criacao",
  });

  const { data: processos = [], isLoading } = useQuery<AcervoProcesso[]>({
    queryKey: ["/api/acervo", "administrativo"],
    queryFn: async () => {
      const res = await fetch("/api/acervo?tipo=administrativo");
      return res.json();
    },
  });

  const criarMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/acervo", {
        ...form,
        tipo: "administrativo",
        statusInterno: "ativo",
        prazo: form.prazo || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acervo", "administrativo"] });
      setShowDialog(false);
      setForm({
        titulo: "", numero: `ADM-${Date.now()}`, tipoAdministrativo: "outro",
        interessado: "", prazo: "", observacoes: "", fase: "criacao",
      });
      toast({ title: "Processo administrativo criado" });
    },
    onError: () => toast({ title: "Erro ao criar processo", variant: "destructive" }),
  });

  const moverMutation = useMutation({
    mutationFn: async ({ id, fase }: { id: string; fase: string }) => {
      const res = await apiRequest("PATCH", `/api/acervo/${id}`, { fase });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acervo", "administrativo"] });
    },
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/acervo/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acervo", "administrativo"] });
      toast({ title: "Processo removido" });
    },
  });

  const porFase = (faseId: string) =>
    processos.filter((p) => (p.fase || "criacao") === faseId);

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-57px)] overflow-y-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-page-title">
            <Briefcase className="h-6 w-6 text-primary" />
            Processos Administrativos
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {processos.length} processo(s) em tramitação interna
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)} data-testid="button-novo-proc-admin">
          <Plus className="h-4 w-4 mr-1" />
          Novo Processo
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FASES.map((fase) => {
            const cards = porFase(fase.id);
            return (
              <div key={fase.id} className="space-y-3" data-testid={`coluna-${fase.id}`}>
                <div className={`p-3 rounded-md border ${fase.color}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{fase.label}</span>
                    <Badge variant="outline" className="text-xs">{cards.length}</Badge>
                  </div>
                </div>
                <div className="space-y-2 min-h-24">
                  {cards.map((p) => (
                    <KanbanCard
                      key={p.id}
                      processo={p}
                      onMover={(id, novaFase) => moverMutation.mutate({ id, fase: novaFase })}
                      onAbrir={setProcessoAberto}
                      onExcluir={(id) => excluirMutation.mutate(id)}
                    />
                  ))}
                  {cards.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-xs border border-dashed rounded-md">
                      Nenhum processo
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog Novo Processo */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg" data-testid="dialog-novo-proc-admin">
          <DialogHeader>
            <DialogTitle>Novo Processo Administrativo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="admin-titulo">Título *</Label>
              <Input
                id="admin-titulo"
                data-testid="input-admin-titulo"
                placeholder="Ex: Habilitação Empresa XYZ"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="admin-tipo">Tipo</Label>
                <Select value={form.tipoAdministrativo} onValueChange={(v) => setForm({ ...form, tipoAdministrativo: v })}>
                  <SelectTrigger id="admin-tipo" data-testid="select-admin-tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_ADMIN.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="admin-fase">Fase Inicial</Label>
                <Select value={form.fase} onValueChange={(v) => setForm({ ...form, fase: v })}>
                  <SelectTrigger id="admin-fase" data-testid="select-admin-fase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FASES.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="admin-interessado">Interessado</Label>
                <Input
                  id="admin-interessado"
                  data-testid="input-admin-interessado"
                  placeholder="Nome da parte"
                  value={form.interessado}
                  onChange={(e) => setForm({ ...form, interessado: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="admin-prazo">Prazo</Label>
                <Input
                  id="admin-prazo"
                  data-testid="input-admin-prazo"
                  type="date"
                  value={form.prazo}
                  onChange={(e) => setForm({ ...form, prazo: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="admin-obs">Observações</Label>
              <Textarea
                id="admin-obs"
                data-testid="textarea-admin-obs"
                placeholder="Descrição e observações do processo..."
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => criarMutation.mutate()}
              disabled={!form.titulo || criarMutation.isPending}
              data-testid="button-criar-proc-admin"
            >
              Criar Processo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog detalhes do processo aberto */}
      <Dialog open={!!processoAberto} onOpenChange={(open) => { if (!open) setProcessoAberto(null); }}>
        {processoAberto && (
          <DialogContent className="max-w-lg" data-testid="dialog-proc-admin-detalhe">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                {processoAberto.titulo || processoAberto.numero}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Tipo</p>
                  <p>{TIPOS_ADMIN.find(t => t.value === processoAberto.tipoAdministrativo)?.label || "Outro"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Fase Atual</p>
                  <p>{FASE_LABEL[processoAberto.fase || "criacao"] || processoAberto.fase}</p>
                </div>
                {processoAberto.interessado && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Interessado</p>
                    <p>{processoAberto.interessado}</p>
                  </div>
                )}
                {processoAberto.prazo && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Prazo</p>
                    <p className="text-amber-600 dark:text-amber-400">
                      {new Date(processoAberto.prazo).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                )}
              </div>
              {processoAberto.observacoes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">Observações</p>
                  <p className="text-sm whitespace-pre-wrap mt-1">{processoAberto.observacoes}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Avançar para</p>
                <div className="flex gap-2 flex-wrap">
                  {FASES.filter(f => f.id !== processoAberto.fase).map(fase => (
                    <Button
                      key={fase.id}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        moverMutation.mutate({ id: processoAberto.id, fase: fase.id });
                        setProcessoAberto({ ...processoAberto, fase: fase.id });
                      }}
                      data-testid={`button-mover-${fase.id}`}
                    >
                      {fase.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setProcessoAberto(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
