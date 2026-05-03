import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  CheckSquare,
  Calendar,
  FileText,
  Search,
  DollarSign,
  Receipt,
  Sparkles,
  Settings,
  ScrollText,
  Newspaper,
  Sun,
  Moon,
  Folder,
  Clock,
  Activity,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

type NavCommand = {
  label: string;
  href: string;
  icon: LucideIcon;
  group: string;
  hint?: string;
};

const NAV: NavCommand[] = [
  { group: "Geral", label: "Painel de Controle", href: "/", icon: LayoutDashboard },
  { group: "Geral", label: "Configurações", href: "/configuracoes", icon: Settings },

  { group: "Processos", label: "Todos os Processos", href: "/processos", icon: Briefcase },
  { group: "Processos", label: "Consulta Processual", href: "/consulta-processual", icon: Search },
  { group: "Processos", label: "Pesquisa Jurídica", href: "/pesquisa-juridica", icon: Search },
  { group: "Processos", label: "Busca por Parte", href: "/busca-parte", icon: Users },
  { group: "Processos", label: "Monitoramento", href: "/monitoramento", icon: Activity },
  { group: "Processos", label: "Processos a Acompanhar", href: "/acompanhamentos", icon: Activity },
  { group: "Processos", label: "Diários Oficiais", href: "/diarios", icon: Newspaper },

  { group: "Atividades", label: "Lista de Atividades", href: "/atividades", icon: CheckSquare },
  { group: "Atividades", label: "Painel de Tarefas", href: "/atividades/painel", icon: LayoutDashboard },
  { group: "Atividades", label: "Kanban de Tarefas", href: "/atividades/kanban", icon: LayoutDashboard },
  { group: "Atividades", label: "Prazos Críticos", href: "/atividades/prazos-criticos", icon: AlertTriangle },
  { group: "Atividades", label: "Regras de Prazos", href: "/atividades/regras-prazos", icon: Calendar },
  { group: "Atividades", label: "Timesheet", href: "/atividades/timesheet", icon: Clock },

  { group: "Gestão", label: "Clientes", href: "/gestao/clientes", icon: Users },
  { group: "Gestão", label: "Equipe", href: "/gestao/equipe", icon: Users },
  { group: "Gestão", label: "Relatórios", href: "/gestao/relatorios", icon: FileText },
  { group: "Gestão", label: "Relatórios Gerenciais", href: "/gestao/relatorios-gerenciais", icon: FileText },

  { group: "Acervo", label: "Processos Judiciais", href: "/acervo/judicial", icon: Folder },
  { group: "Acervo", label: "Processos Administrativos", href: "/acervo/administrativo", icon: Folder },

  { group: "Financeiro", label: "Contas a Receber", href: "/financeiro/receber", icon: DollarSign },
  { group: "Financeiro", label: "Contas a Pagar", href: "/financeiro/pagar", icon: Receipt },
  { group: "Financeiro", label: "Honorários", href: "/financeiro/honorarios", icon: DollarSign },

  { group: "Documentos", label: "Todos os Documentos", href: "/documentos", icon: FileText },
  { group: "Documentos", label: "Petições", href: "/documentos/peticoes", icon: ScrollText },
  { group: "Documentos", label: "Contratos", href: "/documentos/contratos", icon: ScrollText },
  { group: "Documentos", label: "Ofícios e Comunicações", href: "/documentos/oficios", icon: ScrollText },

  { group: "IA", label: "Petições com IA", href: "/ia/peticoes", icon: Sparkles },
  { group: "IA", label: "Conselho de Ministros", href: "/ia/conselho", icon: Sparkles },
  { group: "IA", label: "Configurar DNA", href: "/configuracoes/dna", icon: Sparkles },
];

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { open, setOpen };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleTheme: () => void;
};

export function CommandPalette({ open, onOpenChange, onToggleTheme }: Props) {
  const [, setLocation] = useLocation();

  const groups = useMemo(() => {
    const map = new Map<string, NavCommand[]>();
    for (const item of NAV) {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)!.push(item);
    }
    return Array.from(map.entries());
  }, []);

  const go = (href: string) => {
    setLocation(href);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Pesquisar páginas, ações, atalhos..." data-testid="input-cmdk" />
      <CommandList>
        <CommandEmpty>Nenhum resultado.</CommandEmpty>

        <CommandGroup heading="Ações rápidas">
          <CommandItem
            onSelect={() => {
              onToggleTheme();
              onOpenChange(false);
            }}
            data-testid="cmdk-toggle-theme"
          >
            <Sun className="mr-2 h-4 w-4" />
            <span>Alternar tema (claro / escuro)</span>
            <CommandShortcut>⌘ J</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/")} data-testid="cmdk-go-home">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Ir ao Painel</span>
            <CommandShortcut>G H</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/consulta-processual")} data-testid="cmdk-consulta">
            <Search className="mr-2 h-4 w-4" />
            <span>Nova consulta processual</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {groups.map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((it) => (
              <CommandItem
                key={it.href}
                onSelect={() => go(it.href)}
                data-testid={`cmdk-${it.href.replace(/\W+/g, "-")}`}
              >
                <it.icon className="mr-2 h-4 w-4 opacity-70" />
                <span>{it.label}</span>
                <span className="ml-auto text-[11px] font-mono text-muted-foreground/60">{it.href}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
