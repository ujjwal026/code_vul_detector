import { Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const OllamaBadge = () => {
  return (
    <Badge 
    
      variant="outline" 
      className="gap-1.5 border-primary text-primary glow-primary"
    >
      <Cpu className="h-3 w-3" />
      On-Prem Ollama
    </Badge>
  );
};
