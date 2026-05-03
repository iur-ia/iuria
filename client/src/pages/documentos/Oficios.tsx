import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Search, FileText, Eye, Printer, Trash2, Edit, Send,
  CheckCircle, Clock, Archive, Mail, Hash, Copy, Download,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CommunicationTemplate, Communication } from "@shared/schema";

type EnrichedComm = Communication & {
  templateNome?: string | null;
  numeroOficio?: string | null;
  enviadoEm?: string | Date | null;
  pdfGeradoEm?: string | Date | null;
};

const CATEGORIA_LABELS: Record<string, string> = {
  oficio: "Ofício",
  notificacao: "Notificação",
  carta: "Carta",
  minuta: "Minuta",
  outro: "Outro",
};

const STATUS_COLORS: Record<string, string> = {
  gerada: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  enviada: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  respondida: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  arquivada: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  gerada: "Gerada",
  enviada: "Enviada",
  respondida: "Respondida",
  arquivada: "Arquivada",
};

function PrintPreview({ html, onClose }: { html: string; onClose: () => void }) {
  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>Comunicação</title>
      <style>
        body { margin: 0; padding: 0; }
        @media print { body { margin: 0; } }
      </style>
    </head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Visualizar Comunicação</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto border rounded-md bg-white min-h-[400px]">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir / Salvar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GerarComunicacaoDialog({
  template,
  onClose,
  onGenerated,
}: {
  template: CommunicationTemplate;
  onClose: () => void;
  onGenerated: () => void;
}) {
  const { toast } = useToast();
  const [destinatario, setDestinatario] = useState("");
  const [assunto, setAssunto] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);

  const camposObrigatorios: string[] = (() => {
    try { return template.camposObrigatorios ? JSON.parse(template.camposObrigatorios) : []; }
    catch { return []; }
  })();

  const { data: equipe = [] } = useQuery<any[]>({ queryKey: ["/api/equipe"] });

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/communication-templates/${template.id}/render`, {
        dados: { ...campos, destinatario, assunto },
        responsavelId: responsavelId || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => setPreview(data.html),
    onError: () => toast({ title: "Erro ao gerar prévia", variant: "destructive" }),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/communications/generate", {
        templateId: template.id,
        destinatario,
        assunto: assunto || undefined,
        dados: campos,
        responsavelId: responsavelId !== "__none__" ? responsavelId || undefined : undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Comunicação gerada com sucesso" });
      onGenerated();
      onClose();
    },
    onError: () => toast({ title: "Erro ao gerar comunicação", variant: "destructive" }),
  });

  if (preview) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Prévia — {template.nome}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto border rounded-md bg-white min-h-[400px]">
            <div dangerouslySetInnerHTML={{ __html: preview }} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPreview(null)}>Voltar</Button>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              data-testid="button-confirmar-gerar"
            >
              Confirmar e Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar — {template.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Destinatário *</Label>
            <Input
              data-testid="input-destinatario"
              placeholder="Nome ou cargo do destinatário"
              value={destinatario}
              onChange={(e) => setDestinatario(e.target.value)}
            />
          </div>
          <div>
            <Label>Assunto</Label>
            <Input
              data-testid="input-assunto"
              placeholder="Assunto da comunicação"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
            />
          </div>
          <div>
            <Label>Advogado Responsável</Label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger data-testid="select-responsavel">
                <SelectValue placeholder="Selecionar advogado..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {equipe.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.nome} — OAB {m.oab}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {camposObrigatorios.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Campos do Template</h4>
              {camposObrigatorios.map((campo) => (
                <div key={campo}>
                  <Label className="capitalize">{campo.replace(/_/g, " ")}</Label>
                  {campo.includes("corpo") || campo.includes("texto") || campo.includes("pedido") || campo.includes("observ") ? (
                    <Textarea
                      data-testid={`input-campo-${campo}`}
                      placeholder={`Preencha: ${campo.replace(/_/g, " ")}`}
                      value={campos[campo] ?? ""}
                      onChange={(e) => setCampos({ ...campos, [campo]: e.target.value })}
                      className="resize-none"
                      rows={3}
                    />
                  ) : (
                    <Input
                      data-testid={`input-campo-${campo}`}
                      placeholder={campo.replace(/_/g, " ")}
                      value={campos[campo] ?? ""}
                      onChange={(e) => setCampos({ ...campos, [campo]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="outline"
            onClick={() => previewMutation.mutate()}
            disabled={!destinatario || previewMutation.isPending}
            data-testid="button-previa"
          >
            <Eye className="h-4 w-4 mr-2" />
            Prévia
          </Button>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!destinatario || generateMutation.isPending}
            data-testid="button-gerar"
          >
            Gerar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateFormDialog({
  template,
  onClose,
  onSaved,
}: {
  template?: CommunicationTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!template;

  const parseCampos = (raw: string | null | undefined) => {
    try { return raw ? JSON.parse(raw).join(", ") : ""; } catch { return ""; }
  };

  const [form, setForm] = useState({
    nome: template?.nome ?? "",
    categoria: template?.categoria ?? "oficio",
    descricao: template?.descricao ?? "",
    corpo: template?.corpo ?? "",
    camposObrigatorios: parseCampos(template?.camposObrigatorios),
  });
  const [livePreview, setLivePreview] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const camposArr = form.camposObrigatorios
        ? form.camposObrigatorios.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const payload = {
        ...form,
        camposObrigatorios: JSON.stringify(camposArr),
        ativo: true,
        preConfigurada: false,
      };
      if (isEdit) {
        const res = await apiRequest("PATCH", `/api/communication-templates/${template!.id}`, payload);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/communication-templates", payload);
        return res.json();
      }
    },
    onSuccess: () => {
      toast({ title: isEdit ? "Template atualizado" : "Template criado" });
      onSaved();
      onClose();
    },
    onError: () => toast({ title: "Erro ao salvar template", variant: "destructive" }),
  });

  // Substitute a few demo values for live preview
  const previewHtml = form.corpo
    .replace(/\{\{#if\s+[^}]+\}\}([\s\S]*?)\{\{\/if\}\}/g, "$1")
    .replace(/\{\{([^}]+)\}\}/g, (_, k) => {
      const demos: Record<string, string> = {
        "escritorio.nome": "Alves & Associados Advogados",
        "escritorio.oab": "SP 123456",
        "escritorio.endereco": "Av. Paulista, 1000, São Paulo – SP",
        "escritorio.telefone": "(11) 3000-0000",
        "escritorio.email": "contato@escritorio.adv.br",
        "escritorio.website": "escritorio.adv.br",
        "advogado.nome": "Dra. Ana Lima",
        "advogado.oab": "SP 98765",
        "processo.numero": "0000001-00.2024.8.19.0001",
        "cliente.nome": "João da Silva",
        "destinatario": "MM. Juízo da 1ª Vara Cível",
        "data_atual": new Date().toLocaleDateString("pt-BR"),
        "data_extenso": new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }),
      };
      return demos[k.trim()] ?? `[${k.trim()}]`;
    });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Template" : "Novo Template de Comunicação"}</DialogTitle>
        </DialogHeader>
        <div className={`grid gap-4 py-2 ${livePreview ? "grid-cols-2" : "grid-cols-1"}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  data-testid="input-template-nome"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Ofício ao Banco"
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                  <SelectTrigger data-testid="select-categoria"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIA_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                data-testid="input-template-descricao"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Breve descrição do template"
              />
            </div>
            <div>
              <Label>Campos Personalizados <span className="text-xs text-muted-foreground">(separados por vírgula)</span></Label>
              <Input
                data-testid="input-template-campos"
                value={form.camposObrigatorios}
                onChange={(e) => setForm({ ...form, camposObrigatorios: e.target.value })}
                placeholder="Ex: vara, cidade_escritorio, motivo"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Placeholders: <code>{"{{escritorio.nome}}"}</code>, <code>{"{{processo.numero}}"}</code>, <code>{"{{cliente.nome}}"}</code>, <code>{"{{advogado.nome}}"}</code>, <code>{"{{data_atual}}"}</code>
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Corpo (HTML) *</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setLivePreview(!livePreview)}
                  data-testid="button-toggle-preview"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  {livePreview ? "Ocultar Prévia" : "Mostrar Prévia"}
                </Button>
              </div>
              <Textarea
                data-testid="textarea-template-corpo"
                value={form.corpo}
                onChange={(e) => setForm({ ...form, corpo: e.target.value })}
                placeholder={'<div style="font-family: Arial; padding: 40px;">\n  <p>{{destinatario}},</p>\n  <p>{{corpo}}</p>\n</div>'}
                className="font-mono text-xs resize-y"
                rows={14}
              />
            </div>
          </div>
          {livePreview && (
            <div className="border rounded-md overflow-auto bg-white p-2" style={{ maxHeight: "580px" }}>
              <p className="text-xs text-muted-foreground mb-2 text-center">Prévia (dados de exemplo)</p>
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!form.nome || !form.corpo || mutation.isPending}
            data-testid="button-salvar-template"
          >
            {isEdit ? "Salvar Alterações" : "Criar Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoTemplateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  return <TemplateFormDialog onClose={onClose} onSaved={onCreated} />;
}

function ProtocoloDialog({ comm, onClose }: { comm: EnrichedComm; onClose: () => void }) {
  const { toast } = useToast();
  const [protocolo, setProtocolo] = useState(comm.protocolo ?? "");
  const [status, setStatus] = useState(comm.status);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/communications/${comm.id}`, { protocolo, status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
      toast({ title: "Comunicação atualizada" });
      onClose();
    },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Atualizar Comunicação</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Protocolo / AR</Label>
            <Input
              data-testid="input-protocolo"
              value={protocolo}
              onChange={(e) => setProtocolo(e.target.value)}
              placeholder="Número de protocolo ou AR"
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-status-comm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-salvar-protocolo">
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Oficios() {
  const { toast } = useToast();
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("__all__");
  const [templateParaGerar, setTemplateParaGerar] = useState<CommunicationTemplate | null>(null);
  const [templateParaEditar, setTemplateParaEditar] = useState<CommunicationTemplate | null>(null);
  const [showNovoTemplate, setShowNovoTemplate] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [commParaProtocolo, setCommParaProtocolo] = useState<EnrichedComm | null>(null);

  const { data: templates = [], isLoading: loadingTemplates } = useQuery<CommunicationTemplate[]>({
    queryKey: ["/api/communication-templates"],
  });

  const { data: comms = [], isLoading: loadingComms } = useQuery<EnrichedComm[]>({
    queryKey: ["/api/communications"],
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/communication-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communication-templates"] });
      toast({ title: "Template removido" });
    },
    onError: () => toast({ title: "Erro ao remover template", variant: "destructive" }),
  });

  const deleteCommMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/communications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications"] });
      toast({ title: "Comunicação removida" });
    },
    onError: () => toast({ title: "Erro ao remover", variant: "destructive" }),
  });

  const cloneTemplateMutation = useMutation({
    mutationFn: async (t: CommunicationTemplate) => {
      const res = await apiRequest("POST", "/api/communication-templates", {
        nome: `${t.nome} (cópia)`,
        categoria: t.categoria,
        descricao: t.descricao,
        corpo: t.corpo,
        camposObrigatorios: t.camposObrigatorios,
        ativo: true,
        preConfigurada: false,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communication-templates"] });
      toast({ title: "Template clonado com sucesso" });
    },
    onError: () => toast({ title: "Erro ao clonar", variant: "destructive" }),
  });

  const handleDownloadPdf = async (commId: string) => {
    setDownloadingPdf(commId);
    try {
      const res = await fetch(`/api/communications/${commId}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Falha ao gerar PDF" }));
        toast({ title: err.error ?? "Falha ao gerar PDF", variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comunicacao-${commId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Erro ao baixar PDF", variant: "destructive" });
    } finally {
      setDownloadingPdf(null);
    }
  };

  const templatesFiltrados = templates.filter((t) => {
    const buscaOk = !busca || t.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (t.descricao ?? "").toLowerCase().includes(busca.toLowerCase());
    const catOk = filtroCategoria === "__all__" || t.categoria === filtroCategoria;
    return buscaOk && catOk;
  });

  const commsFiltradas = comms.filter((c) =>
    !busca || c.destinatario.toLowerCase().includes(busca.toLowerCase()) ||
    (c.acervoNumero ?? "").includes(busca) ||
    (c.templateNome ?? "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      {previewHtml && <PrintPreview html={previewHtml} onClose={() => setPreviewHtml(null)} />}
      {templateParaGerar && (
        <GerarComunicacaoDialog
          template={templateParaGerar}
          onClose={() => setTemplateParaGerar(null)}
          onGenerated={() => queryClient.invalidateQueries({ queryKey: ["/api/communications"] })}
        />
      )}
      {showNovoTemplate && (
        <NovoTemplateDialog
          onClose={() => setShowNovoTemplate(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ["/api/communication-templates"] })}
        />
      )}
      {templateParaEditar && (
        <TemplateFormDialog
          template={templateParaEditar}
          onClose={() => setTemplateParaEditar(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["/api/communication-templates"] })}
        />
      )}
      {commParaProtocolo && (
        <ProtocoloDialog comm={commParaProtocolo} onClose={() => setCommParaProtocolo(null)} />
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1" data-testid="text-page-title">
            Ofícios e Comunicações
          </h1>
          <p className="text-sm text-muted-foreground">
            Gere ofícios, notificações e cartas a partir de templates configuráveis
          </p>
        </div>
        <Button onClick={() => setShowNovoTemplate(true)} data-testid="button-novo-template">
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates" data-testid="tab-templates">
            <FileText className="h-4 w-4 mr-1.5" />
            Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="historico" data-testid="tab-historico">
            <Clock className="h-4 w-4 mr-1.5" />
            Histórico ({comms.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4 space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="input-busca-templates"
                className="pl-9"
                placeholder="Buscar template..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-44" data-testid="select-filtro-categoria">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as categorias</SelectItem>
                {Object.entries(CATEGORIA_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingTemplates ? (
            <div className="text-center py-10 text-muted-foreground">Carregando templates...</div>
          ) : templatesFiltrados.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border border-dashed rounded-md">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum template encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {templatesFiltrados.map((t) => (
                <Card key={t.id} className="hover-elevate" data-testid={`card-template-${t.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className="text-xs">
                            {CATEGORIA_LABELS[t.categoria] ?? t.categoria}
                          </Badge>
                          {t.preConfigurada && (
                            <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                              Pré-configurado
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-sm leading-tight">{t.nome}</h3>
                        {t.descricao && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.descricao}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t.usos} uso(s)</span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setTemplateParaGerar(t)}
                          data-testid={`button-usar-template-${t.id}`}
                          title="Gerar comunicação"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setTemplateParaEditar(t)}
                          data-testid={`button-editar-template-${t.id}`}
                          title="Editar template"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => cloneTemplateMutation.mutate(t)}
                          data-testid={`button-clonar-template-${t.id}`}
                          title="Clonar template"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {!t.preConfigurada && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteTemplateMutation.mutate(t.id)}
                            data-testid={`button-excluir-template-${t.id}`}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="input-busca-historico"
              className="pl-9"
              placeholder="Buscar por destinatário, processo ou template..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          {loadingComms ? (
            <div className="text-center py-10 text-muted-foreground">Carregando histórico...</div>
          ) : commsFiltradas.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border border-dashed rounded-md">
              <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma comunicação gerada ainda</p>
              <p className="text-xs mt-1">Selecione um template e clique em "Gerar"</p>
            </div>
          ) : (
            <div className="space-y-3">
              {commsFiltradas.map((c) => (
                <Card key={c.id} data-testid={`card-comm-${c.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className={`text-xs ${STATUS_COLORS[c.status] ?? ""}`}>
                            {STATUS_LABELS[c.status] ?? c.status}
                          </Badge>
                          {c.templateNome && (
                            <Badge variant="outline" className="text-xs">{c.templateNome}</Badge>
                          )}
                          {c.numeroOficio && (
                            <Badge variant="secondary" className="text-xs font-mono">
                              {c.numeroOficio}
                            </Badge>
                          )}
                          {c.protocolo && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {c.protocolo}
                            </Badge>
                          )}
                          {c.pdfGeradoEm && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1 text-green-600 border-green-400">
                              <Download className="h-3 w-3" />
                              PDF
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-sm">Para: {c.destinatario}</p>
                        {c.assunto && <p className="text-xs text-muted-foreground">Assunto: {c.assunto}</p>}
                        {c.acervoNumero && (
                          <p className="text-xs text-muted-foreground font-mono">Processo: {c.acervoNumero}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {c.createdAt ? new Date(c.createdAt).toLocaleString("pt-BR") : ""}
                          {c.enviadoEm && (
                            <span className="ml-2 text-blue-600">
                              · Enviada em {new Date(c.enviadoEm).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {c.htmlGerado && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setPreviewHtml(c.htmlGerado!)}
                            data-testid={`button-visualizar-comm-${c.id}`}
                            title="Visualizar / Imprimir"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDownloadPdf(c.id)}
                          disabled={downloadingPdf === c.id}
                          data-testid={`button-pdf-comm-${c.id}`}
                          title="Baixar PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setCommParaProtocolo(c)}
                          data-testid={`button-protocolo-comm-${c.id}`}
                          title="Protocolo / Status"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteCommMutation.mutate(c.id)}
                          data-testid={`button-excluir-comm-${c.id}`}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
