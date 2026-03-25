import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Search, Loader2, Pencil, Trash2, Settings, X, GripVertical } from "lucide-react";
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

interface KanbanColumn {
  id: string;
  titulo: string;
  color: string;
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: "pendente", titulo: "A Fazer", color: "bg-slate-600" },
  { id: "em-andamento", titulo: "Em Andamento", color: "bg-blue-600" },
  { id: "revisao", titulo: "Em Revisão", color: "bg-purple-600" },
  { id: "concluida", titulo: "Concluído", color: "bg-green-600" },
];

const COLUMN_COLOR_OPTIONS = [
  { value: "bg-slate-600", label: "Cinza" },
  { value: "bg-blue-600", label: "Azul" },
  { value: "bg-purple-600", label: "Roxo" },
  { value: "bg-green-600", label: "Verde" },
  { value: "bg-red-600", label: "Vermelho" },
  { value: "bg-orange-600", label: "Laranja" },
  { value: "bg-yellow-600", label: "Amarelo" },
  { value: "bg-teal-600", label: "Teal" },
  { value: "bg-pink-600", label: "Rosa" },
  { value: "bg-indigo-600", label: "Indigo" },
];

const PRIORIDADE_COLORS: Record<string, string> = {
  alta: "border-l-red-500",
  media: "border-l-yellow-500",
  baixa: "border-l-green-500",
};

