import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNavigation } from "@/components/TopNavigation";
import Dashboard from "@/pages/Dashboard";
import Processos from "@/pages/Processos";
import Clientes from "@/pages/gestao/Clientes";
import Equipe from "@/pages/gestao/Equipe";
import Relatorios from "@/pages/gestao/Relatorios";
import ListaAtividades from "@/pages/atividades/Lista";
import PainelTarefas from "@/pages/atividades/Painel";
import KanbanTarefas from "@/pages/atividades/Kanban";
import RelatoriosAtividades from "@/pages/atividades/RelatoriosAtividades";
import RegrasPrazos from "@/pages/atividades/RegrasPrazos";
import PrazosCriticos from "@/pages/atividades/PrazosCriticos";
import ContasReceber from "@/pages/financeiro/ContasReceber";
import ContasPagar from "@/pages/financeiro/ContasPagar";
import Honorarios from "@/pages/financeiro/Honorarios";
import TodosDocumentos from "@/pages/documentos/TodosDocumentos";
import Peticoes from "@/pages/documentos/Peticoes";
import Contratos from "@/pages/documentos/Contratos";
import Oficios from "@/pages/documentos/Oficios";
import ConsultaProcessual from "@/pages/ConsultaProcessual";
import ProcessosAcompanhar from "@/pages/ProcessosAcompanhar";
import PesquisaJuridica from "@/pages/pesquisa-juridica";
import BuscaParte from "@/pages/BuscaParte";
import Monitoramento from "@/pages/Monitoramento";
import AcervoJudicial from "@/pages/acervo/AcervoJudicial";
import ProcessoAdministrativo from "@/pages/acervo/ProcessoAdministrativo";
import DiarioOficial from "@/pages/DiarioOficial";
import Configuracoes from "@/pages/Configuracoes";
import PeticoesIA from "@/pages/PeticoesIA";
import ConselhoMinistros from "@/pages/ConselhoMinistros";
import ConfiguracaoDNA from "@/pages/ConfiguracaoDNA";
import Timesheet from "@/pages/Timesheet";
import RelatoriosGerenciais from "@/pages/RelatoriosGerenciais";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/processos/incompletos" component={Processos} />
      <Route path="/processos/movimentados" component={Processos} />
      <Route path="/processos/parados" component={Processos} />
      <Route path="/processos" component={Processos} />
      <Route path="/gestao/clientes" component={Clientes} />
      <Route path="/gestao/equipe" component={Equipe} />
      <Route path="/gestao/relatorios" component={Relatorios} />
      <Route path="/gestao" component={() => <div className="p-6 bg-[#f5f5f5] min-h-screen"><h1 className="text-2xl font-semibold">Gestão</h1><p className="text-muted-foreground mt-2">Selecione uma opção no menu</p></div>} />
      <Route path="/atividades/painel" component={PainelTarefas} />
      <Route path="/atividades/kanban" component={KanbanTarefas} />
      <Route path="/atividades/relatorios" component={RelatoriosAtividades} />
      <Route path="/atividades/regras-prazos" component={RegrasPrazos} />
      <Route path="/atividades/prazos-criticos" component={PrazosCriticos} />
      <Route path="/atividades" component={ListaAtividades} />
      <Route path="/financeiro/receber" component={ContasReceber} />
      <Route path="/financeiro/pagar" component={ContasPagar} />
      <Route path="/financeiro/honorarios" component={Honorarios} />
      <Route path="/financeiro" component={() => <div className="p-6 bg-[#f5f5f5] min-h-screen"><h1 className="text-2xl font-semibold">Financeiro</h1><p className="text-muted-foreground mt-2">Selecione uma opção no menu</p></div>} />
      <Route path="/documentos/peticoes" component={Peticoes} />
      <Route path="/documentos/contratos" component={Contratos} />
      <Route path="/documentos/oficios" component={Oficios} />
      <Route path="/documentos" component={TodosDocumentos} />
      <Route path="/acervo/judicial" component={AcervoJudicial} />
      <Route path="/acervo/administrativo" component={ProcessoAdministrativo} />
      <Route path="/consulta-processual" component={ConsultaProcessual} />
      <Route path="/busca-parte" component={BuscaParte} />
      <Route path="/monitoramento" component={Monitoramento} />
      <Route path="/acompanhamentos" component={ProcessosAcompanhar} />
      <Route path="/pesquisa-juridica" component={PesquisaJuridica} />
      <Route path="/diarios" component={DiarioOficial} />
      <Route path="/configuracoes" component={Configuracoes} />
      <Route path="/configuracoes/dna" component={ConfiguracaoDNA} />
      <Route path="/atividades/timesheet" component={Timesheet} />
      <Route path="/gestao/relatorios-gerenciais" component={RelatoriosGerenciais} />
      <Route path="/ia/peticoes" component={PeticoesIA} />
      <Route path="/ia/conselho" component={ConselhoMinistros} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen">
          <TopNavigation />
          <main>
            <Router />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
