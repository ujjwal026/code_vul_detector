import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Severity = "critical" | "high" | "medium" | "low" | "info";

interface StatusPillProps {
  severity: Severity;
  className?: string;
}

const severityConfig = {
  critical: {
    label: "Critical",
    className: "bg-critical text-critical-foreground hover:bg-critical/90 glow-critical",
  },
  high: {
    label: "High",
    className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
  medium: {
    label: "Medium",
    className: "bg-warning text-warning-foreground hover:bg-warning/90",
  },
  low: {
    label: "Low",
    className: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
  },
  info: {
    label: "Info",
    className: "bg-muted text-muted-foreground hover:bg-muted/90",
  },
};

export const StatusPill = ({ severity, className }: StatusPillProps) => {
  const config = severityConfig[severity] || severityConfig.info; // Fallback to info

  return (
    <Badge
      className={cn(
        "font-semibold transition-smooth",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
};
