import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Users, Scale, Building, AlertCircle, User, Briefcase } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Processo {
  numero: string;
  classe?: string;
  tribunal: string;
  assunto?: string;
  url?: string;
}

interface BuscaResultado {
  tribunal: string;
  termo: string;
  processos: Processo[];
  erro?: string;
  total: number;
}

const TRIBUNAIS_BUSCA = [
  // Tribunais Superiores
  { sigla: "STF", nome: "Supremo Tribunal Federal", ativo: true },
  { sigla: "STJ", nome: "Superior Tribunal de Justiça", ativo: true },
  { sigla: "TST", nome: "Tribunal Superior do Trabalho", ativo: true },
  { sigla: "TSE", nome: "Tribunal Superior Eleitoral", ativo: true },
  { sigla: "STM", nome: "Superior Tribunal Militar", ativo: true },
  // TRFs
  { sigla: "TRF1", nome: "TRF 1ª Região", ativo: true },
  { sigla: "TRF2", nome: "TRF 2ª Região (RJ/ES)", ativo: true },
  { sigla: "TRF3", nome: "TRF 3ª Região (SP/MS)", ativo: true },
  { sigla: "TRF4", nome: "TRF 4ª Região (RS/PR/SC)", ativo: true },
  { sigla: "TRF5", nome: "TRF 5ª Região (NE)", ativo: true },
  { sigla: "TRF6", nome: "TRF 6ª Região (MG)", ativo: true },
  // TJs principais
  { sigla: "TJSP", nome: "TJ São Paulo", ativo: true },
  { sigla: "TJRJ", nome: "TJ Rio de Janeiro", ativo: true },
  { sigla: "TJMG", nome: "TJ Minas Gerais", ativo: true },
  { sigla: "TJRS", nome: "TJ Rio Grande do Sul", ativo: true },
  { sigla: "TJPR", nome: "TJ Paraná", ativo: true },
  { sigla: "TJSC", nome: "TJ Santa Catarina", ativo: true },
  { sigla: "TJBA", nome: "TJ Bahia", ativo: true },
  { sigla: "TJPE", nome: "TJ Pernambuco", ativo: true },
  { sigla: "TJCE", nome: "TJ Ceará", ativo: true },
  { sigla: "TJDFT", nome: "TJ Distrito Federal", ativo: true },
  { sigla: "TJGO", nome: "TJ Goiás", ativo: true },
  { sigla: "TJES", nome: "TJ Espírito Santo", ativo: true },
  { sigla: "TJPA", nome: "TJ Pará", ativo: true },
  { sigla: "TJMA", nome: "TJ Maranhão", ativo: true },
  { sigla: "TJAM", nome: "TJ Amazonas", ativo: true },
  { sigla: "TJMS", nome: "TJ Mato Grosso do Sul", ativo: true },
  { sigla: "TJMT", nome: "TJ Mato Grosso", ativo: true },
  { sigla: "TJPB", nome: "TJ Paraíba", ativo: true },
  { sigla: "TJAL", nome: "TJ Alagoas", ativo: true },
  { sigla: "TJPI", nome: "TJ Piauí", ativo: true },
  { sigla: "TJRN", nome: "TJ Rio Grande do Norte", ativo: true },
  { sigla: "TJSE", nome: "TJ Sergipe", ativo: true },
  { sigla: "TJRO", nome: "TJ Rondônia", ativo: true },
  { sigla: "TJTO", nome: "TJ Tocantins", ativo: true },
  { sigla: "TJAC", nome: "TJ Acre", ativo: true },
  { sigla: "TJAP", nome: "TJ Amapá", ativo: true },
  { sigla: "TJRR", nome: "TJ Roraima", ativo: true },
];

