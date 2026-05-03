import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Plus, Search, FileText, Eye, PencilLine, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { Template, Documento } from "@shared/schema";

const categoriaColors: Record<string, string> = {
  Cível: "bg-blue-500/15 text-blue-400 dark:bg-blue-500/15 dark:text-blue-300",
  Trabalhista: "bg-primary/15 text-primary",
  Penal: "bg-rose-500/15 text-rose-400 dark:bg-rose-500/15 dark:text-rose-300",
  Criminal: "bg-rose-500/15 text-rose-400 dark:bg-rose-500/15 dark:text-rose-300",
  Tributário: "bg-amber-500/15 text-amber-500 dark:text-amber-300",
  Administrativo: "bg-cyan-500/15 text-cyan-500 dark:text-cyan-300",
  Empresarial: "bg-emerald-500/15 text-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-300",
  Família: "bg-pink-500/15 text-pink-500 dark:text-pink-300",
  Recursos: "bg-violet-500/15 text-violet-500 dark:text-violet-300",
  Importado: "bg-muted text-muted-foreground",
  Outro: "bg-muted text-muted-foreground",
};

export default function Peticoes() {
  const [busca, setBusca] = useState("");

  const { data: templates = [], isLoading: tplLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });
  const { data: documentos = [], isLoading: docsLoading } = useQuery<Documento[]>({
    queryKey: ["/api/documentos"],
  });

  const peticoesSalvas = useMemo(
    () =>
      documentos
        .filter((d) => d.tipo === "Petição")
        .sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return db - da;
        }),
    [documentos]
  );

  const templatesFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.nome.toLowerCase().includes(q) ||
        (t.descricao || "").toLowerCase().includes(q) ||
        (t.categoria || "").toLowerCase().includes(q)
    );
  }, [templates, busca]);

  const tituloDoc = (d: Documento) =>
    (d.nome || "").replace(/\.html$/i, "").replace(/\.[a-z0-9]+$/i, "") || d.nome;

  const maisUsado = useMemo(() => {
    if (templates.length === 0) return null;
    return [...templates].sort((a, b) => (b.usos || 0) - (a.usos || 0))[0];
  }, [templates]);

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Petições</h1>
          <p className="text-sm text-muted-foreground">
            Templates e documentos jurídicos do acervo
          </p>
        </div>
        <Link href="/ia/peticoes">
          <Button
            className="bg-legal-status-active hover:bg-legal-status-active/90"
            data-testid="button-new-petition"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Petição
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle>Templates Disponíveis</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar template..."
                    className="pl-9"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    data-testid="input-template-search"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {tplLoading && (
                <p className="text-sm text-muted-foreground" data-testid="text-templates-loading">
                  Carregando templates…
                </p>
              )}
              {!tplLoading && templatesFiltrados.length === 0 && (
                <p
                  className="text-sm text-muted-foreground p-4 text-center"
                  data-testid="text-templates-empty"
                >
                  {busca
                    ? "Nenhum template encontrado para a busca."
                    : "Nenhum template disponível. Crie um no editor de petições."}
                </p>
              )}
              {templatesFiltrados.map((template) => (
                <Card
                  key={template.id}
                  className="hover-elevate"
                  data-testid={`card-template-${template.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1" data-testid={`text-template-name-${template.id}`}>
                          {template.nome}
                        </h3>
                        {template.descricao && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {template.descricao}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className={
                              categoriaColors[template.categoria] || categoriaColors.Outro
                            }
                          >
                            {template.categoria}
                          </Badge>
                          {template.isPadrao && (
                            <Badge variant="outline">Padrão</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {template.usos || 0} usos
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Link href={`/ia/peticoes?templateId=${template.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`button-use-template-${template.id}`}
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Usar template
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Petições do Acervo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {docsLoading && (
                <p className="text-sm text-muted-foreground" data-testid="text-peticoes-loading">
                  Carregando…
                </p>
              )}
              {!docsLoading && peticoesSalvas.length === 0 && (
                <p
                  className="text-sm text-muted-foreground text-center p-3"
                  data-testid="text-peticoes-empty"
                >
                  Nenhuma petição salva no acervo. Use o editor para gerar e salvar.
                </p>
              )}
              {peticoesSalvas.slice(0, 10).map((peticao) => (
                <div
                  key={peticao.id}
                  className="p-3 border rounded-md hover-elevate"
                  data-testid={`recent-petition-${peticao.id}`}
                >
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium mb-1 truncate"
                        data-testid={`text-peticao-nome-${peticao.id}`}
                        title={peticao.nome}
                      >
                        {tituloDoc(peticao)}
                      </p>
                      {peticao.processoId && (
                        <p className="text-xs font-mono text-muted-foreground mb-1">
                          {peticao.processoId.slice(0, 8)}
                        </p>
                      )}
                      {peticao.createdAt && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(peticao.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Link href={`/ia/peticoes?docId=${peticao.id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-open-peticao-${peticao.id}`}
                      >
                        <PencilLine className="w-3.5 h-3.5 mr-1.5" />
                        Abrir no editor
                      </Button>
                    </Link>
                    <Link href={`/documentos`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid={`button-view-peticao-${peticao.id}`}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        Ver
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total de Templates</p>
                <p className="text-2xl font-bold" data-testid="text-stat-total-templates">
                  {templates.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Petições no Acervo</p>
                <p className="text-2xl font-bold" data-testid="text-stat-total-peticoes">
                  {peticoesSalvas.length}
                </p>
              </div>
              {maisUsado && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Mais Usado</p>
                  <p className="text-sm font-medium" data-testid="text-stat-mais-usado">
                    {maisUsado.nome}
                  </p>
                  <p className="text-xs text-muted-foreground">{maisUsado.usos || 0} usos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
