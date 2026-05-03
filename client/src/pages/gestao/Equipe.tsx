import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Mail, Phone, Briefcase, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertEquipeSchema } from "@shared/schema";
import type { Equipe } from "@shared/schema";
import { z } from "zod";

const formSchema = insertEquipeSchema.extend({
  nome: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  cargo: z.string().min(1, "Cargo obrigatório"),
  status: z.string().min(1, "Status obrigatório"),
});
type FormValues = z.infer<typeof formSchema>;

const CARGOS = ["Sócio", "Advogado Sênior", "Advogado", "Advogada", "Assistente", "Estagiário"];
const STATUS = ["Ativo", "Inativo"];
const coresEquipe = ["hsl(var(--chart-1))", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function EquipePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Equipe | null>(null);
  const { toast } = useToast();

  const { data: equipe = [], isLoading } = useQuery<Equipe[]>({ queryKey: ["/api/equipe"] });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { nome: "", email: "", telefone: "", cargo: "Advogado", oab: "", especialidade: "", status: "Ativo", avatar: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => (await apiRequest("POST", "/api/equipe", data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipe"] });
      toast({ title: "Membro adicionado!" }); setDialogOpen(false); form.reset();
    },
    onError: () => toast({ title: "Erro ao adicionar membro", variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormValues> }) =>
      (await apiRequest("PATCH", `/api/equipe/${id}`, data)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipe"] });
      toast({ title: "Membro atualizado!" }); setDialogOpen(false); setEditing(null); form.reset();
    },
    onError: () => toast({ title: "Erro ao atualizar membro", variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/equipe/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipe"] });
      toast({ title: "Membro removido" });
    },
    onError: () => toast({ title: "Erro ao remover membro", variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ nome: "", email: "", telefone: "", cargo: "Advogado", oab: "", especialidade: "", status: "Ativo", avatar: "" });
    setDialogOpen(true);
  };
  const openEdit = (m: Equipe) => {
    setEditing(m);
    form.reset({
      nome: m.nome, email: m.email,
      telefone: m.telefone || "", cargo: m.cargo, oab: m.oab || "",
      especialidade: m.especialidade || "", status: m.status, avatar: m.avatar || "",
    });
    setDialogOpen(true);
  };
  const handleDelete = (m: Equipe) => {
    if (window.confirm(`Remover "${m.nome}" da equipe?`)) deleteMutation.mutate(m.id);
  };
  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      telefone: values.telefone || null,
      oab: values.oab || null,
      especialidade: values.especialidade || null,
      avatar: values.avatar || null,
    };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  const filteredEquipe = equipe.filter((m) =>
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleColors: Record<string, string> = {
    "Advogado Sênior": "bg-primary/15 text-primary",
    "Advogada": "bg-blue-500/15 text-blue-400 dark:bg-blue-500/15 dark:text-blue-300",
    "Advogado": "bg-blue-500/15 text-blue-400 dark:bg-blue-500/15 dark:text-blue-300",
    "Assistente": "bg-emerald-500/15 text-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-300",
    "Estagiário": "bg-amber-500/15 text-amber-400 dark:bg-amber-500/15 dark:text-amber-300",
    "Sócio": "bg-primary/15 text-primary",
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando equipe...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Equipe</h1>
          <p className="text-sm text-muted-foreground">Gerencie os membros da equipe do escritório</p>
        </div>
        <Button onClick={openCreate} data-testid="button-new-member">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Membro
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total de Membros</p>
            <p className="text-3xl font-bold text-foreground">{equipe.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Advogados</p>
            <p className="text-3xl font-bold text-blue-600">
              {equipe.filter((m) => m.cargo.toLowerCase().includes("advogad")).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Com OAB</p>
            <p className="text-3xl font-bold text-primary">
              {equipe.filter((m) => m.oab).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Ativos</p>
            <p className="text-3xl font-bold text-green-600">
              {equipe.filter((m) => m.status === "Ativo").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Pesquisar por nome, email ou função..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-team-search"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEquipe.map((membro, index) => {
              const cor = coresEquipe[index % coresEquipe.length];
              return (
                <Card key={membro.id} className="hover-elevate" data-testid={`card-member-${membro.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="w-12 h-12" style={{ backgroundColor: cor }}>
                          {membro.avatar ? (
                            <AvatarImage src={membro.avatar} alt={membro.nome} />
                          ) : (
                            <AvatarFallback className="text-white" style={{ backgroundColor: cor }}>
                              {membro.nome.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{membro.nome}</CardTitle>
                          <Badge className={`mt-1 ${roleColors[membro.cargo] || "bg-muted text-foreground"}`}>
                            {membro.cargo}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(membro)} data-testid={`button-edit-member-${membro.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(membro)} data-testid={`button-delete-member-${membro.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {membro.oab && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono">{membro.oab}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{membro.email}</span>
                    </div>
                    {membro.telefone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{membro.telefone}</span>
                      </div>
                    )}
                    {membro.especialidade && (
                      <div className="pt-3 border-t">
                        <p className="text-xs text-muted-foreground">Especialidade</p>
                        <p className="text-sm font-medium">{membro.especialidade}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredEquipe.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum membro encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar membro" : "Adicionar membro"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl><Input {...field} data-testid="input-member-nome" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail *</FormLabel>
                    <FormControl><Input type="email" {...field} data-testid="input-member-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="telefone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl><Input {...field} value={field.value || ""} data-testid="input-member-telefone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="cargo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger data-testid="select-member-cargo"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{CARGOS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="oab" render={({ field }) => (
                  <FormItem>
                    <FormLabel>OAB</FormLabel>
                    <FormControl><Input placeholder="OAB/SP 123456" {...field} value={field.value || ""} data-testid="input-member-oab" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="especialidade" render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialidade</FormLabel>
                  <FormControl><Input {...field} value={field.value || ""} data-testid="input-member-especialidade" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger data-testid="select-member-status"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-member">Cancelar</Button>
                <Button type="submit" disabled={isPending} data-testid="button-save-member">
                  {isPending ? "Salvando..." : editing ? "Atualizar" : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
