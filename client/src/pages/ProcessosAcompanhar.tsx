import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2, Search, Scale, Building, Clock, FileText,
  Plus, Trash2, RefreshCw, Eye, Database, Globe, Zap,
  Fingerprint, AlertCircle, CheckCircle2, RotateCcw, StickyNote,
  User, Briefcase, Hash, Bell, BellOff, CheckCheck, ArrowUpDown, X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ProcessoAcompanhado } from "@shared/schema";

interface Movimentacao {
  data: string;
  descricao: string;
  detalhes?: string;
}

interface ProcessoResultado {
  numero: string;
  numero_unico?: string;
  classe?: string;
  assunto?: string;
  tribunal: string;
  movimentacoes?: Movimentacao[];
  url?: string;
  relator?: string;
  origem?: string;
  partes?: string[];
}

interface ConsultaResultado {
  tribunal: string;
  processos: ProcessoResultado[];
  erro?: string;
  fonte?: string;
  fonte_label?: string;
  total_encontrados: number;
}

interface TribunalDetectado {
  detectado: boolean;
  tribunal: string | null;
  info: { sigla: string; nome: string; ativo: boolean } | null;
}

type TipoBusca = "numero" | "nome" | "oab" | "cnpj";

const TRIBUNAIS_PARTE = [
  { sigla: "STF", nome: "Supremo Tribunal Federal", ativo: true },
  { sigla: "STJ", nome: "Superior Tribunal de Justiça", ativo: true },
  { sigla: "TRF2", nome: "TRF 2ª Região (RJ/ES)", ativo: true },
  { sigla: "TJRJ", nome: "TJ Rio de Janeiro", ativo: true },
  { sigla: "TJSP", nome: "TJ São Paulo", ativo: true },
  { sigla: "TJMG", nome: "TJ Minas Gerais", ativo: true },
];

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function FonteBadge({ fonte }: { fonte?: string | null }) {
  if (!fonte) return null;
  const config =
    fonte === "datajud"
      ? { label: "DataJud", icon: Database, cls: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20" }
      : fonte === "tecjustica"
      ? { label: "TecJustiça MCP", icon: Zap, cls: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20" }
      : fonte === "pje_autenticado"
      ? { label: "PJe Auth", icon: Fingerprint, cls: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20" }
      : { label: "Portal", icon: Globe, cls: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20" };
  const Icon = config.icon;
  return (
    <Badge variant="secondary" className={config.cls}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

function AddAnnotationDialog({
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (anotacao: string) => void;
  isPending: boolean;
}) {
  const [anotacao, setAnotacao] = useState("");
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar aos Acompanhados</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="anotacao-dialog">Anotação (opcional)</Label>
          <Textarea
            id="anotacao-dialog"
            data-testid="textarea-anotacao-dialog"
            placeholder="Ex: Falência da Empresa X, Interesse cliente Y..."
            value={anotacao}
            onChange={(e) => setAnotacao(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => { onConfirm(anotacao); setAnotacao(""); }}
            disabled={isPending}
            data-testid="button-confirmar-adicionar"
          >
            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProcessoBuscaCard({
  processo,
  fonte,
  acompanhados,
}: {
  processo: ProcessoResultado;
  fonte?: string;
  acompanhados: ProcessoAcompanhado[];
}) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const numeroKey = processo.numero_unico || processo.numero;
  const jaAcompanhado = acompanhados.some((a) => a.numeroProcesso === numeroKey);

  const addMutation = useMutation({
    mutationFn: async (anotacao: string) => {
      const movs = processo.movimentacoes || [];
      const ultimo = movs[0];
      const res = await apiRequest("POST", "/api/acompanhamentos", {
        numeroProcesso: numeroKey,
        classe: processo.classe || null,
        assunto: processo.assunto || null,
        tribunal: processo.tribunal,
        ultimoAndamento: ultimo?.descricao || null,
        dataUltimoAndamento: ultimo?.data || null,
        fonte: fonte || null,
        anotacao: anotacao || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acompanhamentos"] });
      setDialogOpen(false);
      toast({ title: "Processo adicionado aos acompanhados!" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar processo", variant: "destructive" });
    },
  });

  return (
    <>
      <Card data-testid={`card-resultado-${numeroKey.replace(/\W/g, "")}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                <Scale className="h-4 w-4 text-primary flex-shrink-0" />
                {processo.numero}
                {processo.classe && <Badge variant="default">{processo.classe}</Badge>}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{processo.tribunal}</p>
            </div>
            <Button
              size="sm"
              variant={jaAcompanhado ? "secondary" : "default"}
              onClick={() => { if (!jaAcompanhado) setDialogOpen(true); }}
              disabled={jaAcompanhado || addMutation.isPending}
              data-testid={`button-adicionar-acompanhado-${numeroKey.replace(/\W/g, "")}`}
            >
              {jaAcompanhado ? (
                <><CheckCircle2 className="h-4 w-4 mr-1" />Acompanhando</>
              ) : (
                <><Eye className="h-4 w-4 mr-1" />Acompanhar</>
              )}
            </Button>
          </div>
        </CardHeader>
        {(processo.assunto || (processo.movimentacoes && processo.movimentacoes.length > 0)) && (
          <CardContent className="pt-0 space-y-1">
            {processo.assunto && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3 flex-shrink-0" />
                {processo.assunto}
              </p>
            )}
            {processo.movimentacoes && processo.movimentacoes.length > 0 && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 flex-shrink-0" />
                {processo.movimentacoes[0].data} — {processo.movimentacoes[0].descricao}
              </p>
            )}
          </CardContent>
        )}
      </Card>

      <AddAnnotationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={(anotacao) => addMutation.mutate(anotacao)}
        isPending={addMutation.isPending}
      />
    </>
  );
}

function ProcessoAcompanhadoCard({ item }: { item: ProcessoAcompanhado }) {
  const { toast } = useToast();
  const [editingAnotacao, setEditingAnotacao] = useState(false);
  const [anotacaoLocal, setAnotacaoLocal] = useState(item.anotacao || "");

  const temNovos = (item.novosAndamentos ?? 0) > 0;

  const marcarVistoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/acompanhamentos/${item.id}/marcar-visto`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acompanhamentos"] });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/acompanhamentos/${item.id}`, { refresh: true });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acompanhamentos"] });
      toast({ title: "Processo atualizado!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar processo", variant: "destructive" });
    },
  });

  const updateAnotacaoMutation = useMutation({
    mutationFn: async (anotacao: string) => {
      const res = await apiRequest("PATCH", `/api/acompanhamentos/${item.id}`, { anotacao });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acompanhamentos"] });
      setEditingAnotacao(false);
      toast({ title: "Anotação salva!" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar anotação", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/acompanhamentos/${item.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acompanhamentos"] });
      toast({ title: "Processo removido dos acompanhados" });
    },
    onError: () => {
      toast({ title: "Erro ao remover processo", variant: "destructive" });
    },
  });

  const updatedAt = item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("pt-BR") : null;
  const ultimaVerificacao = item.ultimaVerificacao
    ? new Date(item.ultimaVerificacao).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Card
      data-testid={`card-acompanhado-${item.id}`}
      className={temNovos ? "border-primary/40 bg-primary/5" : ""}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Scale className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="font-medium text-sm" data-testid={`text-numero-${item.id}`}>
                {item.numeroProcesso}
              </span>
              {item.classe && <Badge variant="default">{item.classe}</Badge>}
              <FonteBadge fonte={item.fonte} />
              {temNovos && (
                <Badge
                  variant="destructive"
                  data-testid={`badge-novos-andamentos-${item.id}`}
                  className="gap-1"
                >
                  <Bell className="h-3 w-3" />
                  {item.novosAndamentos} novo{(item.novosAndamentos ?? 0) > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Building className="h-3 w-3 flex-shrink-0" />
              {item.tribunal}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {temNovos && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => marcarVistoMutation.mutate()}
                disabled={marcarVistoMutation.isPending}
                data-testid={`button-marcar-visto-${item.id}`}
                title="Marcar como visto"
              >
                {marcarVistoMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4 text-primary" />
                )}
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              data-testid={`button-atualizar-${item.id}`}
              title="Atualizar processo"
            >
              {refreshMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              data-testid={`button-remover-${item.id}`}
              title="Remover dos acompanhados"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {item.assunto && (
          <p className="text-sm text-muted-foreground flex items-start gap-1">
            <FileText className="h-3 w-3 flex-shrink-0 mt-0.5" />
            <span data-testid={`text-assunto-${item.id}`}>{item.assunto}</span>
          </p>
        )}

        {item.ultimoAndamento && (
          <div className={`flex items-start gap-1 p-2 rounded-md ${temNovos ? "bg-primary/10 border border-primary/20" : "bg-muted/40"}`}>
            <Clock className={`h-3 w-3 flex-shrink-0 mt-0.5 ${temNovos ? "text-primary" : "text-muted-foreground"}`} />
            <div className="flex-1 min-w-0">
              {item.dataUltimoAndamento && (
                <span className="text-xs font-medium text-primary mr-2" data-testid={`text-data-andamento-${item.id}`}>
                  {item.dataUltimoAndamento}
                </span>
              )}
              <span className="text-sm" data-testid={`text-ultimo-andamento-${item.id}`}>
                {item.ultimoAndamento}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {updatedAt && (
            <span>Atualizado: {updatedAt}</span>
          )}
          {ultimaVerificacao && (
            <span data-testid={`text-ultima-verificacao-${item.id}`}>
              Verificado: {ultimaVerificacao}
            </span>
          )}
        </div>

        {editingAnotacao ? (
          <div className="space-y-2">
            <Textarea
              value={anotacaoLocal}
              onChange={(e) => setAnotacaoLocal(e.target.value)}
              rows={2}
              placeholder="Anotação livre..."
              data-testid={`textarea-anotacao-${item.id}`}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => updateAnotacaoMutation.mutate(anotacaoLocal)}
                disabled={updateAnotacaoMutation.isPending}
                data-testid={`button-salvar-anotacao-${item.id}`}
              >
                {updateAnotacaoMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                setEditingAnotacao(false);
                setAnotacaoLocal(item.anotacao || "");
              }}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button
            className="flex items-start gap-1 text-left w-full group"
            onClick={() => setEditingAnotacao(true)}
            data-testid={`button-editar-anotacao-${item.id}`}
          >
            <StickyNote className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5 group-hover:text-primary" />
            <span className={`text-sm ${item.anotacao ? "text-foreground" : "text-muted-foreground italic"} group-hover:text-primary`}>
              {item.anotacao || "Adicionar anotação..."}
            </span>
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function SearchByNumber({
  acompanhados,
}: {
  acompanhados: ProcessoAcompanhado[];
}) {
  const [termoBusca, setTermoBusca] = useState("");
  const [tribunalDetectado, setTribunalDetectado] = useState<TribunalDetectado | null>(null);
  const [resultado, setResultado] = useState<ConsultaResultado | null>(null);
  const debouncedTermo = useDebounce(termoBusca, 500);

  useEffect(() => {
    const detectar = async () => {
      if (!debouncedTermo || debouncedTermo.trim().length < 2) {
        setTribunalDetectado(null);
        return;
      }
      try {
        const res = await fetch(`/api/detectar-tribunal/${encodeURIComponent(debouncedTermo.trim())}`);
        if (res.ok) setTribunalDetectado(await res.json());
        else setTribunalDetectado(null);
      } catch {
        setTribunalDetectado(null);
      }
    };
    detectar();
  }, [debouncedTermo]);

  const consultaMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/consulta-processual", {
        tribunal: tribunalDetectado!.tribunal,
        tipoBusca: "numero",
        termoBusca: termoBusca.trim(),
      });
      return response.json() as Promise<ConsultaResultado>;
    },
    onSuccess: (data) => setResultado(data),
  });

  const canSubmit = tribunalDetectado?.detectado && termoBusca.trim().length > 0 && !consultaMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="termoBusca">Número do Processo</Label>
        <Input
          id="termoBusca"
          data-testid="input-termo-busca"
          placeholder="Ex: ADI 1, PET 13350, 0000001-23.2024.8.19.0001"
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          className="text-lg"
        />
        <p className="text-xs text-muted-foreground">
          Formatos: Classe + Número (ADI 1, REsp 123456) ou CNJ (0000001-23.2024.8.19.0001) — tribunal detectado automaticamente
        </p>
      </div>

      {tribunalDetectado && (
        <div className={`p-3 rounded-md ${
          tribunalDetectado.detectado && tribunalDetectado.info?.ativo
            ? "bg-primary/10 border border-primary/20"
            : "bg-muted"
        }`} data-testid="tribunal-detectado">
          {tribunalDetectado.detectado ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Building className="h-4 w-4" />
              <span className="font-medium">{tribunalDetectado.tribunal}</span>
              <span className="text-sm text-muted-foreground">{tribunalDetectado.info?.nome}</span>
              <Badge variant="default">Disponível</Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Tribunal não detectado. Verifique o formato.</p>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={!canSubmit} onClick={() => { setResultado(null); consultaMutation.mutate(); }} data-testid="button-buscar">
          {consultaMutation.isPending
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Consultando...</>
            : <><Search className="h-4 w-4 mr-2" />Buscar</>}
        </Button>
      </div>

      {consultaMutation.isPending && (
        <div className="py-8 text-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          Consultando {tribunalDetectado?.tribunal}...
        </div>
      )}

      {resultado && !consultaMutation.isPending && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">Resultados:</span>
            <FonteBadge fonte={resultado.fonte} />
            <Badge variant={resultado.processos.length > 0 ? "default" : "secondary"} data-testid="badge-total">
              {resultado.total_encontrados} processo(s)
            </Badge>
          </div>

          {resultado.erro && (
            <Card className="border-destructive bg-destructive/5">
              <CardContent className="py-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{resultado.erro}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {resultado.processos.length === 0 && !resultado.erro && (
            <div className="py-6 text-center text-muted-foreground">
              <Scale className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum processo encontrado</p>
            </div>
          )}

          {resultado.processos.map((processo, i) => (
            <ProcessoBuscaCard key={i} processo={processo} fonte={resultado.fonte} acompanhados={acompanhados} />
          ))}
        </div>
      )}
    </div>
  );
}

function SearchByParte({
  acompanhados,
}: {
  acompanhados: ProcessoAcompanhado[];
}) {
  const { toast } = useToast();
  const [tipoBusca, setTipoBusca] = useState<"nome" | "oab" | "cnpj">("nome");
  const [termo, setTermo] = useState("");
  const [oabUF, setOabUF] = useState("SP");
  const [tribunaisSelecionados, setTribunaisSelecionados] = useState<string[]>(["STF"]);
  const [resultados, setResultados] = useState<Array<ConsultaResultado & { tribunalBuscado: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleTribunal = (sigla: string) => {
    const t = TRIBUNAIS_PARTE.find((t) => t.sigla === sigla);
    if (!t?.ativo) return;
    setTribunaisSelecionados((prev) =>
      prev.includes(sigla) ? prev.filter((s) => s !== sigla) : [...prev, sigla]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termo.trim() || tribunaisSelecionados.length === 0 || isLoading) return;
    setResultados([]);
    setIsLoading(true);
    try {
      const termoBusca = tipoBusca === "oab" ? `${termo.trim()}/${oabUF}` : termo.trim();
      const promises = tribunaisSelecionados.map(async (tribunal) => {
        try {
          const res = await apiRequest("POST", "/api/consulta-processual", {
            tribunal,
            tipoBusca,
            termoBusca,
          });
          const data = await res.json();
          return { ...data, tribunalBuscado: tribunal } as ConsultaResultado & { tribunalBuscado: string };
        } catch {
          return {
            tribunal,
            tribunalBuscado: tribunal,
            processos: [],
            erro: "Erro ao consultar tribunal",
            total_encontrados: 0,
          } as ConsultaResultado & { tribunalBuscado: string };
        }
      });
      const results = await Promise.all(promises);
      setResultados(results);
    } finally {
      setIsLoading(false);
    }
  };

  const allProcessos = resultados.flatMap((r) => r.processos.map((p) => ({ ...p, _fonte: r.fonte })));
  const totalEncontrados = resultados.reduce((acc, r) => acc + r.total_encontrados, 0);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo de Busca</Label>
        <div className="flex gap-4 flex-wrap">
          {([
            { value: "nome", label: "Nome da Parte", icon: User },
            { value: "cnpj", label: "CNPJ/CPF", icon: Building },
            { value: "oab", label: "OAB", icon: Briefcase },
          ] as const).map(({ value, label, icon: Icon }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="tipoBuscaParte"
                value={value}
                checked={tipoBusca === value}
                onChange={() => setTipoBusca(value)}
                className="accent-primary"
              />
              <Icon className="h-4 w-4" />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="termo-parte">
            {tipoBusca === "nome" ? "Nome da Parte" : tipoBusca === "cnpj" ? "CNPJ/CPF" : "Número da OAB"}
          </Label>
          <Input
            id="termo-parte"
            data-testid="input-termo-parte"
            placeholder={
              tipoBusca === "nome" ? "Ex: João da Silva" : tipoBusca === "cnpj" ? "Ex: 00.000.000/0001-00" : "Ex: 123456"
            }
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
          />
        </div>
        {tipoBusca === "oab" && (
          <div className="space-y-2">
            <Label htmlFor="oabUF">Estado da OAB</Label>
            <select
              id="oabUF"
              data-testid="select-oab-uf"
              value={oabUF}
              onChange={(e) => setOabUF(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Tribunais</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {TRIBUNAIS_PARTE.map((t) => (
            <label
              key={t.sigla}
              className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer ${
                tribunaisSelecionados.includes(t.sigla)
                  ? "bg-primary/10 border-primary/30"
                  : "bg-background border-muted"
              }`}
              data-testid={`checkbox-tribunal-${t.sigla.toLowerCase()}`}
            >
              <Checkbox
                checked={tribunaisSelecionados.includes(t.sigla)}
                onCheckedChange={() => handleToggleTribunal(t.sigla)}
              />
              <span className="text-sm font-medium">{t.sigla}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit as any}
          disabled={!termo.trim() || tribunaisSelecionados.length === 0 || isLoading}
          data-testid="button-buscar-parte"
        >
          {isLoading
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Buscando...</>
            : <><Search className="h-4 w-4 mr-2" />Buscar em {tribunaisSelecionados.length} tribunal(is)</>}
        </Button>
      </div>

      {isLoading && (
        <div className="py-8 text-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          Consultando {tribunaisSelecionados.length} tribunal(is)...
        </div>
      )}

      {resultados.length > 0 && !isLoading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Resultados:</span>
            <Badge variant={totalEncontrados > 0 ? "default" : "secondary"}>
              {totalEncontrados} processo(s) em {resultados.length} tribunal(is)
            </Badge>
          </div>
          {resultados.map((r) => r.erro && (
            <div key={r.tribunalBuscado} className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              <span>{r.tribunalBuscado}: {r.erro}</span>
            </div>
          ))}
          {allProcessos.length === 0 && (
            <div className="py-6 text-center text-muted-foreground">
              <Scale className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum processo encontrado</p>
            </div>
          )}
          {allProcessos.map((processo, i) => (
            <ProcessoBuscaCard key={i} processo={processo} fonte={processo._fonte} acompanhados={acompanhados} />
          ))}
        </div>
      )}
    </div>
  );
}

type OrdemLista = "recente" | "antigo" | "tribunal" | "numero" | "novos";

export default function ProcessosAcompanhar() {
  const { toast } = useToast();
  const [searchMode, setSearchMode] = useState<"numero" | "parte">("numero");
  const [atualizandoTodos, setAtualizandoTodos] = useState(false);
  const [progressoAtualizacao, setProgressoAtualizacao] = useState(0);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [ordemLista, setOrdemLista] = useState<OrdemLista>("recente");

  const { data: acompanhados = [], isLoading: loadingAcompanhados } = useQuery<ProcessoAcompanhado[]>({
    queryKey: ["/api/acompanhamentos"],
    refetchInterval: 60 * 1000, // poll a cada minuto para refletir o job de background
  });

  const totalNovosAndamentos = acompanhados.reduce((acc, i) => acc + (i.novosAndamentos ?? 0), 0);
  const processosComNovos = acompanhados.filter((i) => (i.novosAndamentos ?? 0) > 0).length;

  const acompanhadosFiltrados = useMemo(() => {
    const q = filtroTexto.trim().toLowerCase();
    let lista = q
      ? acompanhados.filter(
          (item) =>
            item.numeroProcesso.toLowerCase().includes(q) ||
            (item.tribunal ?? "").toLowerCase().includes(q) ||
            (item.assunto ?? "").toLowerCase().includes(q) ||
            (item.classe ?? "").toLowerCase().includes(q) ||
            (item.anotacao ?? "").toLowerCase().includes(q)
        )
      : [...acompanhados];

    switch (ordemLista) {
      case "recente":
        lista.sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime());
        break;
      case "antigo":
        lista.sort((a, b) => new Date(a.updatedAt ?? 0).getTime() - new Date(b.updatedAt ?? 0).getTime());
        break;
      case "tribunal":
        lista.sort((a, b) => (a.tribunal ?? "").localeCompare(b.tribunal ?? "", "pt-BR"));
        break;
      case "numero":
        lista.sort((a, b) => a.numeroProcesso.localeCompare(b.numeroProcesso, "pt-BR"));
        break;
      case "novos":
        lista.sort((a, b) => (b.novosAndamentos ?? 0) - (a.novosAndamentos ?? 0));
        break;
    }
    return lista;
  }, [acompanhados, filtroTexto, ordemLista]);

  const marcarTodosVistosMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/acompanhamentos/marcar-todos-vistos", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acompanhamentos"] });
      toast({ title: "Todos os alertas foram marcados como vistos" });
    },
    onError: () => {
      toast({ title: "Erro ao marcar como vistos", variant: "destructive" });
    },
  });

  const handleAtualizarTodos = async () => {
    if (acompanhados.length === 0) return;
    setAtualizandoTodos(true);
    setProgressoAtualizacao(0);

    for (let i = 0; i < acompanhados.length; i++) {
      try {
        await apiRequest("PATCH", `/api/acompanhamentos/${acompanhados[i].id}`, { refresh: true });
      } catch {
        // continue on individual failures
      }
      setProgressoAtualizacao(i + 1);
    }

    queryClient.invalidateQueries({ queryKey: ["/api/acompanhamentos"] });
    setAtualizandoTodos(false);
    setProgressoAtualizacao(0);
    toast({ title: "Todos os processos foram atualizados!" });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
          Processos a Acompanhar
        </h1>
        <p className="text-muted-foreground">
          Adicione processos de interesse para acompanhar continuamente — falências, casos de referência, concorrentes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Processo para Acompanhar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={searchMode === "numero" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchMode("numero")}
              data-testid="button-modo-numero"
            >
              <Hash className="h-4 w-4 mr-1" />
              Por Número
            </Button>
            <Button
              variant={searchMode === "parte" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchMode("parte")}
              data-testid="button-modo-parte"
            >
              <User className="h-4 w-4 mr-1" />
              Por Parte / OAB / CNPJ
            </Button>
          </div>

          {searchMode === "numero" ? (
            <SearchByNumber acompanhados={acompanhados} />
          ) : (
            <SearchByParte acompanhados={acompanhados} />
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold" data-testid="text-lista-titulo">
                Processos Acompanhados
              </h2>
              {totalNovosAndamentos > 0 && (
                <Badge
                  variant="destructive"
                  data-testid="badge-total-novos"
                  className="gap-1"
                >
                  <Bell className="h-3 w-3" />
                  {totalNovosAndamentos} novo{totalNovosAndamentos > 1 ? "s" : ""} em {processosComNovos} processo{processosComNovos > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {filtroTexto
                ? `${acompanhadosFiltrados.length} de ${acompanhados.length} processo(s)`
                : `${acompanhados.length} processo(s) na lista de vigilância`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {totalNovosAndamentos > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => marcarTodosVistosMutation.mutate()}
                disabled={marcarTodosVistosMutation.isPending}
                data-testid="button-marcar-todos-vistos"
              >
                {marcarTodosVistosMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BellOff className="h-4 w-4 mr-2" />
                )}
                Marcar todos como vistos
              </Button>
            )}
            {acompanhados.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAtualizarTodos}
                disabled={atualizandoTodos}
                data-testid="button-atualizar-todos"
              >
                {atualizandoTodos ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Atualizando {progressoAtualizacao}/{acompanhados.length}...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Atualizar Todos
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Barra de filtro e ordenação — visível somente quando há processos */}
        {acompanhados.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                data-testid="input-filtro-lista"
                placeholder="Filtrar por número, tribunal, assunto, anotação..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="pl-9 pr-9"
              />
              {filtroTexto && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setFiltroTexto("")}
                  data-testid="button-limpar-filtro"
                  aria-label="Limpar filtro"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Select
                value={ordemLista}
                onValueChange={(v) => setOrdemLista(v as OrdemLista)}
              >
                <SelectTrigger
                  className="w-48"
                  data-testid="select-ordem-lista"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recente">Mais recente</SelectItem>
                  <SelectItem value="antigo">Mais antigo</SelectItem>
                  <SelectItem value="novos">Com novos andamentos</SelectItem>
                  <SelectItem value="tribunal">Por tribunal (A-Z)</SelectItem>
                  <SelectItem value="numero">Por número (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {loadingAcompanhados ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
              <p className="text-muted-foreground">Carregando lista...</p>
            </CardContent>
          </Card>
        ) : acompanhados.length === 0 ? (
          <Card data-testid="card-lista-vazia">
            <CardContent className="py-12 text-center">
              <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-40" />
              <p className="font-medium text-muted-foreground">Nenhum processo na lista de vigilância</p>
              <p className="text-sm text-muted-foreground mt-1">
                Busque um processo acima e clique em "Acompanhar" para adicioná-lo
              </p>
            </CardContent>
          </Card>
        ) : acompanhadosFiltrados.length === 0 ? (
          <Card data-testid="card-filtro-sem-resultado">
            <CardContent className="py-10 text-center">
              <Search className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
              <p className="font-medium text-muted-foreground">Nenhum processo encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tente outros termos ou{" "}
                <button
                  className="text-primary underline underline-offset-2"
                  onClick={() => setFiltroTexto("")}
                >
                  limpe o filtro
                </button>
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="lista-acompanhados">
            {acompanhadosFiltrados.map((item) => (
              <ProcessoAcompanhadoCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
