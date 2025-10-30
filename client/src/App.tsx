import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNavigation } from "@/components/TopNavigation";
import Dashboard from "@/pages/Dashboard";
import Processos from "@/pages/Processos";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/processos" component={Processos} />
      <Route path="/processos/:filter" component={Processos} />
      <Route path="/gestao" component={() => <div className="p-6 bg-[#f5f5f5] min-h-screen"><h1 className="text-2xl font-semibold">Gestão</h1><p className="text-muted-foreground mt-2">Em desenvolvimento...</p></div>} />
      <Route path="/atividades" component={() => <div className="p-6 bg-[#f5f5f5] min-h-screen"><h1 className="text-2xl font-semibold">Atividades</h1><p className="text-muted-foreground mt-2">Em desenvolvimento...</p></div>} />
      <Route path="/financeiro" component={() => <div className="p-6 bg-[#f5f5f5] min-h-screen"><h1 className="text-2xl font-semibold">Financeiro</h1><p className="text-muted-foreground mt-2">Em desenvolvimento...</p></div>} />
      <Route path="/documentos" component={() => <div className="p-6 bg-[#f5f5f5] min-h-screen"><h1 className="text-2xl font-semibold">Documentos</h1><p className="text-muted-foreground mt-2">Em desenvolvimento...</p></div>} />
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
