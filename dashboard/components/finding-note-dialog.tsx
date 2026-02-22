"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface FindingNoteDialogProps {
  note: string;
  onSave: (note: string) => void;
}

export function FindingNoteDialog({ note, onSave }: FindingNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(note);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setValue(note); }}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${note ? "text-primary" : "text-muted-foreground"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Finding Note</DialogTitle>
        </DialogHeader>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a note about this finding..."
          className="min-h-[100px]"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => { onSave(value); setOpen(false); }}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
