import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CalendarEvent {
  id: string;
  title: string;
  type: "task" | "intimation" | "hearing" | "appointment";
  date: Date;
  time?: string;
}

const eventColors = {
  task: "bg-chart-1 text-white",
  intimation: "bg-chart-2 text-white",
  hearing: "bg-chart-4 text-white",
  appointment: "bg-chart-5 text-white",
};

const eventTypeLabels = {
  task: "Tarefa",
  intimation: "Intimação",
  hearing: "Audiência",
  appointment: "Compromisso",
};

export function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"personal" | "office">("personal");

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const mockEvents: CalendarEvent[] = [
    { id: "1", title: "Revisar petição inicial", type: "task", date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 5), time: "10:00" },
    { id: "2", title: "Prazo recurso", type: "intimation", date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 8) },
    { id: "3", title: "Audiência de instrução", type: "hearing", date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 12), time: "14:30" },
    { id: "4", title: "Reunião com cliente", type: "appointment", date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 15), time: "09:00" },
    { id: "5", title: "Análise de contrato", type: "task", date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 18), time: "11:00" },
    { id: "6", title: "Prazo contestação", type: "intimation", date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 22) },
  ];

  const getEventsForDay = (day: number) => {
    return mockEvents.filter(event => {
      return event.date.getDate() === day &&
        event.date.getMonth() === currentDate.getMonth() &&
        event.date.getFullYear() === currentDate.getFullYear();
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg font-semibold">Calendário</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-calendar-today">
              Hoje
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={previousMonth} data-testid="button-calendar-prev">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-32 text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth} data-testid="button-calendar-next">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Tabs value={view} onValueChange={(v) => setView(v as "personal" | "office")} className="mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal" data-testid="tab-personal">Pessoal</TabsTrigger>
            <TabsTrigger value="office" data-testid="tab-office">Escritório</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {daysOfWeek.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startingDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}
          
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dayEvents = getEventsForDay(day);
            const today = isToday(day);

            return (
              <div
                key={day}
                className={`aspect-square border rounded-md p-1 hover-elevate cursor-pointer ${
                  today ? "border-primary border-2" : "border-border"
                }`}
                data-testid={`calendar-day-${day}`}
                onClick={() => console.log(`Day ${day} clicked`)}
              >
                <div className={`text-xs font-medium mb-1 ${today ? "text-primary" : "text-foreground"}`}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={`text-xs px-1 py-0.5 rounded ${eventColors[event.type]} truncate`}
                      title={`${eventTypeLabels[event.type]}: ${event.title}`}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-muted-foreground px-1">
                      +{dayEvents.length - 2} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
          <div className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${eventColors.task}`} />
            <span className="text-xs text-muted-foreground">Tarefas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${eventColors.intimation}`} />
            <span className="text-xs text-muted-foreground">Intimações</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${eventColors.hearing}`} />
            <span className="text-xs text-muted-foreground">Audiências</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${eventColors.appointment}`} />
            <span className="text-xs text-muted-foreground">Compromissos</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
