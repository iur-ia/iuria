import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RelatoriosAtividades() {
  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Relatórios de Atividades
          </h1>
          <p className="text-sm text-muted-foreground">
            Métricas e produtividade da equipe
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
              <p className="text-sm text-muted-foreground">Tarefas Concluídas</p>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">42</p>
            <p className="text-xs text-green-600">+18% vs mês anterior</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Tarefas Pendentes</p>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">18</p>
            <p className="text-xs text-blue-600">Em andamento</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Tarefas Atrasadas</p>
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">5</p>
            <p className="text-xs text-red-600">Requer atenção</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">87%</p>
            <p className="text-xs text-green-600">+5% vs mês anterior</p>
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
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Tarefas Jurídicas</span>
                  <span className="text-sm font-semibold">28 (47%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: "47%" }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Intimações</span>
                  <span className="text-sm font-semibold">18 (30%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-orange-600 h-2 rounded-full" style={{ width: "30%" }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Audiências</span>
                  <span className="text-sm font-semibold">8 (13%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: "13%" }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Compromissos</span>
                  <span className="text-sm font-semibold">6 (10%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: "10%" }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Produtividade por Membro</CardTitle>
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
                    <p className="text-xs text-muted-foreground">18 tarefas concluídas</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">100%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-600 flex items-center justify-center text-white font-semibold">
                    MC
                  </div>
                  <div>
                    <p className="font-medium">Maria Costa</p>
                    <p className="text-xs text-muted-foreground">15 tarefas concluídas</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">94%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                    RS
                  </div>
                  <div>
                    <p className="font-medium">Roberto Silva</p>
                    <p className="text-xs text-muted-foreground">9 tarefas concluídas</p>
                  </div>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800">75%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Tempo Médio de Conclusão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Tarefas Simples</p>
              <p className="text-2xl font-bold mb-2">2.5 dias</p>
              <p className="text-xs text-green-600">-0.5 dias vs meta</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Tarefas Médias</p>
              <p className="text-2xl font-bold mb-2">5.2 dias</p>
              <p className="text-xs text-green-600">-0.8 dias vs meta</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Tarefas Complexas</p>
              <p className="text-2xl font-bold mb-2">12.8 dias</p>
              <p className="text-xs text-red-600">+2.8 dias vs meta</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Média Geral</p>
              <p className="text-2xl font-bold mb-2">6.8 dias</p>
              <p className="text-xs text-muted-foreground">Dentro da meta</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
