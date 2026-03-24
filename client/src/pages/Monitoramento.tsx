import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { 
  Bell, Clock, Trash2, Eye, ExternalLink, RefreshCw, Plus,
  Scale, Building, AlertCircle, CheckCircle, Loader2,
  Settings
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Monitoramento {
  id: string;
  numeroProcesso: string;
  tribunal: string;
  classe?: string;
  assunto?: string;
  relator?: string;
  urlProcesso?: string;
  frequenciaMinutos: number;
  ultimaChecagem?: string;
  proximaChecagem?: string;
  contadorAndamentos: number;
  novosAndamentos: number;
  ativo: boolean;
  createdAt: string;
}

const FREQUENCIAS = [
  { valor: 60, label: "1 hora" },
  { valor: 120, label: "2 horas" },
  { valor: 360, label: "6 horas" },
  { valor: 720, label: "12 horas" },
  { valor: 1440, label: "24 horas" },
];

function formatarData(dataStr?: string): string {
  if (!dataStr) return "Nunca";
  try {
    const data = new Date(dataStr);
    return formatDistanceToNow(data, { addSuffix: true, locale: ptBR });
  } catch {
    return dataStr;
  }
}

function MonitoramentoCard({ monitoramento, onRemover, onAtualizar, onMarcarVisto }: {
  monitoramento: Monitoramento;
  onRemover: (id: string) => void;
  onAtualizar: (id: string, frequencia: number) => void;
  onMarcarVisto: (id: string) => void;
}) {
  const [editandoFrequencia, setEditandoFrequencia] = useState(false);
  const temNovos = monitoramento.novosAndamentos > 0;

  return (
    <Card 
      className={`${temNovos ? "border-primary bg-primary/5 animate-pulse" : ""}`}
      data-testid={`card-monitoramento-${monitoramento.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="h-4 w-4" />
              {monitoramento.numeroProcesso}
              {monitoramento.classe && (
                <Badge variant="outline" className="ml-1">
                  {monitoramento.classe}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Building className="h-3 w-3" />
              {monitoramento.tribunal}
            </div>
          </div>
          
          {temNovos && (
            <Badge variant="default" className="bg-red-500 animate-bounce" data-testid="badge-novos">
              <Bell className="h-3 w-3 mr-1" />
              {monitoramento.novosAndamentos} NOVO(S)
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {monitoramento.assunto && (
          <p className="text-sm text-muted-foreground">{monitoramento.assunto}</p>
        )}
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Andamentos:</span>
            <span className="ml-2 font-medium" data-testid="text-contador">
              {monitoramento.contadorAndamentos}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Frequencia:</span>
            <span className="ml-2 font-medium">
              {FREQUENCIAS.find(f => f.valor === monitoramento.frequenciaMinutos)?.label || `${monitoramento.frequenciaMinutos}min`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Ultima: {formatarData(monitoramento.ultimaChecagem)}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Proxima: {formatarData(monitoramento.proximaChecagem)}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
          {temNovos && (
            <Button 
              size="sm" 
              onClick={() => onMarcarVisto(monitoramento.id)}
              data-testid="button-marcar-visto"
            >
              <Eye className="h-4 w-4 mr-1" />
              Marcar como visto
            </Button>
          )}
          
          {monitoramento.urlProcesso && (
            <Button variant="outline" size="sm" asChild>
              <a href={monitoramento.urlProcesso} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                Ver no portal
              </a>
            </Button>
          )}

          {editandoFrequencia ? (
            <Select
              value={String(monitoramento.frequenciaMinutos)}
              onValueChange={(val) => {
                onAtualizar(monitoramento.id, parseInt(val));
                setEditandoFrequencia(false);
              }}
            >
              <SelectTrigger className="w-32" data-testid="select-frequencia">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIAS.map(f => (
                  <SelectItem key={f.valor} value={String(f.valor)}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setEditandoFrequencia(true)}
              data-testid="button-editar-frequencia"
            >
              <Settings className="h-4 w-4 mr-1" />
              Frequencia
            </Button>
          )}

          <Button 
            variant="ghost" 
            size="sm" 
            className="text-destructive"
            onClick={() => onRemover(monitoramento.id)}
            data-testid="button-remover"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Remover
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const TRIBUNAIS = [
  "STF", "STJ", "TST", "TSE", "STM",
  "TRF1", "TRF2", "TRF3", "TRF4", "TRF5", "TRF6",
  "TJAC", "TJAL", "TJAP", "TJAM", "TJBA", "TJCE", "TJDF", "TJES", "TJGO",
  "TJMA", "TJMT", "TJMS", "TJMG", "TJPA", "TJPB", "TJPR", "TJPE", "TJPI",
  "TJRJ", "TJRN", "TJRS", "TJRO", "TJRR", "TJSC", "TJSP", "TJSE", "TJTO",
];

const emptyForm = {
  numeroProcesso: "", tribunal: "STF", classe: "", assunto: "",
  relator: "", urlProcesso: "", frequenciaMinutos: 60,
};

export default function Monitoramento() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();

  const { data: monitoramentos = [], isLoading, refetch } = useQuery<Monitoramento[]>({
    queryKey: ["/api/monitoramentos"],
    refetchInterval: 30000,
  });

  const removerMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/monitoramentos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monitoramentos"] });
    },
  });

  const atualizarMutation = useMutation({
    mutationFn: async ({ id, frequenciaMinutos }: { id: string; frequenciaMinutos: number }) => {
      await apiRequest("PATCH", `/api/monitoramentos/${id}`, { frequenciaMinutos });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monitoramentos"] });
    },
  });

  const criarMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      await apiRequest("POST", "/api/monitoramentos", {
        ...data,
        frequenciaMinutos: Number(data.frequenciaMinutos),
        classe: data.classe || undefined,
        assunto: data.assunto || undefined,
        relator: data.relator || undefined,
        urlProcesso: data.urlProcesso || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monitoramentos"] });
      setDialogOpen(false);
      setForm(emptyForm);
      toast({ title: "Processo adicionado ao monitoramento!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao adicionar", description: error?.message || "Verifique os dados e tente novamente", variant: "destructive" });
    },
  });

  const marcarVistoMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/monitoramentos/${id}/marcar-visto`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monitoramentos"] });
    },
  });

  const openCreate = () => { setForm(emptyForm); setDialogOpen(true); };
  const handleSubmit = () => {
    if (!form.numeroProcesso.trim() || !form.tribunal) return;
    criarMutation.mutate(form);
  };

  const totalNovos = monitoramentos.reduce((acc, m) => acc + (m.novosAndamentos || 0), 0);
  const monitoramentosComNovos = monitoramentos.filter(m => m.novosAndamentos > 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2" data-testid="text-page-title">
            <Bell className="h-6 w-6" />
            Monitoramento de Processos
          </h1>
          <p className="text-muted-foreground">
            Acompanhe automaticamente as movimentacoes dos seus processos
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {totalNovos > 0 && (
            <Badge variant="default" className="bg-red-500" data-testid="badge-total-novos">
              {totalNovos} novo(s) andamento(s)
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-atualizar"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={openCreate} data-testid="button-adicionar">
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Processo
          </Button>
        </div>
      </div>

      {totalNovos > 0 && (
        <Card className="border-primary bg-primary/10" data-testid="card-alertas">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">
                  {monitoramentosComNovos.length} processo(s) com novos andamentos!
                </p>
                <p className="text-sm text-muted-foreground">
                  Verifique os processos destacados abaixo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : monitoramentos.length === 0 ? (
        <Card data-testid="card-vazio">
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhum processo monitorado</h3>
            <p className="text-muted-foreground mb-4">
              Adicione processos ao monitoramento pela tela de Consulta Processual
            </p>
            <Button asChild>
              <Link href="/consulta-processual">Ir para Consulta Processual</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {monitoramentosComNovos.map((m) => (
            <MonitoramentoCard
              key={m.id}
              monitoramento={m}
              onRemover={(id) => removerMutation.mutate(id)}
              onAtualizar={(id, freq) => atualizarMutation.mutate({ id, frequenciaMinutos: freq })}
              onMarcarVisto={(id) => marcarVistoMutation.mutate(id)}
            />
          ))}
          
          {monitoramentos.filter(m => m.novosAndamentos === 0).map((m) => (
            <MonitoramentoCard
              key={m.id}
              monitoramento={m}
              onRemover={(id) => removerMutation.mutate(id)}
              onAtualizar={(id, freq) => atualizarMutation.mutate({ id, frequenciaMinutos: freq })}
              onMarcarVisto={(id) => marcarVistoMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funciona o monitoramento</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            O sistema verifica automaticamente os processos monitorados na frequencia configurada.
          </p>
          <p>
            Quando novos andamentos sao detectados, voce recebe um alerta visual nesta pagina.
          </p>
          <p className="font-medium text-foreground">
            Frequencias disponiveis: 1h, 2h, 6h, 12h, 24h
          </p>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Processo ao Monitoramento</DialogTitle>
            <DialogDescription>Informe os dados do processo que deseja monitorar</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Numero do Processo *</Label>
              <Input
                value={form.numeroProcesso}
                onChange={e => setForm({ ...form, numeroProcesso: e.target.value })}
                placeholder="Ex: 0001234-56.2024.8.19.0001"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tribunal *</Label>
                <Select value={form.tribunal} onValueChange={v => setForm({ ...form, tribunal: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIBUNAIS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Frequencia de Verificacao</Label>
                <Select value={String(form.frequenciaMinutos)} onValueChange={v => setForm({ ...form, frequenciaMinutos: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIAS.map(f => <SelectItem key={f.valor} value={String(f.valor)}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Classe Processual</Label>
              <Input value={form.classe} onChange={e => setForm({ ...form, classe: e.target.value })} placeholder="Ex: Recurso Extraordinario" />
            </div>
            <div className="grid gap-2">
              <Label>Assunto</Label>
              <Input value={form.assunto} onChange={e => setForm({ ...form, assunto: e.target.value })} placeholder="Ex: Direito Civil" />
            </div>
            <div className="grid gap-2">
              <Label>Relator</Label>
              <Input value={form.relator} onChange={e => setForm({ ...form, relator: e.target.value })} placeholder="Ex: Min. Fulano" />
            </div>
            <div className="grid gap-2">
              <Label>URL do Processo</Label>
              <Input value={form.urlProcesso} onChange={e => setForm({ ...form, urlProcesso: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.numeroProcesso.trim() || criarMutation.isPending}>
              {criarMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
