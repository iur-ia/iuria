import { Bell, Search, User, ChevronDown } from "lucide-react";
import { Link, useLocation } from "wouter";
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
import logoImage from "@assets/generated_images/Law_firm_logo_design_bb2f9039.png";
import avatarImage from "@assets/stock_images/professional_lawyer__9acf90aa.jpg";

const menuItems = [
  {
    title: "GESTÃO",
    href: "/gestao",
    submenu: [
      { title: "Clientes", href: "/gestao/clientes" },
      { title: "Equipe", href: "/gestao/equipe" },
      { title: "Relatórios", href: "/gestao/relatorios" },
    ],
  },
  {
    title: "ATIVIDADES",
    href: "/atividades",
    submenu: [
      { title: "Lista de atividades", href: "/atividades" },
      { title: "Painel de Tarefas", href: "/atividades/painel" },
      { title: "Kanban de Tarefas", href: "/atividades/kanban" },
      { title: "Relatórios", href: "/atividades/relatorios" },
    ],
  },
  {
    title: "PROCESSOS",
    href: "/processos",
    submenu: [
      { title: "Todos os Processos", href: "/processos" },
      { title: "Consulta Processual", href: "/consulta-processual" },
      { title: "Busca por Parte", href: "/busca-parte" },
      { title: "Incompletos", href: "/processos/incompletos" },
      { title: "Movimentados", href: "/processos/movimentados" },
      { title: "Parados", href: "/processos/parados" },
    ],
  },
  {
    title: "FINANCEIRO",
    href: "/financeiro",
    submenu: [
      { title: "Contas a Receber", href: "/financeiro/receber" },
      { title: "Contas a Pagar", href: "/financeiro/pagar" },
      { title: "Honorários", href: "/financeiro/honorarios" },
    ],
  },
  {
    title: "DOCUMENTOS",
    href: "/documentos",
    submenu: [
      { title: "Todos os Documentos", href: "/documentos" },
      { title: "Petições", href: "/documentos/peticoes" },
      { title: "Contratos", href: "/documentos/contratos" },
    ],
  },
];

export function TopNavigation() {
  const [, setLocation] = useLocation();

  return (
    <div className="bg-[#1a1a1a] text-white border-b border-[#2a2a2a]">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer" data-testid="logo-home">
              <img src={logoImage} alt="LegalSys" className="w-8 h-8" />
              <span className="text-lg font-semibold">LegalSys</span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {menuItems.map((item) => (
              item.submenu ? (
                <DropdownMenu key={item.title}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="bg-transparent hover:bg-white/10 text-white h-9 px-3 text-sm font-medium"
                      data-testid={`nav-${item.title.toLowerCase()}`}
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
                        data-testid={`nav-${subItem.title.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {subItem.title}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link key={item.title} href={item.href}>
                  <Button
                    variant="ghost"
                    className="bg-transparent hover:bg-white/10 text-white h-9 px-3 text-sm font-medium"
                    data-testid={`nav-${item.title.toLowerCase()}`}
                  >
                    {item.title}
                  </Button>
                </Link>
              )
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Pesquisar..."
              className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-gray-400 h-9"
              data-testid="input-top-search"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="relative text-white hover:bg-white/10 h-9 w-9"
            data-testid="button-notifications"
          >
            <Bell className="w-5 h-5" />
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs bg-red-500 text-white border-0">
              7
            </Badge>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 text-white hover:bg-white/10 h-9" data-testid="button-user-menu">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={avatarImage} alt="Thiago Gomes" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    TG
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">Thiago Gomes</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="menu-profile">
                <User className="mr-2 h-4 w-4" />
                <span>Meus Dados</span>
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="menu-settings">
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="menu-logout">
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
