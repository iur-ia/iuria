import { useState, useEffect, useRef, useMemo } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import Placeholder from "@tiptap/extension-placeholder";
import { FontFamily } from "@tiptap/extension-font-family";
import {
  TextB,
  TextItalic,
  TextUnderline,
  TextStrikethrough,
  TextAlignLeft,
  TextAlignCenter,
  TextAlignRight,
  TextAlignJustify,
  ListBullets,
  ListNumbers,
  Quotes,
  Table as TableIcon,
  ArrowCounterClockwise,
  ArrowClockwise,
  TextHOne,
  TextHTwo,
  TextHThree,
  Plus,
  UploadSimple,
  Star,
  Trash,
  FloppyDisk,
  FilePdf,
  FileDoc,
  PaperPlaneTilt,
  Sparkle,
  Archive,
  CaretDown,
  Pencil,
  MagicWand,
  CircleNotch,
  Copy as CopyIcon,
  Check,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Template, PeticaoRascunho } from "@shared/schema";
import { cn } from "@/lib/utils";

const CATEGORIAS = [
  "Cível",
  "Trabalhista",
  "Penal",
  "Tributário",
  "Administrativo",
  "Empresarial",
  "Família",
  "Recursos",
  "Importado",
  "Outro",
];

const QUICK_ACTIONS = [
  { label: "Gerar petição inicial", prompt: "Gere uma petição inicial completa com endereçamento, qualificação genérica das partes, fatos, fundamentação jurídica, pedidos e fechamento." },
  { label: "Revisar fundamentação", prompt: "Revise a fundamentação jurídica do documento, fortalecendo a argumentação e adicionando referências legais quando pertinente." },
  { label: "Reforçar argumentos", prompt: "Reforce os argumentos do documento atual com fundamentação doutrinária e jurisprudencial brasileira." },
  { label: "Gerar contestação", prompt: "Gere uma contestação completa, refutando a inicial em preliminares e mérito." },
  { label: "Pedido de tutela de urgência", prompt: "Adicione um capítulo de pedido de tutela provisória de urgência, com demonstração de probabilidade do direito e perigo na demora." },
  { label: "Resumir documento", prompt: "Faça um resumo executivo do documento, em até 5 parágrafos." },
];

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  mode?: "gerar" | "editar" | "revisar";
  ts: number;
};

