import { useState, useMemo } from "react";
import {
  Clock,
  Plus,
  Filter,
  DollarSign,
  Briefcase,
  ClipboardList,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// --- Seed Data ---

const CATEGORIAS = [
  "Consultoria",
  "Reuniao",
  "Audiencia",
  "Pesquisa",
  "Redacao",
  "Administrativo",
];

const ADVOGADOS_SEED = [
  { id: "1", nome: "Dr. Thiago Morani" },
  { id: "2", nome: "Dra. Carolina Silva" },
  { id: "3", nome: "Dr. Rafael Santos" },
];

const CLIENTES_SEED = [
  { id: "1", nome: "Empresa Alpha Ltda." },
  { id: "2", nome: "Joao da Silva Santos" },
  { id: "3", nome: "Construtora Beta S.A." },
  { id: "4", nome: "Maria Oliveira" },
];

interface TimesheetEntry {
  id: string;
  data: string;
  advogado: string;
  cliente: string;
  processo: string;
  descricao: string;
  horasMinutos: string;
  categoria: string;
  valorHora: number;
}

const SEED_ENTRIES: TimesheetEntry[] = [
  {
    id: "1",
    data: "2026-04-03",
    advogado: "Dr. Thiago Morani",
    cliente: "Empresa Alpha Ltda.",
    processo: "0001234-56.2025.8.19.0001",
    descricao: "Analise de contrato de prestacao de servicos e elaboracao de parecer",
    horasMinutos: "03:30",
    categoria: "Consultoria",
    valorHora: 450,
  },
  {
    id: "2",
    data: "2026-04-03",
    advogado: "Dra. Carolina Silva",
    cliente: "Joao da Silva Santos",
    processo: "0005678-90.2025.8.19.0042",
    descricao: "Audiencia de conciliacao no JEC - 3a Vara",
    horasMinutos: "02:00",
    categoria: "Audiencia",
    valorHora: 400,
  },
  {
    id: "3",
    data: "2026-04-02",
    advogado: "Dr. Thiago Morani",
    cliente: "Construtora Beta S.A.",
    processo: "0009876-12.2024.8.19.0001",
    descricao: "Pesquisa jurisprudencial sobre responsabilidade civil em obras",
    horasMinutos: "04:00",
    categoria: "Pesquisa",
    valorHora: 450,
  },
  {
    id: "4",
    data: "2026-04-02",
    advogado: "Dr. Rafael Santos",
    cliente: "Maria Oliveira",
    processo: "0003210-45.2025.8.19.0015",
    descricao: "Redacao de peticao inicial - acao de alimentos",
    horasMinutos: "05:15",
    categoria: "Redacao",
    valorHora: 350,
  },
  {
    id: "5",
    data: "2026-04-01",
    advogado: "Dr. Thiago Morani",
    cliente: "Empresa Alpha Ltda.",
    processo: "0001234-56.2025.8.19.0001",
    descricao: "Reuniao com cliente para alinhamento estrategico",
    horasMinutos: "01:30",
    categoria: "Reuniao",
    valorHora: 450,
  },
  {
    id: "6",
    data: "2026-04-01",
    advogado: "Dra. Carolina Silva",
    cliente: "",
    processo: "",
    descricao: "Organizacao de pautas e gestao de agenda da semana",
    horasMinutos: "01:00",
    categoria: "Administrativo",
    valorHora: 0,
  },
  {
    id: "7",
    data: "2026-03-31",
    advogado: "Dr. Rafael Santos",
    cliente: "Construtora Beta S.A.",
    processo: "0009876-12.2024.8.19.0001",
    descricao: "Elaboracao de recurso de apelacao",
    horasMinutos: "06:00",
    categoria: "Redacao",
    valorHora: 350,
  },
  {
    id: "8",
    data: "2026-03-31",
    advogado: "Dr. Thiago Morani",
    cliente: "Maria Oliveira",
    processo: "0003210-45.2025.8.19.0015",
    descricao: "Consultoria sobre direito de familia e estrategia processual",
    horasMinutos: "02:00",
    categoria: "Consultoria",
    valorHora: 450,
  },
];

function parseHM(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h || 0) + (m || 0) / 60;
}

