import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScanCardProps {
  severity: "critical" | "high" | "medium" | "low";
  count: number;
  title: string;
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    className: "border-critical/50 bg-critical/5 glow-critical",
    iconClassName: "text-critical",
  },
  high: {
    icon: AlertCircle,
    className: "border-destructive/50 bg-destructive/5",
    iconClassName: "text-destructive",
  },
  medium: {
    icon: AlertTriangle,
    className: "border-warning/50 bg-warning/5",
    iconClassName: "text-warning",
  },
  low: {
    icon: Info,
    className: "border-secondary/50 bg-secondary/5",
    iconClassName: "text-secondary",
  },
};

export const ScanCard = ({ severity, count, title }: ScanCardProps) => {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Card className={cn("border-2 card-elevated transition-smooth hover:scale-105", config.className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-4xl font-bold mt-2">{count}</p>
          </div>
          <Icon className={cn("h-12 w-12", config.iconClassName)} />
        </div>
      </CardContent>
    </Card>
  );
};
