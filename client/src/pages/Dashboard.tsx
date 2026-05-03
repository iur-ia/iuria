import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ChevronRight, Activity, Zap, Printer, Download, Users, TrendingUp,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";

// ─── Types ───────────────────────────────────────────────────────────────────

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
    honorariosPorCliente: { clienteId: string; nome: string; total: number; recebido: number; pendente: number }[];
    receitaMesAtual: number;
    metaReceitaMensal: number;
  };
  timesheet: {
    totalHorasRegistradas: number;
    horasPorColaborador: { equipeId: string; nome: string; totalHoras: number; horasFaturaveis: number }[];
  };
  mapaRisco: RiscoItem[];
  trendFinanceiro: { mes: string; label: string; recebido: number; pago: number; aVencer: number }[];
  tarefasPorSemana: { label: string; concluidas: number; abertas: number }[];
  acompanhados: { total: number; comNovosAndamentos: number };
  filtros: {
    areas: string[];
    equipe: { id: string; nome: string }[];
    clientes: { id: string; nome: string }[];
  };
  periodo: string;
  periodoLabel: string;
  geradoEm: string;
}

type Periodo = "semana" | "mes" | "trimestre" | "personalizado";

const PERIODO_LABELS: Record<Periodo, string> = {
  semana: "7 dias",
  mes: "30 dias",
  trimestre: "90 dias",
  personalizado: "Personalizado",
};

const AREA_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f97316", "#ec4899", "#f59e0b"];

