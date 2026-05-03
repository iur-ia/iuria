import { useLocation } from "wouter";
import { ChevronRight, Home } from "lucide-react";
import { Link } from "wouter";

const LABELS: Record<string, string> = {
  "": "Painel",
  processos: "Processos",
  incompletos: "Incompletos",
  movimentados: "Movimentados",
  parados: "Parados",
  gestao: "Gestão",
  clientes: "Clientes",
  equipe: "Equipe",
  relatorios: "Relatórios",
  "relatorios-gerenciais": "Relatórios Gerenciais",
  atividades: "Atividades",
  painel: "Painel",
  kanban: "Kanban",
  "regras-prazos": "Regras de Prazos",
  "prazos-criticos": "Prazos Críticos",
  timesheet: "Timesheet",
  financeiro: "Financeiro",
  receber: "Contas a Receber",
  pagar: "Contas a Pagar",
  honorarios: "Honorários",
  documentos: "Documentos",
  peticoes: "Petições",
  contratos: "Contratos",
  oficios: "Ofícios",
  acervo: "Acervo",
  judicial: "Judicial",
  administrativo: "Administrativo",
  "consulta-processual": "Consulta Processual",
  "pesquisa-juridica": "Pesquisa Jurídica",
  "busca-parte": "Busca por Parte",
  monitoramento: "Monitoramento",
  acompanhamentos: "Acompanhamentos",
  diarios: "Diários Oficiais",
  configuracoes: "Configurações",
  dna: "DNA",
  ia: "IA",
  conselho: "Conselho de Ministros",
};

const labelize = (seg: string) =>
  LABELS[seg] ??
  seg
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export function Breadcrumbs() {
  const [location] = useLocation();
  if (location === "/") return null;

  const segments = location.split("/").filter(Boolean);
  const crumbs = segments.map((seg, idx) => ({
    label: labelize(seg),
    href: "/" + segments.slice(0, idx + 1).join("/"),
    last: idx === segments.length - 1,
  }));

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 px-5 py-2 border-b border-border/60 bg-background/40 text-[12px] font-mono"
      data-testid="breadcrumbs"
    >
      <Link
        href="/"
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        data-testid="breadcrumb-home"
      >
        <Home className="w-3 h-3" />
        <span>iuria</span>
      </Link>
      {crumbs.map((c) => (
        <span key={c.href} className="flex items-center gap-1.5">
          <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
          {c.last ? (
            <span className="text-foreground" data-testid={`breadcrumb-${c.href}`}>
              {c.label}
            </span>
          ) : (
            <Link
              href={c.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid={`breadcrumb-${c.href}`}
            >
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
