import { useState, useEffect, useRef } from "react";
import {
  FileText,
  Brain,
  Zap,
  Eye,
  ChevronRight,
  ChevronLeft,
  Check,
  Download,
  Copy,
  Edit,
  Swords,
  BookOpen,
  Shield,
  Scale,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// --- Constantes ---

const TIPOS_PECA = [
  "Peticao Inicial",
  "Contestacao",
  "Recurso de Apelacao",
  "Recurso Especial",
  "Recurso Extraordinario",
  "Agravo de Instrumento",
  "Embargos de Declaracao",
  "Mandado de Seguranca",
  "Habeas Corpus",
  "Manifestacao",
  "Parecer",
  "Contrarrazoes",
];

const INSTANCIAS = [
  "1a Instancia",
  "2a Instancia (TJ/TRF)",
  "Tribunal Superior (STJ)",
  "Supremo Tribunal Federal",
  "Juizado Especial",
  "Turma Recursal",
];

const AREAS_DIREITO = [
  "Civel",
  "Trabalhista",
  "Penal",
  "Tributario",
  "Administrativo",
  "Constitucional",
  "Previdenciario",
  "Ambiental",
  "Consumidor",
  "Empresarial",
  "Familia e Sucessoes",
  "Eleitoral",
];

const FASES_GERACAO = [
  "Estruturacao",
  "Fatos",
  "Direito",
  "Pedidos",
  "Red Team",
  "Verificacao",
  "Formatacao",
];

// --- Seed data for Conselho resumido (Etapa 2) ---
const SEED_CONSELHO_RESUMO = [
  {
    nome: "Min. Barroso",
    estilo: "Principiologico",
    corBadge: "bg-amber-500 text-white",
    resumo:
      "Fundamentar em principios constitucionais e direitos fundamentais. Articular proporcionalidade e vedacao ao retrocesso. Incluir dialogo com Corte IDH.",
  },
  {
    nome: "Min. Gilmar Mendes",
    estilo: "Tecnico-Processual",
    corBadge: "bg-blue-600 text-white",
    resumo:
      "Assegurar prequestionamento e repercussao geral. Apresentar evolucao legislativa. Requerer modulacao de efeitos com parametros claros.",
  },
  {
    nome: "Des. Streck",
    estilo: "Advogado do Diabo",
    corBadge: "bg-red-600 text-white",
    resumo:
      "Riscos: reserva do possivel e natureza infraconstitucional. Necessario distinguishing expresso. Prever argumentacao subsidiaria.",
  },
  {
    nome: "Min. Celso de Mello",
    estilo: "Revisor Critico",
    corBadge: "bg-emerald-600 text-white",
    resumo:
      "Convergencia: materia constitucional confirmada. Estrutura recomendada: admissibilidade + merito principiologico + distinguishing + pedido com tutela.",
  },
];

// --- Seed data for Preview (Etapa 4) ---
const SEED_PREVIEW = `EXCELENTISSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA CIVEL DA COMARCA DE ___

[VERDE] Qualificacao completa das partes conforme art. 319, II, CPC

JOAO DA SILVA SANTOS, brasileiro, casado, empresario, inscrito no CPF sob o no 000.000.000-00, residente e domiciliado na Rua das Flores, no 123, Centro, Cidade/UF, CEP 00000-000, por seu advogado que esta subscreve (procuracao em anexo), vem, respeitosamente, a presenca de Vossa Excelencia, com fundamento nos arts. 319 e seguintes do Codigo de Processo Civil, propor a presente

ACAO DE OBRIGACAO DE FAZER COM PEDIDO DE TUTELA PROVISORIA DE URGENCIA

em face de EMPRESA BETA LTDA., pessoa juridica de direito privado, inscrita no CNPJ sob o no 00.000.000/0001-00, com sede na Av. Principal, no 456, Bairro Industrial, Cidade/UF, CEP 00000-000, pelos fatos e fundamentos a seguir expostos.

I - DOS FATOS

[VERDE] Narrativa fatica completa e cronologica

1. O Autor celebrou com a Re, em 15 de marco de 2024, contrato de prestacao de servicos de consultoria empresarial, pelo prazo de 12 (doze) meses, mediante remuneracao mensal de R$ 15.000,00 (quinze mil reais).

2. O referido contrato preve, em sua clausula 5a, a obrigacao da Re de fornecer ao Autor acesso irrestrito a plataforma digital de gestao, ferramenta indispensavel para a execucao dos servicos contratados.

3. Ocorre que, a partir de 10 de janeiro de 2025, a Re, de forma unilateral e sem qualquer justificativa, suspendeu o acesso do Autor a referida plataforma, inviabilizando a continuidade da prestacao dos servicos.

[AMARELO] Verificar se ha notificacao extrajudicial comprovando a mora

4. O Autor notificou extrajudicialmente a Re em 20 de janeiro de 2025, concedendo o prazo de 15 (quinze) dias para restabelecimento do acesso, sem que houvesse qualquer resposta.

II - DO DIREITO

[VERDE] Fundamentacao juridica adequada

5. O Codigo Civil, em seu art. 421, consagra o principio da funcao social do contrato, que impoe as partes o dever de lealdade e cooperacao na execucao das obrigacoes avencadas.

6. A conduta da Re configura inequivoco inadimplemento contratual (art. 389, CC), gerando ao Autor o direito de exigir o cumprimento forcado da obrigacao, nos termos do art. 497 do CPC.

7. Ademais, a suspensao unilateral e injustificada do acesso a plataforma viola o principio da boa-fe objetiva (art. 422, CC), configurando abuso de direito passivel de reparacao (art. 187, CC).

III - DA TUTELA PROVISORIA DE URGENCIA

[VERDE] Requisitos do art. 300 CPC preenchidos

8. Estao presentes os requisitos do art. 300 do CPC. A probabilidade do direito decorre da existencia de contrato valido com obrigacao expressa. O perigo de dano resulta da impossibilidade de prestacao dos servicos contratados, gerando prejuizos financeiros e reputacionais continuos ao Autor.

IV - DOS PEDIDOS

[VERDE] Pedidos especificos e bem formulados

Ante o exposto, requer:

a) A concessao de tutela provisoria de urgencia para determinar a imediata reativacao do acesso do Autor a plataforma digital, sob pena de multa diaria de R$ 1.000,00;

b) A citacao da Re para contestar a presente acao;

c) A procedencia dos pedidos para condenar a Re ao cumprimento da obrigacao de fazer consistente na manutencao do acesso a plataforma pelo prazo contratual remanescente;

d) A condenacao da Re ao pagamento de indenizacao por danos materiais e morais, a serem apurados em liquidacao de sentenca;

e) A condenacao da Re ao pagamento das custas processuais e honorarios advocaticios.

Da-se a causa o valor de R$ 180.000,00 (cento e oitenta mil reais).

Nestes termos, pede deferimento.

Cidade/UF, ___ de ___ de 2025.

___________________________
Advogado
OAB/___ no ___`;

// --- Componente Principal ---

export default function PeticoesIA() {
  const [etapa, setEtapa] = useState(1);

  // Etapa 1 - Intake
  const [tipo, setTipo] = useState("");
  const [instancia, setInstancia] = useState("");
  const [area, setArea] = useState("");
  const [cliente, setCliente] = useState("");
  const [fatos, setFatos] = useState("");
  const [pedido, setPedido] = useState("");
  const [tom, setTom] = useState<"combativo" | "reflexivo">("combativo");
  const [tutela, setTutela] = useState(false);

  // Etapa 3 - Progress
  const [faseAtual, setFaseAtual] = useState(0);
  const [progressValue, setProgressValue] = useState(0);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Etapa 4 - Preview
  const [copiadoMsg, setCopiadoMsg] = useState(false);

  const canProceed =
    etapa === 1 ? tipo && instancia && area && fatos.trim() && pedido.trim() : true;

  const iniciarGeracao = () => {
    setEtapa(3);
    setFaseAtual(0);
    setProgressValue(0);

    let fase = 0;
    let prog = 0;

    progressInterval.current = setInterval(() => {
      prog += 2;
      if (prog >= 100 && fase < FASES_GERACAO.length - 1) {
        fase += 1;
        prog = 0;
      } else if (prog >= 100 && fase === FASES_GERACAO.length - 1) {
        if (progressInterval.current) clearInterval(progressInterval.current);
        setEtapa(4);
        return;
      }
      setFaseAtual(fase);
      setProgressValue(prog);
    }, 80);
  };

  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  const handleCopiar = () => {
    navigator.clipboard.writeText(SEED_PREVIEW).then(() => {
      setCopiadoMsg(true);
      setTimeout(() => setCopiadoMsg(false), 2000);
    });
  };

  const etapas = [
    { num: 1, label: "Intake", icon: FileText },
    { num: 2, label: "Conselho", icon: Brain },
    { num: 3, label: "Geracao", icon: Zap },
    { num: 4, label: "Preview", icon: Eye },
  ];

  return (
    <div className="p-6 bg-[#f5f5f5] min-h-screen space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <FileText className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-semibold">Peticoes IA</h1>
        </div>
        <p className="text-muted-foreground">
          Gere peticoes juridicas com auxilio de inteligencia artificial em 4 etapas.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 justify-center">
        {etapas.map((e, i) => (
          <div key={e.num} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                etapa === e.num
                  ? "bg-blue-600 text-white"
                  : etapa > e.num
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-500"
              }`}
            >
              {etapa > e.num ? (
                <Check className="w-4 h-4" />
              ) : (
                <e.icon className="w-4 h-4" />
              )}
              <span>
                {e.num}. {e.label}
              </span>
            </div>
            {i < etapas.length - 1 && (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </div>
        ))}
      </div>

      {/* ETAPA 1 - Intake */}
      {etapa === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados da Peticao</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tipo de Peca */}
              <div className="space-y-2">
                <Label>Tipo de Peca</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_PECA.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Instancia */}
              <div className="space-y-2">
                <Label>Instancia</Label>
                <Select value={instancia} onValueChange={setInstancia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTANCIAS.map((inst) => (
                      <SelectItem key={inst} value={inst}>
                        {inst}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Area do Direito */}
              <div className="space-y-2">
                <Label>Area do Direito</Label>
                <Select value={area} onValueChange={setArea}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {AREAS_DIREITO.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cliente */}
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                placeholder="Buscar cliente pelo nome..."
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
              />
            </div>

            {/* Fatos */}
            <div className="space-y-2">
              <Label>Resumo dos Fatos</Label>
              <Textarea
                placeholder="Descreva os fatos do caso de forma detalhada..."
                className="min-h-[120px] resize-y"
                value={fatos}
                onChange={(e) => setFatos(e.target.value)}
              />
            </div>

            {/* Pedido */}
            <div className="space-y-2">
              <Label>Pedido Final</Label>
              <Textarea
                placeholder="Descreva o que se pretende obter com a peticao..."
                className="min-h-[80px] resize-y"
                value={pedido}
                onChange={(e) => setPedido(e.target.value)}
              />
            </div>

            {/* Tom e Tutela */}
            <div className="flex flex-wrap items-center gap-6">
              {/* Toggle Tom */}
              <div className="space-y-2">
                <Label>Tom da Peticao</Label>
                <div className="flex gap-2">
                  <Button
                    variant={tom === "combativo" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTom("combativo")}
                    className={tom === "combativo" ? "bg-red-600 hover:bg-red-700" : ""}
                  >
                    <Swords className="w-4 h-4 mr-1" />
                    Combativo
                  </Button>
                  <Button
                    variant={tom === "reflexivo" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTom("reflexivo")}
                    className={tom === "reflexivo" ? "bg-blue-600 hover:bg-blue-700" : ""}
                  >
                    <BookOpen className="w-4 h-4 mr-1" />
                    Reflexivo
                  </Button>
                </div>
              </div>

              {/* Tutela */}
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="tutela"
                  checked={tutela}
                  onCheckedChange={(v) => setTutela(v === true)}
                />
                <Label htmlFor="tutela" className="cursor-pointer">
                  Tutela Provisoria de Urgencia
                </Label>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => setEtapa(2)}
                disabled={!canProceed}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Avancar para Conselho
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ETAPA 2 - Conselho Resumo */}
      {etapa === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {SEED_CONSELHO_RESUMO.map((m) => (
              <Card key={m.nome}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{m.nome}</CardTitle>
                    <Badge className={`${m.corBadge} text-xs`}>{m.estilo}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{m.resumo}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Memorando resumido */}
          <Card className="border-2 border-purple-300 bg-purple-50/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <CardTitle className="text-base">Memorando Estrategico (Resumo)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <Scale className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-purple-700">Tese:</span>
                  <p className="text-sm">
                    Inconstitucionalidade por violacao a vedacao ao retrocesso social e dignidade da pessoa humana.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-green-700">Argumentos:</span>
                  <p className="text-sm">Eficacia horizontal, Estado de Coisas Inconstitucional, protecao da confianca.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-red-700">Riscos:</span>
                  <p className="text-sm">Reserva do possivel, deficiencia no prequestionamento.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setEtapa(1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
            <Button onClick={iniciarGeracao} className="bg-blue-600 hover:bg-blue-700">
              <Zap className="w-4 h-4 mr-1" />
              Gerar Peticao
            </Button>
          </div>
        </div>
      )}

      {/* ETAPA 3 - Geracao */}
      {etapa === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-center">Gerando Peticao...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 py-8">
            <div className="max-w-lg mx-auto space-y-4">
              {FASES_GERACAO.map((fase, i) => (
                <div key={fase} className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                      i < faseAtual
                        ? "bg-green-500 text-white"
                        : i === faseAtual
                          ? "bg-blue-500 text-white animate-pulse"
                          : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {i < faseAtual ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span
                    className={`text-sm ${
                      i < faseAtual
                        ? "text-green-700 font-medium"
                        : i === faseAtual
                          ? "text-blue-700 font-semibold"
                          : "text-gray-400"
                    }`}
                  >
                    {fase}
                  </span>
                  {i === faseAtual && (
                    <div className="flex-1 ml-2">
                      <Progress value={progressValue} className="h-2" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ETAPA 4 - Preview */}
      {etapa === 4 && (
        <div className="space-y-4">
          {/* Badges de qualidade */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className="bg-green-100 text-green-800">
              <Check className="w-3 h-3 mr-1" />
              Qualificacao [VERDE]
            </Badge>
            <Badge className="bg-green-100 text-green-800">
              <Check className="w-3 h-3 mr-1" />
              Fatos [VERDE]
            </Badge>
            <Badge className="bg-green-100 text-green-800">
              <Check className="w-3 h-3 mr-1" />
              Fundamentacao [VERDE]
            </Badge>
            <Badge className="bg-yellow-100 text-yellow-800">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Notificacao [AMARELO]
            </Badge>
            <Badge className="bg-green-100 text-green-800">
              <Check className="w-3 h-3 mr-1" />
              Pedidos [VERDE]
            </Badge>
          </div>

          {/* Documento */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Preview do Documento</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Tom: </span>
                  {tom === "combativo" ? (
                    <Badge className="bg-red-100 text-red-700">
                      <Swords className="w-3 h-3 mr-1" />
                      Combativo
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-100 text-blue-700">
                      <BookOpen className="w-3 h-3 mr-1" />
                      Reflexivo
                    </Badge>
                  )}
                  {tutela && (
                    <Badge className="bg-purple-100 text-purple-700">Tutela Provisoria</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-white border rounded-lg p-8 font-serif text-sm leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto">
                {SEED_PREVIEW}
              </div>
            </CardContent>
          </Card>

          {/* Acoes */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setEtapa(1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Nova Peticao
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopiar}>
                {copiadoMsg ? (
                  <>
                    <Check className="w-4 h-4 mr-1 text-green-600" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copiar
                  </>
                )}
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-1" />
                Exportar DOCX
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Edit className="w-4 h-4 mr-1" />
                Revisar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
