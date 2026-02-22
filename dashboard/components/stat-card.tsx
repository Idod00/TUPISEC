import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  count: number;
  colorClass: string;
}

export function StatCard({ label, count, colorClass }: StatCardProps) {
  return (
    <Card className="border-border/50">
      <CardContent className="flex flex-col items-center gap-1 p-4">
        <span className={cn("text-3xl font-bold font-mono", colorClass)}>{count}</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      </CardContent>
    </Card>
  );
}
