import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, Bell, Activity, Calendar, Clock, Scale, Users, FileText, AlertTriangle, ChevronLeft, ChevronRight, TrendingUp, DollarSign, ArrowUpCircle, ArrowDownCircle, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface DashboardData {
  metricas: {
    tarefas: { total: number; atrasadas: number; hoje: number; futuras: number };
    intimacoes: { total: number; pendentes: number };
    andamentos: { total: number; naoLidos: number };
    audiencias: { total: number; atrasadas: number; hoje: number; futuras: number };
    compromissos: { total: number; atrasados: number; hoje: number; futuros: number };
  };
  resumo: {
    totalProcessos: number;
    processosAtivos: number;
    totalClientes: number;
    monitoramentosAtivos: number;
    prazosVencendo: number;
    alertasNaoLidos: number;
  };
  financeiro: {
    totalReceber: number;
    totalPagar: number;
    recebido: number;
    pago: number;
    saldo: number;
    contasReceberPendentes: number;
    contasPagarPendentes: number;
  };
  prazosProximos: any[];
  atividadesHoje: any[];
  atividadesRecentes: any[];
}

const monthNames = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const daysOfWeek = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

function prioridadeColor(p: string) {
  if (p === "critica") return "bg-red-500 text-white";
  if (p === "alta") return "bg-orange-500 text-white";
  if (p === "media") return "bg-yellow-500 text-white";
  return "bg-gray-400 text-white";
}

