import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import {
  Briefcase, AlertCircle, Clock, DollarSign, TrendingDown,
  Bell, Eye, RefreshCw, AlertTriangle, CheckCircle2,
  ChevronRight, Activity, Zap, Printer,
} from "lucide-react";

interface DashboardKPI {
  processos: {
    total: number;
    ativos: number;
    porArea: { area: string; total: number }[];
    semMovimentacao30d: number;
  };
  atividades: {
    total: number;
    atrasadas: number;
    vencendo7d: number;
    vencendoPeriodo: number;
    concluidas: number;
    porRisco: { CRITICO: number; ALTO: number; MEDIO: number; BAIXO: number };
  };
  financeiro: {
    totalReceber: number;
    totalPagarPeriodo: number;
    totalRecebidoPeriodo: number;
    honorariosPendentes: number;
  };
  mapaRisco: {
    id: string;
    titulo: string;
    risco: string | null;
    data: string;
    tipo: string;
  }[];
  acompanhados: {
    total: number;
    comNovosAndamentos: number;
  };
  periodo: string;
  periodoLabel: string;
  geradoEm: string;
}

type Periodo = "semana" | "mes" | "trimestre";

const PERIODO_LABELS: Record<Periodo, string> = {
  semana: "7 dias",
  mes: "30 dias",
  trimestre: "90 dias",
};

const AREA_COLORS = [
  "#8b5cf6", "#3b82f6", "#10b981", "#f97316", "#ec4899", "#f59e0b",
];

