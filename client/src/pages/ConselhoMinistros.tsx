import { useState } from "react";
import { Brain, Send, FileText, AlertTriangle, Shield, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface DeliberacaoMinistro {
  nome: string;
  peso: string;
  estilo: string;
  corBadge: string;
  corBorda: string;
  deliberacao: string;
}

const SEED_DELIBERACOES: Record<string, DeliberacaoMinistro> = {
  barroso: {
    nome: "Min. Barroso",
    peso: "35%",
    estilo: "Principiologico",
    corBadge: "bg-amber-500 text-white",
    corBorda: "border-amber-400",
    deliberacao:
      "A questao posta guarda intima relacao com o principio da dignidade da pessoa humana (art. 1o, III, CF) e com a vedacao ao retrocesso social. A jurisprudencia desta Corte tem firmado entendimento no sentido de que direitos fundamentais sociais, uma vez concretizados pelo legislador, nao podem ser suprimidos sem a oferta de mecanismo compensatorio equivalente (RE 587.970/SP). Recomendo estruturar a tese em torno da eficacia horizontal dos direitos fundamentais, invocando o precedente firmado no RE 201.819/RJ, em que se reconheceu a aplicabilidade direta dos direitos fundamentais nas relacoes privadas. A fundamentacao deve articular os principios da proporcionalidade e razoabilidade como limites ao poder de conformacao do legislador. Sugiro, ainda, o dialogo com a Corte Interamericana de Direitos Humanos, notadamente a Opiniao Consultiva OC-23/17, para reforcar a dimensao convencional da protecao.",
  },
  gilmar: {
    nome: "Min. Gilmar Mendes",
    peso: "35%",
    estilo: "Tecnico-Processual",
    corBadge: "bg-blue-600 text-white",
    corBorda: "border-blue-400",
    deliberacao:
      "Do ponto de vista processual, e imprescindivel verificar o esgotamento das vias ordinarias e o prequestionamento da materia constitucional (Sumulas 282 e 356/STF). A peca deve demonstrar, de forma analitica, a repercussao geral da questao, nos termos do art. 1.035 do CPC, apresentando a transcendencia juridica, politica, social e economica do tema. Quanto ao merito, a abordagem deve privilegiar a seguranca juridica e a protecao da confianca (art. 5o, XXXVI, CF), com referencia expressa ao leading case firmado no RE 566.621/RS. E fundamental apresentar a evolucao legislativa do tema, demonstrando a existencia de um Estado de Coisas Inconstitucional, nos moldes reconhecidos na ADPF 347. A modulacao de efeitos deve ser requerida desde a petricao inicial, com parametros temporais claros, para evitar inseguranca juridica na hipotese de procedencia. Recomendo, ainda, a juntada de parecer tecnico ou estudo de impacto que quantifique os efeitos da decisao sobre o erario.",
  },
  streck: {
    nome: "Des. Streck",
    peso: "30%",
    estilo: "Advogado do Diabo",
    corBadge: "bg-red-600 text-white",
    corBorda: "border-red-400",
    deliberacao:
      "Atencao: a tese apresentada possui vulnerabilidades que a parte adversa certamente explorara. O principal risco esta na possivel invocacao da reserva do possivel (RE 592.581/RS), que tem sido utilizada pelo STF para limitar prestacoes positivas do Estado. A defesa adversaria tende a argumentar que a materia possui natureza infraconstitucional, o que obstaria o conhecimento do recurso extraordinario (ARE 748.371/MT, Tema 660). Outro ponto critico: a jurisprudencia do STJ em sentido contrario (REsp 1.657.156/RJ, Tema 106) pode ser invocada para demonstrar que a questao ja possui tratamento adequado na via infraconstitucional. Para neutralizar esses argumentos, recomendo: (i) distinguishing expresso dos precedentes adversos, demonstrando as peculiaridades faticas do caso; (ii) argumentacao subsidiaria para a hipotese de nao conhecimento; e (iii) pedido cautelar autonomo para garantir a efetividade da tutela.",
  },
  celso: {
    nome: "Min. Celso de Mello",
    peso: "Revisor",
    estilo: "Revisor Critico",
    corBadge: "bg-emerald-600 text-white",
    corBorda: "border-emerald-400",
    deliberacao:
      "Apos analise das tres perspectivas apresentadas, identifico convergencia nos seguintes pontos: (a) a materia possui inequivoca dimensao constitucional; (b) ha necessidade de demonstracao robusta do prequestionamento; (c) a fundamentacao deve articular tanto o direito interno quanto o direito convencional. Como pontos de atencao, destaco: a argumentacao principiologica do Min. Barroso deve ser complementada com a solidez tecnico-processual sugerida pelo Min. Gilmar Mendes, sob pena de a peca ser percebida como excessivamente teorica. Os contrapontos levantados pelo Des. Streck sao pertinentes e devem ser enfrentados preventivamente no corpo da peticao, especialmente a questao da reserva do possivel. Recomendo a seguinte estrutura final: (1) preliminar de admissibilidade com demonstracao do prequestionamento e da repercussao geral; (2) merito com fundamentacao principiologica e convencional; (3) secao autonoma de distinguishing dos precedentes adversos; (4) pedido com modulacao de efeitos e tutela provisoria.",
  },
};

const SEED_MEMORANDO = {
  tesePrincipal:
    "Inconstitucionalidade da norma por violacao ao principio da vedacao ao retrocesso social e a dignidade da pessoa humana (art. 1o, III, CF), com dimensao convencional reforçada pela jurisprudencia da Corte IDH.",
  argumentos: [
    "Eficacia horizontal dos direitos fundamentais nas relacoes privadas (RE 201.819/RJ), aplicavel ao caso por analogia ao reconhecer a oponibilidade do direito social em face de entes privados que exercem funcao publica.",
    "Estado de Coisas Inconstitucional configurado pela omissao estrutural do Poder Publico (ADPF 347), demandando intervencao judicial para garantia do nucleo essencial do direito.",
    "Protecao da confianca e seguranca juridica (art. 5o, XXXVI, CF; RE 566.621/RS), uma vez que a supressao do direito frustra expectativas legitimamente constituidas sob o regime anterior.",
  ],
  contraArgumentos: [
    "Reserva do possivel (RE 592.581/RS) — neutralizar com demonstracao de que o custo e inferior ao impacto social da omissao, juntando estudo de impacto orcamentario.",
    "Natureza infraconstitucional da materia (ARE 748.371/MT) — distinguishing pelas peculiaridades faticas e pela dimensao constitucional direta.",
    "Jurisprudencia contraria do STJ (REsp 1.657.156/RJ) — demonstrar superacao pelo novo contexto normativo e fatico.",
  ],
  riscos: [
    "Nao conhecimento por deficiencia no prequestionamento — mitigar com embargos de declaracao previos e demonstracao analitica.",
    "Modulacao de efeitos desfavoravel — requerer desde a petricao inicial com parametros claros.",
  ],
};

export default function ConselhoMinistros() {
  const [fatos, setFatos] = useState("");
  const [convocado, setConvocado] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConvocar = () => {
    if (!fatos.trim()) return;
    setLoading(true);
    // Simula um delay de processamento (seed data, sem LLM real)
    setTimeout(() => {
      setLoading(false);
      setConvocado(true);
    }, 1500);
  };

  const ministros = ["barroso", "gilmar", "streck", "celso"] as const;

  return (
    <div className="p-6 bg-[#f5f5f5] min-h-screen space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Brain className="w-7 h-7 text-purple-600" />
          <h1 className="text-2xl font-semibold">Conselho de Ministros IA</h1>
        </div>
        <p className="text-muted-foreground">
          Apresente os fatos e receba deliberacoes de um conselho virtual de ministros com diferentes perspectivas juridicas.
        </p>
      </div>

      {/* Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Fatos do Caso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Descreva os fatos do caso com o maximo de detalhes possiveis. Inclua informacoes sobre as partes, a legislacao aplicavel, o historico processual e os pontos controvertidos..."
            className="min-h-[200px] resize-y"
            value={fatos}
            onChange={(e) => setFatos(e.target.value)}
          />
          <Button
            onClick={handleConvocar}
            disabled={!fatos.trim() || loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Convocando Conselho...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Convocar Conselho
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Deliberacoes */}
      {convocado && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {ministros.map((key) => {
              const m = SEED_DELIBERACOES[key];
              return (
                <Card key={key} className={`border-2 ${m.corBorda}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{m.nome}</CardTitle>
                      <Badge className={m.corBadge}>{m.estilo}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">Peso: {m.peso}</span>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-gray-700">{m.deliberacao}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Memorando Estrategico */}
          <Card className="border-2 border-purple-400 bg-purple-50/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-purple-600" />
                <CardTitle className="text-xl">Memorando Estrategico</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tese Principal */}
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2 mb-2">
                  <Scale className="w-4 h-4 text-purple-600" />
                  Tese Principal
                </h3>
                <p className="text-sm bg-white p-4 rounded-lg border">{SEED_MEMORANDO.tesePrincipal}</p>
              </div>

              {/* 3 Argumentos */}
              <div>
                <h3 className="font-semibold text-base mb-2">Argumentos Centrais</h3>
                <div className="space-y-2">
                  {SEED_MEMORANDO.argumentos.map((arg, i) => (
                    <div key={i} className="flex gap-3 bg-white p-3 rounded-lg border">
                      <Badge className="bg-green-100 text-green-800 h-6 w-6 flex items-center justify-center shrink-0">
                        {i + 1}
                      </Badge>
                      <p className="text-sm">{arg}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contra-argumentos */}
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Contra-argumentos Previstos
                </h3>
                <div className="space-y-2">
                  {SEED_MEMORANDO.contraArgumentos.map((ca, i) => (
                    <div key={i} className="flex gap-3 bg-white p-3 rounded-lg border border-orange-200">
                      <Badge className="bg-orange-100 text-orange-800 h-6 shrink-0">{`C${i + 1}`}</Badge>
                      <p className="text-sm">{ca}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Riscos */}
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Riscos Identificados
                </h3>
                <div className="space-y-2">
                  {SEED_MEMORANDO.riscos.map((r, i) => (
                    <div key={i} className="flex gap-3 bg-white p-3 rounded-lg border border-red-200">
                      <Badge className="bg-red-100 text-red-800 h-6 shrink-0">{`R${i + 1}`}</Badge>
                      <p className="text-sm">{r}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
