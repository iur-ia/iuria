import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Loader2,
  Scale,
  BookOpen,
  Building2,
  Gavel,
  ExternalLink,
  Info,
  Send,
  AlertCircle,
  Clock,
  User,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScrapingLog {
  ts: string;
  level: "info" | "warn" | "error";
  msg: string;
}

interface ScrapingResult<T = unknown> {
  source: string;
  sourceLabel: string;
  data: T;
  markdownContent: string;
  durationMs: number;
  logs: ScrapingLog[];
  error?: string;
}

interface ProcessoScrapeData {
  numero: string;
  tribunal: string;
  classe?: string;
  assunto?: string;
  relator?: string;
  vara?: string;
  partes: string[];
  movimentacoes: { data: string; descricao: string; detalhes?: string }[];
  documentos: { titulo: string; link?: string }[];
  urlPortal?: string;
  situacao?: string;
}

interface JurisprudenciaItem {
  tribunal: string;
  numero?: string;
  ementa: string;
  relator?: string;
  data?: string;
  tema?: string;
  link?: string;
}

interface DoutrinaItem {
  titulo: string;
  autor?: string;
  resumo?: string;
  link?: string;
  fonte?: string;
  ano?: string;
}

interface EmpresaData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacao?: string;
  atividadePrincipal?: string;
  atividadesSecundarias?: string[];
  endereco?: string;
  municipio?: string;
  uf?: string;
  telefone?: string;
  email?: string;
  naturezaJuridica?: string;
  capitalSocial?: string;
  porte?: string;
  dataAbertura?: string;
  socios?: { nome: string; qualificacao?: string }[];
}

const SOURCE_COLORS: Record<string, string> = {
  datajud: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  esaj: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  stj: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  stf: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  trf: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  brasilapi: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  receita_federal: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  cnj_biblioteca: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  senado: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
};

function SourceBadge({ source, label }: { source: string; label: string }) {
  const cls = SOURCE_COLORS[source] || "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      <CheckCircle2 className="w-3 h-3" />
      {label}
    </span>
  );
}

function DurationBadge({ ms }: { ms: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="w-3 h-3" />
      {(ms / 1000).toFixed(1)}s
    </span>
  );
}

function useLexosInject() {
  const { toast } = useToast();
  return (markdown: string, label: string) => {
    if (!markdown) return;
    try {
      sessionStorage.setItem("iuria_ia_inject", JSON.stringify({ text: markdown, label }));
      toast({
        title: "Conteúdo enviado à IA",
        description: `"${label}" foi injetado no contexto do chat. Abra a IA para continuar.`,
      });
    } catch {
      toast({ title: "Erro", description: "Não foi possível enviar à IA.", variant: "destructive" });
    }
  };
}

// ─── ABA PROCESSOS ───────────────────────────────────────────────────────────

