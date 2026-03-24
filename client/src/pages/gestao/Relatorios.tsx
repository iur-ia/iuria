import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Processo {
  id: string;
  numero: string;
  titulo: string;
  status: string;
  area?: string;
  tipo?: string;
  responsavelId?: string;
}

interface EquipeMember {
  id: string;
  nome: string;
}

interface FinanceiroRelatorio {
  periodo: string;
  resumo: {
    totalReceber: number;
    totalPagar: number;
    recebido: number;
    pago: number;
    saldo: number;
    saldoProjetado: number;
  };
}

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

export default function Relatorios() {
  const [periodo, setPeriodo] = useState("mensal");

  const { data: processos = [], isLoading: loadingProcessos } = useQuery<Processo[]>({
    queryKey: ["/api/processos"],
  });

  const { data: equipe = [] } = useQuery<EquipeMember[]>({
    queryKey: ["/api/equipe"],
  });

  const { data: financeiro, isLoading: loadingFin } = useQuery<FinanceiroRelatorio>({
    queryKey: ["/api/relatorios/financeiro", periodo],
    queryFn: async () => {
      const res = await fetch(`/api/relatorios/financeiro?periodo=${periodo}`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const stats = useMemo(() => {
    const total = processos.length;
    const ativos = processos.filter(p => p.status === "Ativo").length;
    const concluidos = processos.filter(p => p.status === "Concluido" || p.status === "Arquivado").length;
    const movimentados = processos.filter(p => p.status === "Movimentado").length;
    const parados = processos.filter(p => p.status === "Parado").length;
    const incompletos = processos.filter(p => p.status === "Incompleto").length;

    // Areas breakdown
    const areaCount: Record<string, number> = {};
    processos.forEach(p => {
      const area = p.area || p.tipo || "Outros";
      areaCount[area] = (areaCount[area] || 0) + 1;
    });
    const topAreas = Object.entries(areaCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Team performance
    const teamStats = equipe.map(m => {
      const processosDoMembro = processos.filter(p => p.responsavelId === m.id);
      const total = processosDoMembro.length;
      const concluidos = processosDoMembro.filter(p => p.status === "Concluido" || p.status === "Arquivado").length;
      const taxa = total > 0 ? Math.round((concluidos / total) * 100) : 0;
      return { ...m, processos: total, taxa, initials: m.nome.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() };
    }).filter(m => m.processos > 0).sort((a, b) => b.taxa - a.taxa).slice(0, 5);

    const taxaSucesso = total > 0 ? Math.round((concluidos / total) * 100) : 0;

    return { total, ativos, concluidos, movimentados, parados, incompletos, taxaSucesso, topAreas, teamStats };
  }, [processos, equipe]);

  const isLoading = loadingProcessos || loadingFin;

  const receitaMensal = financeiro?.resumo?.recebido || 0;

  const handleExport = () => {
    const csvRows = [
      ["Metrica", "Valor"],
      ["Total Processos", stats.total],
      ["Processos Ativos", stats.ativos],
      ["Processos Concluidos", stats.concluidos],
      ["Taxa de Sucesso", `${stats.taxaSucesso}%`],
      ["Receita Periodo", formatCurrency(receitaMensal)],
    ];
    const csv = csvRows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${periodo}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusData = [
    { label: "Ativos", count: stats.ativos, pct: stats.total > 0 ? Math.round((stats.ativos / stats.total) * 100) : 0, color: "bg-green-600" },
    { label: "Movimentados", count: stats.movimentados, pct: stats.total > 0 ? Math.round((stats.movimentados / stats.total) * 100) : 0, color: "bg-purple-600" },
    { label: "Parados", count: stats.parados, pct: stats.total > 0 ? Math.round((stats.parados / stats.total) * 100) : 0, color: "bg-gray-600" },
    { label: "Incompletos", count: stats.incompletos, pct: stats.total > 0 ? Math.round((stats.incompletos / stats.total) * 100) : 0, color: "bg-orange-600" },
  ];

  const teamColors = ["bg-purple-600", "bg-pink-600", "bg-blue-600", "bg-green-600", "bg-orange-600"];

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Relatorios</h1>
          <p className="text-sm text-muted-foreground">
            Performance e metricas do escritorio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semanal">Esta Semana</SelectItem>
              <SelectItem value="mensal">Este Mes</SelectItem>
              <SelectItem value="trimestral">Este Trimestre</SelectItem>
              <SelectItem value="anual">Este Ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Processos</p>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{stats.total}</p>
            <p className="text-xs text-muted-foreground">{stats.ativos} ativos</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Processos Concluidos</p>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{stats.concluidos}</p>
            <p className="text-xs text-muted-foreground">do total de {stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
              {stats.taxaSucesso >= 50 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{stats.taxaSucesso}%</p>
            <p className="text-xs text-muted-foreground">concluidos / total</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Receita no Periodo</p>
              {receitaMensal > 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{formatCurrency(receitaMensal)}</p>
            <p className="text-xs text-muted-foreground">
              Saldo: {formatCurrency(financeiro?.resumo?.saldo || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Processos por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusData.map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">{item.label}</span>
                    <span className="text-sm font-semibold">{item.count} ({item.pct}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className={`${item.color} h-2 rounded-full`} style={{ width: `${Math.max(item.pct, 1)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Performance da Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.teamStats.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado disponivel</p>
              )}
              {stats.teamStats.map((member, idx) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${teamColors[idx % teamColors.length]} flex items-center justify-center text-white font-semibold`}>
                      {member.initials}
                    </div>
                    <div>
                      <p className="font-medium">{member.nome}</p>
                      <p className="text-xs text-muted-foreground">{member.processos} processos</p>
                    </div>
                  </div>
                  <Badge className={member.taxa >= 80 ? "bg-green-100 text-green-800" : member.taxa >= 50 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>
                    {member.taxa}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Areas de Atuacao</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.topAreas.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 col-span-3">Nenhum dado disponivel</p>
            )}
            {stats.topAreas.map(([area, count]) => (
              <div key={area} className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">{area}</p>
                <p className="text-2xl font-bold mb-2">{count}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.total > 0 ? Math.round((count / stats.total) * 100) : 0}% do total
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
