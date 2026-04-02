import { safeStorage } from "@/lib/safeStorage";
import { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNavigation } from "@/components/TopNavigation";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

// Lazy-loaded page components for code splitting
const Processos = lazy(() => import("@/pages/Processos"));
const Prazos = lazy(() => import("@/pages/Prazos"));
const Clientes = lazy(() => import("@/pages/gestao/Clientes"));
const Equipe = lazy(() => import("@/pages/gestao/Equipe"));
const Relatorios = lazy(() => import("@/pages/gestao/Relatorios"));
const ListaAtividades = lazy(() => import("@/pages/atividades/Lista"));
const PainelTarefas = lazy(() => import("@/pages/atividades/Painel"));
const KanbanTarefas = lazy(() => import("@/pages/atividades/Kanban"));
const RelatoriosAtividades = lazy(() => import("@/pages/atividades/RelatoriosAtividades"));
const ContasReceber = lazy(() => import("@/pages/financeiro/ContasReceber"));
const ContasPagar = lazy(() => import("@/pages/financeiro/ContasPagar"));
const Honorarios = lazy(() => import("@/pages/financeiro/Honorarios"));
const TodosDocumentos = lazy(() => import("@/pages/documentos/TodosDocumentos"));
const Peticoes = lazy(() => import("@/pages/documentos/Peticoes"));
const Contratos = lazy(() => import("@/pages/documentos/Contratos"));
const ConsultaProcessual = lazy(() => import("@/pages/ConsultaProcessual"));
const BuscaParte = lazy(() => import("@/pages/BuscaParte"));
const Monitoramento = lazy(() => import("@/pages/Monitoramento"));
const DiarioOficial = lazy(() => import("@/pages/DiarioOficial"));
const ProcessoDetalhe = lazy(() => import("@/pages/ProcessoDetalhe"));
const CertificadosDigitais = lazy(() => import("@/pages/CertificadosDigitais"));
const ConselhoMinistros = lazy(() => import("@/pages/ConselhoMinistros"));
const PeticoesIA = lazy(() => import("@/pages/PeticoesIA"));
const ConfiguracaoDNA = lazy(() => import("@/pages/ConfiguracaoDNA"));

function GestaoIndex() {
  return (
    <div className="p-6 bg-[#f5f5f5] min-h-screen space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Gestao</h1>
        <p className="text-muted-foreground mt-1">Painel de gestao do escritorio</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Clientes", desc: "Gerencie a base de clientes do escritorio", href: "/gestao/clientes", icon: "👥" },
          { title: "Equipe", desc: "Gerenciamento da equipe e membros", href: "/gestao/equipe", icon: "🏢" },
          { title: "Relatorios", desc: "Relatorios gerenciais e analiticos", href: "/gestao/relatorios", icon: "📊" },
          { title: "Certificados Digitais", desc: "Gestao de certificados A1/A3", href: "/gestao/certificados", icon: "🔐" },
        ].map(item => (
          <a key={item.href} href={item.href} className="block p-6 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">{item.icon}</div>
            <h3 className="font-semibold text-lg">{item.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

function FinanceiroIndex() {
  return (
    <div className="p-6 bg-[#f5f5f5] min-h-screen space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Financeiro</h1>
        <p className="text-muted-foreground mt-1">Gestao financeira do escritorio</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Contas a Receber", desc: "Gerencie receitas e pagamentos de clientes", href: "/financeiro/receber", icon: "💰" },
          { title: "Contas a Pagar", desc: "Controle despesas e fornecedores", href: "/financeiro/pagar", icon: "💸" },
          { title: "Honorarios", desc: "Contratos de honorarios e valores", href: "/financeiro/honorarios", icon: "📋" },
        ].map(item => (
          <a key={item.href} href={item.href} className="block p-6 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">{item.icon}</div>
            <h3 className="font-semibold text-lg">{item.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/prazos" component={Prazos} />
        <Route path="/processos/incompletos" component={Processos} />
        <Route path="/processos/movimentados" component={Processos} />
        <Route path="/processos/parados" component={Processos} />
        <Route path="/processos/:id" component={ProcessoDetalhe} />
        <Route path="/processos" component={Processos} />
        <Route path="/gestao/clientes" component={Clientes} />
        <Route path="/gestao/equipe" component={Equipe} />
        <Route path="/gestao/relatorios" component={Relatorios} />
        <Route path="/gestao/certificados" component={CertificadosDigitais} />
        <Route path="/gestao" component={GestaoIndex} />
        <Route path="/atividades/painel" component={PainelTarefas} />
        <Route path="/atividades/kanban" component={KanbanTarefas} />
        <Route path="/atividades/relatorios" component={RelatoriosAtividades} />
        <Route path="/atividades" component={ListaAtividades} />
        <Route path="/financeiro/receber" component={ContasReceber} />
        <Route path="/financeiro/pagar" component={ContasPagar} />
        <Route path="/financeiro/honorarios" component={Honorarios} />
        <Route path="/financeiro" component={FinanceiroIndex} />
        <Route path="/documentos/peticoes" component={Peticoes} />
        <Route path="/documentos/contratos" component={Contratos} />
        <Route path="/documentos" component={TodosDocumentos} />
        <Route path="/consulta-processual" component={ConsultaProcessual} />
        <Route path="/busca-parte" component={BuscaParte} />
        <Route path="/monitoramento" component={Monitoramento} />
        <Route path="/diarios" component={DiarioOficial} />
        <Route path="/lexos/conselho" component={ConselhoMinistros} />
        <Route path="/lexos/peticoes" component={PeticoesIA} />
        <Route path="/lexos/config-dna" component={ConfiguracaoDNA} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AuthenticatedApp({ user, onLogout }: { user: any; onLogout: () => void }) {
  return (
    <div className="min-h-screen">
      <TopNavigation user={user} onLogout={onLogout} />
      <main>
        <Router />
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not authenticated");
      })
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
  };

  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      .then(() => {
        setUser(null);
        safeStorage.removeItem("iuria_token");
        queryClient.clear();
      })
      .catch(() => {
        setUser(null);
        safeStorage.removeItem("iuria_token");
      });
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {user ? (
          <AuthenticatedApp user={user} onLogout={handleLogout} />
        ) : (
          <Login onLogin={handleLogin} />
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
