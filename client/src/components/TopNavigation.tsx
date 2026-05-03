import {
  Bell,
  MagnifyingGlass,
  User,
  CaretDown,
  Gear,
  SignOut,
  Command,
} from "@phosphor-icons/react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

type TopNavProps = {
  onOpenPalette?: () => void;
};

const menuItems = [
  {
    title: "Gestão",
    href: "/gestao",
    submenu: [
      { title: "Clientes", href: "/gestao/clientes" },
      { title: "Equipe", href: "/gestao/equipe" },
      { title: "Relatórios", href: "/gestao/relatorios" },
      { title: "Relatórios Gerenciais", href: "/gestao/relatorios-gerenciais" },
    ],
  },
  {
    title: "Atividades",
    href: "/atividades",
    submenu: [
      { title: "Lista de atividades", href: "/atividades" },
      { title: "Painel de Tarefas", href: "/atividades/painel" },
      { title: "Kanban de Tarefas", href: "/atividades/kanban" },
      { title: "Prazos Críticos", href: "/atividades/prazos-criticos" },
      { title: "Regras de Prazos", href: "/atividades/regras-prazos" },
      { title: "Timesheet", href: "/atividades/timesheet" },
      { title: "Relatórios", href: "/atividades/relatorios" },
    ],
  },
  {
    title: "Processos",
    href: "/processos",
    submenu: [
      { title: "Todos os Processos", href: "/processos" },
      { title: "Consulta Processual", href: "/consulta-processual" },
      { title: "Busca por Parte", href: "/busca-parte" },
      { title: "Monitoramento", href: "/monitoramento" },
      { title: "Processos a Acompanhar", href: "/acompanhamentos" },
      { title: "Pesquisa Jurídica", href: "/pesquisa-juridica" },
      { title: "Diários Oficiais", href: "/diarios" },
      { title: "Incompletos", href: "/processos/incompletos" },
      { title: "Movimentados", href: "/processos/movimentados" },
      { title: "Parados", href: "/processos/parados" },
    ],
  },
  {
    title: "Acervo",
    href: "/acervo/judicial",
    submenu: [
      { title: "Processos Judiciais", href: "/acervo/judicial" },
      { title: "Processos Administrativos", href: "/acervo/administrativo" },
    ],
  },
  {
    title: "Financeiro",
    href: "/financeiro",
    submenu: [
      { title: "Contas a Receber", href: "/financeiro/receber" },
      { title: "Contas a Pagar", href: "/financeiro/pagar" },
      { title: "Honorários", href: "/financeiro/honorarios" },
    ],
  },
  {
    title: "Documentos",
    href: "/documentos",
    submenu: [
      { title: "Todos os Documentos", href: "/documentos" },
      { title: "Petições", href: "/documentos/peticoes" },
      { title: "Contratos", href: "/documentos/contratos" },
      { title: "Ofícios e Comunicações", href: "/documentos/oficios" },
    ],
  },
  {
    title: "IA",
    href: "/ia/peticoes",
    submenu: [
      { title: "Petições com IA", href: "/ia/peticoes" },
      { title: "Conselho de Ministros", href: "/ia/conselho" },
      { title: "Configurar DNA", href: "/configuracoes/dna" },
    ],
  },
];

export function TopNavigation({ onOpenPalette }: TopNavProps = {}) {
  const [location, setLocation] = useLocation();

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    return href !== "/" && location.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border surface-glass">
      <div className="flex h-14 items-center gap-6 px-5">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 cursor-pointer pr-4 mr-2 border-r border-border h-9"
          data-testid="logo-home"
        >
          <Logo size={24} />
        </Link>

        {/* Primary nav */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {menuItems.map((item) =>
            item.submenu ? (
              <DropdownMenu key={item.title}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-[13px] font-medium text-muted-foreground hover:text-foreground gap-1 ${
                      isActive(item.href) ? "text-foreground" : ""
                    }`}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                  >
                    {item.title}
                    <CaretDown className="h-3 w-3 opacity-60" weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {item.submenu.map((sub) => (
                    <DropdownMenuItem
                      key={sub.href}
                      onClick={() => setLocation(sub.href)}
                      data-testid={`nav-${sub.title.toLowerCase().replace(/\s+/g, "-")}`}
                      className="text-[13px]"
                    >
                      {sub.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link key={item.title} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[13px] font-medium text-muted-foreground hover:text-foreground"
                  data-testid={`nav-${item.title.toLowerCase()}`}
                >
                  {item.title}
                </Button>
              </Link>
            )
          )}
        </nav>

        <div className="flex-1" />

        {/* Search trigger (opens command palette) */}
        <button
          type="button"
          onClick={onOpenPalette}
          className="hidden md:flex items-center gap-2 h-9 w-72 rounded-md border border-border bg-card px-3 text-left text-[13px] text-muted-foreground hover:text-foreground hover-elevate"
          data-testid="button-open-palette"
        >
          <MagnifyingGlass className="w-4 h-4 shrink-0" weight="regular" />
          <span className="flex-1 truncate">Pesquisar páginas, ações...</span>
          <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">
            <Command className="w-2.5 h-2.5" weight="bold" />K
          </kbd>
        </button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="w-4 h-4" weight="regular" />
          <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground border-0 rounded-full pointer-events-none">
            7
          </Badge>
        </Button>

        {/* User */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 pl-1.5 pr-2"
              data-testid="button-user-menu"
            >
              <Avatar className="w-6 h-6">
                <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-semibold">
                  TG
                </AvatarFallback>
              </Avatar>
              <span className="text-[13px] hidden md:inline">Thiago</span>
              <CaretDown className="w-3 h-3 opacity-60" weight="bold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Minha Conta
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="menu-profile">
              <User className="mr-2 h-3.5 w-3.5" weight="regular" />
              <span className="text-[13px]">Meus Dados</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setLocation("/configuracoes")}
              data-testid="menu-settings"
            >
              <Gear className="mr-2 h-3.5 w-3.5" weight="regular" />
              <span className="text-[13px]">Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem data-testid="menu-logout">
              <SignOut className="mr-2 h-3.5 w-3.5" weight="regular" />
              <span className="text-[13px]">Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