function formatCurrency(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function categoriaCor(cat: string): string {
  const map: Record<string, string> = {
    Consultoria: "bg-blue-100 text-blue-800",
    Reuniao: "bg-purple-100 text-purple-800",
    Audiencia: "bg-amber-100 text-amber-800",
    Pesquisa: "bg-cyan-100 text-cyan-800",
    Redacao: "bg-green-100 text-green-800",
    Administrativo: "bg-gray-100 text-gray-700",
  };
  return map[cat] || "bg-gray-100 text-gray-700";
}

export default function Timesheet() {
  const [entries, setEntries] = useState<TimesheetEntry[]>(SEED_ENTRIES);
  const [filtroAdvogado, setFiltroAdvogado] = useState("todos");
  const [filtroCliente, setFiltroCliente] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    data: new Date().toISOString().slice(0, 10),
    advogado: "",
    cliente: "",
    processo: "",
    descricao: "",
    horasMinutos: "",
    categoria: "",
    valorHora: "",
  });

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filtroAdvogado !== "todos" && e.advogado !== filtroAdvogado) return false;
      if (filtroCliente !== "todos" && e.cliente !== filtroCliente) return false;
      return true;
    });
  }, [entries, filtroAdvogado, filtroCliente]);

  const stats = useMemo(() => {
    let totalHoras = 0;
    let totalValor = 0;
    let horasFaturaveis = 0;
    let horasAdmin = 0;

    for (const e of filtered) {
      const h = parseHM(e.horasMinutos);
      totalHoras += h;
      totalValor += h * e.valorHora;
      if (e.categoria === "Administrativo") {
        horasAdmin += h;
      } else {
        horasFaturaveis += h;
      }
    }

    return {
      totalHoras: totalHoras.toFixed(1),
      totalValor,
      horasFaturaveis: horasFaturaveis.toFixed(1),
      horasAdmin: horasAdmin.toFixed(1),
    };
  }, [filtered]);

  const handleSubmit = () => {
    if (!formData.descricao || !formData.horasMinutos || !formData.categoria) return;

    const newEntry: TimesheetEntry = {
      id: String(Date.now()),
      data: formData.data,
      advogado: formData.advogado || "Dr. Thiago Morani",
      cliente: formData.cliente,
      processo: formData.processo,
      descricao: formData.descricao,
      horasMinutos: formData.horasMinutos,
      categoria: formData.categoria,
      valorHora: parseFloat(formData.valorHora) || 0,
    };

    setEntries([newEntry, ...entries]);
    setFormData({
      data: new Date().toISOString().slice(0, 10),
      advogado: "",
      cliente: "",
      processo: "",
      descricao: "",
      horasMinutos: "",
      categoria: "",
      valorHora: "",
    });
    setDialogOpen(false);
  };

  return (
    <div className="p-6 bg-[#f5f5f5] min-h-screen space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Clock className="w-7 h-7 text-indigo-600" />
            <h1 className="text-2xl font-semibold">Timesheet</h1>
          </div>
          <p className="text-muted-foreground">
            Registro de horas trabalhadas por advogado, cliente e processo.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Registro de Horas</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tempo (HH:MM)</Label>
                  <Input
                    placeholder="03:30"
                    value={formData.horasMinutos}
                    onChange={(e) => setFormData({ ...formData, horasMinutos: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Advogado</Label>
                <Select
                  value={formData.advogado}
                  onValueChange={(v) => setFormData({ ...formData, advogado: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ADVOGADOS_SEED.map((a) => (
                      <SelectItem key={a.id} value={a.nome}>{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select
                    value={formData.cliente}
                    onValueChange={(v) => setFormData({ ...formData, cliente: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENTES_SEED.map((c) => (
                        <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(v) => setFormData({ ...formData, categoria: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Processo (opcional)</Label>
                <Input
                  placeholder="0001234-56.2025.8.19.0001"
                  value={formData.processo}
                  onChange={(e) => setFormData({ ...formData, processo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Descricao</Label>
                <Textarea
                  placeholder="Descreva a atividade realizada..."
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor/Hora (R$)</Label>
                <Input
                  type="number"
                  placeholder="450.00"
                  value={formData.valorHora}
                  onChange={(e) => setFormData({ ...formData, valorHora: e.target.value })}
                />
              </div>
              <Button onClick={handleSubmit} className="w-full bg-indigo-600 hover:bg-indigo-700">
                Salvar Registro
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Clock className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Horas</p>
                <p className="text-2xl font-bold">{stats.totalHoras}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalValor)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas Faturaveis</p>
                <p className="text-2xl font-bold">{stats.horasFaturaveis}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <ClipboardList className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas Admin</p>
                <p className="text-2xl font-bold">{stats.horasAdmin}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtrar:</span>
        </div>
        <Select value={filtroAdvogado} onValueChange={setFiltroAdvogado}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Advogado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Advogados</SelectItem>
            {ADVOGADOS_SEED.map((a) => (
              <SelectItem key={a.id} value={a.nome}>{a.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroCliente} onValueChange={setFiltroCliente}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Clientes</SelectItem>
            {CLIENTES_SEED.map((c) => (
              <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(filtroAdvogado !== "todos" || filtroCliente !== "todos") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFiltroAdvogado("todos"); setFiltroCliente("todos"); }}
          >
            <X className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Advogado</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Atividade</TableHead>
                <TableHead className="text-center">Tempo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => {
                const horas = parseHM(entry.horasMinutos);
                const valor = horas * entry.valorHora;
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {new Date(entry.data + "T12:00:00").toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{entry.advogado}</TableCell>
                    <TableCell>{entry.cliente || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.processo || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate" title={entry.descricao}>
                      {entry.descricao}
                    </TableCell>
                    <TableCell className="text-center font-mono font-medium">
                      {entry.horasMinutos}
                    </TableCell>
                    <TableCell>
                      <Badge className={categoriaCor(entry.categoria)}>{entry.categoria}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {entry.valorHora > 0 ? formatCurrency(valor) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
