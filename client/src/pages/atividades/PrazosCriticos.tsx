import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertTriangle, Clock, CheckCircle, Filter, RefreshCw, BookOpen, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Atividade, Equipe, Processo } from "@shared/schema";

const RISCO_CONFIG = {
  CRITICO: {
    label: "Crítico",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    border: "border-l-red-500",
    headerBg: "bg-red-50 dark:bg-red-900/10",
    icon: "🔴",
    order: 0,
  },
  ALTO: {
    label: "Alto",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    border: "border-l-orange-500",
    headerBg: "bg-orange-50 dark:bg-orange-900/10",
    icon: "🟠",
    order: 1,
  },
  MEDIO: {
    label: "Médio",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    border: "border-l-yellow-500",
    headerBg: "bg-yellow-50 dark:bg-yellow-900/10",
    icon: "🟡",
    order: 2,
  },
  BAIXO: {
    label: "Baixo",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    border: "border-l-green-500",
    headerBg: "bg-green-50 dark:bg-green-900/10",
    icon: "🟢",
    order: 3,
  },
};

function calcularHorasRestantes(dataStr: string): number {
  const vencimento = new Date(dataStr + "T23:59:59");
  const agora = new Date();
  return (vencimento.getTime() - agora.getTime()) / (1000 * 60 * 60);
}

function formatarHoras(horas: number): string {
  if (horas < 0) return "Vencido";
  if (horas < 24) return `${Math.floor(horas)}h restantes`;
  const dias = Math.floor(horas / 24);
  const horasRem = Math.floor(horas % 24);
  return `${dias}d ${horasRem}h restantes`;
}

interface PrazoCardProps {
  tarefa: Atividade;
  responsavelNome?: string;
  processoNumero?: string;
  onConcluir: (id: string) => void;
  isUpdating: boolean;
}

