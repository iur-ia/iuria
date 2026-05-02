import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Scale, ExternalLink, AlertCircle, Clock, User, FileText, Building, Users, Bell, Check, Database, Globe, Wifi, Fingerprint, Info, Zap, Archive, BookOpen } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

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
  acervoId?: string;
}

interface ConsultaResultado {
  tribunal: string;
  tipo_busca: string;
  termo_busca: string;
  processos: ProcessoResultado[];
  erro?: string;
  portal_url?: string;
  data_consulta: string;
  total_encontrados: number;
  fonte?: string;
  fonte_label?: string;
  fonte_descricao?: string;
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

function ProcessoDetalhe({ processo, certConfigurado }: { processo: ProcessoResultado; certConfigurado?: boolean }) {
  const [adicionadoMonitoramento, setAdicionadoMonitoramento] = useState(false);
  const [salvoAcervo, setSalvoAcervo] = useState(!!processo.acervoId);
  const { toast } = useToast();

  const acervoMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        numero: processo.numero_unico || processo.numero,
        tribunal: processo.tribunal,
        classe: processo.classe,
        assunto: processo.assunto,
        relator: processo.relator,
        partes: processo.partes || [],
        movimentacoes: processo.movimentacoes || [],
        urlPortal: processo.url,
      };
      const res = await apiRequest("POST", "/api/acervo/salvar-processo", payload);
      return res.json();
    },
    onSuccess: (data) => {
      setSalvoAcervo(true);
      toast({
        title: data.criado ? "Processo salvo no acervo!" : "Acervo atualizado!",
        description: data.mensagem,
      });
    },
    onError: () => {
      toast({
        title: "Erro ao salvar no acervo",
        description: "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const monitoramentoMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        numeroProcesso: processo.numero_unico || processo.numero,
        tribunal: processo.tribunal,
        frequenciaMinutos: 60,
        contadorAndamentos: processo.movimentacoes?.length || 0,
      };
      if (processo.classe) payload.classe = processo.classe;
      if (processo.assunto) payload.assunto = processo.assunto;
      if (processo.relator) payload.relator = processo.relator;
      if (processo.url) payload.urlProcesso = processo.url;
      
      const res = await apiRequest("POST", "/api/monitoramentos", payload);
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

  const movimentacoes = processo.movimentacoes || [];

  return (
    <Card data-testid="card-processo-detalhe">
      {/* CAPA DO PROCESSO */}
      <CardHeader className="pb-3 border-b">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 flex-wrap text-lg">
              <Scale className="h-5 w-5 text-primary" />
              {processo.numero}
              {processo.classe && (
                <Badge variant="default" data-testid="badge-classe">
                  {processo.classe}
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {processo.tribunal}
            </p>
            {/* Numero CNJ */}
            {processo.numero_unico && processo.numero_unico !== processo.numero && (
              <p className="text-xs text-muted-foreground mt-1 font-mono" data-testid="text-numero-cnj">
                CNJ: {processo.numero_unico}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant={salvoAcervo ? "secondary" : "outline"}
              size="sm" 
              onClick={() => acervoMutation.mutate()}
              disabled={acervoMutation.isPending}
              data-testid="button-salvar-acervo"
            >
              {acervoMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : salvoAcervo ? (
                <Check className="h-4 w-4 mr-1" />
              ) : (
                <BookOpen className="h-4 w-4 mr-1" />
              )}
              {salvoAcervo ? "No Acervo" : "Salvar no Acervo"}
            </Button>
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
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        {/* INFORMACOES DA CAPA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {processo.assunto && (
            <div className="flex items-start gap-2 md:col-span-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Assunto</p>
                <p className="text-sm" data-testid="text-assunto">{processo.assunto}</p>
              </div>
            </div>
          )}
          
          {processo.relator && (
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Relator</p>
                <p className="text-sm" data-testid="text-relator">{processo.relator}</p>
              </div>
            </div>
          )}

          {processo.origem && (
            <div className="flex items-start gap-2">
              <Building className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Origem</p>
                <p className="text-sm" data-testid="text-origem">{processo.origem}</p>
              </div>
            </div>
          )}
        </div>

        {/* PARTES */}
        {processo.partes && processo.partes.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Partes
            </h3>
            <div className="space-y-1 pl-6" data-testid="lista-partes">
              {processo.partes.filter(p => p.length > 3).map((parte, i) => (
                <p key={i} className="text-sm text-muted-foreground" data-testid={`parte-${i}`}>
                  {parte}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* ANDAMENTOS */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Andamentos
            {movimentacoes.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {movimentacoes.length}
              </Badge>
            )}
          </h3>
          
          {movimentacoes.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto" data-testid="lista-andamentos">
              {movimentacoes.map((mov, i) => (
                <div key={i} className="flex items-start gap-2 p-2 border-l-2 border-primary/30 pl-3 bg-muted/30 rounded-r">
                  <div className="flex-1">
                    <span className="text-xs font-medium text-primary" data-testid={`andamento-data-${i}`}>
                      {mov.data}
                    </span>
                    <p className="text-sm" data-testid={`andamento-desc-${i}`}>{mov.descricao}</p>
                    {mov.detalhes && (
                      <p className="text-xs text-muted-foreground mt-1">{mov.detalhes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3" data-testid="sem-andamentos">
              <div className="text-center py-5 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                <Clock className="h-6 w-6 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Nenhum andamento disponível nesta consulta</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pode ser processo recente, em sigilo ou fora do índice atual
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {processo.url && (
                  <a
                    href={processo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    data-testid="link-portal-andamentos"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Consultar diretamente no portal do tribunal
                  </a>
                )}
                {!certConfigurado && (
                  <Link href="/configuracoes">
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary cursor-pointer" data-testid="link-config-cert-andamentos">
                      <Fingerprint className="h-3.5 w-3.5" />
                      Tentar com certificado digital
                    </span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ConsultaProcessual() {
  const [termoBusca, setTermoBusca] = useState<string>("");
  const [tribunalDetectado, setTribunalDetectado] = useState<TribunalDetectado | null>(null);
  const [resultado, setResultado] = useState<ConsultaResultado | null>(null);

  const { data: certStatus } = useQuery<{ configurado: boolean; nome_titular?: string; provedor?: string }>({
    queryKey: ["/api/certificado/status"],
    refetchInterval: 120000,
  });

  const { data: pjeStatus } = useQuery<{ autenticado: boolean; valido?: boolean; nome_titular?: string }>({
    queryKey: ["/api/pje/status"],
    refetchInterval: 120000,
  });

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

      {certStatus?.configurado && (
        <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-md text-sm" data-testid="banner-cert-configurado">
          <Fingerprint className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
          <span className="text-purple-700 dark:text-purple-300">
            Certificado digital conectado{certStatus.nome_titular ? ` — ${certStatus.nome_titular}` : ""}.
            Processos sigilosos e intimações pessoais serão acessíveis.
          </span>
        </div>
      )}

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
                  ? tribunalDetectado.info?.ativo 
                    ? "bg-primary/10 border border-primary/20" 
                    : "bg-yellow-500/10 border border-yellow-500/20"
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
                      Disponivel
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
            <div className="flex items-center gap-2 flex-wrap">
              {resultado.fonte && (
                <Badge
                  variant="secondary"
                  className={
                    resultado.fonte === "datajud"
                      ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                      : resultado.fonte === "tecjustica"
                      ? "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20"
                      : resultado.fonte === "pje_autenticado"
                      ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                      : "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20"
                  }
                  data-testid="badge-fonte-dados"
                >
                  {resultado.fonte === "datajud" ? (
                    <Database className="h-3 w-3 mr-1" />
                  ) : resultado.fonte === "tecjustica" ? (
                    <Zap className="h-3 w-3 mr-1" />
                  ) : resultado.fonte === "pje_autenticado" ? (
                    <Fingerprint className="h-3 w-3 mr-1" />
                  ) : (
                    <Wifi className="h-3 w-3 mr-1" />
                  )}
                  {resultado.fonte_label || resultado.fonte}
                </Badge>
              )}
              {pjeStatus?.autenticado && pjeStatus?.valido && (
                <Badge
                  variant="secondary"
                  className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                  data-testid="badge-pje-autenticado"
                >
                  <Fingerprint className="h-3 w-3 mr-1" />
                  PJe Autenticado
                </Badge>
              )}
              <Badge variant={resultado.processos.length > 0 ? "default" : "secondary"} data-testid="badge-total-encontrados">
                {resultado.total_encontrados} processo(s) encontrado(s)
              </Badge>
            </div>
          </div>

          {resultado.fonte_descricao && (
            <div className={`flex items-start gap-2 p-3 rounded-md text-sm ${
              resultado.fonte === "datajud"
                ? "bg-blue-500/5 border border-blue-500/20 text-blue-700 dark:text-blue-300"
                : resultado.fonte === "tecjustica"
                ? "bg-orange-500/5 border border-orange-500/20 text-orange-700 dark:text-orange-300"
                : "bg-green-500/5 border border-green-500/20 text-green-700 dark:text-green-300"
            }`} data-testid="banner-fonte">
              {resultado.fonte === "datajud" ? (
                <Database className="h-4 w-4 mt-0.5 flex-shrink-0" />
              ) : resultado.fonte === "tecjustica" ? (
                <Zap className="h-4 w-4 mt-0.5 flex-shrink-0" />
              ) : (
                <Globe className="h-4 w-4 mt-0.5 flex-shrink-0" />
              )}
              <span>{resultado.fonte_descricao}</span>
            </div>
          )}

          {resultado.erro && (
            <Card className="border-destructive bg-destructive/5" data-testid="card-erro">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive">Erro na consulta</p>
                    <p className="text-sm text-muted-foreground">{resultado.erro}</p>
                    {resultado.portal_url && (
                      <a
                        href={resultado.portal_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-primary hover:underline"
                        data-testid="link-portal-erro"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir no Portal do Tribunal
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {resultado.processos.length === 0 && !resultado.erro && (
            <Card data-testid="card-resultado-vazio">
              <CardContent className="py-8">
                <div className="text-center mb-4">
                  <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium" data-testid="text-nenhum-resultado">
                    Nenhum processo encontrado para "{resultado.termo_busca}"
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pode ser um processo recente, em sigilo ou que ainda não foi indexado pelo DataJud
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
                  {resultado.portal_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={resultado.portal_url} target="_blank" rel="noopener noreferrer" data-testid="link-portal-vazio">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Buscar no portal do tribunal
                      </a>
                    </Button>
                  )}
                  {!certStatus?.configurado && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/configuracoes" data-testid="link-cert-vazio">
                        <Fingerprint className="h-4 w-4 mr-2" />
                        Configurar certificado digital
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {resultado.processos.map((processo, index) => (
            <ProcessoDetalhe key={index} processo={processo} certConfigurado={certStatus?.configurado} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Cobertura de Tribunais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-md text-sm">
            <Database className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <span className="font-medium text-blue-700 dark:text-blue-300">DataJud CNJ (100% dos tribunais)</span>
              <p className="text-muted-foreground text-xs mt-0.5">
                Qualquer numero CNJ pode ser consultado via API publica do CNJ. Dados atualizados diariamente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              { sigla: "STF", desc: "ADI, HC, RE, Rcl...", sistema: "Portal STF" },
              { sigla: "STJ", desc: "REsp, RHC, HC...", sistema: "Portal STJ" },
              { sigla: "TRF1", desc: "AM, BA, CE, DF, GO, MG...", sistema: "eProc TRF1" },
              { sigla: "TRF2", desc: "RJ, ES - CNJ 4.02", sistema: "eProc TRF2" },
              { sigla: "TRF3", desc: "SP, MS - CNJ 4.03", sistema: "PJe TRF3" },
              { sigla: "TRF4", desc: "PR, RS, SC - CNJ 4.04", sistema: "eProc TRF4" },
              { sigla: "TRF5", desc: "AL, CE, PB, PE, RN, SE", sistema: "PJe TRF5" },
              { sigla: "TJRJ", desc: "Rio de Janeiro - CNJ 8.19", sistema: "Scrapling" },
              { sigla: "TJSP", desc: "São Paulo - CNJ 8.26", sistema: "eSAJ" },
              { sigla: "TJBA", desc: "Bahia - CNJ 8.05", sistema: "eSAJ" },
              { sigla: "TJCE", desc: "Ceará - CNJ 8.06", sistema: "eSAJ" },
              { sigla: "TJSC", desc: "Santa Catarina - CNJ 8.24", sistema: "eSAJ" },
              { sigla: "TJMS", desc: "Mato Grosso do Sul - CNJ 8.12", sistema: "eSAJ" },
              { sigla: "TJMG", desc: "Minas Gerais - CNJ 8.13", sistema: "PJe" },
              { sigla: "TJPE", desc: "Pernambuco - CNJ 8.17", sistema: "PJe" },
              { sigla: "TJRS", desc: "Rio Grande do Sul - CNJ 8.21", sistema: "PJe" },
              { sigla: "TJPR", desc: "Paraná - CNJ 8.16", sistema: "PJe" },
              { sigla: "TJGO", desc: "Goiás - CNJ 8.09", sistema: "PJe" },
            ].map(({ sigla, desc, sistema }) => (
              <div key={sigla} className="p-2 rounded-md bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="font-medium">{sigla}</span>
                  <span className="text-xs text-muted-foreground flex-1">{desc}</span>
                  <Badge className="text-xs" variant="outline">{sistema}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
