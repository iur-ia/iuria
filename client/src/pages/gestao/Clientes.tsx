import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Filter, Mail, Phone, Building, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import type { Cliente } from "@shared/schema";

const emptyCliente = {
  nome: "", tipo: "Pessoa Fisica", cpfCnpj: "", email: "", telefone: "",
  endereco: "", cidade: "", estado: "", cep: "", observacoes: "", status: "Ativo",
};

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCliente);
  const { toast } = useToast();

  const { data: clientes = [], isLoading } = useQuery<Cliente[]>({ queryKey: ["/api/clientes"] });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/clientes", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/clientes"] }); setDialogOpen(false); resetForm(); toast({ title: "Cliente criado com sucesso" }); },
    onError: (e: Error) => { toast({ title: "Erro ao criar cliente", description: e.message, variant: "destructive" }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => apiRequest("PATCH", `/api/clientes/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/clientes"] }); setDialogOpen(false); resetForm(); toast({ title: "Cliente atualizado com sucesso" }); },
    onError: (e: Error) => { toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/clientes/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/clientes"] }); setDeleteDialogOpen(false); toast({ title: "Cliente excluido" }); },
    onError: (e: Error) => { toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }); },
  });

  const resetForm = () => { setForm(emptyCliente); setEditingCliente(null); };

  const openCreate = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (c: Cliente) => {
    setEditingCliente(c);
    setForm({
      nome: c.nome, tipo: c.tipo, cpfCnpj: c.cpfCnpj || "", email: c.email || "",
      telefone: c.telefone || "", endereco: c.endereco || "", cidade: c.cidade || "",
      estado: c.estado || "", cep: c.cep || "", observacoes: c.observacoes || "", status: c.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) { toast({ title: "Nome e obrigatorio", variant: "destructive" }); return; }
    if (editingCliente) updateMutation.mutate({ id: editingCliente.id, data: form });
    else createMutation.mutate(form);
  };

  const filteredClientes = clientes.filter(c => {
    const matchSearch = c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cpfCnpj?.includes(searchTerm) || c.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = tipoFilter === "todos" || c.tipo === tipoFilter;
    return matchSearch && matchTipo;
  });

  if (isLoading) return <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Carregando clientes...</p></div>;

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gerencie os clientes do escritorio</p>
        </div>
        <Button className="bg-legal-status-active hover:bg-legal-status-active/90" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />Novo Cliente
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total de Clientes", value: clientes.length, color: "text-foreground" },
          { label: "Clientes Ativos", value: clientes.filter(c => c.status === "Ativo").length, color: "text-green-600" },
          { label: "Pessoa Fisica", value: clientes.filter(c => c.tipo === "Pessoa Fisica").length, color: "text-blue-600" },
          { label: "Pessoa Juridica", value: clientes.filter(c => c.tipo === "Pessoa Juridica").length, color: "text-purple-600" },
        ].map((s, i) => (
          <Card key={i} className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-sm text-muted-foreground mb-1">{s.label}</p><p className={`text-3xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="search" placeholder="Pesquisar por nome, CPF/CNPJ, email..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Tipo de cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="Pessoa Fisica">Pessoa Fisica</SelectItem>
                <SelectItem value="Pessoa Juridica">Pessoa Juridica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.map(c => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8"><AvatarFallback className="bg-primary text-primary-foreground text-xs">{c.nome.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      <p className="font-medium">{c.nome}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {c.tipo === "Pessoa Juridica" && <Building className="w-4 h-4 text-muted-foreground" />}
                      <span className="text-sm">{c.tipo}</span>
                    </div>
                  </TableCell>
                  <TableCell><span className="font-mono text-sm">{c.cpfCnpj || "-"}</span></TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {c.email && <div className="flex items-center gap-2 text-sm"><Mail className="w-3 h-3 text-muted-foreground" /><span>{c.email}</span></div>}
                      {c.telefone && <div className="flex items-center gap-2 text-sm"><Phone className="w-3 h-3 text-muted-foreground" /><span>{c.telefone}</span></div>}
                    </div>
                  </TableCell>
                  <TableCell>{c.cidade || "-"}</TableCell>
                  <TableCell><Badge className={c.status === "Ativo" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{c.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDeletingId(c.id); setDeleteDialogOpen(true); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredClientes.length === 0 && <div className="text-center py-8"><p className="text-muted-foreground">Nenhum cliente encontrado</p></div>}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) resetForm(); setDialogOpen(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCliente ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            <DialogDescription>{editingCliente ? "Atualize os dados do cliente" : "Preencha os dados para cadastrar um novo cliente"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nome *</Label><Input placeholder="Nome completo" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required /></div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Pessoa Fisica">Pessoa Fisica</SelectItem><SelectItem value="Pessoa Juridica">Pessoa Juridica</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>CPF/CNPJ</Label><Input placeholder="000.000.000-00" value={form.cpfCnpj} onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="email@exemplo.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input placeholder="(00) 00000-0000" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Endereco</Label><Input placeholder="Rua, numero, complemento" value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Cidade</Label><Input placeholder="Cidade" value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v }))}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>{["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>CEP</Label><Input placeholder="00000-000" value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Observacoes</Label><Textarea placeholder="Observacoes sobre o cliente..." value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{(createMutation.isPending || updateMutation.isPending) ? "Salvando..." : editingCliente ? "Atualizar" : "Criar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir Cliente</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este cliente?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deletingId && deleteMutation.mutate(deletingId)}>{deleteMutation.isPending ? "Excluindo..." : "Excluir"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
