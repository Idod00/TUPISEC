import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server } from "lucide-react";

interface TechStackCardProps {
  techStack: Record<string, string>;
}

export function TechStackCard({ techStack }: TechStackCardProps) {
  const entries = Object.entries(techStack);
  if (entries.length === 0) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Server className="h-4 w-4" />
          Technology Stack
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
              <span className="text-sm font-medium capitalize">
                {key.replace(/_/g, " ")}
              </span>
              <span className="font-mono text-sm text-muted-foreground truncate ml-4 max-w-[300px]">
                {value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