export default function PeticoesIA() {
  const { toast } = useToast();

  // Editor state
  const [titulo, setTitulo] = useState("Nova Petição");
  const [rascunhoId, setRascunhoId] = useState<string | null>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({}),
      TextStyle,
      Color,
      FontFamily,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({
        placeholder: "Comece a redigir, escolha um template à esquerda ou peça à IA…",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[60vh] font-serif text-[15px] leading-[1.75]",
      },
    },
  });

  // Templates query
  const { data: templates = [] } = useQuery<Template[]>({ queryKey: ["/api/templates"] });
  const { data: rascunhos = [] } = useQuery<PeticaoRascunho[]>({ queryKey: ["/api/peticao-rascunhos"] });

  // Filtros painel templates
  const [filtroCat, setFiltroCat] = useState<string>("todas");
  const [buscaTpl, setBuscaTpl] = useState("");
  const templatesFiltrados = useMemo(() => {
    return templates.filter((t) => {
      if (filtroCat !== "todas" && t.categoria !== filtroCat) return false;
      if (buscaTpl && !t.nome.toLowerCase().includes(buscaTpl.toLowerCase())) return false;
      return true;
    });
  }, [templates, filtroCat, buscaTpl]);

  const templatesPadrao = useMemo(() => templates.filter((t) => t.isPadrao), [templates]);

  // Carrega template padrão automaticamente uma vez
  useEffect(() => {
    if (!editor) return;
    if (rascunhoId) return;
    if (editor.getHTML() && editor.getHTML() !== "<p></p>") return;
    if (templatesPadrao.length > 0) {
      const html = templatesPadrao[0].conteudoHtml || templatesPadrao[0].conteudo || "";
      if (html) editor.commands.setContent(html);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templatesPadrao.length, editor]);

  // Chat state
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatMode, setChatMode] = useState<"gerar" | "editar" | "revisar">("gerar");
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length]);

  const chatMutation = useMutation({
    mutationFn: async (payload: { instruction: string; mode: typeof chatMode; selection?: string }) => {
      const res = await apiRequest("POST", "/api/peticoes-ia/chat", {
        instruction: payload.instruction,
        contentHtml: editor?.getHTML() || "",
        selection: payload.selection,
        mode: payload.mode,
      });
      return res.json();
    },
    onSuccess: (data: { html: string; mode: string }) => {
      if (!editor) return;
      if (data.mode === "editar") {
        // substitui a seleção atual (ou no fim se não houver)
        const { from, to } = editor.state.selection;
        if (from !== to) {
          editor.chain().focus().deleteSelection().insertContent(data.html).run();
        } else {
          editor.chain().focus("end").insertContent(data.html).run();
        }
      } else if (data.mode === "revisar") {
        editor.commands.setContent(data.html);
      } else {
        // gerar — se editor está vazio, substitui; senão append
        const cur = editor.getHTML();
        if (!cur || cur === "<p></p>") {
          editor.commands.setContent(data.html);
        } else {
          editor.chain().focus("end").insertContent(data.html).run();
        }
      }
      setChat((prev) => [...prev, { role: "assistant", content: "Pronto. Aplicado ao documento.", mode: data.mode as any, ts: Date.now() }]);
    },
    onError: (err: any) => {
      const msg = err?.message || "Erro na IA";
      setChat((prev) => [...prev, { role: "system", content: msg, ts: Date.now() }]);
      toast({ title: "IA indisponível", description: msg, variant: "destructive" });
    },
  });

  const sendChat = (instruction: string) => {
    if (!instruction.trim()) return;
    const selection = (() => {
      if (!editor || chatMode !== "editar") return undefined;
      const { from, to } = editor.state.selection;
      if (from === to) return undefined;
      return editor.state.doc.cut(from, to).textContent;
    })();
    setChat((prev) => [...prev, { role: "user", content: instruction, mode: chatMode, ts: Date.now() }]);
    setInput("");
    chatMutation.mutate({ instruction, mode: chatMode, selection });
  };

  // Templates mutations
  const deleteTpl = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/templates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/templates"] }),
  });
  const setPadraoTpl = useMutation({
    mutationFn: ({ id, isPadrao }: { id: string; isPadrao: boolean }) =>
      apiRequest("POST", `/api/templates/${id}/padrao`, { isPadrao }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/templates"] }),
  });

  const loadTemplate = (t: Template) => {
    if (!editor) return;
    const html = t.conteudoHtml || (t.conteudo ? `<p>${t.conteudo}</p>` : "");
    editor.commands.setContent(html);
    setTitulo(t.nome);
    toast({ title: "Template carregado", description: t.nome });
    apiRequest("PATCH", `/api/templates/${t.id}`, { usos: (t.usos || 0) + 1 }).catch(() => {});
  };

  // ===== Novo template dialog =====
  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [novoTpl, setNovoTpl] = useState({ nome: "", categoria: "Cível", descricao: "" });
  const createTplMut = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/templates", {
        nome: novoTpl.nome,
        categoria: novoTpl.categoria,
        descricao: novoTpl.descricao,
        conteudoHtml: editor?.getHTML() || "",
        conteudo: editor?.getText().slice(0, 4000) || "",
        origem: "manual",
        isPadrao: false,
        usos: 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setTplDialogOpen(false);
      setNovoTpl({ nome: "", categoria: "Cível", descricao: "" });
      toast({ title: "Template criado", description: "Salvo a partir do documento atual." });
    },
  });

  // ===== Import =====
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onImport = async (file: File, asTemplate: boolean) => {
    const fd = new FormData();
    fd.append("arquivo", file);
    if (asTemplate) {
      fd.append("nome", file.name.replace(/\.[^.]+$/, ""));
      fd.append("categoria", "Importado");
    }
    const res = await fetch(`/api/templates/import${asTemplate ? "?asTemplate=1" : ""}`, {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast({ title: "Falha ao importar", description: err.error || "Erro", variant: "destructive" });
      return;
    }
    const data = await res.json();
    if (asTemplate) {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template importado", description: file.name });
    } else if (editor && data.html) {
      editor.commands.setContent(data.html);
      setTitulo(file.name.replace(/\.[^.]+$/, ""));
      toast({ title: "Documento importado", description: file.name });
    }
  };

  // ===== Salvar rascunho =====
  const salvarRascunho = useMutation({
    mutationFn: async () => {
      const html = editor?.getHTML() || "";
      if (rascunhoId) {
        const r = await apiRequest("PATCH", `/api/peticao-rascunhos/${rascunhoId}`, {
          titulo, conteudoHtml: html,
        });
        return r.json();
      } else {
        const r = await apiRequest("POST", "/api/peticao-rascunhos", {
          titulo, conteudoHtml: html,
        });
        return r.json();
      }
    },
    onSuccess: (r: PeticaoRascunho) => {
      setRascunhoId(r.id);
      queryClient.invalidateQueries({ queryKey: ["/api/peticao-rascunhos"] });
      toast({ title: "Rascunho salvo", description: r.titulo });
    },
  });

  const carregarRascunho = (r: PeticaoRascunho) => {
    if (!editor) return;
    editor.commands.setContent(r.conteudoHtml || "");
    setTitulo(r.titulo);
    setRascunhoId(r.id);
  };

  // ===== Export =====
  const [exporting, setExporting] = useState<"docx" | "pdf" | null>(null);
  const exportar = async (format: "docx" | "pdf") => {
    if (!editor) return;
    setExporting(format);
    try {
      const res = await fetch("/api/peticoes-ia/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: editor.getHTML(), format, titulo }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${titulo.replace(/[^a-zA-Z0-9._-]/g, "_")}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: "Falha ao exportar", description: e.message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  // ===== Salvar no acervo =====
  const salvarAcervo = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/peticoes-ia/salvar-no-acervo", {
        titulo, html: editor?.getHTML() || "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documentos"] });
      toast({ title: "Salvo no acervo", description: `${titulo} adicionado em Documentos > Petições.` });
    },
  });

  // ===== Copiar =====
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    if (!editor) return;
    try {
      await navigator.clipboard.writeText(editor.getText());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {}
  };

  if (!editor) {
    return <div className="p-8 text-muted-foreground">Carregando editor…</div>;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-[calc(100vh-7rem)] gap-3 p-3" data-testid="page-peticoes-ia">
        {/* ============================ COLUNA 1 — TEMPLATES ============================ */}
        <aside className="w-[280px] flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">Templates</h2>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} data-testid="button-import-template">
                    <UploadSimple />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Importar (.docx, .html, .txt)</TooltipContent>
              </Tooltip>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.html,.htm,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImport(f, true);
                  e.target.value = "";
                }}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={() => setTplDialogOpen(true)} data-testid="button-novo-template">
                    <Plus />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Novo template (a partir do editor)</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <Input
            placeholder="Buscar…"
            value={buscaTpl}
            onChange={(e) => setBuscaTpl(e.target.value)}
            data-testid="input-busca-template"
          />
          <Select value={filtroCat} onValueChange={setFiltroCat}>
            <SelectTrigger data-testid="select-categoria-template">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas categorias</SelectItem>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ScrollArea className="flex-1 -mx-1 px-1">
            <div className="space-y-1">
              {templatesFiltrados.length === 0 && (
                <div className="text-xs text-muted-foreground p-3 text-center">
                  Nenhum template. Crie a partir do editor ou importe um arquivo.
                </div>
              )}
              {templatesFiltrados.map((t) => (
                <div
                  key={t.id}
                  className="group rounded-md border bg-card p-2 hover-elevate cursor-pointer"
                  onClick={() => loadTemplate(t)}
                  data-testid={`card-template-${t.id}`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{t.nome}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                          {t.categoria}
                        </Badge>
                        {t.origem === "importado" && (
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">imp.</span>
                        )}
                        <span className="text-[10px] text-muted-foreground">{t.usos || 0} usos</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPadraoTpl.mutate({ id: t.id, isPadrao: !t.isPadrao });
                        }}
                        data-testid={`button-padrao-${t.id}`}
                      >
                        <Star weight={t.isPadrao ? "fill" : "regular"} className={t.isPadrao ? "text-primary" : ""} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Excluir "${t.nome}"?`)) deleteTpl.mutate(t.id);
                        }}
                        data-testid={`button-excluir-${t.id}`}
                      >
                        <Trash />
                      </Button>
                    </div>
                  </div>
                  {t.descricao && (
                    <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{t.descricao}</div>
                  )}
                </div>
              ))}
            </div>

            {rascunhos.length > 0 && (
              <div className="mt-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1">Rascunhos</div>
                <div className="space-y-1">
                  {rascunhos.slice(0, 8).map((r) => (
                    <button
                      key={r.id}
                      className="w-full text-left rounded-md border bg-card p-2 hover-elevate"
                      onClick={() => carregarRascunho(r)}
                      data-testid={`card-rascunho-${r.id}`}
                    >
                      <div className="text-sm truncate">{r.titulo}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {r.updatedAt ? new Date(r.updatedAt).toLocaleString("pt-BR") : ""}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* ============================ COLUNA 2 — EDITOR ============================ */}
        <section className="flex-1 flex flex-col min-w-0 gap-2">
          {/* Header com título e ações */}
          <div className="flex items-center gap-2">
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="text-base font-medium border-none shadow-none focus-visible:ring-1 px-2 max-w-md"
              data-testid="input-titulo-peticao"
            />
            <div className="flex-1" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => salvarRascunho.mutate()}
              disabled={salvarRascunho.isPending}
              data-testid="button-salvar-rascunho"
            >
              <FloppyDisk className="mr-1.5" />
              {salvarRascunho.isPending ? "Salvando…" : rascunhoId ? "Salvar" : "Salvar rascunho"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" data-testid="button-export-menu">
                  Exportar <CaretDown className="ml-1.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportar("docx")} disabled={!!exporting}>
                  <FileDoc className="mr-2" /> {exporting === "docx" ? "Gerando…" : "Word (.docx)"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportar("pdf")} disabled={!!exporting}>
                  <FilePdf className="mr-2" /> {exporting === "pdf" ? "Gerando…" : "PDF"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={copiar}>
                  {copiado ? <Check className="mr-2" /> : <CopyIcon className="mr-2" />}
                  {copiado ? "Copiado!" : "Copiar texto"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.print()}>
                  <FilePdf className="mr-2" /> Imprimir / PDF do navegador
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              onClick={() => salvarAcervo.mutate()}
              disabled={salvarAcervo.isPending}
              data-testid="button-salvar-acervo"
            >
              <Archive className="mr-1.5" />
              {salvarAcervo.isPending ? "Salvando…" : "Salvar no acervo"}
            </Button>
          </div>

          {/* Toolbar */}
          <EditorToolbar editor={editor} />

          {/* Página A4 */}
          <ScrollArea className="flex-1 surface-elevated rounded-md">
            <div className="mx-auto my-6 bg-white text-zinc-900 dark:bg-[#fafaf7] shadow-sm border border-border max-w-[820px] min-h-[1000px] px-[80px] py-[72px] print:shadow-none print:border-0 print:max-w-full print:p-0">
              <EditorContent editor={editor} />
            </div>
          </ScrollArea>
        </section>

        {/* ============================ COLUNA 3 — CHAT IA ============================ */}
        <aside className="w-[340px] flex flex-col gap-2 shrink-0 border-l pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkle className="text-primary" />
              <h2 className="text-sm font-semibold tracking-tight">Assistente IA</h2>
            </div>
            <Select value={chatMode} onValueChange={(v) => setChatMode(v as any)}>
              <SelectTrigger className="h-7 w-[120px] text-xs" data-testid="select-chat-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gerar">Gerar</SelectItem>
                <SelectItem value="editar">Editar seleção</SelectItem>
                <SelectItem value="revisar">Revisar tudo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-1">
            {QUICK_ACTIONS.map((q) => (
              <Button
                key={q.label}
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => sendChat(q.prompt)}
                disabled={chatMutation.isPending}
                data-testid={`button-quick-${q.label.replace(/\s+/g, "-").toLowerCase()}`}
              >
                {q.label}
              </Button>
            ))}
          </div>

          <ScrollArea className="flex-1 -mx-1 px-1">
            <div className="space-y-2 py-1">
              {chat.length === 0 && (
                <div className="text-xs text-muted-foreground text-center p-6">
                  <MagicWand className="mx-auto mb-2 text-2xl text-primary/60" />
                  Peça à IA para gerar, editar ou revisar trechos.
                  <div className="mt-2 text-[10px]">
                    Modo <strong>Editar seleção</strong>: selecione um trecho no editor, descreva a mudança.
                  </div>
                </div>
              )}
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-md border p-2 text-xs",
                    m.role === "user" && "bg-primary/5 border-primary/30",
                    m.role === "assistant" && "bg-card",
                    m.role === "system" && "bg-destructive/10 border-destructive/30 text-destructive"
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {m.role === "user" ? "Você" : m.role === "assistant" ? "IA" : "Sistema"}
                    {m.mode && <Badge variant="outline" className="text-[9px] py-0 px-1 h-3.5">{m.mode}</Badge>}
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                  <CircleNotch className="animate-spin" /> Pensando…
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          <div className="space-y-1.5">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  sendChat(input);
                }
              }}
              placeholder={
                chatMode === "editar"
                  ? "Selecione um trecho no editor e descreva a alteração…"
                  : chatMode === "revisar"
                    ? "Como deseja que o documento inteiro seja revisado?"
                    : "Descreva a peça ou trecho que deseja gerar…"
              }
              rows={3}
              className="text-xs resize-none"
              data-testid="textarea-chat-input"
            />
            <div className="flex items-center justify-between gap-1">
              <div className="text-[10px] text-muted-foreground">⌘/Ctrl + Enter para enviar</div>
              <Button
                size="sm"
                onClick={() => sendChat(input)}
                disabled={chatMutation.isPending || !input.trim()}
                data-testid="button-enviar-chat"
              >
                <PaperPlaneTilt className="mr-1" /> Enviar
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* Dialog: Novo template */}
      <Dialog open={tplDialogOpen} onOpenChange={setTplDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar como template</DialogTitle>
            <DialogDescription>O conteúdo atual do editor será salvo como modelo reutilizável.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={novoTpl.nome} onChange={(e) => setNovoTpl({ ...novoTpl, nome: e.target.value })} data-testid="input-novo-tpl-nome" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={novoTpl.categoria} onValueChange={(v) => setNovoTpl({ ...novoTpl, categoria: v })}>
                <SelectTrigger data-testid="select-novo-tpl-categoria"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={novoTpl.descricao}
                onChange={(e) => setNovoTpl({ ...novoTpl, descricao: e.target.value })}
                data-testid="textarea-novo-tpl-descricao"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTplDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createTplMut.mutate()} disabled={!novoTpl.nome || createTplMut.isPending} data-testid="button-confirmar-novo-tpl">
              Salvar template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

// ============================================================================
// Toolbar
// ============================================================================
function EditorToolbar({ editor }: { editor: Editor }) {
  if (!editor) return null;
  const Btn = ({
    onClick,
    active,
    icon: Icon,
    label,
    testId,
  }: {
    onClick: () => void;
    active?: boolean;
    icon: any;
    label: string;
    testId: string;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={cn("h-8 w-8", active && "bg-accent text-accent-foreground")}
          onClick={onClick}
          data-testid={testId}
        >
          <Icon weight={active ? "fill" : "regular"} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  const Sep = () => <div className="w-px h-6 bg-border mx-0.5" />;

  return (
    <div className="flex items-center gap-0.5 flex-wrap p-1.5 rounded-md border bg-card">
      <Btn
        onClick={() => editor.chain().focus().undo().run()}
        icon={ArrowCounterClockwise}
        label="Desfazer"
        testId="toolbar-undo"
      />
      <Btn
        onClick={() => editor.chain().focus().redo().run()}
        icon={ArrowClockwise}
        label="Refazer"
        testId="toolbar-redo"
      />
      <Sep />
      <Btn
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        icon={TextHOne}
        label="Título 1"
        testId="toolbar-h1"
      />
      <Btn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        icon={TextHTwo}
        label="Título 2"
        testId="toolbar-h2"
      />
      <Btn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        icon={TextHThree}
        label="Título 3"
        testId="toolbar-h3"
      />
      <Sep />
      <Btn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        icon={TextB}
        label="Negrito"
        testId="toolbar-bold"
      />
      <Btn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        icon={TextItalic}
        label="Itálico"
        testId="toolbar-italic"
      />
      <Btn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        icon={TextUnderline}
        label="Sublinhado"
        testId="toolbar-underline"
      />
      <Btn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        icon={TextStrikethrough}
        label="Tachado"
        testId="toolbar-strike"
      />
      <Sep />
      <Btn
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        icon={TextAlignLeft}
        label="Esquerda"
        testId="toolbar-align-left"
      />
      <Btn
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        icon={TextAlignCenter}
        label="Centro"
        testId="toolbar-align-center"
      />
      <Btn
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        icon={TextAlignRight}
        label="Direita"
        testId="toolbar-align-right"
      />
      <Btn
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })}
        icon={TextAlignJustify}
        label="Justificar"
        testId="toolbar-align-justify"
      />
      <Sep />
      <Btn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        icon={ListBullets}
        label="Lista"
        testId="toolbar-bullet-list"
      />
      <Btn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        icon={ListNumbers}
        label="Lista numerada"
        testId="toolbar-ordered-list"
      />
      <Btn
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        icon={Quotes}
        label="Citação"
        testId="toolbar-blockquote"
      />
      <Sep />
      <Btn
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        icon={TableIcon}
        label="Inserir tabela"
        testId="toolbar-table"
      />
    </div>
  );
}
