import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Shield, Pencil, Trash2, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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

interface Certificado {
  id: string;
  nome: string;
  tipo: string;
  titular: string;
  cpfCnpj?: string;
  autoridade?: string;
  dataEmissao: string;
  dataValidade: string;
  status: string;
  senha?: string;
  createdAt: string;
}

const emptyCert = {
  nome: "", tipo: "A1", titular: "", cpfCnpj: "", autoridade: "",
  dataEmissao: "", dataValidade: "", status: "Ativo", senha: "",
};

function diasParaVencer(data: string) {
  return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000);
}

export default function CertificadosDigitais() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certificado | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCert);
  const { toast } = useToast();

  const { data: certificados = [], isLoading } = useQuery<Certificado[]>({ queryKey: ["/api/certificados"] });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/certificados", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/certificados"] }); setDialogOpen(false); resetForm(); toast({ title: "Certificado criado" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => apiRequest("PATCH", `/api/certificados/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/certificados"] }); setDialogOpen(false); resetForm(); toast({ title: "Certificado atualizado" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/certificados/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/certificados"] }); setDeleteDialogOpen(false); toast({ title: "Certificado excluido" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const resetForm = () => { setForm(emptyCert); setEditingCert(null); };
  const openCreate = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (c: Certificado) => {
    setEditingCert(c);
    setForm({
      nome: c.nome, tipo: c.tipo, titular: c.titular, cpfCnpj: c.cpfCnpj || "",
      autoridade: c.autoridade || "", dataEmissao: c.dataEmissao, dataValidade: c.dataValidade,
      status: c.status, senha: "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.titular || !form.dataEmissao || !form.dataValidade) {
      toast({ title: "Preencha os campos obrigatorios", variant: "destructive" }); return;
    }
    if (editingCert) updateMutation.mutate({ id: editingCert.id, data: form });
    else createMutation.mutate(form);
  };

  const filtered = certificados.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.titular.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ativos = certificados.filter(c => c.status === "Ativo").length;
  const vencendo = certificados.filter(c => {
    const d = diasParaVencer(c.dataValidade);
    return d >= 0 && d <= 30 && c.status === "Ativo";
  }).length;
  const vencidos = certificados.filter(c => diasParaVencer(c.dataValidade) < 0).length;

  if (isLoading) return <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando certificados...</p></div>;

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Certificados Digitais</h1>
          <p className="text-sm text-muted-foreground">Gerencie certificados A1 e A3 do escritorio</p>
        </div>
        <Button className="bg-legal-status-active hover:bg-legal-status-active/90" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />Novo Certificado
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Shield className="w-4 h-4 text-blue-600" /><span className="text-sm text-muted-foreground">Total</span></div><p className="text-3xl font-bold text-blue-600">{certificados.length}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-sm text-muted-foreground">Ativos</span></div><p className="text-3xl font-bold text-green-600">{ativos}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-orange-600" /><span className="text-sm text-muted-foreground">Vencendo (30d)</span></div><p className="text-3xl font-bold text-orange-600">{vencendo}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-sm text-muted-foreground">Vencidos</span></div><p className="text-3xl font-bold text-red-600">{vencidos}</p></CardContent></Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="search" placeholder="Pesquisar por nome ou titular..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Titular</TableHead>
                <TableHead>Autoridade</TableHead>
                <TableHead>Emissao</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => {
                const dias = diasParaVencer(c.dataValidade);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell><Badge variant="outline">{c.tipo}</Badge></TableCell>
                    <TableCell>{c.titular}</TableCell>
                    <TableCell>{c.autoridade || "-"}</TableCell>
                    <TableCell>{new Date(c.dataEmissao + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{new Date(c.dataValidade + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                        {dias < 0 && <Badge className="bg-red-100 text-red-800 text-xs">Vencido</Badge>}
                        {dias >= 0 && dias <= 30 && <Badge className="bg-orange-100 text-orange-800 text-xs">{dias}d</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={c.status === "Ativo" ? "bg-green-100 text-green-800" : c.status === "Revogado" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDeletingId(c.id); setDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtered.length === 0 && <div className="text-center py-8"><p className="text-muted-foreground">Nenhum certificado encontrado</p></div>}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) resetForm(); setDialogOpen(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCert ? "Editar Certificado" : "Novo Certificado Digital"}</DialogTitle>
            <DialogDescription>{editingCert ? "Atualize os dados do certificado" : "Cadastre um novo certificado digital"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input placeholder="Ex: Certificado e-CNPJ A1" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="A1">A1</SelectItem><SelectItem value="A3">A3</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Revogado">Revogado</SelectItem><SelectItem value="Vencido">Vencido</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Titular *</Label><Input placeholder="Nome do titular" value={form.titular} onChange={e => setForm(f => ({ ...f, titular: e.target.value }))} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>CPF/CNPJ</Label><Input placeholder="000.000.000-00" value={form.cpfCnpj} onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Autoridade</Label><Input placeholder="Ex: Certisign, Serasa" value={form.autoridade} onChange={e => setForm(f => ({ ...f, autoridade: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data Emissao *</Label><Input type="date" value={form.dataEmissao} onChange={e => setForm(f => ({ ...f, dataEmissao: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Data Validade *</Label><Input type="date" value={form.dataValidade} onChange={e => setForm(f => ({ ...f, dataValidade: e.target.value }))} required /></div>
            </div>
            {!editingCert && <div className="space-y-2"><Label>Senha do Certificado</Label><Input type="password" placeholder="Senha" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} /></div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : editingCert ? "Atualizar" : "Criar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir Certificado</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este certificado?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deletingId && deleteMutation.mutate(deletingId)}>{deleteMutation.isPending ? "Excluindo..." : "Excluir"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