const RISCO_CONFIG: Record<string, { label: string; cls: string; icon: typeof AlertCircle }> = {
  CRITICO: { label: "Crítico", cls: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900", icon: Zap },
  ALTO:    { label: "Alto",    cls: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-900", icon: AlertTriangle },
  MEDIO:   { label: "Médio",  cls: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-200 dark:border-yellow-900", icon: AlertCircle },
  BAIXO:   { label: "Baixo",  cls: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-900", icon: CheckCircle2 },
};

function fmt(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}k`;
  return `R$ ${value.toFixed(0)}`;
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
  badgeColor,
  href,
  loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Briefcase;
  iconColor: string;
  badgeColor?: string;
  href?: string;
  loading?: boolean;
}) {
  const [, navigate] = useLocation();
  return (
    <Card
      className={`border-0 shadow-sm ${href ? "cursor-pointer hover-elevate" : ""}`}
      onClick={href ? () => navigate(href) : undefined}
      data-testid={`kpi-card-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className={`p-2 rounded-md ${iconColor}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-20 mb-1" />
        ) : (
          <p
            className="text-3xl font-bold text-foreground mb-1"
            data-testid={`kpi-value-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {value}
          </p>
        )}
        {sub && (
          <p className={`text-xs ${badgeColor ?? "text-muted-foreground"}`}>{sub}</p>
        )}
        {href && (
          <div className="flex items-center gap-1 mt-2 text-xs text-primary">
            <span>Ver detalhes</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RiscoBadge({ risco }: { risco: string | null }) {
  const cfg = risco ? RISCO_CONFIG[risco] : null;
  if (!cfg) return <Badge variant="secondary">—</Badge>;
  const Icon = cfg.icon;
  return (
    <Badge className={`${cfg.cls} gap-1 border shrink-0`} variant="secondary">
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

export default function Dashboard() {
  const [periodo, setPeriodo] = useState<Periodo>(() => {
    return (sessionStorage.getItem("dashboard_periodo") as Periodo) || "mes";
  });

  useEffect(() => {
    sessionStorage.setItem("dashboard_periodo", periodo);
  }, [periodo]);

  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useQuery<DashboardKPI>({
    queryKey: ["/api/dashboard/kpis", periodo],
    queryFn: () =>
      fetch(`/api/dashboard/kpis?periodo=${periodo}`).then((r) => r.json()),
    refetchInterval: 5 * 60 * 1000,
  });

  const [, navigate] = useLocation();

  const geradoEm = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  const periodoLbl = PERIODO_LABELS[periodo];

  const riscoData = data
    ? [
        { name: "Crítico", value: data.atividades.porRisco.CRITICO, color: "#ef4444" },
        { name: "Alto",    value: data.atividades.porRisco.ALTO,    color: "#f97316" },
        { name: "Médio",   value: data.atividades.porRisco.MEDIO,   color: "#eab308" },
        { name: "Baixo",   value: data.atividades.porRisco.BAIXO,   color: "#22c55e" },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="min-h-screen bg-muted/30 print:bg-white">
      <div className="p-6 space-y-6 print:p-4 print:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
          <div>
            <h1
              className="text-2xl font-semibold text-foreground"
              data-testid="text-dashboard-titulo"
            >
              Painel de Controle
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Visão operacional em tempo real do escritório
              {geradoEm && ` · Atualizado às ${geradoEm}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Period Filter */}
            <div
              className="flex items-center rounded-md border bg-background overflow-hidden"
              data-testid="filtro-periodo"
            >
              {(["semana", "mes", "trimestre"] as Periodo[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    periodo === p
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                  data-testid={`filtro-${p}`}
                >
                  {PERIODO_LABELS[p]}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              data-testid="button-exportar-pdf"
            >
              <Printer className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              data-testid="button-atualizar-dashboard"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Print-only header */}
        <div className="hidden print:block">
          <h1 className="text-xl font-bold">Painel de Controle — LegalSys</h1>
          <p className="text-sm text-gray-500">
            Período: {periodoLbl} · Gerado em {new Date().toLocaleString("pt-BR")}
          </p>
        </div>

        {/* KPI Cards — Operacional */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Operacional
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 print:grid-cols-3">
            <KpiCard
              label="Processos Ativos"
              value={isLoading ? "…" : (data?.processos.ativos ?? 0)}
              sub={`de ${data?.processos.total ?? 0} no total`}
              icon={Briefcase}
              iconColor="bg-blue-500"
              href="/processos"
              loading={isLoading}
            />
            <KpiCard
              label="Tarefas Atrasadas"
              value={isLoading ? "…" : (data?.atividades.atrasadas ?? 0)}
              sub={data?.atividades.atrasadas ? "Requer atenção imediata" : "Tudo em dia"}
              icon={AlertCircle}
              iconColor={data?.atividades.atrasadas ? "bg-red-500" : "bg-green-500"}
              badgeColor={data?.atividades.atrasadas ? "text-red-600" : "text-green-600"}
              href="/atividades"
              loading={isLoading}
            />
            <KpiCard
              label="Prazos em 7 dias"
              value={isLoading ? "…" : (data?.atividades.vencendo7d ?? 0)}
              sub={`${data?.atividades.vencendoPeriodo ?? 0} em ${periodoLbl}`}
              icon={Clock}
              iconColor="bg-amber-500"
              href="/atividades"
              loading={isLoading}
            />
            <KpiCard
              label="Sem Movimentação"
              value={isLoading ? "…" : (data?.processos.semMovimentacao30d ?? 0)}
              sub="Processos parados +30 dias"
              icon={Activity}
              iconColor="bg-slate-500"
              href="/processos/parados"
              loading={isLoading}
            />
            <KpiCard
              label="Risco Crítico/Alto"
              value={
                isLoading
                  ? "…"
                  : (data?.atividades.porRisco.CRITICO ?? 0) + (data?.atividades.porRisco.ALTO ?? 0)
              }
              sub={`${data?.atividades.porRisco.CRITICO ?? 0} crítico · ${data?.atividades.porRisco.ALTO ?? 0} alto`}
              icon={AlertTriangle}
              iconColor="bg-orange-500"
              badgeColor={
                ((data?.atividades.porRisco.CRITICO ?? 0) + (data?.atividades.porRisco.ALTO ?? 0)) > 0
                  ? "text-orange-600"
                  : "text-muted-foreground"
              }
              href="/atividades/prazos-criticos"
              loading={isLoading}
            />
            <KpiCard
              label="Acompanhados"
              value={isLoading ? "…" : (data?.acompanhados.total ?? 0)}
              sub={
                data?.acompanhados.comNovosAndamentos
                  ? `${data.acompanhados.comNovosAndamentos} com novos andamentos`
                  : "Nenhum alerta pendente"
              }
              icon={Bell}
              iconColor={data?.acompanhados.comNovosAndamentos ? "bg-red-500" : "bg-violet-500"}
              badgeColor={
                data?.acompanhados.comNovosAndamentos ? "text-red-600" : "text-muted-foreground"
              }
              href="/acompanhamentos"
              loading={isLoading}
            />
          </div>
        </div>

        {/* KPI Cards — Financeiro */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Financeiro · <span className="normal-case font-normal">{periodoLbl}</span>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4">
            <KpiCard
              label="A Receber"
              value={isLoading ? "…" : fmt(data?.financeiro.totalReceber ?? 0)}
              sub={`${data?.financeiro.honorariosPendentes ?? 0} cobranças pendentes`}
              icon={DollarSign}
              iconColor="bg-blue-500"
              href="/financeiro/receber"
              loading={isLoading}
            />
            <KpiCard
              label={`Recebido (${periodoLbl})`}
              value={isLoading ? "…" : fmt(data?.financeiro.totalRecebidoPeriodo ?? 0)}
              sub={`Honorários pagos nos últimos ${periodoLbl}`}
              icon={DollarSign}
              iconColor="bg-emerald-500"
              badgeColor="text-emerald-600"
              href="/financeiro/receber"
              loading={isLoading}
            />
            <KpiCard
              label={`A Pagar (${periodoLbl})`}
              value={isLoading ? "…" : fmt(data?.financeiro.totalPagarPeriodo ?? 0)}
              sub={`Vencendo nos próximos ${periodoLbl}`}
              icon={TrendingDown}
              iconColor="bg-orange-500"
              href="/financeiro/pagar"
              loading={isLoading}
            />
            <KpiCard
              label="Honorários Ativos"
              value={isLoading ? "…" : (data?.financeiro.honorariosPendentes ?? 0)}
              sub="Faturas em aberto"
              icon={Eye}
              iconColor="bg-purple-500"
              href="/financeiro/honorarios"
              loading={isLoading}
            />
          </div>
        </div>

        {/* Middle: Mapa de Risco + Processos por Área */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mapa de Risco */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                Mapa de Risco
                <Badge variant="secondary" className="ml-auto">
                  Atrasadas + próximos {periodoLbl}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (data?.mapaRisco.length ?? 0) === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-green-500 mb-2 opacity-60" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma atividade de risco crítico/alto pendente
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {(data?.mapaRisco ?? []).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-md bg-muted/40 cursor-pointer hover-elevate"
                      onClick={() => navigate("/atividades")}
                      data-testid={`risco-item-${item.id}`}
                    >
                      <RiscoBadge risco={item.risco} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.titulo}</p>
                        <p className="text-xs text-muted-foreground">{item.tipo}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 font-mono">
                        {new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 print:hidden"
                onClick={() => navigate("/atividades/prazos-criticos")}
                data-testid="button-ver-prazos-criticos"
              >
                Ver todos os prazos críticos
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Processos por Área */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-500" />
                Processos por Área de Prática
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-52 w-full" />
              ) : (data?.processos.porArea.length ?? 0) === 0 ? (
                <div className="py-8 text-center">
                  <Briefcase className="w-10 h-10 mx-auto text-muted-foreground mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">Nenhum processo cadastrado</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={data?.processos.porArea ?? []}
                    layout="vertical"
                    margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
                  >
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="area"
                      width={90}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))" }}
                      contentStyle={{ fontSize: 12, borderRadius: 6 }}
                      formatter={(v: number) => [v, "processos"]}
                    />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                      {(data?.processos.porArea ?? []).map((_, i) => (
                        <Cell key={i} fill={AREA_COLORS[i % AREA_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom: Distribuição de Risco + Resumo Operacional */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribuição de Risco (Pie) */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-500" />
                Distribuição por Nível de Risco
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : riscoData.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-green-500 mb-2 opacity-60" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma atividade de risco mapeada
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={riscoData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {riscoData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 6 }}
                      formatter={(v: number, name: string) => [v, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Resumo Operacional */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumo Operacional</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    label: "Tarefas concluídas",
                    value: data?.atividades.concluidas ?? 0,
                    total: data?.atividades.total ?? 0,
                    color: "bg-emerald-500",
                    pct: data
                      ? Math.round(
                          (data.atividades.concluidas / Math.max(data.atividades.total, 1)) * 100
                        )
                      : 0,
                  },
                  {
                    label: "Prazo de cumprimento",
                    value:
                      (data?.atividades.total ?? 0) - (data?.atividades.atrasadas ?? 0),
                    total: data?.atividades.total ?? 0,
                    color: "bg-blue-500",
                    pct: data
                      ? Math.max(
                          0,
                          100 -
                            Math.round(
                              (data.atividades.atrasadas /
                                Math.max(data.atividades.total, 1)) *
                                100
                            )
                        )
                      : 0,
                  },
                  {
                    label: "Processos ativos",
                    value: data?.processos.ativos ?? 0,
                    total: data?.processos.total ?? 0,
                    color: "bg-violet-500",
                    pct: data
                      ? Math.round(
                          (data.processos.ativos / Math.max(data.processos.total, 1)) * 100
                        )
                      : 0,
                  },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold tabular-nums">
                        {isLoading ? "…" : `${item.value} / ${item.total}`}
                        {!isLoading && (
                          <span className="text-muted-foreground font-normal ml-1.5">
                            ({item.pct}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full">
                      {!isLoading && (
                        <div
                          className={`h-2 rounded-full transition-all ${item.color}`}
                          style={{ width: `${Math.min(item.pct, 100)}%` }}
                        />
                      )}
                    </div>
                  </div>
                ))}

                <div className="pt-2 grid grid-cols-2 gap-2 border-t print:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/atividades")}
                    data-testid="button-ir-atividades"
                  >
                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                    Atividades
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/processos")}
                    data-testid="button-ir-processos"
                  >
                    <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                    Processos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
