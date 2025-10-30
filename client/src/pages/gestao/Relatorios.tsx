import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Relatorios() {
  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Performance e métricas do escritório
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="mes">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Esta Semana</SelectItem>
              <SelectItem value="mes">Este Mês</SelectItem>
              <SelectItem value="trimestre">Este Trimestre</SelectItem>
              <SelectItem value="ano">Este Ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Novos Processos</p>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">12</p>
            <p className="text-xs text-green-600">+15% vs mês anterior</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Processos Concluídos</p>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">8</p>
            <p className="text-xs text-green-600">+20% vs mês anterior</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">87%</p>
            <p className="text-xs text-green-600">+3% vs mês anterior</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Receita Mensal</p>
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">R$ 125k</p>
            <p className="text-xs text-red-600">-5% vs mês anterior</p>
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
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Ativos</span>
                  <span className="text-sm font-semibold">45 (56%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: "56%" }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Movimentados</span>
                  <span className="text-sm font-semibold">25 (31%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: "31%" }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Parados</span>
                  <span className="text-sm font-semibold">7 (9%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-gray-600 h-2 rounded-full" style={{ width: "9%" }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Incompletos</span>
                  <span className="text-sm font-semibold">3 (4%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-orange-600 h-2 rounded-full" style={{ width: "4%" }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Performance da Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
                    TG
                  </div>
                  <div>
                    <p className="font-medium">Thiago Gomes</p>
                    <p className="text-xs text-muted-foreground">15 processos</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">95%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-600 flex items-center justify-center text-white font-semibold">
                    MC
                  </div>
                  <div>
                    <p className="font-medium">Maria Costa</p>
                    <p className="text-xs text-muted-foreground">12 processos</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">92%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                    RS
                  </div>
                  <div>
                    <p className="font-medium">Roberto Silva</p>
                    <p className="text-xs text-muted-foreground">8 processos</p>
                  </div>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800">88%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Áreas de Atuação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Cível</p>
              <p className="text-2xl font-bold mb-2">32</p>
              <p className="text-xs text-muted-foreground">40% do total</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Trabalhista</p>
              <p className="text-2xl font-bold mb-2">28</p>
              <p className="text-xs text-muted-foreground">35% do total</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Empresarial</p>
              <p className="text-2xl font-bold mb-2">20</p>
              <p className="text-xs text-muted-foreground">25% do total</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