function AbaProcessos() {
  const [numero, setNumero] = useState("");
  const [query, setQuery] = useState("");
  const injectLexos = useLexosInject();

  const { data, isFetching, error, refetch } = useQuery<ScrapingResult<ProcessoScrapeData | null>>({
    queryKey: ["/api/pesquisa/processo", query],
    queryFn: async () => {
      const res = await fetch(`/api/pesquisa/processo/${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error((await res.json()).error || "Erro");
      return res.json();
    },
    enabled: false,
    retry: false,
  });

  const processo = data?.data;

  const handleBuscar = () => {
    const n = numero.trim();
    if (!n) return;
    setQuery(n);
    setTimeout(() => refetch(), 0);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="input-processo-numero">Número CNJ do Processo</Label>
              <Input
                id="input-processo-numero"
                data-testid="input-processo-numero"
                placeholder="0000000-00.0000.0.00.0000"
                value={numero}
                onChange={e => setNumero(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleBuscar()}
                className="font-mono"
              />
            </div>
            <Button
              data-testid="button-buscar-processo"
              onClick={handleBuscar}
              disabled={isFetching || !/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/.test(numero.trim())}
            >
              {isFetching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
              {isFetching ? "Buscando..." : "Consultar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isFetching && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Consultando portais dos tribunais... (pode levar até 20s)</p>
          </CardContent>
        </Card>
      )}

      {!isFetching && error && (
        <Card className="border-destructive/30">
          <CardContent className="py-4 flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {String(error)}
          </CardContent>
        </Card>
      )}

      {!isFetching && data && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base" data-testid="text-processo-numero">
                {processo ? `Processo ${processo.numero}` : "Processo não encontrado"}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <SourceBadge source={data.source} label={data.sourceLabel} />
                <DurationBadge ms={data.durationMs} />
                {data.markdownContent && (
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid="button-enviar-ia-processo"
                    onClick={() => injectLexos(data.markdownContent, `Processo ${processo?.numero || query}`)}
                  >
                    <Send className="w-3 h-3 mr-1" /> Enviar à IA
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          {processo ? (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {processo.classe && (
                  <div>
                    <span className="font-medium text-muted-foreground">Classe:</span>{" "}
                    <span data-testid="text-processo-classe">{processo.classe}</span>
                  </div>
                )}
                {processo.assunto && (
                  <div>
                    <span className="font-medium text-muted-foreground">Assunto:</span>{" "}
                    <span>{processo.assunto}</span>
                  </div>
                )}
                {processo.vara && (
                  <div>
                    <span className="font-medium text-muted-foreground">Vara/Órgão:</span>{" "}
                    <span>{processo.vara}</span>
                  </div>
                )}
                {processo.tribunal && (
                  <div>
                    <span className="font-medium text-muted-foreground">Tribunal:</span>{" "}
                    <span>{processo.tribunal}</span>
                  </div>
                )}
              </div>

              {processo.partes.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Partes
                  </p>
                  <div className="space-y-1">
                    {processo.partes.slice(0, 8).map((p, i) => (
                      <div key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                        <span className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {processo.movimentacoes.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Movimentações ({processo.movimentacoes.length})
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {processo.movimentacoes.slice(0, 20).map((m, i) => (
                      <div key={i} className="text-sm border-l-2 border-muted pl-3 py-0.5" data-testid={`row-movimentacao-${i}`}>
                        <span className="font-mono text-xs text-muted-foreground">{m.data}</span>
                        <p>{m.descricao}</p>
                        {m.detalhes && <p className="text-xs text-muted-foreground">{m.detalhes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {processo.urlPortal && (
                <a
                  href={processo.urlPortal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  data-testid="link-portal-tribunal"
                >
                  <ExternalLink className="w-3 h-3" /> Abrir no portal do tribunal
                </a>
              )}
            </CardContent>
          ) : (
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              {data.error || "Processo não encontrado nos portais consultados."}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── ABA JURISPRUDÊNCIA ───────────────────────────────────────────────────────

const TRIBUNAIS_JUR = [
  { value: "TODOS", label: "Todos os Tribunais" },
  { value: "STF", label: "STF" },
  { value: "STJ", label: "STJ" },
  { value: "TRF1", label: "TRF1" },
  { value: "TRF2", label: "TRF2" },
  { value: "TRF3", label: "TRF3" },
  { value: "TRF4", label: "TRF4" },
  { value: "TRF5", label: "TRF5" },
  { value: "TRF6", label: "TRF6" },
];

function AbaJurisprudencia() {
  const [busca, setBusca] = useState("");
  const [tribunal, setTribunal] = useState("TODOS");
  const [queryParams, setQueryParams] = useState<{ q: string; tribunal: string } | null>(null);
  const injectLexos = useLexosInject();

  const { data, isFetching, error } = useQuery<ScrapingResult<JurisprudenciaItem[]>>({
    queryKey: ["/api/pesquisa/jurisprudencia", queryParams?.q, queryParams?.tribunal],
    queryFn: async () => {
      const params = new URLSearchParams({ q: queryParams!.q, tribunal: queryParams!.tribunal });
      const res = await fetch(`/api/pesquisa/jurisprudencia?${params}`);
      if (!res.ok) throw new Error((await res.json()).error || "Erro");
      return res.json();
    },
    enabled: !!queryParams,
    retry: false,
  });

  const handleBuscar = () => {
    const q = busca.trim();
    if (!q) return;
    setQueryParams({ q, tribunal });
  };

  const items = data?.data || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="input-jur-busca">Termo de busca</Label>
              <Input
                id="input-jur-busca"
                data-testid="input-jurisprudencia-busca"
                placeholder="Ex: dano moral indenização trabalhista"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleBuscar()}
              />
            </div>
            <div className="w-full sm:w-44 space-y-1">
              <Label>Tribunal</Label>
              <Select value={tribunal} onValueChange={setTribunal}>
                <SelectTrigger data-testid="select-tribunal-jurisprudencia">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIBUNAIS_JUR.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              data-testid="button-buscar-jurisprudencia"
              onClick={handleBuscar}
              disabled={isFetching || !busca.trim()}
            >
              {isFetching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
              {isFetching ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isFetching && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Consultando jurisprudência... (STF, STJ, TRFs)</p>
          </CardContent>
        </Card>
      )}

      {!isFetching && error && (
        <Card className="border-destructive/30">
          <CardContent className="py-4 flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {String(error)}
          </CardContent>
        </Card>
      )}

      {!isFetching && data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <SourceBadge source={data.source} label={data.sourceLabel} />
              <DurationBadge ms={data.durationMs} />
              <span className="text-sm text-muted-foreground">{items.length} resultado(s)</span>
            </div>
            {data.markdownContent && (
              <Button
                size="sm"
                variant="outline"
                data-testid="button-enviar-ia-jurisprudencia"
                onClick={() => injectLexos(data.markdownContent, `Jurisprudência: ${queryParams?.q}`)}
              >
                <Send className="w-3 h-3 mr-1" /> Enviar à IA
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {items.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum acórdão encontrado.
                </CardContent>
              </Card>
            ) : (
              items.map((item, i) => (
                <Card key={i} data-testid={`card-jurisprudencia-${i}`}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">{item.tribunal}</Badge>
                        {item.numero && <span className="text-xs font-mono text-muted-foreground">{item.numero}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {item.relator && <span className="flex items-center gap-1"><User className="w-3 h-3" />{item.relator}</span>}
                        {item.data && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.data}</span>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {item.tema && (
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Tema: {item.tema}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed line-clamp-5">{item.ementa}</p>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        data-testid={`link-jurisprudencia-${i}`}
                      >
                        <ExternalLink className="w-3 h-3" /> Ver íntegra
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── ABA DOUTRINA ─────────────────────────────────────────────────────────────

function AbaDoutrina() {
  const [busca, setBusca] = useState("");
  const [query, setQuery] = useState("");
  const injectLexos = useLexosInject();

  const { data, isFetching, error } = useQuery<ScrapingResult<DoutrinaItem[]>>({
    queryKey: ["/api/pesquisa/doutrina", query],
    queryFn: async () => {
      const res = await fetch(`/api/pesquisa/doutrina?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error((await res.json()).error || "Erro");
      return res.json();
    },
    enabled: !!query,
    retry: false,
  });

  const handleBuscar = () => {
    const q = busca.trim();
    if (q) setQuery(q);
  };

  const items = data?.data || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="input-doutrina-busca">Tema ou assunto</Label>
              <Input
                id="input-doutrina-busca"
                data-testid="input-doutrina-busca"
                placeholder="Ex: responsabilidade civil médica, LGPD"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleBuscar()}
              />
            </div>
            <Button
              data-testid="button-buscar-doutrina"
              onClick={handleBuscar}
              disabled={isFetching || !busca.trim()}
            >
              {isFetching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
              {isFetching ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isFetching && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Buscando em CNJ Biblioteca, LexML, Senado, STF...</p>
          </CardContent>
        </Card>
      )}

      {!isFetching && error && (
        <Card className="border-destructive/30">
          <CardContent className="py-4 flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {String(error)}
          </CardContent>
        </Card>
      )}

      {!isFetching && data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <SourceBadge source={data.source} label={data.sourceLabel} />
              <DurationBadge ms={data.durationMs} />
              <span className="text-sm text-muted-foreground">{items.length} resultado(s)</span>
            </div>
            {data.markdownContent && (
              <Button
                size="sm"
                variant="outline"
                data-testid="button-enviar-ia-doutrina"
                onClick={() => injectLexos(data.markdownContent, `Doutrina: ${query}`)}
              >
                <Send className="w-3 h-3 mr-1" /> Enviar à IA
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {items.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum resultado encontrado nas fontes disponíveis.
                </CardContent>
              </Card>
            ) : (
              items.map((item, i) => (
                <Card key={i} data-testid={`card-doutrina-${i}`}>
                  <CardContent className="py-4 space-y-1.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug">{item.titulo}</p>
                      {item.fonte && (
                        <Badge variant="secondary" className="text-xs shrink-0">{item.fonte}</Badge>
                      )}
                    </div>
                    {(item.autor || item.ano) && (
                      <p className="text-xs text-muted-foreground">
                        {item.autor && <span><User className="inline w-3 h-3 mr-0.5" />{item.autor}</span>}
                        {item.autor && item.ano && " · "}
                        {item.ano && <span>{item.ano}</span>}
                      </p>
                    )}
                    {item.resumo && (
                      <p className="text-sm text-muted-foreground line-clamp-4">{item.resumo}</p>
                    )}
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        data-testid={`link-doutrina-${i}`}
                      >
                        <ExternalLink className="w-3 h-3" /> Acessar documento
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── ABA EMPRESAS ─────────────────────────────────────────────────────────────

function formatCnpj(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

function AbaEmpresas() {
  const [cnpjInput, setCnpjInput] = useState("");
  const [cnpjQuery, setCnpjQuery] = useState("");
  const injectLexos = useLexosInject();

  const { data, isFetching, error } = useQuery<ScrapingResult<EmpresaData>>({
    queryKey: ["/api/pesquisa/cnpj", cnpjQuery],
    queryFn: async () => {
      const raw = cnpjQuery.replace(/\D/g, "");
      const res = await fetch(`/api/pesquisa/cnpj/${raw}`);
      if (!res.ok) throw new Error((await res.json()).error || "Erro");
      return res.json();
    },
    enabled: cnpjQuery.replace(/\D/g, "").length === 14,
    retry: false,
  });

  const handleBuscar = () => {
    const raw = cnpjInput.replace(/\D/g, "");
    if (raw.length === 14) setCnpjQuery(cnpjInput);
  };

  const empresa = data?.data;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="input-cnpj">CNPJ</Label>
              <Input
                id="input-cnpj"
                data-testid="input-cnpj"
                placeholder="00.000.000/0000-00"
                value={cnpjInput}
                onChange={e => setCnpjInput(formatCnpj(e.target.value))}
                onKeyDown={e => e.key === "Enter" && handleBuscar()}
                className="font-mono"
              />
            </div>
            <Button
              data-testid="button-buscar-cnpj"
              onClick={handleBuscar}
              disabled={isFetching || cnpjInput.replace(/\D/g, "").length !== 14}
            >
              {isFetching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Building2 className="w-4 h-4 mr-2" />}
              {isFetching ? "Consultando..." : "Consultar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isFetching && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Consultando Receita Federal via BrasilAPI...</p>
          </CardContent>
        </Card>
      )}

      {!isFetching && error && (
        <Card className="border-destructive/30">
          <CardContent className="py-4 flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {String(error)}
          </CardContent>
        </Card>
      )}

      {!isFetching && data && empresa && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base" data-testid="text-empresa-nome">{empresa.razaoSocial}</CardTitle>
                {empresa.nomeFantasia && (
                  <p className="text-sm text-muted-foreground mt-0.5">{empresa.nomeFantasia}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SourceBadge source={data.source} label={data.sourceLabel} />
                <DurationBadge ms={data.durationMs} />
                {data.markdownContent && (
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid="button-enviar-ia-empresa"
                    onClick={() => injectLexos(data.markdownContent, empresa.razaoSocial)}
                  >
                    <Send className="w-3 h-3 mr-1" /> Enviar à IA
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                { label: "CNPJ", value: empresa.cnpj },
                { label: "Situação", value: empresa.situacao },
                { label: "Porte", value: empresa.porte },
                { label: "Natureza Jurídica", value: empresa.naturezaJuridica },
                { label: "Capital Social", value: empresa.capitalSocial },
                { label: "Data de Abertura", value: empresa.dataAbertura },
                { label: "Município/UF", value: empresa.municipio && empresa.uf ? `${empresa.municipio} – ${empresa.uf}` : undefined },
                { label: "Telefone", value: empresa.telefone },
                { label: "E-mail", value: empresa.email },
              ].filter(f => f.value).map(({ label, value }) => (
                <div key={label}>
                  <span className="font-medium text-muted-foreground">{label}:</span>{" "}
                  <span data-testid={`text-empresa-${label.toLowerCase().replace(/\s/g, "-")}`}>{value}</span>
                </div>
              ))}
            </div>

            {empresa.atividadePrincipal && (
              <div className="text-sm">
                <p className="font-medium mb-1">Atividade Principal</p>
                <p className="text-muted-foreground">{empresa.atividadePrincipal}</p>
              </div>
            )}

            {(empresa.atividadesSecundarias || []).length > 0 && (
              <div className="text-sm">
                <p className="font-medium mb-1">Atividades Secundárias</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  {empresa.atividadesSecundarias!.slice(0, 5).map((a, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-muted-foreground/50" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {empresa.endereco && (
              <div className="text-sm">
                <p className="font-medium mb-0.5">Endereço</p>
                <p className="text-muted-foreground">{empresa.endereco}</p>
              </div>
            )}

            {(empresa.socios || []).length > 0 && (
              <div className="text-sm">
                <p className="font-medium mb-2">Quadro Societário</p>
                <div className="space-y-1.5">
                  {empresa.socios!.map((s, i) => (
                    <div key={i} className="flex items-start gap-2" data-testid={`row-socio-${i}`}>
                      <User className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                      <div>
                        <span className="font-medium">{s.nome}</span>
                        {s.qualificacao && (
                          <span className="text-muted-foreground"> — {s.qualificacao}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function PesquisaJuridica() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Scale className="w-6 h-6 text-primary" />
              Pesquisa Jurídica
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Busca direta nos portais dos tribunais — STF, STJ, TRFs, TJs estaduais, CNPJ e doutrina
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-default">
                <Info className="w-3.5 h-3.5" />
                Motor ativo
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Usa DataJud (CNJ API pública), ScraperAPI com proxies brasileiros e BrasilAPI
              como fontes. Resultados podem levar até 20s dependendo do tribunal.
            </TooltipContent>
          </Tooltip>
        </div>

        <Tabs defaultValue="processos" data-testid="tabs-pesquisa-juridica">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="processos" data-testid="tab-processos" className="flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Processos</span>
            </TabsTrigger>
            <TabsTrigger value="jurisprudencia" data-testid="tab-jurisprudencia" className="flex items-center gap-1.5">
              <Gavel className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Jurisprudência</span>
            </TabsTrigger>
            <TabsTrigger value="doutrina" data-testid="tab-doutrina" className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Doutrina</span>
            </TabsTrigger>
            <TabsTrigger value="empresas" data-testid="tab-empresas" className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Empresas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="processos" className="mt-4">
            <AbaProcessos />
          </TabsContent>
          <TabsContent value="jurisprudencia" className="mt-4">
            <AbaJurisprudencia />
          </TabsContent>
          <TabsContent value="doutrina" className="mt-4">
            <AbaDoutrina />
          </TabsContent>
          <TabsContent value="empresas" className="mt-4">
            <AbaEmpresas />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
