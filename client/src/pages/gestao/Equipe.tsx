import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Mail, Phone, Briefcase, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Equipe } from "@shared/schema";

const emptyMembro = {
  nome: "", email: "", telefone: "", cargo: "Advogado", oab: "",
  especialidade: "", status: "Ativo", avatar: "",
};

const coresEquipe = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function EquipePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingMembro, setEditingMembro] = useState<Equipe | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyMembro);
  const { toast } = useToast();

  const { data: equipe = [], isLoading } = useQuery<Equipe[]>({ queryKey: ["/api/equipe"] });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/equipe", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/equipe"] }); setDialogOpen(false); resetForm(); toast({ title: "Membro adicionado com sucesso" }); },
    onError: (e: Error) => { toast({ title: "Erro ao adicionar membro", description: e.message, variant: "destructive" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => apiRequest("PATCH", `/api/equipe/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/equipe"] }); setDialogOpen(false); resetForm(); toast({ title: "Membro atualizado com sucesso" }); },
    onError: (e: Error) => { toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/equipe/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/equipe"] }); setDeleteDialogOpen(false); toast({ title: "Membro removido" }); },
    onError: (e: Error) => { toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }); },
  });

  const resetForm = () => { setForm(emptyMembro); setEditingMembro(null); };
  const openCreate = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (m: Equipe) => {
    setEditingMembro(m);
    setForm({ nome: m.nome, email: m.email, telefone: m.telefone || "", cargo: m.cargo, oab: m.oab || "", especialidade: m.especialidade || "", status: m.status, avatar: m.avatar || "" });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.email || !form.cargo) { toast({ title: "Preencha os campos obrigatorios", variant: "destructive" }); return; }
    if (editingMembro) updateMutation.mutate({ id: editingMembro.id, data: form });
    else createMutation.mutate(form);
  };

  const filteredEquipe = equipe.filter(m =>
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleColors: Record<string, string> = {
    "Advogado Senior": "bg-purple-100 text-purple-800",
    "Advogada": "bg-blue-100 text-blue-800",
    "Advogado": "bg-blue-100 text-blue-800",
    "Assistente": "bg-green-100 text-green-800",
    "Estagiario": "bg-yellow-100 text-yellow-800",
    "Socio": "bg-purple-100 text-purple-800",
  };

  if (isLoading) return <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando equipe...</p></div>;

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Equipe</h1>
          <p className="text-sm text-muted-foreground">Gerencie os membros da equipe do escritorio</p>
        </div>
        <Button className="bg-legal-status-active hover:bg-legal-status-active/90" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />Adicionar Membro
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total de Membros", value: equipe.length, color: "text-foreground" },
          { label: "Advogados", value: equipe.filter(m => m.cargo.toLowerCase().includes("advogad")).length, color: "text-blue-600" },
          { label: "Com OAB", value: equipe.filter(m => m.oab).length, color: "text-purple-600" },
          { label: "Ativos", value: equipe.filter(m => m.status === "Ativo").length, color: "text-green-600" },
        ].map((s, i) => (
          <Card key={i} className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-muted-foreground mb-1">{s.label}</p><p className={`text-3xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="search" placeholder="Pesquisar por nome, email ou funcao..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEquipe.map((membro, index) => {
              const cor = coresEquipe[index % coresEquipe.length];
              return (
                <Card key={membro.id} className="hover-elevate">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className="w-12 h-12 shrink-0" style={{ backgroundColor: cor }}>
                          {membro.avatar ? <AvatarImage src={membro.avatar} alt={membro.nome} /> : <AvatarFallback className="text-white" style={{ backgroundColor: cor }}>{membro.nome.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}</AvatarFallback>}
                        </Avatar>
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{membro.nome}</CardTitle>
                          <Badge className={`mt-1 ${roleColors[membro.cargo] || "bg-gray-100 text-gray-800"}`}>{membro.cargo}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(membro)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDeletingId(membro.id); setDeleteDialogOpen(true); }}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {membro.oab && <div className="flex items-center gap-2 text-sm"><Briefcase className="w-4 h-4 text-muted-foreground" /><span className="font-mono">{membro.oab}</span></div>}
                    <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" /><span className="truncate">{membro.email}</span></div>
                    {membro.telefone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" /><span>{membro.telefone}</span></div>}
                    {membro.especialidade && <div className="pt-3 border-t"><p className="text-xs text-muted-foreground">Especialidade</p><p className="text-sm font-medium">{membro.especialidade}</p></div>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {filteredEquipe.length === 0 && <div className="text-center py-8"><p className="text-muted-foreground">Nenhum membro encontrado</p></div>}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) resetForm(); setDialogOpen(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMembro ? "Editar Membro" : "Adicionar Membro"}</DialogTitle>
            <DialogDescription>{editingMembro ? "Atualize os dados do membro" : "Preencha os dados para adicionar um novo membro"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nome *</Label><Input placeholder="Nome completo" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required /></div>
              <div className="space-y-2">
                <Label>Cargo *</Label>
                <Select value={form.cargo} onValueChange={v => setForm(f => ({ ...f, cargo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Socio", "Advogado Senior", "Advogado", "Advogada", "Assistente", "Estagiario", "Secretaria", "Financeiro", "TI"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Email *</Label><Input type="email" placeholder="email@exemplo.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input placeholder="(00) 00000-0000" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>OAB</Label><Input placeholder="000000/UF" value={form.oab} onChange={e => setForm(f => ({ ...f, oab: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Especialidade</Label><Input placeholder="Ex: Direito Civil, Trabalhista, Criminal..." value={form.especialidade} onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : editingMembro ? "Atualizar" : "Adicionar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover Membro</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja remover este membro da equipe?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deletingId && deleteMutation.mutate(deletingId)}>{deleteMutation.isPending ? "Removendo..." : "Remover"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
