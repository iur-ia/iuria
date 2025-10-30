import { useState } from "react";
import { Plus, Search, Mail, Phone, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import avatarImage from "@assets/stock_images/professional_lawyer__9acf90aa.jpg";

interface Membro {
  id: string;
  nome: string;
  role: "Advogado(a)" | "Assistente" | "Estagiário(a)" | "Sócio(a)";
  oab?: string;
  email: string;
  telefone: string;
  processos_atribuidos: number;
  tarefas_ativas: number;
  avatar?: string;
  cor: string;
}

const mockEquipe: Membro[] = [
  {
    id: "1",
    nome: "Thiago Gomes",
    role: "Sócio(a)",
    oab: "RJ 123.456",
    email: "thiago.gomes@legalsys.com.br",
    telefone: "(21) 99999-0001",
    processos_atribuidos: 15,
    tarefas_ativas: 8,
    avatar: avatarImage,
    cor: "#8b5cf6",
  },
  {
    id: "2",
    nome: "Maria Costa",
    role: "Advogado(a)",
    oab: "RJ 234.567",
    email: "maria.costa@legalsys.com.br",
    telefone: "(21) 99999-0002",
    processos_atribuidos: 12,
    tarefas_ativas: 15,
    cor: "#ec4899",
  },
  {
    id: "3",
    nome: "Roberto Silva",
    role: "Advogado(a)",
    oab: "RJ 345.678",
    email: "roberto.silva@legalsys.com.br",
    telefone: "(21) 99999-0003",
    processos_atribuidos: 8,
    tarefas_ativas: 10,
    cor: "#3b82f6",
  },
  {
    id: "4",
    nome: "Juliana Souza",
    role: "Assistente",
    email: "juliana.souza@legalsys.com.br",
    telefone: "(21) 99999-0004",
    processos_atribuidos: 0,
    tarefas_ativas: 12,
    cor: "#10b981",
  },
  {
    id: "5",
    nome: "Lucas Mendes",
    role: "Estagiário(a)",
    email: "lucas.mendes@legalsys.com.br",
    telefone: "(21) 99999-0005",
    processos_atribuidos: 0,
    tarefas_ativas: 5,
    cor: "#f59e0b",
  },
];

export default function Equipe() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEquipe = mockEquipe.filter((membro) =>
    membro.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    membro.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    membro.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleColors = {
    "Sócio(a)": "bg-purple-100 text-purple-800",
    "Advogado(a)": "bg-blue-100 text-blue-800",
    "Assistente": "bg-green-100 text-green-800",
    "Estagiário(a)": "bg-yellow-100 text-yellow-800",
  };

  return (
    <div className="p-6 space-y-6 bg-[#f5f5f5] min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Equipe</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os membros da equipe do escritório
          </p>
        </div>
        <Button
          className="bg-legal-status-active hover:bg-legal-status-active/90"
          data-testid="button-new-member"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Membro
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total de Membros</p>
            <p className="text-3xl font-bold text-foreground">{mockEquipe.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Advogados</p>
            <p className="text-3xl font-bold text-blue-600">
              {mockEquipe.filter((m) => m.role === "Advogado(a)" || m.role === "Sócio(a)").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Processos Ativos</p>
            <p className="text-3xl font-bold text-purple-600">
              {mockEquipe.reduce((acc, m) => acc + m.processos_atribuidos, 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Tarefas Ativas</p>
            <p className="text-3xl font-bold text-orange-600">
              {mockEquipe.reduce((acc, m) => acc + m.tarefas_ativas, 0)}
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
            {filteredEquipe.map((membro) => (
              <Card key={membro.id} className="hover-elevate cursor-pointer" data-testid={`card-member-${membro.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12" style={{ backgroundColor: membro.cor }}>
                        {membro.avatar ? (
                          <AvatarImage src={membro.avatar} alt={membro.nome} />
                        ) : (
                          <AvatarFallback className="text-white" style={{ backgroundColor: membro.cor }}>
                            {membro.nome
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .substring(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{membro.nome}</CardTitle>
                        <Badge className={`mt-1 ${roleColors[membro.role]}`}>
                          {membro.role}
                        </Badge>
                      </div>
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
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{membro.telefone}</span>
                  </div>
                  <div className="pt-3 border-t flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Processos</p>
                      <p className="text-lg font-semibold">{membro.processos_atribuidos}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tarefas</p>
                      <p className="text-lg font-semibold">{membro.tarefas_ativas}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredEquipe.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum membro encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