function PrazoCard({ tarefa, responsavelNome, processoNumero, onConcluir, isUpdating }: PrazoCardProps) {
  const risco = tarefa.risco || "MEDIO";
  const config = RISCO_CONFIG[risco as keyof typeof RISCO_CONFIG] || RISCO_CONFIG.MEDIO;
  const horas = calcularHorasRestantes(tarefa.data);
  const vencido = horas < 0;

  return (
    <Card
      className={`border-0 shadow-sm border-l-4 ${config.border}`}
      data-testid={`card-prazo-${tarefa.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{tarefa.titulo}</h4>
            {tarefa.fundamentoLegal && (
              <div className="flex items-center gap-1 mt-0.5">
                <BookOpen className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate">{tarefa.fundamentoLegal}</span>
              </div>
            )}
          </div>
          <Badge className={config.color}>
            {config.label}
          </Badge>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground mb-3">
          {processoNumero && (
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3 flex-shrink-0" />
              <span className="font-mono">{processoNumero}</span>
            </div>
          )}
          {responsavelNome && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3 flex-shrink-0" />
              <span>{responsavelNome}</span>
            </div>
          )}
          {tarefa.eventoGatilho && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 flex-shrink-0" />
              <span>Evento: {tarefa.eventoGatilho.replace(/_/g, " ")}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className={`text-xs font-medium ${vencido ? "text-red-600" : horas < 24 ? "text-orange-600" : "text-muted-foreground"}`}>
            <span>{new Date(tarefa.data + "T12:00:00").toLocaleDateString("pt-BR")}</span>
            <span className="mx-1">·</span>
            <span>{formatarHoras(horas)}</span>
          </div>
          {tarefa.status !== "Concluído" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onConcluir(tarefa.id)}
              disabled={isUpdating}
              title="Marcar como concluído"
              data-testid={`button-concluir-${tarefa.id}`}
            >
              <CheckCircle className="w-4 h-4 text-green-600" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PrazosCriticos() {
  const [janelaHoras, setJanelaHoras] = useState("72");
  const [filtroResponsavel, setFiltroResponsavel] = useState("todos");
  const [filtroProcesso, setFiltroProcesso] = useState("todos");
  const { toast } = useToast();

  const { data: prazos = [], isLoading, refetch } = useQuery<Atividade[]>({
    queryKey: ["/api/prazos-criticos", janelaHoras],
    queryFn: async () => {
      const res = await fetch(`/api/prazos-criticos?horas=${janelaHoras}`);
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: equipe = [] } = useQuery<Equipe[]>({
    queryKey: ["/api/equipe"],
  });

  const { data: processos = [] } = useQuery<Processo[]>({
    queryKey: ["/api/processos"],
  });

  const concludeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/atividades/${id}`, { status: "Concluído" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prazos-criticos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/atividades"] });
      toast({ title: "Prazo marcado como concluído" });
    },
    onError: () => {
      toast({ title: "Erro ao concluir prazo", variant: "destructive" });
    },
  });

  const getResponsavelNome = (id: string | null) => {
    const m = equipe.find((e) => e.id === id);
    return m?.nome;
  };

  const getProcessoNumero = (id: string | null) => {
    const p = processos.find((p) => p.id === id);
    return p?.numero;
  };

  const filtered = prazos.filter((t) => {
    const matchResp = filtroResponsavel === "todos" || t.responsavelId === filtroResponsavel;
    const matchProc = filtroProcesso === "todos" || t.processoId === filtroProcesso;
    return matchResp && matchProc;
  });

  const grouped = Object.entries(RISCO_CONFIG)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([risco, config]) => ({
      risco,
      config,
      tarefas: filtered.filter((t) => t.risco === risco),
    }))
    .filter((g) => g.tarefas.length > 0);

  const totalCritico = filtered.filter((t) => t.risco === "CRITICO").length;
  const totalAlto = filtered.filter((t) => t.risco === "ALTO").length;
  const vencendo24h = filtered.filter((t) => calcularHorasRestantes(t.data) <= 24 && calcularHorasRestantes(t.data) >= 0).length;

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Prazos Críticos</h1>
          <p className="text-sm text-muted-foreground">
            Tarefas com vencimento próximo geradas pela engine de prazos legais
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={janelaHoras} onValueChange={setJanelaHoras}>
            <SelectTrigger className="w-40" data-testid="select-janela-horas">
              <Clock className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24">Próximas 24h</SelectItem>
              <SelectItem value="48">Próximas 48h</SelectItem>
              <SelectItem value="72">Próximas 72h</SelectItem>
              <SelectItem value="168">Próxima semana</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Risco Crítico</p>
            <p className="text-3xl font-bold text-red-600">{totalCritico}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Risco Alto</p>
            <p className="text-3xl font-bold text-orange-600">{totalAlto}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Vencem em 24h</p>
            <p className="text-3xl font-bold text-yellow-600">{vencendo24h}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </CardTitle>
            <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}>
              <SelectTrigger className="w-48" data-testid="select-filtro-responsavel">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os responsáveis</SelectItem>
                {equipe.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroProcesso} onValueChange={setFiltroProcesso}>
              <SelectTrigger className="w-56" data-testid="select-filtro-processo">
                <SelectValue placeholder="Processo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os processos</SelectItem>
                {processos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.numero}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando prazos críticos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium mb-1">Nenhum prazo crítico!</h3>
            <p className="text-muted-foreground text-sm">
              Não há prazos urgentes nas próximas {janelaHoras} horas para os filtros selecionados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ risco, config, tarefas }) => (
            <div key={risco} data-testid={`section-risco-${risco}`}>
              <div className={`flex items-center gap-3 mb-3 p-3 rounded-md ${config.headerBg}`}>
                <AlertTriangle className={`w-5 h-5 ${risco === "CRITICO" ? "text-red-600" : risco === "ALTO" ? "text-orange-600" : risco === "MEDIO" ? "text-yellow-600" : "text-green-600"}`} />
                <h2 className="font-semibold">
                  Risco {config.label}
                </h2>
                <Badge className={config.color}>{tarefas.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tarefas.map((tarefa) => (
                  <PrazoCard
                    key={tarefa.id}
                    tarefa={tarefa}
                    responsavelNome={getResponsavelNome(tarefa.responsavelId)}
                    processoNumero={getProcessoNumero(tarefa.processoId)}
                    onConcluir={(id) => concludeMutation.mutate(id)}
                    isUpdating={concludeMutation.isPending}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
