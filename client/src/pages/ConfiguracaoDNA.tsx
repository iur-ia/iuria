import { useState, useCallback } from "react";
import {
  Sliders,
  Brain,
  Shield,
  Key,
  CheckCircle,
  XCircle,
  Swords,
  BookOpen,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- Seed preview texts ---

const PREVIEW_COMBATIVO = `A conduta da parte adversa revela INEQUIVOCA e DELIBERADA violacao aos principios constitucionais mais elementares. Nao ha qualquer margem para interpretacao diversa: o ato impugnado afronta diretamente o nucleo essencial do direito fundamental em questao, configurando abuso de direito que EXIGE a imediata intervencao jurisdicional.

Importa destacar que a jurisprudencia pacifica desta Corte ja se pronunciou REITERADAMENTE sobre a materia, nao restando qualquer espaco para tergiversacao. O precedente firmado no RE 201.819/RJ e cristalino ao estabelecer a eficacia horizontal dos direitos fundamentais, e a parte adversa NAO PODE simplesmente ignorar este comando constitucional.

Diante da GRAVIDADE dos fatos narrados e da URGENCIA que o caso reclama, o deferimento da tutela provisoria se impoe como medida INDISPENSAVEL a prevencao de dano irreparavel.`;

const PREVIEW_REFLEXIVO = `A analise do caso vertente demanda uma ponderacao cuidadosa dos principios constitucionais aplicaveis e dos interesses em conflito. A materia se insere no ambito da chamada eficacia horizontal dos direitos fundamentais, tema sobre o qual a doutrina e a jurisprudencia tem construido um consenso progressivo.

Com efeito, a partir do paradigma estabelecido pelo Supremo Tribunal Federal no RE 201.819/RJ, a comunidade juridica passou a reconhecer que os direitos fundamentais irradiam efeitos para alem das relacoes verticais entre Estado e particular. Neste contexto, a conduta da parte adversa merece ser analisada a luz dos deveres de boa-fe e cooperacao que informam as relacoes juridicas privadas.

A concessao da tutela provisoria encontra fundamento na conjugacao dos requisitos legais, sopesando-se, de um lado, a probabilidade do direito invocado e, de outro, o risco de dano decorrente da demora na prestacao jurisdicional.`;

export default function ConfiguracaoDNA() {
  const [pesoBarroso, setPesoBarroso] = useState(35);
  const [pesoGilmar, setPesoGilmar] = useState(35);
  const [pesoStreck, setPesoStreck] = useState(30);

  const [apiKey, setApiKey] = useState("");
  const [apiKeySalva, setApiKeySalva] = useState(false);

  const soma = pesoBarroso + pesoGilmar + pesoStreck;
  const somaValida = soma === 100;

  const ajustarPeso = useCallback(
    (quem: "barroso" | "gilmar" | "streck", valor: number) => {
      if (quem === "barroso") {
        setPesoBarroso(valor);
        // Auto-adjust the others proportionally
        const restante = 100 - valor;
        const somaOutros = pesoGilmar + pesoStreck;
        if (somaOutros > 0) {
          setPesoGilmar(Math.round((pesoGilmar / somaOutros) * restante));
          setPesoStreck(Math.round((pesoStreck / somaOutros) * restante));
        } else {
          setPesoGilmar(Math.round(restante / 2));
          setPesoStreck(restante - Math.round(restante / 2));
        }
      } else if (quem === "gilmar") {
        setPesoGilmar(valor);
        const restante = 100 - valor;
        const somaOutros = pesoBarroso + pesoStreck;
        if (somaOutros > 0) {
          setPesoBarroso(Math.round((pesoBarroso / somaOutros) * restante));
          setPesoStreck(Math.round((pesoStreck / somaOutros) * restante));
        } else {
          setPesoBarroso(Math.round(restante / 2));
          setPesoStreck(restante - Math.round(restante / 2));
        }
      } else {
        setPesoStreck(valor);
        const restante = 100 - valor;
        const somaOutros = pesoBarroso + pesoGilmar;
        if (somaOutros > 0) {
          setPesoBarroso(Math.round((pesoBarroso / somaOutros) * restante));
          setPesoGilmar(Math.round((pesoGilmar / somaOutros) * restante));
        } else {
          setPesoBarroso(Math.round(restante / 2));
          setPesoGilmar(restante - Math.round(restante / 2));
        }
      }
    },
    [pesoBarroso, pesoGilmar, pesoStreck],
  );

  const handleSalvarApiKey = () => {
    if (apiKey.trim()) {
      setApiKeySalva(true);
    }
  };

  return (
    <div className="p-6 bg-[#f5f5f5] min-h-screen space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Sliders className="w-7 h-7 text-indigo-600" />
          <h1 className="text-2xl font-semibold">Configuracao DNA</h1>
        </div>
        <p className="text-muted-foreground">
          Ajuste os pesos dos ministros do Conselho IA e configure integracoes externas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sliders dos Pesos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                Pesos do Conselho
              </CardTitle>
              <Badge
                className={
                  somaValida
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }
              >
                Soma: {soma}%{" "}
                {somaValida ? (
                  <CheckCircle className="w-3 h-3 ml-1 inline" />
                ) : (
                  <XCircle className="w-3 h-3 ml-1 inline" />
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Barroso */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500 text-white">Principiologico</Badge>
                  <Label className="font-medium">Min. Barroso</Label>
                </div>
                <span className="text-lg font-bold text-amber-600">{pesoBarroso}%</span>
              </div>
              <Slider
                value={[pesoBarroso]}
                min={0}
                max={100}
                step={5}
                onValueChange={([v]) => ajustarPeso("barroso", v)}
                className="[&_[role=slider]]:bg-amber-500"
              />
              <p className="text-xs text-muted-foreground">
                Fundamentacao em principios constitucionais, direitos fundamentais e direito convencional.
              </p>
            </div>

            {/* Gilmar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600 text-white">Tecnico-Processual</Badge>
                  <Label className="font-medium">Min. Gilmar Mendes</Label>
                </div>
                <span className="text-lg font-bold text-blue-600">{pesoGilmar}%</span>
              </div>
              <Slider
                value={[pesoGilmar]}
                min={0}
                max={100}
                step={5}
                onValueChange={([v]) => ajustarPeso("gilmar", v)}
                className="[&_[role=slider]]:bg-blue-600"
              />
              <p className="text-xs text-muted-foreground">
                Foco em admissibilidade, seguranca juridica, prequestionamento e evolucao legislativa.
              </p>
            </div>

            {/* Streck */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-600 text-white">Advogado do Diabo</Badge>
                  <Label className="font-medium">Des. Streck</Label>
                </div>
                <span className="text-lg font-bold text-red-600">{pesoStreck}%</span>
              </div>
              <Slider
                value={[pesoStreck]}
                min={0}
                max={100}
                step={5}
                onValueChange={([v]) => ajustarPeso("streck", v)}
                className="[&_[role=slider]]:bg-red-600"
              />
              <p className="text-xs text-muted-foreground">
                Identificacao de vulnerabilidades, contra-argumentos e analise de riscos processuais.
              </p>
            </div>

            {!somaValida && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <Info className="w-4 h-4 shrink-0" />
                A soma dos pesos deve ser exatamente 100%. Ajuste os sliders ou eles serao rebalanceados automaticamente.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview do Tom */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview por Tom</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="combativo">
              <TabsList className="w-full">
                <TabsTrigger value="combativo" className="flex-1 gap-1">
                  <Swords className="w-4 h-4" />
                  Combativo
                </TabsTrigger>
                <TabsTrigger value="reflexivo" className="flex-1 gap-1">
                  <BookOpen className="w-4 h-4" />
                  Reflexivo
                </TabsTrigger>
              </TabsList>
              <TabsContent value="combativo" className="mt-4">
                <div className="bg-white border rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                  {PREVIEW_COMBATIVO}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Linguagem assertiva, enfatica e direta. Ideal para recursos e situacoes de urgencia.
                </p>
              </TabsContent>
              <TabsContent value="reflexivo" className="mt-4">
                <div className="bg-white border rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                  {PREVIEW_REFLEXIVO}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Linguagem ponderada, academica e diplomatica. Ideal para peticoes iniciais e pareceres.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Integracoes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Integracoes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MCP TecJustica */}
            <div className="space-y-3 p-4 bg-white rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-medium">MCP TecJustica</h3>
                </div>
                {apiKeySalva ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Conectado
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-600">Nao configurado</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Acesso a 92+ tribunais brasileiros via protocolo MCP. Consulta processual, andamentos e prazos.
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Cole sua API Key aqui..."
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setApiKeySalva(false);
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handleSalvarApiKey}
                  disabled={!apiKey.trim()}
                  size="sm"
                >
                  Salvar
                </Button>
              </div>
            </div>

            {/* Certificado Digital */}
            <div className="space-y-3 p-4 bg-white rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-medium">Certificado Digital</h3>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800">
                  <Info className="w-3 h-3 mr-1" />
                  Pendente
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Certificado A1/A3 para assinatura digital e protocolamento automatico de peticoes.
              </p>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1 text-gray-500">
                  <XCircle className="w-4 h-4" />
                  <span>Nenhum certificado configurado</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.href = "/gestao/certificados"}>
                Gerenciar Certificados
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
