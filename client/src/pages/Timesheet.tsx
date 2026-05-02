import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, DollarSign, BarChart3 } from "lucide-react";

const SAMPLE_ENTRIES = [
  { id: 1, data: "02/04/2026", advogado: "Dr. Thiago Morani", cliente: "ABC Ltda", processo: "0012345-67.2024.8.19.0001", atividade: "Pesquisa jurisprudencial - cram down", tempo: "03:00", categoria: "Pesquisa", valor: 3600 },
  { id: 2, data: "02/04/2026", advogado: "Dra. Jennifer Santos", cliente: "XYZ S.A.", processo: "0098765-43.2025.8.19.0042", atividade: "Audiência de instrução", tempo: "02:30", categoria: "Audiência", valor: 2500 },
  { id: 3, data: "01/04/2026", advogado: "Dr. Thiago Morani", cliente: "DEF Holdings", processo: "0045678-90.2024.8.19.0015", atividade: "Redação petição inicial RJ", tempo: "04:00", categoria: "Redação", valor: 4800 },
  { id: 4, data: "01/04/2026", advogado: "Dr. Thiago Morani", cliente: "GHI Corp", processo: "0034567-89.2025.5.01.0001", atividade: "Reunião com cliente", tempo: "01:00", categoria: "Reunião", valor: 1200 },
  { id: 5, data: "31/03/2026", advogado: "Dra. Jennifer Santos", cliente: "ABC Ltda", processo: "0012345-67.2024.8.19.0001", atividade: "Revisão de contrato", tempo: "02:00", categoria: "Consultoria", valor: 2000 },
];

const CATEGORIAS: Record<string, string> = {
  "Pesquisa": "bg-blue-100 text-blue-800",
  "Audiência": "bg-purple-100 text-purple-800",
  "Redação": "bg-green-100 text-green-800",
  "Reunião": "bg-yellow-100 text-yellow-800",
  "Consultoria": "bg-orange-100 text-orange-800",
  "Administrativo": "bg-gray-100 text-gray-800",
};

export default function Timesheet() {
  const totalHoras = SAMPLE_ENTRIES.reduce((acc, e) => {
    const [h, m] = e.tempo.split(":").map(Number);
    return acc + h + m / 60;
  }, 0);
  const totalValor = SAMPLE_ENTRIES.reduce((acc, e) => acc + e.valor, 0);
  const horasFaturaveis = SAMPLE_ENTRIES.filter(e => e.categoria !== "Administrativo").reduce((acc, e) => {
    const [h, m] = e.tempo.split(":").map(Number);
    return acc + h + m / 60;
  }, 0);

  return (
    <div className="p-6 bg-[#f5f5f5] min-h-screen space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Timesheet</h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de horas trabalhadas — Abril 2026</p>
        </div>
        <Button className="bg-primary"><Plus className="w-4 h-4 mr-2" /> Novo Registro</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-blue-100"><Clock className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Horas Mês</p>
                <p className="text-2xl font-bold">{totalHoras.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-green-100"><DollarSign className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">R$ {totalValor.toLocaleString("pt-BR")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-purple-100"><BarChart3 className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Horas Faturáveis</p>
                <p className="text-2xl font-bold">{horasFaturaveis.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-amber-100"><BarChart3 className="w-5 h-5 text-amber-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Taxa Aproveitamento</p>
                <p className="text-2xl font-bold">{((horasFaturaveis / totalHoras) * 100).toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm bg-white">
        <CardHeader><CardTitle className="text-base">Registros de Horas</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3">Data</th>
                  <th className="p-3">Advogado</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Atividade</th>
                  <th className="p-3">Tempo</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_ENTRIES.map(e => (
                  <tr key={e.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">{e.data}</td>
                    <td className="p-3 font-medium">{e.advogado}</td>
                    <td className="p-3">{e.cliente}</td>
                    <td className="p-3 max-w-xs truncate">{e.atividade}</td>
                    <td className="p-3 font-mono">{e.tempo}</td>
                    <td className="p-3"><Badge className={CATEGORIAS[e.categoria] || ""} variant="secondary">{e.categoria}</Badge></td>
                    <td className="p-3 text-right font-medium">R$ {e.valor.toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
