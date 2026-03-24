import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";

interface Atividade {
  id: string;
  titulo: string;
  tipo: string;
  status: string;
  prioridade: string;
  data: string;
  responsavelId?: string;
}

interface EquipeMember {
  id: string;
  nome: string;
}

export default function RelatoriosAtividades() {
  const { data: atividades = [], isLoading } = useQuery<Atividade[]>({
    queryKey: ["/api/atividades"],
  });

  const { data: equipe = [] } = useQuery<EquipeMember[]>({
    queryKey: ["/api/equipe"],
  });

  const stats = useMemo(() => {
    const hoje = new Date().toISOString().split("T")[0];
    const concluidas = atividades.filter(a => a.status === "Concluida" || a.status === "Concluída");
    const pendentes = atividades.filter(a => a.status === "Pendente" || a.status === "Em Andamento");
    const atrasadas = atividades.filter(a => a.data < hoje && (a.status === "Pendente" || a.status === "Em Andamento"));
    const taxaConclusao = atividades.length > 0 ? Math.round((concluidas.length / atividades.length) * 100) : 0;

    // By tipo
    const tipoCount: Record<string, number> = {};
    atividades.forEach(a => {
      tipoCount[a.tipo] = (tipoCount[a.tipo] || 0) + 1;
    });
    const tipoEntries = Object.entries(tipoCount).sort((a, b) => b[1] - a[1]);
    const totalTipo = atividades.length || 1;

    // By team member
    const teamStats = equipe.map(m => {
      const memberAtividades = atividades.filter(a => a.responsavelId === m.id);
      const memberConcluidas = memberAtividades.filter(a => a.status === "Concluida" || a.status === "Concluída");
      const taxa = memberAtividades.length > 0 ? Math.round((memberConcluidas.length / memberAtividades.length) * 100) : 0;
      return {
        ...m,
        total: memberAtividades.length,
        concluidas: memberConcluidas.length,
        taxa,
        initials: m.nome.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
      };
    }).filter(m => m.total > 0).sort((a, b) => b.taxa - a.taxa).slice(0, 5);

    // Average completion time (simple estimate based on data)
    const prioridadeStats: Record<string, { total: number; count: number }> = {
      "Alta": { total: 0, count: 0 },
      "Media": { total: 0, count: 0 },
      "Baixa": { total: 0, count: 0 },
    };
    concluidas.forEach(a => {
      const p = a.prioridade || "Media";
      if (prioridadeStats[p]) {
        prioridadeStats[p].count += 1;
      }
    });

    return {
      concluidas: concluidas.length,
      pendentes: pendentes.length,
      atrasadas: atrasadas.length,
      taxaConclusao,
      tipoEntries,
      totalTipo,
      teamStats,
      prioridadeStats,
    };
  }, [atividades, equipe]);

  const handleExport = () => {
    const csvRows = [
      ["Metrica", "Valor"],
      ["Atividades Concluidas", stats.concluidas],
      ["Atividades Pendentes", stats.pendentes],
      ["Atividades Atrasadas", stats.atrasadas],
      ["Taxa de Conclusao", `${stats.taxaConclusao}%`],
    ];
    const csv = csvRows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-atividades-${new Date().toISOString().split("T")[0]}.csv`;
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

  const tipoColors = ["bg-purple-600", "bg-orange-600", "bg-green-600", "bg-blue-600", "bg-red-600"];
  const teamColors = ["bg-purple-600", "bg-pink-600", "bg-blue-600", "bg-green-600", "bg-orange-600"];

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Relatorios de Atividades
          </h1>
          <p className="text-sm text-muted-foreground">
            Metricas e produtividade da equipe
          </p>
        </div>
        <div className="flex items-center gap-2">
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
              <p className="text-sm text-muted-foreground">Tarefas Concluidas</p>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{stats.concluidas}</p>
            <p className="text-xs text-green-600">de {atividades.length} total</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Tarefas Pendentes</p>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{stats.pendentes}</p>
            <p className="text-xs text-blue-600">Em andamento</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Tarefas Atrasadas</p>
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{stats.atrasadas}</p>
            <p className="text-xs text-red-600">{stats.atrasadas > 0 ? "Requer atencao" : "Nenhuma atrasada"}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Taxa de Conclusao</p>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{stats.taxaConclusao}%</p>
            <p className="text-xs text-green-600">concluidas / total</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Tarefas por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.tipoEntries.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado disponivel</p>
              )}
              {stats.tipoEntries.map(([tipo, count], idx) => {
                const pct = Math.round((count / stats.totalTipo) * 100);
                return (
                  <div key={tipo}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">{tipo}</span>
                      <span className="text-sm font-semibold">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className={`${tipoColors[idx % tipoColors.length]} h-2 rounded-full`} style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Produtividade por Membro</CardTitle>
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
                      <p className="text-xs text-muted-foreground">{member.concluidas} tarefas concluidas</p>
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
          <CardTitle>Resumo por Prioridade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["Alta", "Media", "Baixa"] as const).map(prio => {
              const total = atividades.filter(a => a.prioridade === prio).length;
              const concluidas = atividades.filter(a => a.prioridade === prio && (a.status === "Concluida" || a.status === "Concluída")).length;
              const pendentes = total - concluidas;
              return (
                <div key={prio} className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Prioridade {prio}</p>
                  <p className="text-2xl font-bold mb-2">{total}</p>
                  <p className="text-xs text-muted-foreground">
                    {concluidas} concluidas, {pendentes} pendentes
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
