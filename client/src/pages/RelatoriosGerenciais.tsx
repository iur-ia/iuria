import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, BarChart3, Users, Briefcase, Clock } from "lucide-react";

export default function RelatoriosGerenciais() {
  return (
    <div className="p-6 bg-[#f5f5f5] min-h-screen space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Relatórios Gerenciais</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão estratégica do escritório — Abril 2026</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Processos Ativos", value: "147", icon: Briefcase, color: "text-blue-600", trend: "+12", up: true },
          { label: "Novos (mês)", value: "8", icon: Briefcase, color: "text-green-600", trend: "+3", up: true },
          { label: "Encerrados (mês)", value: "5", icon: Briefcase, color: "text-gray-600", trend: "-2", up: false },
          { label: "Taxa de Êxito", value: "78,3%", icon: TrendingUp, color: "text-emerald-600", trend: "+2,1%", up: true },
          { label: "Horas Faturadas", value: "342h", icon: Clock, color: "text-purple-600", trend: "+18h", up: true },
          { label: "Clientes Ativos", value: "45", icon: Users, color: "text-orange-600", trend: "+2", up: true },
        ].map((kpi, i) => (
          <Card key={i} className="border-0 shadow-sm bg-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <div className="flex items-center gap-1 mt-1">
                {kpi.up ? <TrendingUp className="w-3 h-3 text-green-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                <span className={`text-xs ${kpi.up ? "text-green-600" : "text-red-600"}`}>{kpi.trend}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Processos por Área</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { area: "Recuperação Judicial", qtd: 52, pct: 35, color: "bg-blue-500" },
                { area: "Empresarial", qtd: 41, pct: 28, color: "bg-purple-500" },
                { area: "Eleitoral", qtd: 22, pct: 15, color: "bg-green-500" },
                { area: "Civil", qtd: 18, pct: 12, color: "bg-orange-500" },
                { area: "Outros", qtd: 14, pct: 10, color: "bg-gray-400" },
              ].map((a, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{a.area}</span>
                    <span className="text-muted-foreground">{a.qtd} ({a.pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className={`h-2 rounded-full ${a.color}`} style={{ width: `${a.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader><CardTitle className="text-base">Resumo Financeiro</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-xs text-muted-foreground">Receita Mensal</p>
                  <p className="text-lg font-bold text-green-700">R$ 285.000</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-xs text-muted-foreground">Despesas</p>
                  <p className="text-lg font-bold text-red-700">R$ 98.500</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-xs text-muted-foreground">Honorários Pendentes</p>
                  <p className="text-lg font-bold text-blue-700">R$ 234.500</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-xs text-muted-foreground">Lucro Líquido</p>
                  <p className="text-lg font-bold text-emerald-700">R$ 186.500</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader><CardTitle className="text-base">Produtividade por Advogado</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground"><th className="p-2 text-left">Advogado</th><th className="p-2">Horas</th><th className="p-2">Peças</th><th className="p-2">Aproveitamento</th></tr></thead>
              <tbody>
                <tr className="border-b"><td className="p-2 font-medium">Dr. Thiago Morani</td><td className="p-2 text-center">198h</td><td className="p-2 text-center">24</td><td className="p-2 text-center"><Badge className="bg-green-100 text-green-800">92%</Badge></td></tr>
                <tr className="border-b"><td className="p-2 font-medium">Dra. Jennifer Santos</td><td className="p-2 text-center">144h</td><td className="p-2 text-center">18</td><td className="p-2 text-center"><Badge className="bg-green-100 text-green-800">88%</Badge></td></tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader><CardTitle className="text-base">Prazos - Status</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Cumpridos no prazo", value: "94%", color: "bg-green-50 text-green-700 border-green-200" },
                { label: "Em dia", value: "45", color: "bg-blue-50 text-blue-700 border-blue-200" },
                { label: "Próximos 7 dias", value: "12", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
                { label: "Críticos (<48h)", value: "3", color: "bg-red-50 text-red-700 border-red-200" },
              ].map((p, i) => (
                <div key={i} className={`p-3 rounded-lg border ${p.color}`}>
                  <p className="text-xs opacity-70">{p.label}</p>
                  <p className="text-xl font-bold">{p.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
