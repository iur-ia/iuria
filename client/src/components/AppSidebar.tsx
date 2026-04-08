import { Home, LayoutDashboard, Activity, Scale, DollarSign, FileText, ChevronDown, Brain, Sliders, Clock, BarChart3 } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import logoImage from "@assets/generated_images/Law_firm_logo_design_bb2f9039.png";

const menuItems = [
  {
    title: "Dashboard",
    icon: Home,
    url: "/",
    badge: null,
  },
  {
    title: "Gestão",
    icon: LayoutDashboard,
    url: "/gestao",
    badge: null,
  },
  {
    title: "Atividades",
    icon: Activity,
    url: "/atividades",
    badge: 5,
  },
  {
    title: "Processos",
    icon: Scale,
    url: "/processos",
    badge: 12,
    submenu: [
      { title: "Todos os Processos", url: "/processos" },
      { title: "Incompletos", url: "/processos/incompletos", badge: 3 },
      { title: "Movimentados", url: "/processos/movimentados", badge: 8 },
      { title: "Parados", url: "/processos/parados", badge: 1 },
    ],
  },
  {
    title: "Financeiro",
    icon: DollarSign,
    url: "/financeiro",
    badge: null,
  },
  {
    title: "Documentos",
    icon: FileText,
    url: "/documentos",
    badge: null,
  },
  {
    title: "Timesheet",
    icon: Clock,
    url: "/timesheet",
    badge: null,
  },
  {
    title: "Relatorios",
    icon: BarChart3,
    url: "/relatorios-gerenciais",
    badge: null,
  },
  {
    title: "LexOS IA",
    icon: Brain,
    url: "/lexos",
    badge: null,
    submenu: [
      { title: "Conselho IA", url: "/lexos/conselho" },
      { title: "Peticoes IA", url: "/lexos/peticoes" },
      { title: "Config. DNA", url: "/lexos/config-dna" },
    ],
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <div className="px-4 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="LegalSys" className="w-10 h-10" />
            <div>
              <h2 className="text-lg font-semibold text-sidebar-foreground">LegalSys</h2>
              <p className="text-xs text-muted-foreground">Gestão Jurídica</p>
            </div>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url || (item.submenu && item.submenu.some(sub => location === sub.url));
                
                if (item.submenu) {
                  return (
                    <Collapsible key={item.title} defaultOpen={isActive}>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="w-full" data-testid={`sidebar-${item.title.toLowerCase()}`}>
                            <item.icon className="w-4 h-4" />
                            <span className="flex-1">{item.title}</span>
                            {item.badge && (
                              <Badge variant="secondary" className="ml-auto mr-1 h-5 min-w-5 px-1.5 text-xs">
                                {item.badge}
                              </Badge>
                            )}
                            <ChevronDown className="ml-auto transition-transform ui-expanded:rotate-180 w-4 h-4" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.submenu.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.url}>
                                <SidebarMenuSubButton asChild isActive={location === subItem.url}>
                                  <Link href={subItem.url} data-testid={`sidebar-${subItem.title.toLowerCase().replace(/\s+/g, '-')}`}>
                                    <span className="flex-1">{subItem.title}</span>
                                    {subItem.badge && (
                                      <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1.5 text-xs">
                                        {subItem.badge}
                                      </Badge>
                                    )}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`sidebar-${item.title.toLowerCase()}`}>
                        <item.icon className="w-4 h-4" />
                        <span className="flex-1">{item.title}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1.5 text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
