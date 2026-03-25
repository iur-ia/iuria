import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

interface PublicacaoDje {
  id: string;
  diario: string;
  tribunal: string;
  dataPublicacao: string;
  caderno?: string;
  pagina?: string;
  conteudo: string;
  conteudoResumo?: string;
  processoNumero?: string;
  oabRelacionada?: string;
  cnpjRelacionado?: string;
  urlPublicacao?: string;
}

const DIARIOS_DISPONIVEIS = [
  { sigla: "DJE-STF", nome: "DJE - Supremo Tribunal Federal", ativo: true },
  { sigla: "DJE-STJ", nome: "DJE - Superior Tribunal de Justica", ativo: true },
  { sigla: "DJE-TST", nome: "DJE - Tribunal Superior do Trabalho", ativo: true },
  { sigla: "DJE-TJRJ", nome: "DJE - TJ Rio de Janeiro", ativo: true },
  { sigla: "DJE-TJSP", nome: "DJE - TJ Sao Paulo", ativo: true },
  { sigla: "DJE-TJMG", nome: "DJE - TJ Minas Gerais", ativo: true },
  { sigla: "DJEM-TRF1", nome: "DJEM - TRF 1a Regiao", ativo: true },
  { sigla: "DJEM-TRF2", nome: "DJEM - TRF 2a Regiao", ativo: true },
  { sigla: "DJEM-TRF3", nome: "DJEM - TRF 3a Regiao", ativo: true },
  { sigla: "DJEM-TRF4", nome: "DJEM - TRF 4a Regiao", ativo: true },
  { sigla: "DJEM-TRF5", nome: "DJEM - TRF 5a Regiao", ativo: true },
  { sigla: "DJEM-TRF6", nome: "DJEM - TRF 6a Regiao", ativo: true },
];

const UFS_BRASIL = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

export default function DiarioOficial() {
  const [tipoBusca, setTipoBusca] = useState<"cnpj" | "oab">("oab");
  const [termo, setTermo] = useState("");
  const [oabUF, setOabUF] = useState("RJ");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [diariosSelecionados, setDiariosSelecionados] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch publicacoes from API when search is triggered
  const { data: publicacoes = [], isLoading, isFetching } = useQuery<PublicacaoDje[]>({
    queryKey: ["/api/publicacoes-dje/busca", searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];
      const res = await fetch(`/api/publicacoes-dje/busca?termo=${encodeURIComponent(searchTerm)}`);
      if (!res.ok) throw new Error("Erro na busca");
      return res.json();
    },
    enabled: !!searchTerm,
  });

  // Also fetch recent publicacoes for browsing
  const { data: recentPublicacoes = [] } = useQuery<PublicacaoDje[]>({
    queryKey: ["/api/publicacoes-dje"],
    queryFn: async () => {
      const res = await fetch("/api/publicacoes-dje?limit=20");
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

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
    if (!termo.trim()) return;

    // Build search term: for OAB include UF, for CNPJ use directly
    const fullTerm = tipoBusca === "oab" ? `${termo} ${oabUF}` : termo;
    setSearchTerm(fullTerm);
    setHasSearched(true);
  };

  // Filter publicacoes by selected diarios
  const filteredPublicacoes = searchTerm ? publicacoes.filter(p => {
    if (diariosSelecionados.length === 0) return true;
    return diariosSelecionados.includes(p.diario);
  }) : [];

  const displayResults = filteredPublicacoes;
  const totalPublicacoes = displayResults.length;
  const isSearching = isLoading || isFetching;

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
                    />
                    <div className="flex-1">
                      <span className="text-sm">
                        {d.nome}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={!termo.trim() || isSearching}
              data-testid="button-buscar"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Buscar Publicacoes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      {hasSearched && (
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
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span className="text-muted-foreground">Buscando publicacoes...</span>
              </div>
            ) : displayResults.length === 0 ? (
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Nenhuma publicacao encontrada
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Nao foram encontradas publicacoes para o termo "{searchTerm}". 
                    Tente outros termos de busca ou verifique se existem publicacoes registradas no sistema.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {displayResults.map((pub) => (
                  <Card key={pub.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{pub.diario}</Badge>
                            <Badge variant="secondary">{pub.tribunal}</Badge>
                            <span className="text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {new Date(pub.dataPublicacao).toLocaleDateString("pt-BR")}
                            </span>
                            {pub.caderno && (
                              <span className="text-sm text-muted-foreground">
                                {pub.caderno}
                              </span>
                            )}
                            {pub.pagina && (
                              <span className="text-sm text-muted-foreground">
                                Pag. {pub.pagina}
                              </span>
                            )}
                          </div>
                          {pub.processoNumero && (
                            <p className="text-xs font-mono text-muted-foreground mb-1">
                              Processo: {pub.processoNumero}
                            </p>
                          )}
                        </div>
                        {pub.urlPublicacao && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={pub.urlPublicacao} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Ver
                            </a>
                          </Button>
                        )}
                      </div>
                      <p className="text-sm line-clamp-4">{pub.conteudoResumo || pub.conteudo}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent publications (always shown) */}
      {!hasSearched && recentPublicacoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Publicacoes Recentes
              <Badge variant="secondary">{recentPublicacoes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPublicacoes.map((pub) => (
                <Card key={pub.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{pub.diario}</Badge>
                          <Badge variant="secondary">{pub.tribunal}</Badge>
                          <span className="text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {new Date(pub.dataPublicacao).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        {pub.processoNumero && (
                          <p className="text-xs font-mono text-muted-foreground mb-1">
                            Processo: {pub.processoNumero}
                          </p>
                        )}
                      </div>
                      {pub.urlPublicacao && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={pub.urlPublicacao} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Ver
                          </a>
                        </Button>
                      )}
                    </div>
                    <p className="text-sm line-clamp-3">{pub.conteudoResumo || pub.conteudo}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
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
                <strong>Diarios suportados:</strong> DJE-STF, DJE-STJ, DJE-TST, DJE-TJRJ, DJE-TJSP, DJE-TJMG, DJEM-TRF1 a TRF6
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
