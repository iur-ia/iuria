import { MetricCard } from '../MetricCard'
import { CheckSquare, Bell, Activity, Calendar, Clock } from "lucide-react"

export default function MetricCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 p-6">
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
  )
}
