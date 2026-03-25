import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Scale, ExternalLink, AlertCircle, Clock, User, FileText, Building, Users, Gavel, Info, ChevronRight, Bell, Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  relator?: string;
  origem?: string;
  partes?: string[];
  movimentacoes?: Movimentacao[];
  tribunal: string;
  url?: string;
  data_consulta?: string;
}

interface ConsultaResultado {
  tribunal: string;
  tipo_busca: string;
  termo_busca: string;
  processos: ProcessoResultado[];
  erro?: string;
  data_consulta: string;
  total_encontrados: number;
}

interface TribunalDetectado {
  detectado: boolean;
  tribunal: string | null;
  formato: string | null;
  info: {
    sigla: string;
    nome: string;
    url?: string;
    sistema?: string;
    ativo: boolean;
  } | null;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function ProcessoDetalhe({ processo }: { processo: ProcessoResultado }) {
  const [activeTab, setActiveTab] = useState("informacoes");
  const [adicionadoMonitoramento, setAdicionadoMonitoramento] = useState(false);
  const { toast } = useToast();
  
  const decisoes = processo.movimentacoes?.filter(m => 
    m.descricao.toLowerCase().includes("decisão") ||
    m.descricao.toLowerCase().includes("decisao") ||
    m.descricao.toLowerCase().includes("despacho") ||
    m.descricao.toLowerCase().includes("acórdão") ||
    m.descricao.toLowerCase().includes("acordao") ||
    m.descricao.toLowerCase().includes("sentença") ||
    m.descricao.toLowerCase().includes("sentenca") ||
    m.descricao.toLowerCase().includes("julgamento")
  ) || [];
  
  const andamentos = processo.movimentacoes?.filter(m => !decisoes.includes(m)) || [];
  
  const monitoramentoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/monitoramentos", {
        numeroProcesso: processo.numero,
        tribunal: processo.tribunal,
        classe: processo.classe,
        assunto: processo.assunto,
        relator: processo.relator,
        urlProcesso: processo.url,
        frequenciaMinutos: 60,
        contadorAndamentos: processo.movimentacoes?.length || 0,
      });
      return res.json();
    },
    onSuccess: () => {
      setAdicionadoMonitoramento(true);
      queryClient.invalidateQueries({ queryKey: ["/api/monitoramentos"] });
      toast({
        title: "Processo adicionado ao monitoramento!",
        description: "Voce sera alertado quando houver novos andamentos.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar monitoramento",
        description: error.message || "Processo ja pode estar sendo monitorado.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card data-testid="card-processo-detalhe">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2 flex-wrap">
        <div>
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <Scale className="h-5 w-5" />
            {processo.numero}
            {processo.classe && (
              <Badge variant="outline" className="ml-2" data-testid="badge-classe">
                {processo.classe}
              </Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {processo.tribunal}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant={adicionadoMonitoramento ? "secondary" : "default"}
            size="sm" 
            onClick={() => monitoramentoMutation.mutate()}
            disabled={adicionadoMonitoramento || monitoramentoMutation.isPending}
            data-testid="button-adicionar-monitoramento"
          >
            {monitoramentoMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : adicionadoMonitoramento ? (
              <Check className="h-4 w-4 mr-1" />
            ) : (
              <Bell className="h-4 w-4 mr-1" />
            )}
            {adicionadoMonitoramento ? "Monitorando" : "Monitorar"}
          </Button>
          {processo.url && (
            <Button 
              variant="outline" 
              size="sm" 
              asChild
              data-testid="button-ver-portal"
            >
              <a href={processo.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                Ver no Portal
              </a>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4" data-testid="tabs-processo">
            <TabsTrigger value="informacoes" data-testid="tab-informacoes">
              <Info className="h-4 w-4 mr-1 hidden sm:inline" />
              Info
            </TabsTrigger>
            <TabsTrigger value="partes" data-testid="tab-partes">
              <Users className="h-4 w-4 mr-1 hidden sm:inline" />
              Partes
            </TabsTrigger>
            <TabsTrigger value="andamentos" data-testid="tab-andamentos">
              <Clock className="h-4 w-4 mr-1 hidden sm:inline" />
              Andamentos
            </TabsTrigger>
            <TabsTrigger value="decisoes" data-testid="tab-decisoes">
              <Gavel className="h-4 w-4 mr-1 hidden sm:inline" />
              Decisões
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="informacoes" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Número</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-numero">
                    {processo.numero_unico || processo.numero}
                  </p>
                </div>
              </div>
              
              {processo.classe && (
                <div className="flex items-start gap-2">
                  <Scale className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Classe</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-classe">
                      {processo.classe}
                    </p>
                  </div>
                </div>
              )}
              
              {processo.relator && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Relator</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-relator">
                      {processo.relator}
                    </p>
                  </div>
                </div>
              )}

              {processo.assunto && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Assunto</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-assunto">
                      {processo.assunto}
                    </p>
                  </div>
                </div>
              )}

              {processo.origem && (
                <div className="flex items-start gap-2 md:col-span-2">
                  <Building className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Origem</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-origem">
                      {processo.origem}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="partes" className="mt-4">
            {processo.partes && processo.partes.length > 0 ? (
              <div className="space-y-2" data-testid="lista-partes">
                {processo.partes.filter(p => p.length > 3).map((parte, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm" data-testid={`parte-${i}`}>{parte}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground" data-testid="sem-partes">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Nenhuma parte encontrada
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="andamentos" className="mt-4">
            {andamentos.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto" data-testid="lista-andamentos">
                {andamentos.map((mov, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 border-l-2 border-muted pl-3">
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-xs text-muted-foreground" data-testid={`andamento-data-${i}`}>
                        {mov.data}
                      </span>
                      <p className="text-sm" data-testid={`andamento-desc-${i}`}>{mov.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground" data-testid="sem-andamentos">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Nenhum andamento encontrado
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="decisoes" className="mt-4">
            {decisoes.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto" data-testid="lista-decisoes">
                {decisoes.map((dec, i) => (
                  <div key={i} className="p-3 rounded-md bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-2 mb-1">
                      <Gavel className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-xs text-muted-foreground" data-testid={`decisao-data-${i}`}>
                        {dec.data}
                      </span>
                    </div>
                    <p className="text-sm" data-testid={`decisao-desc-${i}`}>{dec.descricao}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground" data-testid="sem-decisoes">
                <Gavel className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Nenhuma decisão encontrada
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function ConsultaProcessual() {
  const [termoBusca, setTermoBusca] = useState<string>("");
  const [tribunalDetectado, setTribunalDetectado] = useState<TribunalDetectado | null>(null);
  const [resultado, setResultado] = useState<ConsultaResultado | null>(null);
  
  const debouncedTermo = useDebounce(termoBusca, 500);
  
  useEffect(() => {
    const detectarTribunal = async () => {
      if (!debouncedTermo || debouncedTermo.trim().length < 2) {
        setTribunalDetectado(null);
        return;
      }
      
      try {
        const response = await fetch(`/api/detectar-tribunal/${encodeURIComponent(debouncedTermo.trim())}`);
        if (response.ok) {
          const data = await response.json() as TribunalDetectado;
          setTribunalDetectado(data);
        } else {
          setTribunalDetectado(null);
        }
      } catch (error) {
        console.error("Erro ao detectar tribunal:", error);
        setTribunalDetectado(null);
      }
    };
    
    detectarTribunal();
  }, [debouncedTermo]);

  const consultaMutation = useMutation({
    mutationFn: async (data: { tribunal: string; tipoBusca: string; termoBusca: string }) => {
      const response = await apiRequest("POST", "/api/consulta-processual", data);
      return response.json() as Promise<ConsultaResultado>;
    },
    onSuccess: (data) => {
      setResultado(data);
    },
    onError: (error) => {
      console.error("Erro na consulta:", error);
      setResultado({
        tribunal: tribunalDetectado?.tribunal || "",
        tipo_busca: "numero",
        termo_busca: termoBusca,
        processos: [],
        erro: "Erro ao realizar consulta. Tente novamente.",
        data_consulta: new Date().toISOString(),
        total_encontrados: 0,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tribunalDetectado?.detectado || !tribunalDetectado.tribunal || !termoBusca.trim()) return;
    
    setResultado(null);
    consultaMutation.mutate({ 
      tribunal: tribunalDetectado.tribunal, 
      tipoBusca: "numero", 
      termoBusca: termoBusca.trim() 
    });
  };

  const canSubmit = tribunalDetectado?.detectado && 
                    termoBusca.trim().length > 0 &&
                    !consultaMutation.isPending;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
          Consulta Processual
        </h1>
        <p className="text-muted-foreground">
          Digite o número do processo - o tribunal será detectado automaticamente
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Processo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="termoBusca">Número do Processo</Label>
              <Input
                id="termoBusca"
                data-testid="input-termo-busca"
                placeholder="Ex: ADI 1, PET 13350, HC 123456, 0000001-23.2024.8.19.0001"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: Classe + Número (ADI 1, REsp 123456) ou CNJ (0000001-23.2024.8.19.0001)
              </p>
            </div>
            
            {tribunalDetectado && (
              <div className={`p-3 rounded-md ${
                tribunalDetectado.detectado 
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-muted"
              }`} data-testid="tribunal-detectado">
                {tribunalDetectado.detectado ? (
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <span className="font-medium" data-testid="text-tribunal-sigla">
                        {tribunalDetectado.tribunal}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {tribunalDetectado.info?.nome}
                      </span>
                    </div>
                    <Badge 
                      variant="default"
                      data-testid="badge-tribunal-status"
                    >
                      Disponível
                    </Badge>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground" data-testid="text-tribunal-nao-detectado">
                    Tribunal não detectado. Verifique o formato do número.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={!canSubmit}
                data-testid="button-consultar"
              >
                {consultaMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Consultar
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {consultaMutation.isPending && (
        <Card data-testid="card-loading">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-lg text-muted-foreground">
              Consultando o portal do {tribunalDetectado?.tribunal}...
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Isso pode levar alguns segundos
            </p>
          </CardContent>
        </Card>
      )}

      {resultado && !consultaMutation.isPending && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold" data-testid="text-resultados-titulo">
              Resultados da Consulta
            </h2>
            <Badge variant={resultado.processos.length > 0 ? "default" : "secondary"} data-testid="badge-total-encontrados">
              {resultado.total_encontrados} processo(s) encontrado(s)
            </Badge>
          </div>

          {resultado.erro && (
            <Card className="border-destructive bg-destructive/5" data-testid="card-erro">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Erro na consulta</p>
                    <p className="text-sm text-muted-foreground">{resultado.erro}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {resultado.processos.length === 0 && !resultado.erro && (
            <Card data-testid="card-resultado-vazio">
              <CardContent className="py-8 text-center">
                <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground" data-testid="text-nenhum-resultado">
                  Nenhum processo encontrado para "{resultado.termo_busca}"
                </p>
              </CardContent>
            </Card>
          )}

          {resultado.processos.map((processo, index) => (
            <ProcessoDetalhe key={index} processo={processo} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tribunais com Detecção Automática</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            <div className="p-2 rounded-md bg-primary/5 border border-primary/20">
              <span className="font-medium">STF</span>
              <span className="text-xs text-muted-foreground ml-2">
                ADI, HC, RE, Pet, etc
              </span>
              <Badge className="ml-2" variant="default">Disponível</Badge>
            </div>
            <div className="p-2 rounded-md bg-primary/5 border border-primary/20">
              <span className="font-medium">STJ</span>
              <span className="text-xs text-muted-foreground ml-2">
                REsp, RHC, HC, etc
              </span>
              <Badge className="ml-2" variant="default">Disponível</Badge>
            </div>
            <div className="p-2 rounded-md bg-primary/5 border border-primary/20">
              <span className="font-medium">TRFs</span>
              <span className="text-xs text-muted-foreground ml-2">
                TRF1-TRF6 (Justiça Federal)
              </span>
              <Badge className="ml-2" variant="default">Disponível</Badge>
            </div>
            <div className="p-2 rounded-md bg-primary/5 border border-primary/20">
              <span className="font-medium">TJs</span>
              <span className="text-xs text-muted-foreground ml-2">
                27 Tribunais de Justiça
              </span>
              <Badge className="ml-2" variant="default">Disponível</Badge>
            </div>
            <div className="p-2 rounded-md bg-primary/5 border border-primary/20">
              <span className="font-medium">TRTs</span>
              <span className="text-xs text-muted-foreground ml-2">
                TRT1-TRT24 (Justiça do Trabalho)
              </span>
              <Badge className="ml-2" variant="default">Disponível</Badge>
            </div>
            <div className="p-2 rounded-md bg-primary/5 border border-primary/20">
              <span className="font-medium">TST / TSE / STM</span>
              <span className="text-xs text-muted-foreground ml-2">
                Tribunais Superiores
              </span>
              <Badge className="ml-2" variant="default">Disponível</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
