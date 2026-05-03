import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, AreaChart, Area, CartesianGrid,
} from "recharts";
import {
  Briefcase, AlertCircle, Clock, DollarSign, TrendingDown,
  Bell, Eye, RefreshCw, AlertTriangle, CheckCircle2,
  ChevronRight, Activity, Zap, Printer, Download,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RiscoItem {
  id: string;
  titulo: string;
  risco: string | null;
  data: string;
  tipo: string;
  processoNumero: string | null;
  area: string | null;
  responsavel: string | null;
  valorCausa: string | null;
  diasAtraso: number;
  score: number;
}

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
    honorariosPorStatus: Record<string, number>;
  };
  mapaRisco: RiscoItem[];
  trendFinanceiro: { mes: string; label: string; recebido: number; pago: number; aVencer: number }[];
  tarefasPorSemana: { label: string; concluidas: number; abertas: number }[];
  acompanhados: { total: number; comNovosAndamentos: number };
  filtros: { areas: string[]; equipe: { id: string; nome: string }[] };
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

const AREA_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f97316", "#ec4899", "#f59e0b"];

const RISCO_CFG: Record<string, { label: string; cls: string; icon: typeof AlertCircle }> = {
  CRITICO: { label: "Crítico", cls: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900", icon: Zap },
  ALTO:    { label: "Alto",    cls: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-900", icon: AlertTriangle },
  MEDIO:   { label: "Médio",  cls: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-200 dark:border-yellow-900", icon: AlertCircle },
  BAIXO:   { label: "Baixo",  cls: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-900", icon: CheckCircle2 },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(1)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function exportCSV(data: DashboardKPI) {
  const rows: string[][] = [
    ["=== KPIs Operacionais ==="],
    ["Métrica", "Valor"],
    ["Processos Ativos", String(data.processos.ativos)],
    ["Total Processos", String(data.processos.total)],
    ["Tarefas Atrasadas", String(data.atividades.atrasadas)],
    ["Prazos 7 dias", String(data.atividades.vencendo7d)],
    ["Processos sem movimentação +30d", String(data.processos.semMovimentacao30d)],
    [],
    ["=== KPIs Financeiros ==="],
    ["A Receber (total)", fmt(data.financeiro.totalReceber)],
    [`Recebido (${data.periodoLabel})`, fmt(data.financeiro.totalRecebidoPeriodo)],
    [`A Pagar (${data.periodoLabel})`, fmt(data.financeiro.totalPagarPeriodo)],
    ["Honorários Pendentes (qtd)", String(data.financeiro.honorariosPendentes)],
    [],
    ["=== Mapa de Risco ==="],
    ["Título", "Risco", "Score", "Tipo", "Data", "Processo", "Área", "Dias Atraso", "Responsável"],
    ...data.mapaRisco.map((r) => [
      r.titulo, r.risco ?? "", String(r.score), r.tipo, r.data,
      r.processoNumero ?? "", r.area ?? "", String(r.diasAtraso), r.responsavel ?? "",
    ]),
    [],
    ["=== Processos por Área ==="],
    ["Área", "Total"],
    ...data.processos.porArea.map((p) => [p.area, String(p.total)]),
    [],
    ["=== Tendência Financeira (6 meses) ==="],
    ["Mês", "Recebido", "Pago", "A Vencer"],
    ...data.trendFinanceiro.map((t) => [t.label, fmt(t.recebido), fmt(t.pago), fmt(t.aVencer)]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dashboard-kpis-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RiscoBadge({ risco }: { risco: string | null }) {
  const cfg = risco ? RISCO_CFG[risco] : null;
  if (!cfg) return <Badge variant="secondary">—</Badge>;
  const Icon = cfg.icon;
  return (
    <Badge className={`${cfg.cls} gap-1 border shrink-0 no-default-active-elevate`} variant="secondary">
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

function ScoreDot({ score }: { score: number }) {
  const color = score >= 7 ? "bg-red-500" : score >= 5 ? "bg-orange-500" : score >= 3 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-1 shrink-0">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-muted-foreground tabular-nums">{score}</span>
    </div>
  );
}

function KpiCard({
  label, value, sub, icon: Icon, iconColor, badgeColor, href, loading, drillFilter, onNavigate,
}: {
  label: string; value: string | number; sub?: string;
  icon: typeof Briefcase; iconColor: string; badgeColor?: string;
  href?: string; loading?: boolean; drillFilter?: string;
  onNavigate?: (href: string, drillFilter?: string) => void;
}) {
  const handleClick = () => {
    if (!href || !onNavigate) return;
    onNavigate(href, drillFilter);
  };
  return (
    <Card
      className={`border-0 shadow-sm ${href ? "cursor-pointer hover-elevate" : ""}`}
      onClick={href ? handleClick : undefined}
      data-testid={`kpi-card-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground leading-tight">{label}</p>
          <div className={`p-2 rounded-md ${iconColor} shrink-0`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-20 mb-1" />
        ) : (
          <p className="text-3xl font-bold text-foreground mb-1 tabular-nums"
             data-testid={`kpi-value-${label.toLowerCase().replace(/\s+/g, "-")}`}>
            {value}
          </p>
        )}
        {sub && <p className={`text-xs ${badgeColor ?? "text-muted-foreground"}`}>{sub}</p>}
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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const [periodo, setPeriodo] = useState<Periodo>(() => (sessionStorage.getItem("dashboard_periodo") as Periodo) || "mes");
  const [area, setArea]       = useState(() => sessionStorage.getItem("dashboard_area") || "");
  const [resp, setResp]       = useState(() => sessionStorage.getItem("dashboard_resp") || "");

  useEffect(() => { sessionStorage.setItem("dashboard_periodo", periodo); }, [periodo]);
  useEffect(() => { sessionStorage.setItem("dashboard_area",    area);    }, [area]);
  useEffect(() => { sessionStorage.setItem("dashboard_resp",    resp);    }, [resp]);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams({ periodo });
    if (area) params.set("area", area);
    if (resp) params.set("responsavel", resp);
    return `/api/dashboard/kpis?${params}`;
  }, [periodo, area, resp]);

  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useQuery<DashboardKPI>({
    queryKey: ["/api/dashboard/kpis", periodo, area, resp],
    queryFn: () => fetch(buildUrl()).then((r) => r.json()),
    refetchInterval: 5 * 60 * 1000,
  });

  const [, navigate] = useLocation();

  const handleNavigate = (href: string, drillFilter?: string) => {
    if (drillFilter) sessionStorage.setItem("dashboard_drill_filter", drillFilter);
    navigate(href);
  };

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

  const hasActiveFilter = !!area || !!resp;

  return (
    <div className="min-h-screen bg-muted/30 print:bg-white">
      <div className="p-6 space-y-6 print:p-4 print:space-y-4 max-w-screen-2xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-start justify-between flex-wrap gap-3 print:hidden">
          <div>
            <h1 className="text-2xl font-semibold text-foreground" data-testid="text-dashboard-titulo">
              Painel de Controle
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Visão operacional em tempo real{hasActiveFilter && " · Filtro ativo"}
              {geradoEm && ` · Atualizado às ${geradoEm}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Period filter */}
            <div className="flex items-center rounded-md border bg-background overflow-hidden" data-testid="filtro-periodo">
              {(["semana", "mes", "trimestre"] as Periodo[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    periodo === p ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted"
                  }`}
                  data-testid={`filtro-${p}`}
                >
                  {PERIODO_LABELS[p]}
                </button>
              ))}
            </div>

            {/* Area filter */}
            <Select value={area || "todos"} onValueChange={(v) => setArea(v === "todos" ? "" : v)}>
              <SelectTrigger className="w-36" data-testid="filtro-area">
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Áreas</SelectItem>
                {(data?.filtros?.areas ?? []).map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Responsavel filter */}
            <Select value={resp || "todos"} onValueChange={(v) => setResp(v === "todos" ? "" : v)}>
              <SelectTrigger className="w-44" data-testid="filtro-responsavel">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Responsáveis</SelectItem>
                {(data?.filtros?.equipe ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilter && (
              <Button variant="ghost" size="sm" onClick={() => { setArea(""); setResp(""); }} data-testid="button-limpar-filtros">
                Limpar filtros
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={() => data && exportCSV(data)} disabled={isLoading} data-testid="button-exportar-csv">
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} data-testid="button-exportar-pdf">
              <Printer className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} data-testid="button-atualizar-dashboard">
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Print header */}
        <div className="hidden print:block">
          <h1 className="text-xl font-bold">Painel de Controle — LegalSys</h1>
          <p className="text-sm text-gray-500">
            Período: {periodoLbl}{area && ` · Área: ${area}`}{resp && ` · Responsável`} · Gerado em {new Date().toLocaleString("pt-BR")}
          </p>
        </div>

        {/* ── Operacional KPIs ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Operacional</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 print:grid-cols-3">
            <KpiCard label="Processos Ativos" value={isLoading ? "…" : (data?.processos.ativos ?? 0)}
              sub={`de ${data?.processos.total ?? 0} no total`} icon={Briefcase} iconColor="bg-blue-500"
              href="/processos" drillFilter="Ativo" loading={isLoading} onNavigate={handleNavigate} />
            <KpiCard label="Tarefas Atrasadas" value={isLoading ? "…" : (data?.atividades.atrasadas ?? 0)}
              sub={data?.atividades.atrasadas ? "Requer atenção imediata" : "Tudo em dia"}
              icon={AlertCircle}
              iconColor={data?.atividades.atrasadas ? "bg-red-500" : "bg-green-500"}
              badgeColor={data?.atividades.atrasadas ? "text-red-600" : "text-green-600"}
              href="/atividades" drillFilter="Atrasado" loading={isLoading} onNavigate={handleNavigate} />
            <KpiCard label="Prazos em 7 dias" value={isLoading ? "…" : (data?.atividades.vencendo7d ?? 0)}
              sub={`${data?.atividades.vencendoPeriodo ?? 0} em ${periodoLbl}`}
              icon={Clock} iconColor="bg-amber-500" href="/atividades" loading={isLoading} onNavigate={handleNavigate} />
            <KpiCard label="Sem Movimentação" value={isLoading ? "…" : (data?.processos.semMovimentacao30d ?? 0)}
              sub="Processos parados +30 dias" icon={Activity} iconColor="bg-slate-500"
              href="/processos/parados" drillFilter="Parado" loading={isLoading} onNavigate={handleNavigate} />
            <KpiCard
              label="Risco Crítico/Alto"
              value={isLoading ? "…" : ((data?.atividades.porRisco.CRITICO ?? 0) + (data?.atividades.porRisco.ALTO ?? 0))}
              sub={`${data?.atividades.porRisco.CRITICO ?? 0} crítico · ${data?.atividades.porRisco.ALTO ?? 0} alto`}
              icon={AlertTriangle} iconColor="bg-orange-500"
              badgeColor={((data?.atividades.porRisco.CRITICO ?? 0) + (data?.atividades.porRisco.ALTO ?? 0)) > 0 ? "text-orange-600" : "text-muted-foreground"}
              href="/atividades/prazos-criticos" loading={isLoading} onNavigate={handleNavigate} />
            <KpiCard label="Acompanhados" value={isLoading ? "…" : (data?.acompanhados.total ?? 0)}
              sub={data?.acompanhados.comNovosAndamentos ? `${data.acompanhados.comNovosAndamentos} com novos andamentos` : "Nenhum alerta pendente"}
              icon={Bell}
              iconColor={data?.acompanhados.comNovosAndamentos ? "bg-red-500" : "bg-violet-500"}
              badgeColor={data?.acompanhados.comNovosAndamentos ? "text-red-600" : "text-muted-foreground"}
              href="/acompanhamentos" loading={isLoading} onNavigate={handleNavigate} />
          </div>
        </div>

        {/* ── Financeiro KPIs ── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Financeiro · <span className="normal-case font-normal">{periodoLbl}</span>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4">
            <KpiCard label="A Receber" value={isLoading ? "…" : fmt(data?.financeiro.totalReceber ?? 0)}
              sub={`${data?.financeiro.honorariosPendentes ?? 0} cobranças pendentes`}
              icon={DollarSign} iconColor="bg-blue-500" href="/financeiro/receber" loading={isLoading} onNavigate={handleNavigate} />
            <KpiCard label={`Recebido (${periodoLbl})`} value={isLoading ? "…" : fmt(data?.financeiro.totalRecebidoPeriodo ?? 0)}
              sub={`Honorários pagos nos últimos ${periodoLbl}`}
              icon={DollarSign} iconColor="bg-emerald-500" badgeColor="text-emerald-600"
              href="/financeiro/receber" loading={isLoading} onNavigate={handleNavigate} />
            <KpiCard label={`A Pagar (${periodoLbl})`} value={isLoading ? "…" : fmt(data?.financeiro.totalPagarPeriodo ?? 0)}
              sub={`Vencendo nos próximos ${periodoLbl}`}
              icon={TrendingDown} iconColor="bg-orange-500" href="/financeiro/pagar" loading={isLoading} onNavigate={handleNavigate} />
            <KpiCard label="Honorários em Aberto" value={isLoading ? "…" : (data?.financeiro.honorariosPendentes ?? 0)}
              sub={isLoading ? "" : `Pendente: ${fmt(data?.financeiro.honorariosPorStatus?.["Pendente"] ?? 0)}`}
              icon={Eye} iconColor="bg-purple-500" href="/financeiro/honorarios" loading={isLoading} onNavigate={handleNavigate} />
          </div>
        </div>

        {/* ── Mapa de Risco + Processos por Área ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mapa de Risco */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                Mapa de Risco Composto
                <Badge variant="secondary" className="ml-auto no-default-active-elevate">
                  Score = prazo + valor + movimento
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (data?.mapaRisco.length ?? 0) === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-green-500 mb-2 opacity-60" />
                  <p className="text-sm text-muted-foreground">Nenhum risco crítico/alto no período</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {(data?.mapaRisco ?? []).map((item) => (
                    <div key={item.id}
                      className="flex items-center gap-2 p-2 rounded-md bg-muted/40 cursor-pointer hover-elevate"
                      onClick={() => navigate("/atividades")}
                      data-testid={`risco-item-${item.id}`}
                    >
                      <RiscoBadge risco={item.risco} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.titulo}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.tipo}{item.area ? ` · ${item.area}` : ""}{item.diasAtraso > 0 ? ` · ${item.diasAtraso}d atraso` : ""}
                        </p>
                      </div>
                      <ScoreDot score={item.score} />
                      <span className="text-xs text-muted-foreground shrink-0 font-mono">
                        {new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" size="sm" className="w-full mt-3 print:hidden"
                onClick={() => navigate("/atividades/prazos-criticos")}
                data-testid="button-ver-prazos-criticos">
                Ver todos os prazos críticos <ChevronRight className="w-4 h-4 ml-1" />
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
              {isLoading ? <Skeleton className="h-52 w-full" />
              : (data?.processos.porArea.length ?? 0) === 0 ? (
                <div className="py-8 text-center">
                  <Briefcase className="w-10 h-10 mx-auto text-muted-foreground mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">Nenhum processo cadastrado</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data?.processos.porArea ?? []} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="area" width={90} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ fontSize: 12, borderRadius: 6 }} formatter={(v: number) => [v, "processos"]} />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                      {(data?.processos.porArea ?? []).map((_, i) => <Cell key={i} fill={AREA_COLORS[i % AREA_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Tendência Financeira + Tarefas por Semana ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tendência Financeira 6 meses */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Receita vs Despesa — Últimos 6 Meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-48 w-full" />
              : (data?.trendFinanceiro.every((t) => t.recebido === 0 && t.pago === 0)) ? (
                <div className="py-8 text-center">
                  <DollarSign className="w-10 h-10 mx-auto text-muted-foreground mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">Nenhum dado financeiro registrado</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data?.trendFinanceiro ?? []} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                    <defs>
                      <linearGradient id="gradRec" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradPag" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} width={40} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} formatter={(v: number, name: string) => [fmt(v), name === "recebido" ? "Recebido" : name === "pago" ? "Pago" : "A Vencer"]} />
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v === "recebido" ? "Recebido" : v === "pago" ? "Pago" : "A Vencer"}</span>} />
                    <Area type="monotone" dataKey="recebido" stroke="#10b981" strokeWidth={2} fill="url(#gradRec)" dot={false} />
                    <Area type="monotone" dataKey="pago" stroke="#f97316" strokeWidth={2} fill="url(#gradPag)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Tarefas por Semana */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-500" />
                Tarefas Concluídas vs Abertas — Por Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-48 w-full" />
              : (data?.tarefasPorSemana.every((s) => s.concluidas === 0 && s.abertas === 0)) ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-muted-foreground mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">Nenhuma atividade registrada</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data?.tarefasPorSemana ?? []} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v === "concluidas" ? "Concluídas" : "Abertas"}</span>} />
                    <Bar dataKey="concluidas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} name="concluidas" />
                    <Bar dataKey="abertas"    fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={20} name="abertas" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Distribuição de Risco + Resumo Operacional ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Distribuição por Nível de Risco
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-40 w-full" />
              : riscoData.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-green-500 mb-2 opacity-60" />
                  <p className="text-sm text-muted-foreground">Nenhuma atividade de risco mapeada</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={riscoData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                      {riscoData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} formatter={(v: number, name: string) => [v, name]} />
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
                    pct: data ? Math.round((data.atividades.concluidas / Math.max(data.atividades.total, 1)) * 100) : 0,
                  },
                  {
                    label: "Prazo de cumprimento",
                    value: (data?.atividades.total ?? 0) - (data?.atividades.atrasadas ?? 0),
                    total: data?.atividades.total ?? 0,
                    color: "bg-blue-500",
                    pct: data ? Math.max(0, 100 - Math.round((data.atividades.atrasadas / Math.max(data.atividades.total, 1)) * 100)) : 0,
                  },
                  {
                    label: "Processos ativos",
                    value: data?.processos.ativos ?? 0,
                    total: data?.processos.total ?? 0,
                    color: "bg-violet-500",
                    pct: data ? Math.round((data.processos.ativos / Math.max(data.processos.total, 1)) * 100) : 0,
                  },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold tabular-nums">
                        {isLoading ? "…" : `${item.value} / ${item.total}`}
                        {!isLoading && (
                          <span className="text-muted-foreground font-normal ml-1.5">({item.pct}%)</span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full">
                      {!isLoading && <div className={`h-2 rounded-full transition-all ${item.color}`} style={{ width: `${Math.min(item.pct, 100)}%` }} />}
                    </div>
                  </div>
                ))}

                <div className="pt-2 grid grid-cols-2 gap-2 border-t print:hidden">
                  <Button variant="outline" size="sm" onClick={() => navigate("/atividades")} data-testid="button-ir-atividades">
                    <Clock className="w-3.5 h-3.5 mr-1.5" /> Atividades
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate("/processos")} data-testid="button-ir-processos">
                    <Briefcase className="w-3.5 h-3.5 mr-1.5" /> Processos
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
