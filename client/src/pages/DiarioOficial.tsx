import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Search, FileText, Building, Calendar, 
  AlertCircle, Briefcase, ExternalLink, Newspaper 
} from "lucide-react";

interface Publicacao {
  id: string;
  data: string;
  caderno: string;
  pagina?: string;
  conteudo: string;
  tribunal: string;
  diario: string;
  url?: string;
}

interface BuscaResultado {
  tribunal: string;
  termo: string;
  publicacoes: Publicacao[];
  erro?: string;
  total: number;
}

const DIARIOS_DISPONIVEIS = [
  { sigla: "DJE-STF", nome: "DJE - Supremo Tribunal Federal", ativo: false },
  { sigla: "DJE-STJ", nome: "DJE - Superior Tribunal de Justiça", ativo: false },
  { sigla: "DJE-TJRJ", nome: "DJE - TJ Rio de Janeiro", ativo: false },
  { sigla: "DJEM-TRF2", nome: "DJEM - TRF 2ª Região", ativo: false },
];

const UFS_BRASIL = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

export default function DiarioOficial() {
  const [tipoBusca, setTipoBusca] = useState<"cnpj" | "oab">("oab");
  const [termo, setTermo] = useState("");
  const [oabUF, setOabUF] = useState("RJ");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [diariosSelecionados, setDiariosSelecionados] = useState<string[]>([]);
  const [resultados, setResultados] = useState<BuscaResultado[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleDiario = (sigla: string) => {
    const diario = DIARIOS_DISPONIVEIS.find(d => d.sigla === sigla);
    if (!diario?.ativo) return;
    
    setDiariosSelecionados(prev => 
      prev.includes(sigla) 
        ? prev.filter(d => d !== sigla)
        : [...prev, sigla]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termo.trim() || isLoading) return;

    setResultados([{
      tribunal: "Sistema",
      termo: termo,
      publicacoes: [],
      erro: "A busca em Diarios Oficiais esta em desenvolvimento. Em breve voce podera pesquisar publicacoes por CNPJ e OAB.",
      total: 0
    }]);
  };

  const totalPublicacoes = resultados.reduce((acc, r) => acc + r.total, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2" data-testid="text-page-title">
          <Newspaper className="h-6 w-6" />
          Diarios Oficiais
        </h1>
        <p className="text-muted-foreground">
          Pesquise publicacoes nos Diarios de Justica Eletronicos por CNPJ ou OAB
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Publicacoes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs value={tipoBusca} onValueChange={(v) => setTipoBusca(v as "cnpj" | "oab")}>
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="oab" data-testid="tab-oab">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Por OAB
                </TabsTrigger>
                <TabsTrigger value="cnpj" data-testid="tab-cnpj">
                  <Building className="h-4 w-4 mr-2" />
                  Por CNPJ
                </TabsTrigger>
              </TabsList>

              <TabsContent value="oab" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="oab-numero">Numero da OAB</Label>
                    <Input
                      id="oab-numero"
                      data-testid="input-oab"
                      placeholder="Ex: 123456"
                      value={termo}
                      onChange={(e) => setTermo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="oab-uf">Estado</Label>
                    <select
                      id="oab-uf"
                      data-testid="select-oab-uf"
                      value={oabUF}
                      onChange={(e) => setOabUF(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {UFS_BRASIL.map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="cnpj" className="space-y-4 mt-4">
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    data-testid="input-cnpj"
                    placeholder="Ex: 00.000.000/0001-00"
                    value={termo}
                    onChange={(e) => setTermo(e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="data-inicio">Data Inicio</Label>
                <Input
                  id="data-inicio"
                  type="date"
                  data-testid="input-data-inicio"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data-fim">Data Fim</Label>
                <Input
                  id="data-fim"
                  type="date"
                  data-testid="input-data-fim"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Diarios para Busca</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {DIARIOS_DISPONIVEIS.map((d) => (
                  <label 
                    key={d.sigla}
                    className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer ${
                      diariosSelecionados.includes(d.sigla)
                        ? d.ativo 
                          ? "bg-primary/10 border-primary/30"
                          : "bg-muted/50 border-muted"
                        : "bg-background border-muted"
                    }`}
                    data-testid={`checkbox-diario-${d.sigla.toLowerCase()}`}
                  >
                    <Checkbox
                      checked={diariosSelecionados.includes(d.sigla)}
                      onCheckedChange={() => handleToggleDiario(d.sigla)}
                      disabled={!d.ativo}
                    />
                    <div className="flex-1">
                      <span className={`text-sm ${!d.ativo ? "text-muted-foreground" : ""}`}>
                        {d.nome}
                      </span>
                      {!d.ativo && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Em breve
                        </Badge>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={!termo.trim() || isLoading}
              data-testid="button-buscar"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Buscar Publicacoes
            </Button>
          </form>
        </CardContent>
      </Card>

      {resultados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resultados
              {totalPublicacoes > 0 && (
                <Badge variant="secondary">{totalPublicacoes} publicacao(es)</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resultados.map((resultado, idx) => (
              <div key={idx}>
                {resultado.erro && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Funcionalidade em Desenvolvimento
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        {resultado.erro}
                      </p>
                    </div>
                  </div>
                )}

                {resultado.publicacoes.length > 0 && (
                  <div className="space-y-3">
                    {resultado.publicacoes.map((pub) => (
                      <Card key={pub.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{pub.diario}</Badge>
                                <span className="text-sm text-muted-foreground">
                                  <Calendar className="h-3 w-3 inline mr-1" />
                                  {pub.data}
                                </span>
                                {pub.pagina && (
                                  <span className="text-sm text-muted-foreground">
                                    Pag. {pub.pagina}
                                  </span>
                                )}
                              </div>
                            </div>
                            {pub.url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={pub.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  Ver
                                </a>
                              </Button>
                            )}
                          </div>
                          <p className="text-sm">{pub.conteudo}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium mb-1">Sobre os Diarios Oficiais</h3>
              <p className="text-sm text-muted-foreground">
                Os Diarios de Justica Eletronicos (DJE) sao publicacoes oficiais dos tribunais 
                onde sao divulgadas intimacoes, decisoes e outros atos processuais. 
                A busca por OAB permite encontrar todas as publicacoes relacionadas a um advogado, 
                enquanto a busca por CNPJ permite rastrear publicacoes de uma empresa.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Proximas implementacoes:</strong> DJE-STF, DJE-STJ, DJE-TJRJ, DJEM-TRF2
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
