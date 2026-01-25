import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Search, GripVertical, X, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Atividade {
  id: string;
  titulo: string;
  descricao?: string;
  processoId?: string;
  responsavelId?: string;
  tipo: string;
  status: string;
  prioridade: string;
  prazo?: string;
}

type KanbanStatus = "pendente" | "em-andamento" | "revisao" | "concluida";

const STATUS_COLUMNS: { id: KanbanStatus; titulo: string; color: string }[] = [
  { id: "pendente", titulo: "A Fazer", color: "bg-slate-600" },
  { id: "em-andamento", titulo: "Em Andamento", color: "bg-blue-600" },
  { id: "revisao", titulo: "Em Revisão", color: "bg-purple-600" },
  { id: "concluida", titulo: "Concluído", color: "bg-green-600" },
];

const PRIORIDADE_COLORS: Record<string, string> = {
  alta: "border-l-red-500",
  media: "border-l-yellow-500",
  baixa: "border-l-green-500",
};

function SortableTaskCard({ 
  atividade, 
  onEdit 
}: { 
  atividade: Atividade; 
  onEdit: (atividade: Atividade) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: atividade.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-grab active:cursor-grabbing border-l-4 ${PRIORIDADE_COLORS[atividade.prioridade] || "border-l-gray-300"}`}
      data-testid={`kanban-card-${atividade.id}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2 gap-1">
          <h4 className="font-medium text-sm flex-1">{atividade.titulo}</h4>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(atividade);
              }}
              data-testid="button-edit-task"
            >
              <Pencil className="w-3 h-3" />
            </Button>
            <div {...attributes} {...listeners}>
              <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 cursor-grab" />
            </div>
          </div>
        </div>
        {atividade.descricao && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {atividade.descricao}
          </p>
        )}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {atividade.tipo}
          </Badge>
          {atividade.prazo && (
            <span className="text-xs text-muted-foreground">
              {new Date(atividade.prazo).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TaskCard({ atividade }: { atividade: Atividade }) {
  return (
    <Card
      className={`border-l-4 ${PRIORIDADE_COLORS[atividade.prioridade] || "border-l-gray-300"}`}
    >
      <CardContent className="p-3">
        <h4 className="font-medium text-sm mb-2">{atividade.titulo}</h4>
        <Badge variant="outline" className="text-xs">
          {atividade.tipo}
        </Badge>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({
  status,
  titulo,
  tarefas,
  color,
  onEdit,
}: {
  status: string;
  titulo: string;
  tarefas: Atividade[];
  color: string;
  onEdit: (atividade: Atividade) => void;
}) {
  return (
    <div className="flex-shrink-0 w-72">
      <div className={`rounded-t-lg p-3 ${color} text-white`}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold truncate">{titulo}</h3>
          <Badge className="bg-white/20 text-white border-0 flex-shrink-0">
            {tarefas.length}
          </Badge>
        </div>
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-b-lg p-3 min-h-80 space-y-3">
        <SortableContext
          items={tarefas.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tarefas.map((tarefa) => (
            <SortableTaskCard 
              key={tarefa.id} 
              atividade={tarefa} 
              onEdit={onEdit}
            />
          ))}
        </SortableContext>
        {tarefas.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Arraste tarefas aqui
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanTarefas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTask, setActiveTask] = useState<Atividade | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Atividade | null>(null);
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    tipo: "tarefa",
    prioridade: "media",
    status: "pendente",
    prazo: "",
  });
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: atividades = [], isLoading } = useQuery<Atividade[]>({
    queryKey: ["/api/atividades"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/atividades", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/atividades"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Tarefa criada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar tarefa", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Atividade> }) => {
      const res = await apiRequest("PATCH", `/api/atividades/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/atividades"] });
      setDialogOpen(false);
      setEditingTask(null);
      resetForm();
      toast({ title: "Tarefa atualizada!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar tarefa", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/atividades/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/atividades"] });
      setDialogOpen(false);
      setEditingTask(null);
      resetForm();
      toast({ title: "Tarefa removida!" });
    },
  });

  const resetForm = () => {
    setFormData({
      titulo: "",
      descricao: "",
      tipo: "tarefa",
      prioridade: "media",
      status: "pendente",
      prazo: "",
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = atividades.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeTask = atividades.find((t) => t.id === activeId);
    if (!activeTask) return;

    const overTask = atividades.find((t) => t.id === overId);
    const overColumn = STATUS_COLUMNS.find((c) => c.id === overId);

    let newStatus = activeTask.status;

    if (overColumn) {
      newStatus = overColumn.id;
    } else if (overTask) {
      newStatus = overTask.status;
    }

    if (newStatus !== activeTask.status) {
      updateMutation.mutate({ id: activeId, data: { status: newStatus } });
    }
  };

  const openNewTaskDialog = () => {
    setEditingTask(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (task: Atividade) => {
    setEditingTask(task);
    setFormData({
      titulo: task.titulo,
      descricao: task.descricao || "",
      tipo: task.tipo,
      prioridade: task.prioridade,
      status: task.status,
      prazo: task.prazo ? task.prazo.split("T")[0] : "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo.trim()) {
      toast({ title: "Titulo é obrigatório", variant: "destructive" });
      return;
    }

    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredAtividades = atividades.filter((a) =>
    a.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tarefasPorStatus = STATUS_COLUMNS.reduce((acc, col) => {
    acc[col.id] = filteredAtividades.filter((t) => t.status === col.id);
    return acc;
  }, {} as Record<KanbanStatus, Atividade[]>);

  if (isLoading) {
    return (
      <div className="p-6 bg-[#f5f5f5] dark:bg-background min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] dark:bg-background min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1" data-testid="text-page-title">
            Kanban de Tarefas
          </h1>
          <p className="text-sm text-muted-foreground">
            Arraste e solte tarefas entre as colunas
          </p>
        </div>
        <Button
          onClick={openNewTaskDialog}
          className="bg-legal-status-active hover:bg-legal-status-active/90"
          data-testid="button-new-task"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      <div className="mb-4 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Pesquisar tarefas..."
            className="pl-9 bg-white dark:bg-card"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-kanban-search"
          />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              status={col.id}
              titulo={col.titulo}
              tarefas={tarefasPorStatus[col.id] || []}
              color={col.color}
              onEdit={openEditDialog}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard atividade={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-l-4 border-l-red-500" />
              <span>Alta prioridade</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-l-4 border-l-yellow-500" />
              <span>Média prioridade</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-l-4 border-l-green-500" />
              <span>Baixa prioridade</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "Editar Tarefa" : "Nova Tarefa"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Titulo</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Digite o titulo da tarefa"
                data-testid="input-task-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descricao</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva a tarefa..."
                rows={3}
                data-testid="input-task-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(val) => setFormData({ ...formData, tipo: val })}
                >
                  <SelectTrigger data-testid="select-task-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tarefa">Tarefa</SelectItem>
                    <SelectItem value="prazo">Prazo</SelectItem>
                    <SelectItem value="audiencia">Audiência</SelectItem>
                    <SelectItem value="reuniao">Reunião</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={formData.prioridade}
                  onValueChange={(val) => setFormData({ ...formData, prioridade: val })}
                >
                  <SelectTrigger data-testid="select-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger data-testid="select-task-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">A Fazer</SelectItem>
                    <SelectItem value="em-andamento">Em Andamento</SelectItem>
                    <SelectItem value="revisao">Em Revisão</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prazo">Prazo</Label>
                <Input
                  id="prazo"
                  type="date"
                  value={formData.prazo}
                  onChange={(e) => setFormData({ ...formData, prazo: e.target.value })}
                  data-testid="input-task-deadline"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              {editingTask && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(editingTask.id)}
                  disabled={deleteMutation.isPending}
                >
                  Excluir
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingTask ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