const RISCO_CFG: Record<string, { label: string; cls: string; icon: typeof AlertCircle }> = {
  CRITICO: { label: "Crítico", cls: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900", icon: Zap },
  ALTO:    { label: "Alto",    cls: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-900", icon: AlertTriangle },
  MEDIO:   { label: "Médio",  cls: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-200 dark:border-yellow-900", icon: AlertCircle },
  BAIXO:   { label: "Baixo",  cls: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-900", icon: CheckCircle2 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(1)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function exportXLSX(data: DashboardKPI) {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — KPIs Operacionais
  const kpiRows = [
    ["Métrica", "Valor"],
    ["Processos Ativos", data.processos.ativos],
    ["Total Processos", data.processos.total],
    ["Tarefas Atrasadas", data.atividades.atrasadas],
    ["Prazos 7 dias", data.atividades.vencendo7d],
    ["Processos sem movimentação +30d", data.processos.semMovimentacao30d],
    ["A Receber (total)", data.financeiro.totalReceber],
    [`Recebido (${data.periodoLabel})`, data.financeiro.totalRecebidoPeriodo],
    [`A Pagar (${data.periodoLabel})`, data.financeiro.totalPagarPeriodo],
    ["Honorários Pendentes (qtd)", data.financeiro.honorariosPendentes],
    ["Receita Mês Atual", data.financeiro.receitaMesAtual],
    ["Meta Receita Mensal", data.financeiro.metaReceitaMensal],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiRows), "KPIs");

  // Sheet 2 — Honorários por Status
  const honStatusRows: (string | number)[][] = [
    ["Status", "Valor (R$)"],
    ...Object.entries(data.financeiro.honorariosPorStatus).map(([s, v]) => [s, v]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(honStatusRows), "Honorários por Status");

  // Sheet 3 — Honorários por Cliente
  const honCliRows: (string | number)[][] = [
    ["Cliente", "Total Contratado (R$)", "Recebido (R$)", "Pendente (R$)"],
    ...data.financeiro.honorariosPorCliente.map((c) => [c.nome, c.total, c.recebido, c.pendente]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(honCliRows), "Honorários por Cliente");

  // Sheet 4 — Timesheet
  const tsRows: (string | number)[][] = [
    ["Colaborador", "Total Horas", "Horas Faturáveis", "% Faturável"],
    ...data.timesheet.horasPorColaborador.map((c) => [
      c.nome, c.totalHoras, c.horasFaturaveis,
      c.totalHoras > 0 ? Math.round((c.horasFaturaveis / c.totalHoras) * 100) : 0,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tsRows), "Timesheet");

  // Sheet 5 — Mapa de Risco
  const riscoRows: (string | number)[][] = [
    ["Título", "Risco", "Score", "Tipo", "Data", "Processo", "Área", "Dias Atraso", "Responsável"],
    ...data.mapaRisco.map((r) => [
      r.titulo, r.risco ?? "", r.score, r.tipo, r.data,
      r.processoNumero ?? "", r.area ?? "", r.diasAtraso, r.responsavel ?? "",
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(riscoRows), "Mapa de Risco");

  // Sheet 6 — Tendência Financeira
  const trendRows: (string | number)[][] = [
    ["Mês", "Recebido (R$)", "Pago (R$)", "A Vencer (R$)"],
    ...data.trendFinanceiro.map((t) => [t.label, t.recebido, t.pago, t.aVencer]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trendRows), "Tendência Financeira");

  XLSX.writeFile(wb, `dashboard-kpis-${new Date().toISOString().split("T")[0]}.xlsx`);
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
    ["Receita Mês Atual", fmt(data.financeiro.receitaMesAtual)],
    ["Meta Receita Mensal", fmt(data.financeiro.metaReceitaMensal)],
    [],
    ["=== Honorários por Cliente ==="],
    ["Cliente", "Total Contratado", "Recebido", "Pendente"],
    ...data.financeiro.honorariosPorCliente.map((c) => [c.nome, fmt(c.total), fmt(c.recebido), fmt(c.pendente)]),
    [],
    ["=== Timesheet ==="],
    ["Colaborador", "Total Horas", "Horas Faturáveis"],
    ...data.timesheet.horasPorColaborador.map((c) => [c.nome, String(c.totalHoras), String(c.horasFaturaveis)]),
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

// ─── Sub-components ───────────────────────────────────────────────────────────

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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [periodo, setPeriodo] = useState<Periodo>(() => (sessionStorage.getItem("dashboard_periodo") as Periodo) || "mes");
  const [area, setArea]       = useState(() => sessionStorage.getItem("dashboard_area") || "");
  const [resp, setResp]       = useState(() => sessionStorage.getItem("dashboard_resp") || "");
  const [cliente, setCliente] = useState(() => sessionStorage.getItem("dashboard_cliente") || "");
  const today = new Date().toISOString().split("T")[0];
  const [dataInicio, setDataInicio] = useState(() => sessionStorage.getItem("dashboard_dataInicio") || today);
  const [dataFim, setDataFim]       = useState(() => sessionStorage.getItem("dashboard_dataFim")    || today);

  useEffect(() => { sessionStorage.setItem("dashboard_periodo",    periodo);    }, [periodo]);
  useEffect(() => { sessionStorage.setItem("dashboard_area",       area);       }, [area]);
  useEffect(() => { sessionStorage.setItem("dashboard_resp",       resp);       }, [resp]);
  useEffect(() => { sessionStorage.setItem("dashboard_cliente",    cliente);    }, [cliente]);
  useEffect(() => { sessionStorage.setItem("dashboard_dataInicio", dataInicio); }, [dataInicio]);
  useEffect(() => { sessionStorage.setItem("dashboard_dataFim",    dataFim);    }, [dataFim]);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams({ periodo });
    if (area)    params.set("area", area);
    if (resp)    params.set("responsavel", resp);
    if (cliente) params.set("cliente", cliente);
    if (periodo === "personalizado") {
      params.set("dataInicio", dataInicio);
      params.set("dataFim", dataFim);
    }
    return `/api/dashboard/kpis?${params}`;
  }, [periodo, area, resp, cliente, dataInicio, dataFim]);

  const { data, isLoading, isError, dataUpdatedAt, refetch, isFetching } = useQuery<DashboardKPI>({
    queryKey: ["/api/dashboard/kpis", periodo, area, resp, cliente, dataInicio, dataFim],
    queryFn: async () => {
      const r = await fetch(buildUrl());
      if (!r.ok) throw new Error(`Erro ao carregar KPIs: ${r.status}`);
      const json = await r.json();
      if (json.error) throw new Error(json.error);
      return json as DashboardKPI;
    },
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
  const periodoLbl = periodo === "personalizado"
    ? (dataInicio === dataFim ? dataInicio : `${dataInicio} – ${dataFim}`)
    : PERIODO_LABELS[periodo];

  const riscoData = data
    ? [
        { name: "Crítico", value: data.atividades.porRisco.CRITICO, color: "#ef4444" },
        { name: "Alto",    value: data.atividades.porRisco.ALTO,    color: "#f97316" },
        { name: "Médio",   value: data.atividades.porRisco.MEDIO,   color: "#eab308" },
        { name: "Baixo",   value: data.atividades.porRisco.BAIXO,   color: "#22c55e" },
      ].filter((d) => d.value > 0)
    : [];

  const hasActiveFilter = !!area || !!resp || !!cliente;

  // Receita vs meta calculation
  const receitaMeta = data?.financeiro.receitaMesAtual ?? 0;
  const meta = data?.financeiro.metaReceitaMensal ?? 0;
  const receitaPct = meta > 0 ? Math.min(Math.round((receitaMeta / meta) * 100), 200) : 0;

  if (isError) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Card className="border-0 shadow-sm max-w-md w-full mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <div>
              <p className="font-semibold text-foreground">Erro ao carregar o painel</p>
              <p className="text-sm text-muted-foreground mt-1">Não foi possível carregar os dados de KPI. Verifique a conexão e tente novamente.</p>
            </div>
            <Button variant="outline" onClick={() => refetch()} data-testid="button-retry-dashboard">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              {(["semana", "mes", "trimestre", "personalizado"] as Periodo[]).map((p) => (
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
            {/* Custom date range pickers — only shown when "personalizado" */}
            {periodo === "personalizado" && (
              <div className="flex items-center gap-1" data-testid="filtro-periodo-personalizado">
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-36 text-sm"
                  data-testid="input-data-inicio"
                />
                <span className="text-muted-foreground text-sm">–</span>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-36 text-sm"
                  data-testid="input-data-fim"
                />
              </div>
            )}

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

            {/* Cliente filter */}
            <Select value={cliente || "todos"} onValueChange={(v) => setCliente(v === "todos" ? "" : v)}>
              <SelectTrigger className="w-44" data-testid="filtro-cliente">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Clientes</SelectItem>
                {(data?.filtros?.clientes ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilter && (
              <Button variant="ghost" size="sm" onClick={() => { setArea(""); setResp(""); setCliente(""); }} data-testid="button-limpar-filtros">
                Limpar filtros
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={() => data && exportXLSX(data)} disabled={isLoading} data-testid="button-exportar-xlsx">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
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
          <h1 className="text-xl font-bold">Painel de Controle</h1>
          <p className="text-sm text-gray-500">
            Período: {periodoLbl}{area && ` · Área: ${area}`}{resp && ` · Responsável`}{cliente && ` · Cliente`} · Gerado em {new Date().toLocaleString("pt-BR")}
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
              icon={Clock} iconColor="bg-amber-500" href="/atividades" drillFilter="Vencendo7d" loading={isLoading} onNavigate={handleNavigate} />
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

        {/* ── Honorários por Status ── */}
        <Card className="border-0 shadow-sm" data-testid="card-honorarios-por-status">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-violet-500" />
              Honorários por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 flex-1" />)}
              </div>
            ) : Object.keys(data?.financeiro.honorariosPorStatus ?? {}).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum honorário registrado</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Object.entries(data?.financeiro.honorariosPorStatus ?? {}).map(([status, valor]) => {
                  const colorMap: Record<string, string> = {
                    Pendente: "text-amber-600 bg-amber-50 dark:bg-amber-950",
                    Pago: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950",
                    Cancelado: "text-red-600 bg-red-50 dark:bg-red-950",
                    Parcial: "text-blue-600 bg-blue-50 dark:bg-blue-950",
                    Vencido: "text-orange-600 bg-orange-50 dark:bg-orange-950",
                  };
                  const cls = colorMap[status] ?? "text-muted-foreground bg-muted";
                  return (
                    <div key={status} className={`rounded-md p-3 ${cls}`} data-testid={`honorario-status-${status.toLowerCase()}`}>
                      <p className="text-xs font-medium opacity-80 mb-1">{status}</p>
                      <p className="text-lg font-bold tabular-nums">{fmt(valor)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Receita vs Meta + Honorários por Cliente ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Receita vs Meta */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Receita do Mês vs Meta
                <Badge variant="secondary" className="ml-auto no-default-active-elevate text-xs">
                  Meta = média 3 meses anteriores
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ) : (
                <div className="space-y-3" data-testid="receita-vs-meta">
                  <div className="flex items-end gap-3">
                    <span className="text-3xl font-bold tabular-nums">{fmt(receitaMeta)}</span>
                    <span className="text-sm text-muted-foreground mb-1">de {fmt(meta)} meta</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all ${receitaPct >= 100 ? "bg-emerald-500" : receitaPct >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${Math.min(receitaPct, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-semibold ${receitaPct >= 100 ? "text-emerald-600" : receitaPct >= 70 ? "text-amber-600" : "text-red-600"}`}>
                      {receitaPct}% da meta
                    </span>
                    <span className="text-muted-foreground">
                      {meta > 0
                        ? receitaMeta >= meta
                          ? `Superado em ${fmt(receitaMeta - meta)}`
                          : `Faltam ${fmt(meta - receitaMeta)}`
                        : "Sem dados históricos para meta"}
                    </span>
                  </div>
                  {meta === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Registre recebimentos nos meses anteriores para calcular a meta automaticamente.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Honorários por Cliente */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-500" />
                Honorários por Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : (data?.financeiro.honorariosPorCliente.length ?? 0) === 0 ? (
                <div className="py-8 text-center">
                  <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">Nenhum honorário cadastrado</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {(data?.financeiro.honorariosPorCliente ?? []).map((c) => {
                    const pct = c.total > 0 ? Math.round((c.recebido / c.total) * 100) : 0;
                    return (
                      <div key={c.clienteId} className="space-y-1" data-testid={`honorario-cliente-${c.clienteId}`}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium max-w-[55%]">{c.nome}</span>
                          <span className="text-muted-foreground tabular-nums text-xs">
                            {fmt(c.recebido)} / {fmt(c.total)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : "bg-orange-500"}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
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

        {/* ── Distribuição de Risco + Timesheet ── */}
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

          {/* Timesheet — horas por colaborador */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                Horas Registradas — {periodoLbl}
                {!isLoading && (data?.timesheet.totalHorasRegistradas ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-auto no-default-active-elevate">
                    Total: {data?.timesheet.totalHorasRegistradas}h
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (data?.timesheet.horasPorColaborador.length ?? 0) === 0 ? (
                <div className="py-8 text-center">
                  <Clock className="w-10 h-10 mx-auto text-muted-foreground mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">Nenhuma hora registrada no período</p>
                  <p className="text-xs text-muted-foreground mt-1">Use o módulo de Timesheet para registrar horas</p>
                </div>
              ) : (
                <div className="space-y-2.5" data-testid="timesheet-colaboradores">
                  {(data?.timesheet.horasPorColaborador ?? []).map((col) => {
                    const maxHoras = Math.max(...(data?.timesheet.horasPorColaborador ?? []).map((c) => c.totalHoras), 1);
                    const pct = Math.round((col.totalHoras / maxHoras) * 100);
                    const fatPct = col.totalHoras > 0 ? Math.round((col.horasFaturaveis / col.totalHoras) * 100) : 0;
                    return (
                      <div key={col.equipeId} data-testid={`timesheet-col-${col.equipeId}`}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium truncate max-w-[55%]">{col.nome}</span>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">{col.horasFaturaveis}h fat.</span>
                            <span className="font-semibold tabular-nums">{col.totalHoras}h</span>
                            <Badge variant="secondary" className="no-default-active-elevate text-xs px-1.5 py-0">
                              {fatPct}%
                            </Badge>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Resumo Operacional ── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumo Operacional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            </div>

            <div className="pt-4 mt-4 border-t flex flex-wrap gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={() => navigate("/atividades")} data-testid="button-ir-atividades">
                <Clock className="w-3.5 h-3.5 mr-1.5" /> Atividades
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/processos")} data-testid="button-ir-processos">
                <Briefcase className="w-3.5 h-3.5 mr-1.5" /> Processos
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/financeiro")} data-testid="button-ir-financeiro">
                <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Financeiro
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