// ─── Draggable Task Card ───────────────────────────────────────────
function DraggableTaskCard({
  atividade,
  onEdit,
}: {
  atividade: Atividade;
  onEdit: (atividade: Atividade) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: atividade.id,
    data: { type: "task", status: atividade.status },
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing border-l-4 transition-shadow hover:shadow-md select-none touch-none ${PRIORIDADE_COLORS[atividade.prioridade] || "border-l-gray-300"} ${isDragging ? "shadow-lg ring-2 ring-primary/30" : ""}`}
      data-testid={`kanban-card-${atividade.id}`}
      onClick={(e) => {
        // Only open edit if we didn't drag (distance < threshold)
        if (!isDragging) {
          onEdit(atividade);
        }
      }}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2 gap-1">
          <h4 className="font-medium text-sm flex-1 pointer-events-none">{atividade.titulo}</h4>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(atividade);
            }}
            data-testid="button-edit-task"
          >
            <Pencil className="w-3 h-3" />
          </Button>
        </div>
        {atividade.descricao && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2 pointer-events-none">
            {atividade.descricao}
          </p>
        )}
        <div className="flex items-center justify-between pointer-events-none">
          <Badge variant="outline" className="text-xs">
            {atividade.tipo}
          </Badge>
          {atividade.prazo && (
            <span className="text-xs text-muted-foreground">
              {new Date(atividade.prazo + "T00:00:00").toLocaleDateString("pt-BR", {
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

// ─── Drag Overlay Card (visual only) ──────────────────────────────
function OverlayCard({ atividade }: { atividade: Atividade }) {
  return (
    <Card className={`border-l-4 shadow-xl w-72 rotate-2 ${PRIORIDADE_COLORS[atividade.prioridade] || "border-l-gray-300"}`}>
      <CardContent className="p-3">
        <h4 className="font-medium text-sm mb-2">{atividade.titulo}</h4>
        {atividade.descricao && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{atividade.descricao}</p>
        )}
        <Badge variant="outline" className="text-xs">{atividade.tipo}</Badge>
      </CardContent>
    </Card>
  );
}

// ─── Droppable Column ─────────────────────────────────────────────
function DroppableColumn({
  column,
  tarefas,
  onEdit,
  onEditColumn,
  isOver,
}: {
  column: KanbanColumn;
  tarefas: Atividade[];
  onEdit: (atividade: Atividade) => void;
  onEditColumn: (column: KanbanColumn) => void;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: `column-${column.id}`,
    data: { type: "column", columnId: column.id },
  });

  return (
    <div className="flex-shrink-0 w-72">
      <div className={`rounded-t-lg p-3 ${column.color} text-white`}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold truncate">{column.titulo}</h3>
          <div className="flex items-center gap-1">
            <Badge className="bg-white/20 text-white border-0 flex-shrink-0">
              {tarefas.length}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/20"
              onClick={() => onEditColumn(column)}
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`rounded-b-lg p-3 min-h-80 space-y-3 transition-colors duration-200 ${
          isOver
            ? "bg-primary/10 ring-2 ring-primary/40 ring-inset"
            : "bg-gray-100 dark:bg-gray-800"
        }`}
      >
        {tarefas.map((tarefa) => (
          <div key={tarefa.id} className="group">
            <DraggableTaskCard atividade={tarefa} onEdit={onEdit} />
          </div>
        ))}
        {tarefas.length === 0 && (
          <div className={`text-center py-8 text-sm border-2 border-dashed rounded-lg ${
            isOver ? "border-primary/40 text-primary" : "border-transparent text-muted-foreground"
          }`}>
            {isOver ? "Solte aqui" : "Arraste tarefas aqui"}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Kanban Component ────────────────────────────────────────
export default function KanbanTarefas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTask, setActiveTask] = useState<Atividade | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
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

  // Column management state
  const [columns, setColumns] = useState<KanbanColumn[]>(() => {
    try {
      const saved = localStorage.getItem("kanban-columns");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_COLUMNS;
  });
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [columnForm, setColumnForm] = useState({ titulo: "", color: "bg-blue-600" });

  const { toast } = useToast();

  const saveColumns = useCallback((newColumns: KanbanColumn[]) => {
    setColumns(newColumns);
    localStorage.setItem("kanban-columns", JSON.stringify(newColumns));
  }, []);

  // Pointer sensor with small distance to distinguish click from drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
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

  // ── Drag handlers ──
  const handleDragStart = (event: DragStartEvent) => {
    const task = atividades.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverColumnId(null);
      return;
    }
    // Determine which column we're over
    const overData = over.data?.current;
    if (overData?.type === "column") {
      setOverColumnId(overData.columnId);
    } else {
      // Over a task — find which column it belongs to
      const overTask = atividades.find((t) => t.id === over.id);
      setOverColumnId(overTask?.status || null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setOverColumnId(null);

    if (!over) return;

    const activeId = active.id as string;
    const draggedTask = atividades.find((t) => t.id === activeId);
    if (!draggedTask) return;

    // Determine target column
    let targetColumnId: string | null = null;
    const overData = over.data?.current;

    if (overData?.type === "column") {
      targetColumnId = overData.columnId;
    } else {
      // Dropped on a task — take that task's status as target column
      const overTask = atividades.find((t) => t.id === over.id);
      if (overTask) {
        targetColumnId = overTask.status;
      }
    }

    if (targetColumnId && targetColumnId !== draggedTask.status) {
      updateMutation.mutate({
        id: activeId,
        data: { status: targetColumnId },
      });
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setOverColumnId(null);
  };

  // ── Task dialog handlers ──
  const openNewTaskDialog = (status?: string) => {
    setEditingTask(null);
    setFormData({
      titulo: "",
      descricao: "",
      tipo: "tarefa",
      prioridade: "media",
      status: status || columns[0]?.id || "pendente",
      prazo: "",
    });
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

  // ── Column management ──
  const openNewColumnDialog = () => {
    setEditingColumn(null);
    setColumnForm({ titulo: "", color: "bg-blue-600" });
    setColumnDialogOpen(true);
  };

  const openEditColumnDialog = (column: KanbanColumn) => {
    setEditingColumn(column);
    setColumnForm({ titulo: column.titulo, color: column.color });
    setColumnDialogOpen(true);
  };

  const handleColumnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!columnForm.titulo.trim()) {
      toast({ title: "Nome da fase é obrigatório", variant: "destructive" });
      return;
    }

    if (editingColumn) {
      // Update existing column
      const updated = columns.map((c) =>
        c.id === editingColumn.id ? { ...c, titulo: columnForm.titulo, color: columnForm.color } : c
      );
      saveColumns(updated);
      toast({ title: "Fase atualizada!" });
    } else {
      // Create new column
      const newId = columnForm.titulo
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      if (columns.find((c) => c.id === newId)) {
        toast({ title: "Já existe uma fase com esse identificador", variant: "destructive" });
        return;
      }

      const newColumn: KanbanColumn = {
        id: newId,
        titulo: columnForm.titulo,
        color: columnForm.color,
      };
      saveColumns([...columns, newColumn]);
      toast({ title: "Nova fase criada!" });
    }
    setColumnDialogOpen(false);
  };

  const handleDeleteColumn = (column: KanbanColumn) => {
    const tasksInColumn = atividades.filter((a) => a.status === column.id);
    if (tasksInColumn.length > 0) {
      toast({
        title: "Não é possível excluir",
        description: `Mova as ${tasksInColumn.length} tarefa(s) para outra fase antes de excluir.`,
        variant: "destructive",
      });
      return;
    }
    if (columns.length <= 1) {
      toast({ title: "Precisa ter ao menos uma fase", variant: "destructive" });
      return;
    }
    saveColumns(columns.filter((c) => c.id !== column.id));
    setColumnDialogOpen(false);
    toast({ title: "Fase excluída!" });
  };

  const moveColumnLeft = (index: number) => {
    if (index <= 0) return;
    const newCols = [...columns];
    [newCols[index - 1], newCols[index]] = [newCols[index], newCols[index - 1]];
    saveColumns(newCols);
  };

  const moveColumnRight = (index: number) => {
    if (index >= columns.length - 1) return;
    const newCols = [...columns];
    [newCols[index], newCols[index + 1]] = [newCols[index + 1], newCols[index]];
    saveColumns(newCols);
  };

  // ── Filter tasks ──
  const filteredAtividades = atividades.filter((a) =>
    a.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tarefasPorStatus = columns.reduce((acc, col) => {
    acc[col.id] = filteredAtividades.filter((t) => t.status === col.id);
    return acc;
  }, {} as Record<string, Atividade[]>);

  // Tasks without a matching column
  const orphanTasks = filteredAtividades.filter(
    (t) => !columns.find((c) => c.id === t.status)
  );

  if (isLoading) {
    return (
      <div className="p-6 bg-[#f5f5f5] dark:bg-background min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] dark:bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1" data-testid="text-page-title">
            Kanban de Tarefas
          </h1>
          <p className="text-sm text-muted-foreground">
            Arraste e solte tarefas entre as colunas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={openNewColumnDialog}
            data-testid="button-new-phase"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Fase
          </Button>
          <Button
            onClick={() => openNewTaskDialog()}
            className="bg-legal-status-active hover:bg-legal-status-active/90"
            data-testid="button-new-task"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Search */}
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

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <DroppableColumn
              key={col.id}
              column={col}
              tarefas={tarefasPorStatus[col.id] || []}
              onEdit={openEditDialog}
              onEditColumn={openEditColumnDialog}
              isOver={overColumnId === col.id}
            />
          ))}

          {/* Add column button inline */}
          <div className="flex-shrink-0 w-72">
            <button
              onClick={openNewColumnDialog}
              className="w-full h-full min-h-80 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="w-8 h-8" />
              <span className="text-sm font-medium">Adicionar Fase</span>
            </button>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? <OverlayCard atividade={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Orphan tasks warning */}
      {orphanTasks.length > 0 && (
        <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-2">
              {orphanTasks.length} tarefa(s) em fases removidas:
            </p>
            <div className="space-y-1">
              {orphanTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span>{t.titulo} <span className="text-muted-foreground">(fase: {t.status})</span></span>
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(t)}>
                    Editar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Priority legend */}
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

      {/* ── Task Dialog ── */}
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
                <Label>Fase</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger data-testid="select-task-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.titulo}
                      </SelectItem>
                    ))}
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

      {/* ── Column/Phase Dialog ── */}
      <Dialog open={columnDialogOpen} onOpenChange={setColumnDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingColumn ? "Editar Fase" : "Nova Fase"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleColumnSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="colTitulo">Nome da Fase</Label>
              <Input
                id="colTitulo"
                value={columnForm.titulo}
                onChange={(e) => setColumnForm({ ...columnForm, titulo: e.target.value })}
                placeholder="Ex: Aguardando Perícia"
                data-testid="input-phase-name"
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="grid grid-cols-5 gap-2">
                {COLUMN_COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`h-8 rounded-md ${opt.value} transition-all ${
                      columnForm.color === opt.value
                        ? "ring-2 ring-offset-2 ring-primary scale-110"
                        : "opacity-70 hover:opacity-100"
                    }`}
                    title={opt.label}
                    onClick={() => setColumnForm({ ...columnForm, color: opt.value })}
                  />
                ))}
              </div>
            </div>

            {editingColumn && (
              <div className="space-y-2">
                <Label>Posição</Label>
                <div className="flex gap-2">
                  {(() => {
                    const idx = columns.findIndex((c) => c.id === editingColumn.id);
                    return (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={idx <= 0}
                          onClick={() => { moveColumnLeft(idx); setColumnDialogOpen(false); }}
                        >
                          ← Mover Esquerda
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={idx >= columns.length - 1}
                          onClick={() => { moveColumnRight(idx); setColumnDialogOpen(false); }}
                        >
                          Mover Direita →
                        </Button>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              {editingColumn && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDeleteColumn(editingColumn)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Fase
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setColumnDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingColumn ? "Salvar" : "Criar Fase"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
