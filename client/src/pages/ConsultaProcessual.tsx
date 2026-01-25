import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Scale, ExternalLink, AlertCircle, Clock, User, FileText, Building } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Tribunal } from "@shared/schema";

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

export default function ConsultaProcessual() {
  const [tribunal, setTribunal] = useState<string>("");
  const [tipoBusca, setTipoBusca] = useState<string>("numero");
  const [termoBusca, setTermoBusca] = useState<string>("");
  const [resultado, setResultado] = useState<ConsultaResultado | null>(null);

  const { data: tribunais = [], isLoading: loadingTribunais } = useQuery<Tribunal[]>({
    queryKey: ["/api/tribunais"],
  });

  const tribunaisAtivos = tribunais.filter(t => t.ativo);

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
        tribunal,
        tipo_busca: tipoBusca,
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
    if (!tribunal || !termoBusca.trim()) return;
    
    setResultado(null);
    consultaMutation.mutate({ tribunal, tipoBusca, termoBusca: termoBusca.trim() });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
          Consulta Processual
        </h1>
        <p className="text-muted-foreground">
          Busque processos nos tribunais brasileiros por numero ou nome da parte
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tribunal">Tribunal</Label>
                <Select 
                  value={tribunal} 
                  onValueChange={setTribunal}
                  disabled={loadingTribunais}
                >
                  <SelectTrigger id="tribunal" data-testid="select-tribunal">
                    <SelectValue placeholder="Selecione o tribunal" />
                  </SelectTrigger>
                  <SelectContent>
                    {tribunaisAtivos.map((t) => (
                      <SelectItem key={t.id} value={t.sigla} data-testid={`option-tribunal-${t.sigla.toLowerCase()}`}>
                        {t.sigla} - {t.nome}
                      </SelectItem>
                    ))}
                    {tribunaisAtivos.length === 0 && (
                      <SelectItem value="_disabled" disabled>
                        Nenhum tribunal disponivel
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipoBusca">Tipo de Busca</Label>
                <Select value={tipoBusca} onValueChange={setTipoBusca}>
                  <SelectTrigger id="tipoBusca" data-testid="select-tipo-busca">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="numero" data-testid="option-tipo-numero">Por Numero do Processo</SelectItem>
                    <SelectItem value="nome" data-testid="option-tipo-nome">Por Nome da Parte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="termoBusca">
                  {tipoBusca === "numero" ? "Numero do Processo" : "Nome da Parte"}
                </Label>
                <Input
                  id="termoBusca"
                  data-testid="input-termo-busca"
                  placeholder={tipoBusca === "numero" ? "Ex: ADI 1, HC 123456" : "Nome completo ou parcial"}
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={!tribunal || !termoBusca.trim() || consultaMutation.isPending}
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
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-lg text-muted-foreground">
              Consultando o portal do {tribunal}...
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Isso pode levar alguns segundos
            </p>
          </CardContent>
        </Card>
      )}

      {resultado && !consultaMutation.isPending && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" data-testid="text-resultados-titulo">
              Resultados da Consulta
            </h2>
            <Badge variant={resultado.processos.length > 0 ? "default" : "secondary"} data-testid="badge-total-encontrados">
              {resultado.total_encontrados} processo(s) encontrado(s)
            </Badge>
          </div>

          {resultado.erro && (
            <Card className="border-destructive bg-destructive/5">
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
            <Card key={index} data-testid={`card-processo-${index}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    {processo.numero}
                    {processo.classe && (
                      <Badge variant="outline" className="ml-2">
                        {processo.classe}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {processo.tribunal}
                  </p>
                </div>
                {processo.url && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild
                    data-testid={`button-ver-portal-${index}`}
                  >
                    <a href={processo.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Ver no Portal
                    </a>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {processo.relator && (
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Relator</p>
                        <p className="text-sm text-muted-foreground">{processo.relator}</p>
                      </div>
                    </div>
                  )}

                  {processo.assunto && (
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Assunto</p>
                        <p className="text-sm text-muted-foreground">{processo.assunto}</p>
                      </div>
                    </div>
                  )}

                  {processo.origem && (
                    <div className="flex items-start gap-2">
                      <Building className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Origem</p>
                        <p className="text-sm text-muted-foreground">{processo.origem}</p>
                      </div>
                    </div>
                  )}
                </div>

                {processo.partes && processo.partes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Partes</p>
                    <div className="flex flex-wrap gap-2">
                      {processo.partes.filter(p => p.length > 3).map((parte, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {parte}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {processo.movimentacoes && processo.movimentacoes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Ultimas Movimentacoes
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {processo.movimentacoes.slice(0, 5).map((mov, i) => (
                        <div key={i} className="text-sm border-l-2 border-muted pl-3 py-1">
                          <span className="text-muted-foreground">{mov.data}</span>
                          <span className="mx-2">-</span>
                          <span>{mov.descricao}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tribunais Disponiveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {tribunais.map((t) => (
              <div 
                key={t.id} 
                className={`p-2 rounded-md border text-center text-sm ${
                  t.ativo 
                    ? "bg-primary/5 border-primary/20 text-foreground" 
                    : "bg-muted/50 border-muted text-muted-foreground"
                }`}
              >
                <span className="font-medium">{t.sigla}</span>
                <br />
                <span className="text-xs">
                  {t.ativo ? "Disponivel" : "Em breve"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
