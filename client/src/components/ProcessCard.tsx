import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ProcessCardData {
  id: string;
  codigo_interno: string;
  numero_cnj: string;
  cliente: string;
  envolvido: {
    nome: string;
    tipo: string;
  };
  assunto: string;
  orgao: string;
  comarca: string;
  orgao_julgador?: string;
  instancia: "1ª" | "2ª" | "TS";
  status: Array<"incompleto" | "movimentado" | "parado" | "ativo">;
  marcadores: Array<{ nome: string; cor: string }>;
  responsaveis: Array<{
    iniciais: string;
    nome: string;
    cor: string;
  }>;
}

const statusColors = {
  incompleto: "bg-legal-status-incomplete text-white",
  movimentado: "bg-legal-status-moved text-white",
  parado: "bg-legal-status-stopped text-white",
  ativo: "bg-legal-status-active text-white",
};

const statusLabels = {
  incompleto: "Incompleto",
  movimentado: "Movimentado",
  parado: "Parado",
  ativo: "Ativo",
};

const instanciaColors = {
  "1ª": "bg-blue-500 text-white",
  "2ª": "bg-purple-500 text-white",
  "TS": "bg-red-500 text-white",
};

export function ProcessCard({ process }: { process: ProcessCardData }) {
  return (
    <Card className="border-l-4 border-l-primary hover-elevate cursor-pointer" data-testid={`card-process-${process.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">{process.cliente}</h3>
            <p className="text-sm text-muted-foreground">
              {process.envolvido.nome} ({process.envolvido.tipo})
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-process-menu-${process.id}`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => console.log('View process', process.id)}>Ver detalhes</DropdownMenuItem>
              <DropdownMenuItem onClick={() => console.log('Edit process', process.id)}>Editar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => console.log('Archive process', process.id)}>Arquivar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex gap-2 text-xs">
            <span className="text-muted-foreground">Interno:</span>
            <span className="font-mono font-medium">{process.codigo_interno}</span>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="text-muted-foreground">CNJ:</span>
            <span className="font-mono font-medium">{process.numero_cnj}</span>
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Assunto: </span>
            <span className="text-foreground">{process.assunto}</span>
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">{process.orgao} • {process.comarca}</span>
            {process.orgao_julgador && (
              <span className="text-muted-foreground"> • {process.orgao_julgador}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {process.status.map((status) => (
            <Badge key={status} className={`${statusColors[status]} text-xs`}>
              {statusLabels[status]}
            </Badge>
          ))}
          <Badge className={`${instanciaColors[process.instancia]} text-xs`}>
            {process.instancia} Instância
          </Badge>
        </div>

        {process.marcadores.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {process.marcadores.map((marcador, idx) => (
              <Badge key={idx} variant="outline" className="text-xs" style={{ borderColor: marcador.cor, color: marcador.cor }}>
                {marcador.nome}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 pt-2 border-t">
          {process.responsaveis.map((resp, idx) => (
            <Avatar key={idx} className="w-8 h-8" style={{ backgroundColor: resp.cor }}>
              <AvatarFallback className="text-white text-xs" style={{ backgroundColor: resp.cor }}>
                {resp.iniciais}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