function statusPrazoColor(s: string) {
  if (s === "vencido") return "bg-red-100 text-red-800";
  if (s === "critico" || s === "proximo") return "bg-orange-100 text-orange-800";
  if (s === "cumprido") return "bg-green-100 text-green-800";
  return "bg-blue-100 text-blue-800";
}

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const { data: dashboard } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    refetchInterval: 30000,
  });

  const { data: atividades = [] } = useQuery<any[]>({
    queryKey: ["/api/atividades"],
  });

  const { data: prazos = [] } = useQuery<any[]>({
    queryKey: ["/api/prazos"],
  });

  const metrics = useMemo(() => {
    if (!dashboard) return null;
    const m = dashboard.metricas;
    return [
      { title: "Tarefas", total: m.tarefas.total, icon: CheckSquare, color: "bg-[#8b5cf6]", subItems: [
        { label: "Atrasadas", value: m.tarefas.atrasadas, color: "text-red-500" },
        { label: "Hoje", value: m.tarefas.hoje, color: "text-yellow-500" },
        { label: "Futuras", value: m.tarefas.futuras, color: "text-green-500" },
      ]},
      { title: "Intimacoes", total: m.intimacoes.total, icon: Bell, color: "bg-[#f97316]", subItems: [
        { label: "Pendentes", value: m.intimacoes.pendentes, color: "text-muted-foreground" },
      ]},
      { title: "Andamentos", total: m.andamentos.total, icon: Activity, color: "bg-[#3b82f6]", subItems: [
        { label: "Nao lidos", value: m.andamentos.naoLidos, color: "text-muted-foreground" },
      ]},
      { title: "Audiencias", total: m.audiencias.total, icon: Calendar, color: "bg-[#10b981]", subItems: [
        { label: "Atrasadas", value: m.audiencias.atrasadas, color: "text-red-500" },
        { label: "Hoje", value: m.audiencias.hoje, color: "text-yellow-500" },
        { label: "Futuras", value: m.audiencias.futuras, color: "text-green-500" },
      ]},
      { title: "Compromissos", total: m.compromissos.total, icon: Clock, color: "bg-gray-500", subItems: [
        { label: "Atrasados", value: m.compromissos.atrasados, color: "text-red-500" },
        { label: "Hoje", value: m.compromissos.hoje, color: "text-yellow-500" },
        { label: "Futuros", value: m.compromissos.futuros, color: "text-green-500" },
      ]},
    ];
  }, [dashboard]);

  // Calendar logic
  const calYear = currentDate.getFullYear();
  const calMonth = currentDate.getMonth();
  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDow = firstDay.getDay();

  // Build events from atividades + prazos
  const calEvents = useMemo(() => {
    const events: Record<number, Array<{ title: string; color: string; tipo: string }>> = {};
    for (const a of atividades) {
      if (!a.data) continue;
      const d = new Date(a.data);
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const day = d.getDate();
        if (!events[day]) events[day] = [];
        const c = a.tipo === "Audiencia" || a.tipo === "Audiencia" ? "bg-green-500" : a.tipo === "Intimacao" || a.tipo === "Intimacao" ? "bg-orange-500" : "bg-[#8b5cf6]";
        events[day].push({ title: a.titulo, color: c, tipo: a.tipo });
      }
    }
    for (const p of prazos) {
      if (!p.dataVencimento) continue;
      const d = new Date(p.dataVencimento);
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const day = d.getDate();
        if (!events[day]) events[day] = [];
        events[day].push({ title: p.descricao || "Prazo", color: p.prioridade === "critica" ? "bg-red-500" : "bg-amber-500", tipo: "Prazo" });
      }
    }
    return events;
  }, [atividades, prazos, calYear, calMonth]);

  const prevMonth = () => setCurrentDate(new Date(calYear, calMonth - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(calYear, calMonth + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const todayDay = new Date().getDate();
  const isCurrentMonth = new Date().getMonth() === calMonth && new Date().getFullYear() === calYear;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Painel de Controle</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Visao geral do escritorio - {new Date().toLocaleDateString("pt-BR", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dashboard?.resumo.prazosVencendo ? (
              <Link href="/prazos">
                <Badge className="bg-red-500 text-white cursor-pointer px-3 py-1">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {dashboard.resumo.prazosVencendo} prazos vencendo
                </Badge>
              </Link>
            ) : null}
            <Badge variant="secondary" className="px-3 py-1">v2.0</Badge>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {(metrics || []).map((metric, idx) => (
            <Card key={idx} className="hover-elevate cursor-pointer border-0 shadow-sm bg-white" data-testid={`card-${metric.title.toLowerCase()}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{metric.title}</span>
                  <div className={`p-2 rounded ${metric.color}`}>
                    <metric.icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="text-4xl font-bold mb-2 text-foreground">
                  {metric.total}
                </div>
                <div className="space-y-1">
                  {metric.subItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={`font-medium ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary row */}
        {dashboard?.resumo && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: "Processos Ativos", value: dashboard.resumo.processosAtivos, icon: Scale, color: "text-purple-600" },
              { label: "Total Clientes", value: dashboard.resumo.totalClientes, icon: Users, color: "text-blue-600" },
              { label: "Monitoramentos", value: dashboard.resumo.monitoramentosAtivos, icon: Activity, color: "text-green-600" },
              { label: "Prazos Vencendo", value: dashboard.resumo.prazosVencendo, icon: AlertTriangle, color: "text-red-600" },
              { label: "Alertas", value: dashboard.resumo.alertasNaoLidos, icon: Bell, color: "text-orange-600" },
              { label: "Total Processos", value: dashboard.resumo.totalProcessos, icon: FileText, color: "text-gray-600" },
            ].map((item, i) => (
              <Card key={i} className="border-0 shadow-sm bg-white">
                <CardContent className="p-3 flex items-center gap-3">
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Financial Summary */}
        {dashboard?.financeiro && (
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUpCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-muted-foreground">A Receber</span>
                  </div>
                  <p className="text-lg font-bold text-green-700">
                    R$ {(dashboard.financeiro.totalReceber || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">{dashboard.financeiro.contasReceberPendentes} pendentes</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowDownCircle className="w-4 h-4 text-red-600" />
                    <span className="text-xs text-muted-foreground">A Pagar</span>
                  </div>
                  <p className="text-lg font-bold text-red-700">
                    R$ {(dashboard.financeiro.totalPagar || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">{dashboard.financeiro.contasPagarPendentes} pendentes</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUpCircle className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-muted-foreground">Recebido</span>
                  </div>
                  <p className="text-lg font-bold text-blue-700">
                    R$ {(dashboard.financeiro.recebido || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowDownCircle className="w-4 h-4 text-orange-600" />
                    <span className="text-xs text-muted-foreground">Pago</span>
                  </div>
                  <p className="text-lg font-bold text-orange-700">
                    R$ {(dashboard.financeiro.pago || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className={`p-3 rounded-lg border ${dashboard.financeiro.saldo >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="w-4 h-4 ${dashboard.financeiro.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}" />
                    <span className="text-xs text-muted-foreground">Saldo</span>
                  </div>
                  <p className={`text-lg font-bold ${dashboard.financeiro.saldo >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    R$ {(dashboard.financeiro.saldo || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Link href="/financeiro">
                  <Button variant="outline" size="sm">Ver financeiro completo</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="border-0 shadow-sm lg:col-span-2 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Agenda</h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" onClick={goToday}>Hoje</Button>
                  <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>

              <div className="text-center mb-4">
                <h3 className="text-xl font-semibold">{monthNames[calMonth]} de {calYear}</h3>
              </div>

              <div className="grid grid-cols-7 border-t border-l">
                {daysOfWeek.map((day, idx) => (
                  <div key={idx} className="border-r border-b bg-muted p-2 text-center text-xs font-medium capitalize">{day}</div>
                ))}
                {Array.from({ length: startDow }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="border-r border-b bg-muted/30 min-h-20" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const dayEvents = calEvents[day] || [];
                  const isToday = isCurrentMonth && day === todayDay;
                  return (
                    <div key={day} className={`border-r border-b min-h-20 p-1.5 hover-elevate cursor-pointer ${isToday ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : 'bg-white'}`}>
                      <div className={`text-xs font-medium mb-0.5 ${isToday ? 'text-blue-600 font-bold' : ''}`}>{day}</div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((event, i) => (
                          <div key={i} className={`text-[10px] px-1 py-0.5 rounded ${event.color} text-white truncate`} title={event.title}>{event.title}</div>
                        ))}
                        {dayEvents.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} mais</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Prazos Proximos + Atividades */}
          <div className="space-y-6">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Prazos Proximos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(dashboard?.prazosProximos || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum prazo proximo</p>
                ) : (
                  (dashboard?.prazosProximos || []).map((p: any, i: number) => (
                    <div key={i} className="p-2 rounded border bg-white">
                      <div className="flex items-center justify-between mb-1">
                        <Badge className={prioridadeColor(p.prioridade)} variant="secondary">
                          {p.prioridade}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{new Date(p.dataVencimento).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <p className="text-sm font-medium truncate">{p.descricao}</p>
                      <p className="text-xs text-muted-foreground">{p.fundamentoLegal}</p>
                    </div>
                  ))
                )}
                <Link href="/prazos">
                  <Button variant="outline" size="sm" className="w-full mt-2">Ver todos os prazos</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Atividades Recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {atividades.slice(0, 5).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded border bg-white">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.titulo}</p>
                      <p className="text-xs text-muted-foreground">{a.tipo} - {new Date(a.data).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <Badge className={a.status === "Pendente" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"} variant="secondary">
                      {a.status}
                    </Badge>
                  </div>
                ))}
                <Link href="/atividades">
                  <Button variant="outline" size="sm" className="w-full mt-2">Ver atividades</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
