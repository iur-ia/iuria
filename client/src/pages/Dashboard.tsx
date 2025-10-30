import { CheckSquare, Bell, Activity, Calendar, Clock } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { CalendarWidget } from "@/components/CalendarWidget";

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do escritório</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Tarefas"
          total={42}
          icon={CheckSquare}
          themeColor="purple"
          subItems={[
            { label: "Atrasadas", value: 5, color: "red" },
            { label: "Hoje", value: 12, color: "yellow" },
            { label: "Futuras", value: 25, color: "green" },
          ]}
        />
        <MetricCard
          title="Intimações"
          total={18}
          icon={Bell}
          themeColor="orange"
        />
        <MetricCard
          title="Andamentos"
          total={67}
          icon={Activity}
          themeColor="blue"
          subItems={[
            { label: "Lidos", value: 45, color: "blue" },
            { label: "Não lidos", value: 22, color: "purple" },
          ]}
        />
        <MetricCard
          title="Audiências"
          total={8}
          icon={Calendar}
          themeColor="green"
          subItems={[
            { label: "Atrasadas", value: 1, color: "red" },
            { label: "Hoje", value: 2, color: "yellow" },
            { label: "Futuras", value: 5, color: "green" },
          ]}
        />
        <MetricCard
          title="Compromissos"
          total={15}
          icon={Clock}
          themeColor="gray"
          subItems={[
            { label: "Atrasados", value: 2, color: "red" },
            { label: "Hoje", value: 4, color: "yellow" },
            { label: "Futuros", value: 9, color: "green" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <CalendarWidget />
        </div>
        
        <div className="space-y-4">
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Próximas Atividades</h3>
            <div className="space-y-3">
              {[
                { title: "Prazo recurso - Processo 001", time: "Hoje, 15:00", type: "intimation" },
                { title: "Audiência - Silva vs Santos", time: "Amanhã, 10:30", type: "hearing" },
                { title: "Revisar petição inicial", time: "02/11, 14:00", type: "task" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 rounded hover-elevate cursor-pointer">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    item.type === 'intimation' ? 'bg-chart-2' : 
                    item.type === 'hearing' ? 'bg-chart-4' : 'bg-chart-1'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
