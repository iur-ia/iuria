import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Scale, Search, Clock, FileText, Users, User, Building, ExternalLink,
  Plus, Trash2, ChevronRight, AlertCircle, CheckCircle2, Archive,
  RefreshCw, BookOpen, StickyNote, Filter, X, Mail, Eye, Printer,
  Send, Edit, Hash, Download,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AcervoProcesso, Communication, AcervoAndamento, AcervoDocumento, CommunicationTemplate, Equipe } from "@shared/schema";

type CommResponse = Communication & {
  templateNome?: string | null;
  numeroOficio?: string | null;
  enviadoEm?: string | Date | null;
  pdfGeradoEm?: string | Date | null;
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ativo: { label: "Ativo", variant: "default" },
  arquivado: { label: "Arquivado", variant: "secondary" },
  suspenso: { label: "Suspenso", variant: "outline" },
};

function AndamentosTab({ acervoId }: { acervoId: string }) {
  const { toast } = useToast();
  const [novoAndamento, setNovoAndamento] = useState({ data: "", descricao: "", detalhes: "" });
  const [mostraForm, setMostraForm] = useState(false);

  const { data: andamentos = [], isLoading } = useQuery<AcervoAndamento[]>({
    queryKey: ["/api/acervo", acervoId, "andamentos"],
    queryFn: async () => {
      const res = await fetch(`/api/acervo/${acervoId}/andamentos`);
      return res.json();
    },
  });

  const criarMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/acervo/${acervoId}/andamentos`, {
        ...novoAndamento,
        tipo: "manual",
        origem: "manual",
        critico: false,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acervo", acervoId, "andamentos"] });
      setNovoAndamento({ data: "", descricao: "", detalhes: "" });
      setMostraForm(false);
      toast({ title: "Andamento adicionado com sucesso" });
    },
    onError: () => toast({ title: "Erro ao adicionar andamento", variant: "destructive" }),
  });

  const excluirMutation = useMutation({
    mutationFn: async (andamentoId: string) => {
      await apiRequest("DELETE", `/api/acervo/${acervoId}/andamentos/${andamentoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acervo", acervoId, "andamentos"] });
      toast({ title: "Andamento removido" });
    },
  });

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Carregando andamentos...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {andamentos.length} andamento(s) registrado(s)
        </h3>
        <Button size="sm" variant="outline" onClick={() => setMostraForm(!mostraForm)} data-testid="button-add-andamento">
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {mostraForm && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="and-data">Data</Label>
                <Input
                  id="and-data"
                  data-testid="input-andamento-data"
                  type="date"
                  value={novoAndamento.data}
                  onChange={(e) => setNovoAndamento({ ...novoAndamento, data: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="and-desc">Descrição</Label>
                <Input
                  id="and-desc"
                  data-testid="input-andamento-descricao"
                  placeholder="Ex: Despacho proferido"
                  value={novoAndamento.descricao}
                  onChange={(e) => setNovoAndamento({ ...novoAndamento, descricao: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="and-det">Detalhes (opcional)</Label>
              <Textarea
                id="and-det"
                data-testid="input-andamento-detalhes"
                placeholder="Informações complementares..."
                value={novoAndamento.detalhes}
                onChange={(e) => setNovoAndamento({ ...novoAndamento, detalhes: e.target.value })}
                className="resize-none"
                rows={2}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setMostraForm(false)}>Cancelar</Button>
              <Button
                size="sm"
                onClick={() => criarMutation.mutate()}
                disabled={!novoAndamento.data || !novoAndamento.descricao || criarMutation.isPending}
                data-testid="button-salvar-andamento"
              >
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {andamentos.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed rounded-md">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum andamento registrado</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-3 pl-8">
            {andamentos.map((and, i) => (
              <div key={and.id} className="relative" data-testid={`andamento-item-${i}`}>
                <div className={`absolute -left-5 top-2 h-2 w-2 rounded-full ${and.critico ? "bg-destructive" : "bg-primary"}`} />
                <div className={`p-3 rounded-md border ${and.critico ? "bg-destructive/5 border-destructive/30" : "bg-muted/40"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-semibold ${and.critico ? "text-destructive" : "text-primary"}`}>{and.data}</span>
                        {and.critico && (
                          <Badge variant="destructive" className="text-xs">Crítico</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {and.tipo === "manual" ? "Manual" : "Automático"}
                        </Badge>
                        {and.origem && and.origem !== "manual" && (
                          <Badge variant="secondary" className="text-xs">{and.origem}</Badge>
                        )}
                      </div>
                      <p className={`text-sm font-medium ${and.critico ? "text-destructive" : ""}`}>{and.descricao}</p>
                      {and.detalhes && (
                        <p className="text-xs text-muted-foreground mt-1">{and.detalhes}</p>
                      )}
                    </div>
                    {and.tipo === "manual" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => excluirMutation.mutate(and.id)}
                        data-testid={`button-excluir-andamento-${i}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentosTab({ acervoId }: { acervoId: string }) {
  const { toast } = useToast();
  const [novoDoc, setNovoDoc] = useState({ nome: "", descricao: "", url: "" });
  const [mostraForm, setMostraForm] = useState(false);

  const { data: documentos = [], isLoading } = useQuery<AcervoDocumento[]>({
    queryKey: ["/api/acervo", acervoId, "documentos"],
    queryFn: async () => {
      const res = await fetch(`/api/acervo/${acervoId}/documentos`);
      return res.json();
    },
  });

  const criarMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/acervo/${acervoId}/documentos`, novoDoc);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acervo", acervoId, "documentos"] });
      setNovoDoc({ nome: "", descricao: "", url: "" });
      setMostraForm(false);
      toast({ title: "Documento vinculado com sucesso" });
    },
    onError: () => toast({ title: "Erro ao vincular documento", variant: "destructive" }),
  });

  const excluirMutation = useMutation({
    mutationFn: async (docId: string) => {
      await apiRequest("DELETE", `/api/acervo/${acervoId}/documentos/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acervo", acervoId, "documentos"] });
      toast({ title: "Documento removido" });
    },
  });

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Carregando documentos...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{documentos.length} documento(s)</h3>
        <Button size="sm" variant="outline" onClick={() => setMostraForm(!mostraForm)} data-testid="button-add-documento">
          <Plus className="h-4 w-4 mr-1" />
          Vincular Documento
        </Button>
      </div>

      {mostraForm && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 space-y-3">
            <div>
              <Label>Nome do Documento</Label>
              <Input
                data-testid="input-doc-nome"
                placeholder="Ex: Petição Inicial"
                value={novoDoc.nome}
                onChange={(e) => setNovoDoc({ ...novoDoc, nome: e.target.value })}
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                data-testid="input-doc-descricao"
                placeholder="Breve descrição do documento"
                value={novoDoc.descricao}
                onChange={(e) => setNovoDoc({ ...novoDoc, descricao: e.target.value })}
              />
            </div>
            <div>
              <Label>URL (opcional)</Label>
              <Input
                data-testid="input-doc-url"
                placeholder="https://..."
                value={novoDoc.url}
                onChange={(e) => setNovoDoc({ ...novoDoc, url: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setMostraForm(false)}>Cancelar</Button>
              <Button
                size="sm"
                onClick={() => criarMutation.mutate()}
                disabled={!novoDoc.nome || criarMutation.isPending}
                data-testid="button-salvar-documento"
              >
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {documentos.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed rounded-md">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum documento vinculado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documentos.map((doc, i) => (
            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-md border bg-muted/30" data-testid={`doc-item-${i}`}>
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.nome}</p>
                {doc.descricao && <p className="text-xs text-muted-foreground truncate">{doc.descricao}</p>}
              </div>
              <div className="flex items-center gap-1">
                {doc.url && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => excluirMutation.mutate(doc.id)}
                  data-testid={`button-excluir-doc-${i}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_COMM_COLORS: Record<string, string> = {
  gerada: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  enviada: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  respondida: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  arquivada: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};
const STATUS_COMM_LABELS: Record<string, string> = {
  gerada: "Gerada", enviada: "Enviada", respondida: "Respondida", arquivada: "Arquivada",
};

function PrintPreviewDialog({ html, onClose }: { html: string; onClose: () => void }) {
  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comunicação</title></head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader><DialogTitle>Visualizar Comunicação</DialogTitle></DialogHeader>
        <div className="flex-1 overflow-y-auto border rounded-md bg-white min-h-64">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir / PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProtocoloCommDialog({ comm, onClose }: { comm: CommResponse; onClose: () => void }) {
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
            <Input value={protocolo} onChange={(e) => setProtocolo(e.target.value)} placeholder="Número de protocolo" data-testid="input-protocolo-comm" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-status-comm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_COMM_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} data-testid="button-salvar-protocolo-comm">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GerarComDialog({ acervoId, acervoNumero, onClose, onGenerated }: {
  acervoId: string; acervoNumero: string; onClose: () => void; onGenerated: () => void;
}) {
  const { toast } = useToast();
  const [templateId, setTemplateId] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [assunto, setAssunto] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [campos, setCampos] = useState<Record<string, string>>({});

  const { data: templates = [] } = useQuery<CommunicationTemplate[]>({ queryKey: ["/api/communication-templates"] });
  const { data: equipe = [] } = useQuery<Equipe[]>({ queryKey: ["/api/equipe"] });

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const camposObrigatorios: string[] = (() => {
    try { return selectedTemplate?.camposObrigatorios ? JSON.parse(selectedTemplate.camposObrigatorios) : []; }
    catch { return []; }
  })();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/communications/generate", {
        templateId, acervoId, destinatario, assunto: assunto || undefined,
        dados: campos, responsavelId: responsavelId !== "__none__" ? responsavelId || undefined : undefined,
      });
      return res.json();
    },
    onSuccess: async (comm: CommResponse) => {
      toast({ title: "Comunicação gerada — baixando PDF..." });
      // Trigger immediate PDF download after generation
      try {
        const pdfRes = await fetch(`/api/communications/${comm.id}/pdf`);
        if (pdfRes.ok) {
          const blob = await pdfRes.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          const filename = comm.numeroOficio
            ? `oficio-${comm.numeroOficio.replace(/\//g, "-")}.pdf`
            : `comunicacao-${comm.id.slice(0, 8)}.pdf`;
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
        }
      } catch { /* PDF optional — communication already saved */ }
      onGenerated();
      onClose();
    },
    onError: () => toast({ title: "Erro ao gerar comunicação", variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Gerar Comunicação — {acervoNumero}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Template *</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger data-testid="select-template-comm"><SelectValue placeholder="Selecionar template..." /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Destinatário *</Label>
            <Input value={destinatario} onChange={(e) => setDestinatario(e.target.value)} placeholder="Nome do destinatário" data-testid="input-destinatario-comm" />
          </div>
          <div>
            <Label>Assunto</Label>
            <Input value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Assunto da comunicação" data-testid="input-assunto-comm" />
          </div>
          <div>
            <Label>Advogado Responsável</Label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger data-testid="select-resp-comm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {equipe.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.nome}{m.oab ? ` — OAB ${m.oab}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {camposObrigatorios.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <h4 className="text-sm font-medium">Campos do Template</h4>
              {camposObrigatorios.map((campo) => (
                <div key={campo}>
                  <Label className="capitalize">{campo.replace(/_/g, " ")}</Label>
                  {campo.includes("corpo") || campo.includes("pedido") || campo.includes("notificacao") ? (
                    <Textarea
                      data-testid={`input-campo-${campo}`}
                      value={campos[campo] ?? ""}
                      onChange={(e) => setCampos({ ...campos, [campo]: e.target.value })}
                      placeholder={campo.replace(/_/g, " ")}
                      className="resize-none" rows={3}
                    />
                  ) : (
                    <Input
                      data-testid={`input-campo-${campo}`}
                      value={campos[campo] ?? ""}
                      onChange={(e) => setCampos({ ...campos, [campo]: e.target.value })}
                      placeholder={campo.replace(/_/g, " ")}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => generateMutation.mutate()} disabled={!templateId || !destinatario || generateMutation.isPending} data-testid="button-gerar-comm">
            <Send className="h-4 w-4 mr-2" />
            Gerar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ComunicacoesTab({ acervoId, acervoNumero }: { acervoId: string; acervoNumero: string }) {
  const { toast } = useToast();
  const [showGerar, setShowGerar] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [commParaProtocolo, setCommParaProtocolo] = useState<CommResponse | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: comms = [], isLoading } = useQuery<CommResponse[]>({
    queryKey: ["/api/communications", acervoId],
    queryFn: async () => {
      const res = await fetch(`/api/communications?acervoId=${acervoId}`);
      return res.json();
    },
  });

  const { data: equipeTab = [] } = useQuery<Equipe[]>({ queryKey: ["/api/equipe"] });
  const equipeMap = Object.fromEntries(equipeTab.map((m) => [m.id, m.nome]));

  const handleDownloadPdf = async (c: CommResponse) => {
    setDownloadingId(c.id);
    try {
      const res = await fetch(`/api/communications/${c.id}/pdf`);
      if (!res.ok) throw new Error("Falha ao gerar PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = c.numeroOficio
        ? `oficio-${String(c.numeroOficio).replace(/\//g, "-")}.pdf`
        : `comunicacao-${c.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    } catch {
      toast({ title: "Erro ao baixar PDF", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/communications/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications", acervoId] });
      toast({ title: "Comunicação removida" });
    },
    onError: () => toast({ title: "Erro ao remover", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      {previewHtml && <PrintPreviewDialog html={previewHtml} onClose={() => setPreviewHtml(null)} />}
      {commParaProtocolo && <ProtocoloCommDialog comm={commParaProtocolo} onClose={() => setCommParaProtocolo(null)} />}
      {showGerar && (
        <GerarComDialog
          acervoId={acervoId}
          acervoNumero={acervoNumero}
          onClose={() => setShowGerar(false)}
          onGenerated={() => queryClient.invalidateQueries({ queryKey: ["/api/communications", acervoId] })}
        />
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{comms.length} comunicação(ões)</h3>
        <Button size="sm" variant="outline" onClick={() => setShowGerar(true)} data-testid="button-gerar-comunicacao">
          <Plus className="h-4 w-4 mr-1" />
          Gerar Comunicação
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : comms.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed rounded-md">
          <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma comunicação gerada ainda</p>
        </div>
      ) : (
        <div className="space-y-2">
          {comms.map((c) => (
            <div key={c.id} className="p-3 rounded-md border bg-muted/30" data-testid={`comm-item-${c.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge className={`text-xs ${STATUS_COMM_COLORS[c.status] ?? ""}`}>
                      {STATUS_COMM_LABELS[c.status] ?? c.status}
                    </Badge>
                    {c.templateNome && <Badge variant="outline" className="text-xs">{c.templateNome}</Badge>}
                    {c.protocolo && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Hash className="h-3 w-3" />{c.protocolo}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">Para: {c.destinatario}</p>
                  {c.assunto && <p className="text-xs text-muted-foreground">Assunto: {c.assunto}</p>}
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-xs text-muted-foreground">
                      {c.createdAt ? new Date(c.createdAt).toLocaleString("pt-BR") : ""}
                    </p>
                    {c.responsavelId && equipeMap[c.responsavelId] && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />{equipeMap[c.responsavelId]}
                      </p>
                    )}
                    {c.pdfGeradoEm && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />PDF gerado
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {c.htmlGerado && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPreviewHtml(c.htmlGerado)} data-testid={`button-ver-comm-${c.id}`} title="Visualizar / Imprimir">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => handleDownloadPdf(c)}
                    disabled={downloadingId === c.id}
                    data-testid={`button-pdf-comm-${c.id}`}
                    title="Baixar PDF"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setCommParaProtocolo(c)} data-testid={`button-editar-comm-${c.id}`} title="Protocolo / Status">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(c.id)} data-testid={`button-excluir-comm-${c.id}`} title="Excluir">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ObservacoesTab({ processo }: { processo: AcervoProcesso }) {
  const { toast } = useToast();
  const [editando, setEditando] = useState(false);
  const [obs, setObs] = useState(processo.observacoes || "");

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/acervo/${processo.id}`, { observacoes: obs });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acervo"] });
      setEditando(false);
      toast({ title: "Observações salvas" });
    },
    onError: () => toast({ title: "Erro ao salvar observações", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Notas e observações internas</h3>
        {!editando && (
          <Button size="sm" variant="outline" onClick={() => setEditando(true)} data-testid="button-editar-obs">
            Editar
          </Button>
        )}
      </div>
      {editando ? (
        <div className="space-y-3">
          <Textarea
            data-testid="textarea-observacoes"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Adicione observações internas sobre o processo..."
            className="min-h-32 resize-none"
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => { setEditando(false); setObs(processo.observacoes || ""); }}>Cancelar</Button>
            <Button size="sm" onClick={() => salvarMutation.mutate()} disabled={salvarMutation.isPending} data-testid="button-salvar-obs">
              Salvar
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-md bg-muted/30 border min-h-24">
          {obs ? (
            <p className="text-sm whitespace-pre-wrap" data-testid="text-observacoes">{obs}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nenhuma observação registrada.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ProcessoFicha({ processo, onClose }: { processo: AcervoProcesso; onClose: () => void }) {
  const partes: string[] = (() => {
    try { return processo.partes ? JSON.parse(processo.partes) : []; }
    catch { return processo.partes ? [processo.partes] : []; }
  })();

  const statusCfg = STATUS_CONFIG[processo.statusInterno] || STATUS_CONFIG.ativo;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b bg-muted/30">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Scale className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold font-mono" data-testid="ficha-numero">{processo.numero}</h2>
              {processo.classe && <Badge variant="default">{processo.classe}</Badge>}
              <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
            </div>
            {processo.tribunal && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Building className="h-3.5 w-3.5" />
                {processo.tribunal}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {processo.urlPortal && (
              <Button size="sm" variant="outline" asChild>
                <a href={processo.urlPortal} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Portal
                </a>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>Fechar</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {processo.assunto && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Assunto</p>
              <p className="text-sm" data-testid="ficha-assunto">{processo.assunto}</p>
            </div>
          )}
          {processo.relator && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Relator</p>
              <p className="text-sm" data-testid="ficha-relator">{processo.relator}</p>
            </div>
          )}
          {processo.fase && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Fase</p>
              <p className="text-sm">{processo.fase}</p>
            </div>
          )}
          {processo.dataUltimaSincronizacao && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Última Sincronização</p>
              <p className="text-sm">{new Date(processo.dataUltimaSincronizacao).toLocaleString("pt-BR")}</p>
            </div>
          )}
        </div>

        {partes.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Partes
            </p>
            <div className="flex flex-wrap gap-1">
              {partes.filter(p => p.length > 3).map((parte, i) => (
                <Badge key={i} variant="outline" className="text-xs">{parte}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="andamentos">
          <TabsList className="mb-4">
            <TabsTrigger value="andamentos" data-testid="tab-andamentos">
              <Clock className="h-4 w-4 mr-1" />
              Andamentos
            </TabsTrigger>
            <TabsTrigger value="documentos" data-testid="tab-documentos">
              <FileText className="h-4 w-4 mr-1" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="observacoes" data-testid="tab-observacoes">
              <StickyNote className="h-4 w-4 mr-1" />
              Observações
            </TabsTrigger>
            <TabsTrigger value="comunicacoes" data-testid="tab-comunicacoes">
              <Mail className="h-4 w-4 mr-1" />
              Comunicações
            </TabsTrigger>
          </TabsList>
          <TabsContent value="andamentos">
            <AndamentosTab acervoId={processo.id} />
          </TabsContent>
          <TabsContent value="documentos">
            <DocumentosTab acervoId={processo.id} />
          </TabsContent>
          <TabsContent value="observacoes">
            <ObservacoesTab processo={processo} />
          </TabsContent>
          <TabsContent value="comunicacoes">
            <ComunicacoesTab acervoId={processo.id} acervoNumero={processo.numero} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

type ProcessoEnriquecido = AcervoProcesso & {
  ultimoAndamento?: { data: string; descricao: string } | null;
  responsavelNome?: string | null;
};

export default function AcervoJudicial() {
  const { toast } = useToast();
  const [busca, setBusca] = useState("");
  const [filtroTribunal, setFiltroTribunal] = useState<string>("__all__");
  const [filtroFase, setFiltroFase] = useState<string>("__all__");
  const [filtroStatus, setFiltroStatus] = useState<string>("__all__");
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>("__all__");
  const [filtroPrazoAte, setFiltroPrazoAte] = useState<string>("");
  const [fichaAberta, setFichaAberta] = useState<ProcessoEnriquecido | null>(null);
  const [showNovoDialog, setShowNovoDialog] = useState(false);
  const [novoProcesso, setNovoProcesso] = useState({ numero: "", tribunal: "", classe: "", assunto: "" });

  const filtrosAtivos = (filtroTribunal !== "__all__" ? 1 : 0) + (filtroFase !== "__all__" ? 1 : 0) +
    (filtroStatus !== "__all__" ? 1 : 0) + (filtroResponsavel !== "__all__" ? 1 : 0) + (filtroPrazoAte ? 1 : 0);

  const buildQueryParams = () => {
    const p = new URLSearchParams({ tipo: "judicial", enriquecer: "true" });
    if (filtroTribunal !== "__all__") p.set("tribunal", filtroTribunal);
    if (filtroFase !== "__all__") p.set("fase", filtroFase);
    if (filtroStatus !== "__all__") p.set("statusInterno", filtroStatus);
    if (filtroResponsavel !== "__all__") p.set("responsavelId", filtroResponsavel);
    if (filtroPrazoAte) p.set("prazoAte", filtroPrazoAte);
    return p.toString();
  };

  const { data: processos = [], isLoading } = useQuery<ProcessoEnriquecido[]>({
    queryKey: ["/api/acervo", "judicial", filtroTribunal, filtroFase, filtroStatus, filtroResponsavel, filtroPrazoAte],
    queryFn: async () => {
      const res = await fetch(`/api/acervo?${buildQueryParams()}`);
      return res.json();
    },
  });

  const { data: equipe = [] } = useQuery<Equipe[]>({
    queryKey: ["/api/equipe"],
    queryFn: async () => {
      const res = await fetch("/api/equipe");
      return res.json();
    },
  });

  // Tribunais únicos para o filtro
  const tribunaisUnicos = Array.from(new Set(processos.map(p => p.tribunal).filter(Boolean))) as string[];

  const criarMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/acervo", {
        ...novoProcesso,
        tipo: "judicial",
        statusInterno: "ativo",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acervo", "judicial"] });
      setShowNovoDialog(false);
      setNovoProcesso({ numero: "", tribunal: "", classe: "", assunto: "" });
      toast({ title: "Processo adicionado ao acervo" });
    },
    onError: () => toast({ title: "Erro ao criar processo", variant: "destructive" }),
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/acervo/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acervo", "judicial"] });
      setFichaAberta(null);
      toast({ title: "Processo removido do acervo" });
    },
  });

  const processosFiltrados = processos.filter(p =>
    !busca || p.numero.toLowerCase().includes(busca.toLowerCase()) ||
    (p.assunto || "").toLowerCase().includes(busca.toLowerCase()) ||
    (p.tribunal || "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* Lista */}
      <div className={`flex flex-col border-r ${fichaAberta ? "w-80 hidden md:flex" : "flex-1"}`}>
        <div className="p-4 border-b bg-background">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="text-page-title">
                <BookOpen className="h-5 w-5 text-primary" />
                Acervo Judicial
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">{processos.length} processo(s) no acervo</p>
            </div>
            <Button size="sm" onClick={() => setShowNovoDialog(true)} data-testid="button-novo-processo">
              <Plus className="h-4 w-4 mr-1" />
              Novo
            </Button>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="input-busca-acervo"
              className="pl-9"
              placeholder="Buscar por número, tribunal, assunto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="h-8 text-xs w-32" data-testid="select-filtro-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroFase} onValueChange={setFiltroFase}>
              <SelectTrigger className="h-8 text-xs w-36" data-testid="select-filtro-fase">
                <SelectValue placeholder="Fase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas fases</SelectItem>
                <SelectItem value="conhecimento">Conhecimento</SelectItem>
                <SelectItem value="recursal">Recursal</SelectItem>
                <SelectItem value="execucao">Execução</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
            {tribunaisUnicos.length > 0 && (
              <Select value={filtroTribunal} onValueChange={setFiltroTribunal}>
                <SelectTrigger className="h-8 text-xs w-28" data-testid="select-filtro-tribunal">
                  <SelectValue placeholder="Tribunal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {tribunaisUnicos.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {equipe.length > 0 && (
              <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}>
                <SelectTrigger className="h-8 text-xs w-36" data-testid="select-filtro-responsavel">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos responsáveis</SelectItem>
                  {equipe.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Prazo até:</span>
              <Input
                type="date"
                className="h-8 text-xs w-36"
                value={filtroPrazoAte}
                onChange={(e) => setFiltroPrazoAte(e.target.value)}
                data-testid="input-filtro-prazo"
              />
            </div>
            {filtrosAtivos > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs px-2"
                onClick={() => { setFiltroStatus("__all__"); setFiltroFase("__all__"); setFiltroTribunal("__all__"); setFiltroResponsavel("__all__"); setFiltroPrazoAte(""); }}
                data-testid="button-limpar-filtros"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar ({filtrosAtivos})
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando acervo...</div>
          ) : processosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Archive className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum processo no acervo</p>
              <p className="text-xs mt-1">Salve processos da Consulta Processual ou adicione manualmente</p>
            </div>
          ) : (
            processosFiltrados.map((processo) => {
              const statusCfg = STATUS_CONFIG[processo.statusInterno] || STATUS_CONFIG.ativo;
              return (
                <Card
                  key={processo.id}
                  className={`cursor-pointer hover-elevate transition-colors ${fichaAberta?.id === processo.id ? "border-primary/50 bg-primary/5" : ""}`}
                  onClick={() => setFichaAberta(processo)}
                  data-testid={`card-processo-${processo.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono text-sm font-semibold truncate" data-testid={`numero-${processo.id}`}>
                            {processo.numero}
                          </span>
                          <Badge variant={statusCfg.variant} className="text-xs">{statusCfg.label}</Badge>
                        </div>
                        {processo.classe && (
                          <p className="text-xs text-muted-foreground">{processo.classe}</p>
                        )}
                        {processo.tribunal && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Building className="h-3 w-3" />
                            {processo.tribunal}
                          </p>
                        )}
                        {processo.assunto && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{processo.assunto}</p>
                        )}
                        {processo.responsavelNome && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <User className="h-3 w-3" />
                            {processo.responsavelNome}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                    {(processo.prazo || processo.ultimoAndamento) && (
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {processo.prazo && (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                              Prazo: {new Date(processo.prazo + "T12:00:00").toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        )}
                        {processo.ultimoAndamento && (
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">
                              {processo.ultimoAndamento.data}: {processo.ultimoAndamento.descricao}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    {!processo.prazo && !processo.ultimoAndamento && processo.dataUltimaSincronizacao && (
                      <div className="flex items-center gap-1 mt-2">
                        <RefreshCw className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(processo.dataUltimaSincronizacao).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Ficha */}
      {fichaAberta && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <ProcessoFicha
            processo={fichaAberta}
            onClose={() => setFichaAberta(null)}
          />
        </div>
      )}

      {/* Dialog Novo Processo */}
      <Dialog open={showNovoDialog} onOpenChange={setShowNovoDialog}>
        <DialogContent data-testid="dialog-novo-processo">
          <DialogHeader>
            <DialogTitle>Adicionar Processo ao Acervo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="novo-numero">Número do Processo *</Label>
              <Input
                id="novo-numero"
                data-testid="input-novo-numero"
                placeholder="0000001-23.2024.8.19.0001"
                value={novoProcesso.numero}
                onChange={(e) => setNovoProcesso({ ...novoProcesso, numero: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="novo-tribunal">Tribunal</Label>
                <Input
                  id="novo-tribunal"
                  data-testid="input-novo-tribunal"
                  placeholder="Ex: TJRJ"
                  value={novoProcesso.tribunal}
                  onChange={(e) => setNovoProcesso({ ...novoProcesso, tribunal: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="novo-classe">Classe</Label>
                <Input
                  id="novo-classe"
                  data-testid="input-novo-classe"
                  placeholder="Ex: Ação Civil"
                  value={novoProcesso.classe}
                  onChange={(e) => setNovoProcesso({ ...novoProcesso, classe: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="novo-assunto">Assunto</Label>
              <Input
                id="novo-assunto"
                data-testid="input-novo-assunto"
                placeholder="Assunto principal do processo"
                value={novoProcesso.assunto}
                onChange={(e) => setNovoProcesso({ ...novoProcesso, assunto: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNovoDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => criarMutation.mutate()}
              disabled={!novoProcesso.numero || criarMutation.isPending}
              data-testid="button-confirmar-novo"
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
