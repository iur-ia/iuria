import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Clock,
  AlertTriangle,
  Users,
  Scale,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

// --- Seed Data ---

const MENSAL_PROCESSOS = [
  { mes: "Nov", novos: 8, encerrados: 5 },
  { mes: "Dez", novos: 12, encerrados: 7 },
  { mes: "Jan", novos: 10, encerrados: 9 },
  { mes: "Fev", novos: 15, encerrados: 6 },
  { mes: "Mar", novos: 11, encerrados: 13 },
  { mes: "Abr", novos: 9, encerrados: 8 },
];

const FINANCEIRO_MENSAL = [
  { mes: "Nov", receitas: 85000, despesas: 32000 },
  { mes: "Dez", receitas: 92000, despesas: 38000 },
  { mes: "Jan", receitas: 78000, despesas: 30000 },
  { mes: "Fev", receitas: 105000, despesas: 35000 },
  { mes: "Mar", receitas: 98000, despesas: 41000 },
  { mes: "Abr", receitas: 88000, despesas: 33000 },
];

const AREAS_DISTRIBUICAO = [
  { name: "Civel", value: 35, color: "#3b82f6" },
  { name: "Trabalhista", value: 22, color: "#ef4444" },
  { name: "Tributario", value: 18, color: "#f59e0b" },
  { name: "Empresarial", value: 15, color: "#10b981" },
  { name: "Consumidor", value: 10, color: "#8b5cf6" },
];

const PRODUTIVIDADE_ADVOGADOS = [
  { nome: "Dr. Thiago Morani", processos: 28, horasMes: 142, peticoes: 12, taxa: 94 },
  { nome: "Dra. Carolina Silva", processos: 22, horasMes: 128, peticoes: 9, taxa: 88 },
  { nome: "Dr. Rafael Santos", processos: 19, horasMes: 135, peticoes: 15, taxa: 91 },
  { nome: "Dr. Pedro Lima", processos: 15, horasMes: 110, peticoes: 7, taxa: 85 },
];

const PRAZOS_RESUMO = [
  { status: "Cumpridos no prazo", quantidade: 45, percentual: 78, cor: "bg-green-100 text-green-800" },
  { status: "Cumpridos com atraso", quantidade: 8, percentual: 14, cor: "bg-yellow-100 text-yellow-800" },
  { status: "Vencidos (nao cumpridos)", quantidade: 3, percentual: 5, cor: "bg-red-100 text-red-800" },
  { status: "Pendentes", quantidade: 2, percentual: 3, cor: "bg-blue-100 text-blue-800" },
];

const PRAZOS_CRITICOS = [
  { processo: "0001234-56.2025.8.19.0001", tipo: "Contestacao", vencimento: "2026-04-05", responsavel: "Dr. Thiago Morani", dias: 2 },
  { processo: "0005678-90.2025.8.19.0042", tipo: "Recurso de Apelacao", vencimento: "2026-04-07", responsavel: "Dra. Carolina Silva", dias: 4 },
  { processo: "0009876-12.2024.8.19.0001", tipo: "Manifestacao", vencimento: "2026-04-08", responsavel: "Dr. Rafael Santos", dias: 5 },
];

const HORAS_POR_CATEGORIA = [
  { mes: "Nov", Consultoria: 48, Reuniao: 22, Audiencia: 18, Pesquisa: 32, Redacao: 55, Administrativo: 12 },
  { mes: "Dez", Consultoria: 52, Reuniao: 28, Audiencia: 15, Pesquisa: 35, Redacao: 60, Administrativo: 14 },
  { mes: "Jan", Consultoria: 45, Reuniao: 20, Audiencia: 22, Pesquisa: 30, Redacao: 50, Administrativo: 10 },
  { mes: "Fev", Consultoria: 55, Reuniao: 25, Audiencia: 20, Pesquisa: 38, Redacao: 65, Administrativo: 15 },
  { mes: "Mar", Consultoria: 50, Reuniao: 30, Audiencia: 16, Pesquisa: 34, Redacao: 58, Administrativo: 11 },
  { mes: "Abr", Consultoria: 42, Reuniao: 18, Audiencia: 14, Pesquisa: 28, Redacao: 45, Administrativo: 8 },
];

