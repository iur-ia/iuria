import { CheckSquare, Bell, Activity, Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const metrics = [
    {
      title: "Tarefas",
      total: 30,
      icon: CheckSquare,
      color: "bg-[#8b5cf6]",
      subItems: [
        { label: "Atrasadas", value: 8, color: "text-red-500" },
        { label: "Hoje", value: 10, color: "text-yellow-500" },
        { label: "Futuras", value: 12, color: "text-green-500" },
      ],
    },
    {
      title: "Intimações",
      total: 5,
      icon: Bell,
      color: "bg-[#f97316]",
      subItems: [{ label: "pendentes", value: 5, color: "text-muted-foreground" }],
    },
    {
      title: "Andamentos",
      total: 2,
      icon: Activity,
      color: "bg-[#3b82f6]",
      subItems: [
        { label: "Não lidos", value: 2, color: "text-muted-foreground" },
        { label: "Lidos", value: 0, color: "text-muted-foreground" },
      ],
    },
    {
      title: "Audiências",
      total: 0,
      icon: Calendar,
      color: "bg-[#10b981]",
      subItems: [
        { label: "Atrasadas", value: 0, color: "text-red-500" },
        { label: "Hoje", value: 0, color: "text-yellow-500" },
        { label: "Futuras", value: 0, color: "text-green-500" },
      ],
    },
    {
      title: "Compromissos",
      total: 0,
      icon: Clock,
      color: "bg-gray-400",
      subItems: [
        { label: "Atrasados", value: 0, color: "text-red-500" },
        { label: "Hoje", value: 0, color: "text-yellow-500" },
        { label: "Futuros", value: 0, color: "text-green-500" },
      ],
    },
  ];

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  
  const currentDate = new Date(2025, 9, 1);
  const daysOfWeek = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const events: Record<number, Array<{ title: string; color: string }>> = {
    1: [
      { title: "Preencher o sistema precp...", color: "bg-[#f59e0b]" },
      { title: "Agendar reunião Fernanda", color: "bg-[#f59e0b]" },
    ],
    8: [{ title: "Fazer TAG uniformes", color: "bg-[#f59e0b]" }],
    13: [{ title: "Contestação (art. 335 do C...", color: "bg-[#f59e0b]" }],
    12: [{ title: "Nossa Senhora Aparecida", color: "bg-gray-500" }],
    20: [{ title: "Inicial", color: "bg-[#f59e0b]" }],
    21: [
      { title: "PETIÇÃO MANIFESTAÇÃO...", color: "bg-[#f59e0b]" },
      { title: "PETIÇÃO MANIFESTAÇÃO...", color: "bg-[#f59e0b]" },
    ],
    23: [{ title: "MANIFESTAÇÃO SOBRE O...", color: "bg-[#f59e0b]" }],
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Painel de Controle</h1>
          <Badge variant="secondary" className="px-3 py-1">Beta</Badge>
        </div>

        <div className="grid grid-cols-5 gap-4">
          {metrics.map((metric, idx) => (
            <Card key={idx} className="hover-elevate cursor-pointer border-0 shadow-sm" data-testid={`card-${metric.title.toLowerCase()}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{metric.title}</span>
                  <div className={`p-2 rounded ${metric.color}`}>
                    <metric.icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className={`text-4xl font-bold mb-2 ${metric.color.replace('bg-', 'text-').replace('[', '[').replace(']', ']')}`}>
                  {metric.total}
                </div>
                <div className="space-y-1">
                  {metric.subItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={`font-medium ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Agenda</h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Hoje</Badge>
                <Badge variant="outline">Situação</Badge>
                <Badge variant="outline">Filtros</Badge>
                <div className="h-6 w-px bg-border mx-2" />
                <Badge variant="secondary">Mês</Badge>
                <Badge variant="outline">Semana</Badge>
                <Badge variant="outline">Dia</Badge>
              </div>
            </div>

            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold">{monthNames[currentDate.getMonth()]} de {currentDate.getFullYear()}</h3>
            </div>

            <div className="grid grid-cols-7 border-t border-l">
              {daysOfWeek.map((day, idx) => (
                <div
                  key={idx}
                  className="border-r border-b bg-muted p-2 text-center text-sm font-medium capitalize"
                >
                  {day}
                </div>
              ))}

              {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="border-r border-b bg-muted/30 min-h-24" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const dayEvents = events[day] || [];

                return (
                  <div
                    key={day}
                    className="border-r border-b min-h-24 p-2 hover-elevate cursor-pointer bg-white"
                    data-testid={`calendar-day-${day}`}
                  >
                    <div className="text-sm font-medium mb-1">{day}</div>
                    <div className="space-y-1">
                      {dayEvents.map((event, i) => (
                        <div
                          key={i}
                          className={`text-xs px-2 py-1 rounded ${event.color} text-white truncate`}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
