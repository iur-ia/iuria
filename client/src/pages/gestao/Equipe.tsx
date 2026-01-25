import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Mail, Phone, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Equipe } from "@shared/schema";

const coresEquipe = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function EquipePage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: equipe = [], isLoading } = useQuery<Equipe[]>({
    queryKey: ["/api/equipe"],
  });

  const filteredEquipe = equipe.filter((membro) =>
    membro.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    membro.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    membro.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleColors: Record<string, string> = {
    "Advogado Sênior": "bg-purple-100 text-purple-800",
    "Advogada": "bg-blue-100 text-blue-800",
    "Advogado": "bg-blue-100 text-blue-800",
    "Assistente": "bg-green-100 text-green-800",
    "Estagiário": "bg-yellow-100 text-yellow-800",
    "Sócio": "bg-purple-100 text-purple-800",
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-[#f5f5f5] min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando equipe...</p>
      </div>
    );
  }

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
            <p className="text-3xl font-bold text-purple-600">
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
                <Card key={membro.id} className="hover-elevate cursor-pointer" data-testid={`card-member-${membro.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12" style={{ backgroundColor: cor }}>
                          {membro.avatar ? (
                            <AvatarImage src={membro.avatar} alt={membro.nome} />
                          ) : (
                            <AvatarFallback className="text-white" style={{ backgroundColor: cor }}>
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
                          <Badge className={`mt-1 ${roleColors[membro.cargo] || "bg-gray-100 text-gray-800"}`}>
                            {membro.cargo}
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
    </div>
  );
}
