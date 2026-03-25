import { useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Scale, Info, Users, FileText, Gavel, Clock,
  Building, Calendar, User, Loader2, AlertTriangle, Download,
  ExternalLink, Trash2
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Processo {
  id: string;
  numero: string;
  titulo: string;
  clienteId?: string;
  responsavelId?: string;
  tipo: string;
  area: string;
  tribunal?: string;
  vara?: string;
  valorCausa?: string;
  status: string;
  fase?: string;
  dataDistribuicao?: string;
  dataAtualizacao?: string;
  observacoes?: string;
  createdAt: string;
}

interface Atividade {
  id: string;
  titulo: string;
  tipo: string;
  status: string;
  prioridade: string;
  data: string;
  hora?: string;
  descricao?: string;
  processoId?: string;
}

interface Documento {
  id: string;
  nome: string;
  tipo: string;
  tamanho?: string;
  caminho?: string;
  conteudoMarkdown?: string;
  metodoExtracao?: string;
  processoId?: string;
  createdAt: string;
}

interface Peca {
  id: string;
  titulo: string;
  tipo: string;
  numeroSequencial?: number;
  dataPeca?: string;
  urlOrigem?: string;
  caminhoArquivo?: string;
  tamanhoBytes?: number;
  formatoArquivo?: string;
  fonte?: string;
  tribunal?: string;
  createdAt: string;
}

interface Prazo {
  id: string;
  tipo: string;
  descricao: string;
  fundamentoLegal?: string;
  dataVencimento: string;
  status: string;
  prioridade: string;
  processoId?: string;
}

interface Cliente { id: string; nome: string; }
interface Equipe { id: string; nome: string; cargo?: string; }

function statusColor(s: string) {
  if (s === "Ativo") return "bg-green-100 text-green-800";
  if (s === "Arquivado" || s === "Concluido") return "bg-gray-100 text-gray-800";
  if (s === "Suspenso") return "bg-yellow-100 text-yellow-800";
  return "bg-blue-100 text-blue-800";
}

function prioridadeColor(p: string) {
  if (p === "critica") return "bg-red-500 text-white";
  if (p === "alta") return "bg-orange-500 text-white";
  if (p === "media") return "bg-yellow-500 text-white";
  return "bg-gray-400 text-white";
}

function statusPrazoColor(s: string) {
  if (s === "vencido") return "bg-red-100 text-red-800";
  if (s === "critico" || s === "proximo") return "bg-orange-100 text-orange-800";
  if (s === "cumprido") return "bg-green-100 text-green-800";
  return "bg-blue-100 text-blue-800";
}

export default function ProcessoDetalhe() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPecaId, setDeletingPecaId] = useState<string | null>(null);

  const { data: processo, isLoading } = useQuery<Processo>({
    queryKey: [`/api/processos/${id}`],
    enabled: !!id,
  });

  const { data: clientes = [] } = useQuery<Cliente[]>({ queryKey: ["/api/clientes"] });
  const { data: equipe = [] } = useQuery<Equipe[]>({ queryKey: ["/api/equipe"] });

  const { data: allAtividades = [] } = useQuery<Atividade[]>({ queryKey: ["/api/atividades"] });
  const { data: allDocumentos = [] } = useQuery<Documento[]>({ queryKey: ["/api/documentos"] });
  const { data: allPrazos = [] } = useQuery<Prazo[]>({ queryKey: ["/api/prazos"] });
  const { data: pecas = [] } = useQuery<Peca[]>({
    queryKey: ["/api/pecas", id],
    queryFn: async () => {
      const res = await fetch(`/api/pecas?processoId=${id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const deletePecaMutation = useMutation({
    mutationFn: (pecaId: string) => apiRequest("DELETE", `/api/pecas/${pecaId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pecas", id] });
      setDeleteDialogOpen(false);
      toast({ title: "Peca excluida" });
    },
  });

  const atividades = useMemo(() => allAtividades.filter(a => a.processoId === id), [allAtividades, id]);
  const documentos = useMemo(() => allDocumentos.filter(d => d.processoId === id), [allDocumentos, id]);
  const prazos = useMemo(() => allPrazos.filter(p => p.processoId === id), [allPrazos, id]);

  const cliente = useMemo(() => clientes.find(c => c.id === processo?.clienteId), [clientes, processo]);
  const responsavel = useMemo(() => equipe.find(e => e.id === processo?.responsavelId), [equipe, processo]);

  if (isLoading) {
    return (
      <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!processo) {
    return (
      <div className="p-6 bg-[#f5f5f5] min-h-screen">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Processo nao encontrado</h2>
          <Link href="/processos"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/processos">
              <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
            </Link>
            <Badge className={statusColor(processo.status)}>{processo.status}</Badge>
            {processo.fase && <Badge variant="outline">{processo.fase}</Badge>}
          </div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Scale className="h-6 w-6" />
            {processo.titulo}
          </h1>
          <p className="text-sm font-mono text-muted-foreground mt-1">{processo.numero}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {processo.tribunal && (
            <Badge variant="secondary" className="gap-1">
              <Building className="h-3 w-3" /> {processo.tribunal}
            </Badge>
          )}
          {processo.vara && <Badge variant="outline">{processo.vara}</Badge>}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="info"><Info className="h-4 w-4 mr-1 hidden sm:inline" /> Info</TabsTrigger>
          <TabsTrigger value="partes"><Users className="h-4 w-4 mr-1 hidden sm:inline" /> Partes</TabsTrigger>
          <TabsTrigger value="andamentos"><Clock className="h-4 w-4 mr-1 hidden sm:inline" /> Andamentos</TabsTrigger>
          <TabsTrigger value="decisoes"><Gavel className="h-4 w-4 mr-1 hidden sm:inline" /> Prazos</TabsTrigger>
          <TabsTrigger value="pecas"><FileText className="h-4 w-4 mr-1 hidden sm:inline" /> Pecas</TabsTrigger>
        </TabsList>

        {/* TAB: Info */}
        <TabsContent value="info" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Dados do Processo</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Numero" value={processo.numero} mono />
                <InfoRow label="Tipo" value={processo.tipo} />
                <InfoRow label="Area" value={processo.area} />
                <InfoRow label="Tribunal" value={processo.tribunal || "-"} />
                <InfoRow label="Vara" value={processo.vara || "-"} />
                <InfoRow label="Fase" value={processo.fase || "-"} />
                <InfoRow label="Valor da Causa" value={processo.valorCausa ? `R$ ${parseFloat(processo.valorCausa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"} />
                <InfoRow label="Data Distribuicao" value={processo.dataDistribuicao ? new Date(processo.dataDistribuicao).toLocaleDateString("pt-BR") : "-"} />
                <InfoRow label="Ultima Atualizacao" value={processo.dataAtualizacao ? new Date(processo.dataAtualizacao).toLocaleDateString("pt-BR") : "-"} />
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded bg-blue-50 text-center">
                      <p className="text-2xl font-bold text-blue-700">{atividades.length}</p>
                      <p className="text-xs text-blue-600">Atividades</p>
                    </div>
                    <div className="p-3 rounded bg-green-50 text-center">
                      <p className="text-2xl font-bold text-green-700">{documentos.length}</p>
                      <p className="text-xs text-green-600">Documentos</p>
                    </div>
                    <div className="p-3 rounded bg-orange-50 text-center">
                      <p className="text-2xl font-bold text-orange-700">{prazos.length}</p>
                      <p className="text-xs text-orange-600">Prazos</p>
                    </div>
                    <div className="p-3 rounded bg-purple-50 text-center">
                      <p className="text-2xl font-bold text-purple-700">{pecas.length}</p>
                      <p className="text-xs text-purple-600">Pecas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {processo.observacoes && (
                <Card className="border-0 shadow-sm">
                  <CardHeader><CardTitle className="text-base">Observacoes</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{processo.observacoes}</p></CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB: Partes */}
        <TabsContent value="partes" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Cliente</CardTitle></CardHeader>
              <CardContent>
                {cliente ? (
                  <div className="space-y-2">
                    <p className="font-medium">{cliente.nome}</p>
                    {(cliente as any).email && <p className="text-sm text-muted-foreground">{(cliente as any).email}</p>}
                    {(cliente as any).telefone && <p className="text-sm text-muted-foreground">{(cliente as any).telefone}</p>}
                    {(cliente as any).cpf_cnpj && <p className="text-sm font-mono text-muted-foreground">{(cliente as any).cpf_cnpj}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum cliente vinculado</p>
                )}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Responsavel</CardTitle></CardHeader>
              <CardContent>
                {responsavel ? (
                  <div className="space-y-2">
                    <p className="font-medium">{responsavel.nome}</p>
                    {responsavel.cargo && <p className="text-sm text-muted-foreground">{responsavel.cargo}</p>}
                    {(responsavel as any).email && <p className="text-sm text-muted-foreground">{(responsavel as any).email}</p>}
                    {(responsavel as any).oab && <p className="text-sm font-mono text-muted-foreground">OAB: {(responsavel as any).oab}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum responsavel atribuido</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: Andamentos (Atividades + Prazos timeline) */}
        <TabsContent value="andamentos" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Atividades e Andamentos</CardTitle></CardHeader>
            <CardContent>
              {atividades.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma atividade registrada para este processo</p>
              ) : (
                <div className="space-y-3">
                  {atividades.sort((a, b) => b.data.localeCompare(a.data)).map(a => (
                    <div key={a.id} className="flex items-start gap-3 p-3 rounded border">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${a.status === "Concluida" || a.status === "Concluída" ? "bg-green-500" : a.status === "Em Andamento" ? "bg-blue-500" : "bg-gray-400"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{a.titulo}</p>
                          <Badge variant="secondary" className="text-xs">{a.tipo}</Badge>
                        </div>
                        {a.descricao && <p className="text-xs text-muted-foreground mt-1">{a.descricao}</p>}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span><Calendar className="h-3 w-3 inline mr-1" />{new Date(a.data).toLocaleDateString("pt-BR")}</span>
                          {a.hora && <span>{a.hora}</span>}
                          <Badge className={a.prioridade === "Alta" ? "bg-red-100 text-red-800" : a.prioridade === "Media" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"} variant="secondary">{a.prioridade}</Badge>
                          <Badge className={a.status === "Pendente" ? "bg-gray-100 text-gray-800" : a.status === "Em Andamento" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"} variant="secondary">{a.status}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Prazos */}
        <TabsContent value="decisoes" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Prazos Processuais</CardTitle></CardHeader>
            <CardContent>
              {prazos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum prazo registrado para este processo</p>
              ) : (
                <div className="space-y-3">
                  {prazos.sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento)).map(p => (
                    <div key={p.id} className="p-3 rounded border">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <Badge className={prioridadeColor(p.prioridade)} variant="secondary">{p.prioridade}</Badge>
                          <Badge className={statusPrazoColor(p.status)} variant="secondary">{p.status}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {new Date(p.dataVencimento).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{p.descricao}</p>
                      {p.fundamentoLegal && <p className="text-xs text-muted-foreground mt-1">{p.fundamentoLegal}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Pecas Processuais + Documentos */}
        <TabsContent value="pecas" className="mt-4 space-y-4">
          {/* Pecas */}
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Pecas Processuais</CardTitle></CardHeader>
            <CardContent>
              {pecas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma peca processual registrada</p>
              ) : (
                <div className="space-y-2">
                  {pecas.map(peca => (
                    <div key={peca.id} className="flex items-center justify-between p-3 rounded border">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{peca.titulo}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">{peca.tipo}</Badge>
                            {peca.dataPeca && <span>{new Date(peca.dataPeca).toLocaleDateString("pt-BR")}</span>}
                            {peca.formatoArquivo && <span>{peca.formatoArquivo.toUpperCase()}</span>}
                            {peca.tamanhoBytes && <span>{(peca.tamanhoBytes / 1024).toFixed(1)} KB</span>}
                            {peca.fonte && <Badge variant="secondary" className="text-xs">{peca.fonte}</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {peca.urlOrigem && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={peca.urlOrigem} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a>
                          </Button>
                        )}
                        {peca.caminhoArquivo && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={peca.caminhoArquivo} download><Download className="h-3 w-3" /></a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeletingPecaId(peca.id); setDeleteDialogOpen(true); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documentos */}
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Documentos Anexados</CardTitle></CardHeader>
            <CardContent>
              {documentos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum documento anexado</p>
              ) : (
                <div className="space-y-2">
                  {documentos.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded border">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.nome}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">{doc.tipo}</Badge>
                            {doc.tamanho && <span>{doc.tamanho}</span>}
                            {doc.metodoExtracao && <Badge variant="secondary" className="text-xs">OCR: {doc.metodoExtracao}</Badge>}
                            <span>{new Date(doc.createdAt).toLocaleDateString("pt-BR")}</span>
                          </div>
                        </div>
                      </div>
                      {doc.caminho && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <a href={doc.caminho} download><Download className="h-3 w-3" /></a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Peca Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir peca?</AlertDialogTitle>
            <AlertDialogDescription>Esta acao nao pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingPecaId && deletePecaMutation.mutate(deletingPecaId)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
