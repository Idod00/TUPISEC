import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50 py-6 text-center text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4">
        <Shield className="h-4 w-4 text-primary" />
        <span>TupiSec Scanner &mdash; Web Security Analysis Framework</span>
      </div>
    </footer>
  );
}
