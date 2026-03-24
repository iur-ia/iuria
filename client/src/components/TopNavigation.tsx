import { Bell, Search, User, ChevronDown, LogOut, Settings, Scale, ExternalLink } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

/**
 * Determines the navigation target URL for a notification based on its type
 * and associated references (processoId, prazoId, monitoramentoId).
 */
function getNotificationTargetUrl(alerta: any): string | null {
  const tipo = alerta.tipo || "";

  // Priority: navigate to the most specific context for the alert type
  // Include query params to allow target pages to highlight the relevant item
  if (tipo === "prazo_vencendo" || tipo === "prazo_vencido") {
    const params = alerta.prazoId ? `?destaque=${alerta.prazoId}` : "";
    return `/prazos${params}`;
  }
  if (tipo === "novo_andamento") {
    const params = alerta.monitoramentoId ? `?destaque=${alerta.monitoramentoId}` : "";
    return `/monitoramento${params}`;
  }
  if (tipo === "publicacao_dje") {
    return "/diarios";
  }

  // Fallback by reference IDs
  if (alerta.processoId) {
    return `/processos?destaque=${alerta.processoId}`;
  }
  if (alerta.prazoId) {
    return `/prazos?destaque=${alerta.prazoId}`;
  }
  if (alerta.monitoramentoId) {
    return `/monitoramento?destaque=${alerta.monitoramentoId}`;
  }

  // For task-related alerts, navigate to atividades
  if (tipo.includes("tarefa") || tipo.includes("atividade")) {
    return "/atividades";
  }

  // Default: dashboard
  return "/";
}

const menuItems = [
  {
    title: "GESTAO",
    href: "/gestao",
    submenu: [
      { title: "Clientes", href: "/gestao/clientes" },
      { title: "Equipe", href: "/gestao/equipe" },
      { title: "Relatorios", href: "/gestao/relatorios" },
      { title: "Certificados Digitais", href: "/gestao/certificados" },
    ],
  },
  {
    title: "ATIVIDADES",
    href: "/atividades",
    submenu: [
      { title: "Lista de atividades", href: "/atividades" },
      { title: "Painel de Tarefas", href: "/atividades/painel" },
      { title: "Kanban de Tarefas", href: "/atividades/kanban" },
      { title: "Relatorios", href: "/atividades/relatorios" },
    ],
  },
  {
    title: "PROCESSOS",
    href: "/processos",
    submenu: [
      { title: "Todos os Processos", href: "/processos" },
      { title: "Prazos Processuais", href: "/prazos" },
      { title: "Consulta Processual", href: "/consulta-processual" },
      { title: "Busca por Parte", href: "/busca-parte" },
      { title: "Monitoramento", href: "/monitoramento" },
      { title: "Diarios Oficiais", href: "/diarios" },
    ],
  },
  {
    title: "FINANCEIRO",
    href: "/financeiro",
    submenu: [
      { title: "Contas a Receber", href: "/financeiro/receber" },
      { title: "Contas a Pagar", href: "/financeiro/pagar" },
      { title: "Honorarios", href: "/financeiro/honorarios" },
    ],
  },
  {
    title: "DOCUMENTOS",
    href: "/documentos",
    submenu: [
      { title: "Todos os Documentos", href: "/documentos" },
      { title: "Peticoes", href: "/documentos/peticoes" },
      { title: "Contratos", href: "/documentos/contratos" },
    ],
  },
];

interface TopNavigationProps {
  user?: any;
  onLogout?: () => void;
}

export function TopNavigation({ user, onLogout }: TopNavigationProps) {
  const [, setLocation] = useLocation();

  const { data: alertasData } = useQuery<{ total: number; alertas: any[] }>({
    queryKey: ["/api/alertas/nao-lidos"],
    refetchInterval: 15000,
  });

  const alertCount = alertasData?.total || 0;
  const alertas = alertasData?.alertas || [];

  const handleMarcarTodosLidos = async () => {
    try {
      await apiRequest("POST", "/api/alertas/marcar-todos-lidos");
      queryClient.invalidateQueries({ queryKey: ["/api/alertas/nao-lidos"] });
    } catch {}
  };

  const handleMarcarLido = async (id: string, alerta?: any) => {
    try {
      await apiRequest("PATCH", `/api/alertas/${id}/lido`);
      queryClient.invalidateQueries({ queryKey: ["/api/alertas/nao-lidos"] });

      // Navigate to the relevant location based on alert type and references
      if (alerta) {
        const targetUrl = getNotificationTargetUrl(alerta);
        if (targetUrl) {
          setLocation(targetUrl);
        }
      }
    } catch {}
  };

  const initials = user?.nome?.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() || "TG";
  const displayName = user?.nome || "Thiago Gomes";

  return (
    <div className="bg-[#1a1a1a] text-white border-b border-[#2a2a2a]">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer" data-testid="logo-home">
              <div className="p-1.5 bg-white/10 rounded-lg">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-lg font-bold tracking-tight">iuria</span>
                <span className="text-[10px] text-gray-400 font-medium tracking-wider">LEXFUTURA</span>
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {menuItems.map((item) => (
              <DropdownMenu key={item.title}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="bg-transparent hover:bg-white/10 text-white h-9 px-3 text-sm font-medium"
                  >
                    {item.title}
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {item.submenu.map((subItem) => (
                    <DropdownMenuItem 
                      key={subItem.href}
                      onClick={() => setLocation(subItem.href)}
                    >
                      {subItem.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Pesquisar..."
              className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-gray-400 h-9"
            />
          </div>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/10 h-9 w-9">
                <Bell className="w-5 h-5" />
                {alertCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs bg-red-500 text-white border-0">
                    {alertCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-3 border-b flex items-center justify-between">
                <h4 className="font-semibold text-sm">Notificacoes</h4>
                {alertCount > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleMarcarTodosLidos}>
                    Marcar todas como lidas
                  </Button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {alertas.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Nenhuma notificacao pendente
                  </div>
                ) : (
                  alertas.slice(0, 8).map((alerta: any) => (
                    <div
                      key={alerta.id}
                      className="p-3 border-b hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleMarcarLido(alerta.id, alerta)}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${alerta.prioridade === "critica" ? "bg-red-500" : alerta.prioridade === "alta" ? "bg-orange-500" : "bg-blue-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{alerta.titulo}</p>
                          <p className="text-xs text-muted-foreground truncate">{alerta.mensagem}</p>
                          {alerta.tipo && (
                            <div className="flex items-center gap-1 mt-1">
                              <ExternalLink className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-primary/70">
                                {alerta.tipo === "prazo_vencendo" ? "Ir para Prazos" :
                                 alerta.tipo === "prazo_vencido" ? "Ir para Prazos" :
                                 alerta.tipo === "novo_andamento" ? "Ir para Monitoramento" :
                                 alerta.tipo === "publicacao_dje" ? "Ir para Diarios" :
                                 alerta.processoId ? "Ir para Processos" :
                                 "Ver detalhes"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 text-white hover:bg-white/10 h-9">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm hidden md:inline">{displayName}</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Meus Dados</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configuracoes</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