export default function BuscaParte() {
  const [termo, setTermo] = useState("");
  const [tipoBusca, setTipoBusca] = useState<"nome" | "cnpj" | "oab">("nome");
  const [tribunaisSelecionados, setTribunaisSelecionados] = useState<string[]>(["STF"]);
  const [resultados, setResultados] = useState<BuscaResultado[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [oabUF, setOabUF] = useState("RJ");

  const handleToggleTribunal = (sigla: string) => {
    setTribunaisSelecionados(prev => 
      prev.includes(sigla) 
        ? prev.filter(t => t !== sigla)
        : [...prev, sigla]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termo.trim() || tribunaisSelecionados.length === 0 || isLoading) return;

    setResultados([]);
    setIsLoading(true);
    
    try {
      const promises = tribunaisSelecionados.map(async (tribunal) => {
        try {
          const payload: Record<string, string> = {
            tribunal,
            tipoBusca: tipoBusca,
            termoBusca: tipoBusca === "oab" ? `${termo.trim()}/${oabUF}` : termo.trim()
          };
          const response = await apiRequest("POST", "/api/consulta-processual", payload);
          const data = await response.json();
          return {
            tribunal,
            termo: termo,
            processos: data.processos || [],
            erro: data.erro,
            total: data.total_encontrados || 0
          } as BuscaResultado;
        } catch (error) {
          return {
            tribunal,
            termo: termo,
            processos: [],
            erro: "Erro ao consultar tribunal",
            total: 0
          } as BuscaResultado;
        }
      });

      const results = await Promise.all(promises);
      setResultados(results);
    } finally {
      setIsLoading(false);
    }
  };

  const totalProcessos = resultados.reduce((acc, r) => acc + r.total, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
          Busca por Parte
        </h1>
        <p className="text-muted-foreground">
          Pesquise processos por nome da parte, CNPJ ou OAB do advogado em multiplos tribunais
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Buscar Parte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Busca</Label>
                <div className="flex gap-4 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipoBusca"
                      value="nome"
                      checked={tipoBusca === "nome"}
                      onChange={() => setTipoBusca("nome")}
                      className="accent-primary"
                      data-testid="radio-nome"
                    />
                    <User className="h-4 w-4" />
                    <span>Nome</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipoBusca"
                      value="cnpj"
                      checked={tipoBusca === "cnpj"}
                      onChange={() => setTipoBusca("cnpj")}
                      className="accent-primary"
                      data-testid="radio-cnpj"
                    />
                    <Building className="h-4 w-4" />
                    <span>CNPJ</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipoBusca"
                      value="oab"
                      checked={tipoBusca === "oab"}
                      onChange={() => setTipoBusca("oab")}
                      className="accent-primary"
                      data-testid="radio-oab"
                    />
                    <Briefcase className="h-4 w-4" />
                    <span>OAB</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="termo">
                    {tipoBusca === "nome" ? "Nome da Parte" : tipoBusca === "cnpj" ? "CNPJ" : "Número da OAB"}
                  </Label>
                  <Input
                    id="termo"
                    data-testid="input-termo"
                    placeholder={
                      tipoBusca === "nome" 
                        ? "Ex: João da Silva" 
                        : tipoBusca === "cnpj" 
                          ? "Ex: 00.000.000/0001-00" 
                          : "Ex: 123456"
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
                      {["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tribunais para Busca</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {TRIBUNAIS_BUSCA.map((t) => (
                  <label 
                    key={t.sigla}
                    className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer ${
                      tribunaisSelecionados.includes(t.sigla)
                        ? t.ativo 
                          ? "bg-primary/10 border-primary/30"
                          : "bg-muted/50 border-muted"
                        : "bg-background border-muted"
                    }`}
                    data-testid={`checkbox-tribunal-${t.sigla.toLowerCase()}`}
                  >
                    <Checkbox
                      checked={tribunaisSelecionados.includes(t.sigla)}
                      onCheckedChange={() => handleToggleTribunal(t.sigla)}
                    />
                    <div className="flex-1">
                      <span className="font-medium text-sm">{t.sigla}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={!termo.trim() || tribunaisSelecionados.length === 0 || isLoading}
                data-testid="button-buscar"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar em {tribunaisSelecionados.length} tribunal(is)
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {resultados.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold" data-testid="text-resultados-titulo">
              Resultados da Busca
            </h2>
            <Badge variant="default" data-testid="badge-total">
              {totalProcessos} processo(s) encontrado(s)
            </Badge>
          </div>

          {resultados.map((resultado, index) => (
            <Card key={index} data-testid={`card-resultado-${resultado.tribunal.toLowerCase()}`}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {resultado.tribunal}
                  </CardTitle>
                  <Badge variant={resultado.processos.length > 0 ? "default" : "secondary"}>
                    {resultado.total} processo(s)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {resultado.erro && (
                  <div className="flex items-start gap-2 text-destructive mb-4">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{resultado.erro}</span>
                  </div>
                )}

                {resultado.processos.length === 0 && !resultado.erro && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum processo encontrado para "{resultado.termo}"
                  </p>
                )}

                {resultado.processos.length > 0 && (
                  <div className="space-y-2">
                    {resultado.processos.map((proc, i) => (
                      <div 
                        key={i} 
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                        data-testid={`processo-${resultado.tribunal.toLowerCase()}-${i}`}
                      >
                        <div className="flex items-center gap-2">
                          <Scale className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{proc.numero}</span>
                            {proc.classe && (
                              <Badge variant="outline" className="ml-2">
                                {proc.classe}
                              </Badge>
                            )}
                            {proc.assunto && (
                              <p className="text-xs text-muted-foreground">{proc.assunto}</p>
                            )}
                          </div>
                        </div>
                        {proc.url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={proc.url} target="_blank" rel="noopener noreferrer">
                              Ver
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sobre a Busca por Parte</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Esta funcionalidade permite buscar todos os processos em que uma pessoa ou empresa 
            figura como parte (requerente, requerido, interessado, etc).
          </p>
          <p>
            A busca é realizada nos portais oficiais dos tribunais selecionados através de 
            web scraping, respeitando os limites de acesso.
          </p>
          <p className="font-medium text-foreground">
            Tribunais disponíveis: STF. STJ, TRFs e TJs em implementação.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