function formatCurrency(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function RelatoriosGerenciais() {
  return (
    <div className="p-6 bg-[#f5f5f5] min-h-screen space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <BarChart3 className="w-7 h-7 text-teal-600" />
          <h1 className="text-2xl font-semibold">Relatorios Gerenciais</h1>
        </div>
        <p className="text-muted-foreground">
          Visao consolidada do escritorio com metricas de desempenho, financeiro e prazos.
        </p>
      </div>

      <Tabs defaultValue="mensal">
        <TabsList className="w-full max-w-xl">
          <TabsTrigger value="mensal" className="flex-1 gap-1">
            <Calendar className="w-4 h-4" />
            Mensal
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="flex-1 gap-1">
            <DollarSign className="w-4 h-4" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="produtividade" className="flex-1 gap-1">
            <TrendingUp className="w-4 h-4" />
            Produtividade
          </TabsTrigger>
          <TabsTrigger value="prazos" className="flex-1 gap-1">
            <AlertTriangle className="w-4 h-4" />
            Prazos
          </TabsTrigger>
        </TabsList>

        {/* TAB: Mensal */}
        <TabsContent value="mensal" className="space-y-6 mt-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Scale className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Processos Ativos</p>
                    <p className="text-2xl font-bold">84</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Novos este Mes</p>
                    <p className="text-2xl font-bold">9</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Users className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clientes Ativos</p>
                    <p className="text-2xl font-bold">37</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Horas Registradas</p>
                    <p className="text-2xl font-bold">515h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Processos Novos vs Encerrados</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={MENSAL_PROCESSOS}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="novos" fill="#3b82f6" name="Novos" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="encerrados" fill="#10b981" name="Encerrados" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuicao por Area</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={AREAS_DISTRIBUICAO}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {AREAS_DISTRIBUICAO.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: Financeiro */}
        <TabsContent value="financeiro" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Receita Mensal</p>
                    <p className="text-2xl font-bold">{formatCurrency(88000)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Despesas Mensais</p>
                    <p className="text-2xl font-bold">{formatCurrency(33000)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Resultado Liquido</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(55000)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receitas vs Despesas (6 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={FINANCEIRO_MENSAL}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="receitas" stroke="#10b981" strokeWidth={2} name="Receitas" />
                  <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={2} name="Despesas" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Maiores Clientes por Faturamento</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Processos</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Pendente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { nome: "Empresa Alpha Ltda.", processos: 5, faturamento: 125000, pendente: 22000 },
                    { nome: "Construtora Beta S.A.", processos: 3, faturamento: 98000, pendente: 15000 },
                    { nome: "Joao da Silva Santos", processos: 2, faturamento: 45000, pendente: 8000 },
                    { nome: "Maria Oliveira", processos: 1, faturamento: 28000, pendente: 5000 },
                    { nome: "Distribuidora Gamma", processos: 4, faturamento: 72000, pendente: 18000 },
                  ].map((c) => (
                    <TableRow key={c.nome}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell className="text-center">{c.processos}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.faturamento)}</TableCell>
                      <TableCell className="text-right text-orange-600">{formatCurrency(c.pendente)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Produtividade */}
        <TabsContent value="produtividade" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Desempenho por Advogado</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Advogado</TableHead>
                    <TableHead className="text-center">Processos</TableHead>
                    <TableHead className="text-center">Horas/Mes</TableHead>
                    <TableHead className="text-center">Peticoes</TableHead>
                    <TableHead className="text-center">Taxa Cumprimento Prazos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PRODUTIVIDADE_ADVOGADOS.map((a) => (
                    <TableRow key={a.nome}>
                      <TableCell className="font-medium">{a.nome}</TableCell>
                      <TableCell className="text-center">{a.processos}</TableCell>
                      <TableCell className="text-center">{a.horasMes}h</TableCell>
                      <TableCell className="text-center">{a.peticoes}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={a.taxa >= 90 ? "bg-green-100 text-green-800" : a.taxa >= 80 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>
                          {a.taxa}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Horas por Categoria (6 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={HORAS_POR_CATEGORIA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Consultoria" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="Reuniao" stackId="a" fill="#8b5cf6" />
                  <Bar dataKey="Audiencia" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="Pesquisa" stackId="a" fill="#06b6d4" />
                  <Bar dataKey="Redacao" stackId="a" fill="#10b981" />
                  <Bar dataKey="Administrativo" stackId="a" fill="#9ca3af" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Prazos */}
        <TabsContent value="prazos" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {PRAZOS_RESUMO.map((p) => (
              <Card key={p.status}>
                <CardContent className="pt-6">
                  <Badge className={`${p.cor} mb-2`}>{p.status}</Badge>
                  <div className="flex items-end gap-2 mt-1">
                    <p className="text-3xl font-bold">{p.quantidade}</p>
                    <p className="text-sm text-muted-foreground mb-1">({p.percentual}%)</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Prazos Criticos (proximos 7 dias)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Processo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Responsavel</TableHead>
                    <TableHead className="text-center">Dias Restantes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PRAZOS_CRITICOS.map((p) => (
                    <TableRow key={p.processo}>
                      <TableCell className="font-mono text-xs">{p.processo}</TableCell>
                      <TableCell>{p.tipo}</TableCell>
                      <TableCell>
                        {new Date(p.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>{p.responsavel}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={p.dias <= 2 ? "bg-red-500 text-white" : p.dias <= 5 ? "bg-orange-500 text-white" : "bg-yellow-500 text-white"}>
                          {p.dias} dias
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cumprimento de Prazos (6 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={[
                  { mes: "Nov", taxa: 82 },
                  { mes: "Dez", taxa: 79 },
                  { mes: "Jan", taxa: 85 },
                  { mes: "Fev", taxa: 88 },
                  { mes: "Mar", taxa: 91 },
                  { mes: "Abr", taxa: 78 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis domain={[70, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="taxa" stroke="#10b981" strokeWidth={2} name="Taxa de Cumprimento" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
