import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MetricSubItem {
  label: string;
  value: number;
  color: "red" | "yellow" | "green" | "blue" | "purple" | "gray";
}

interface MetricCardProps {
  title: string;
  total: number;
  icon: LucideIcon;
  themeColor: "purple" | "orange" | "blue" | "green" | "gray";
  subItems?: MetricSubItem[];
}

const colorClasses = {
  purple: "border-l-chart-1 bg-chart-1/5",
  orange: "border-l-chart-2 bg-chart-2/5",
  blue: "border-l-chart-3 bg-chart-3/5",
  green: "border-l-chart-4 bg-chart-4/5",
  gray: "border-l-chart-5 bg-chart-5/5",
};

const dotColors = {
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  gray: "bg-gray-400",
};

export function MetricCard({ title, total, icon: Icon, themeColor, subItems }: MetricCardProps) {
  return (
    <Card className={`border-l-4 ${colorClasses[themeColor]} hover-elevate cursor-pointer`} data-testid={`card-metric-${title.toLowerCase()}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold text-foreground">{total}</p>
          </div>
          <div className="p-2 rounded-md bg-background">
            <Icon className="w-5 h-5 text-foreground" />
          </div>
        </div>
        
        {subItems && subItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {subItems.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${dotColors[item.color]}`} />
                <span className="text-xs text-muted-foreground">
                  {item.label}: <span className="font-medium text-foreground">{item.value}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
