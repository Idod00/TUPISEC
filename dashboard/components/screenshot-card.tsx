"use client";

import { useState, useEffect } from "react";
import { Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ScreenshotCardProps {
  scanId: string;
}

export function ScreenshotCard({ scanId }: ScreenshotCardProps) {
  const [exists, setExists] = useState(false);
  const src = `/api/scan/${scanId}/screenshot`;

  useEffect(() => {
    fetch(src, { method: "HEAD" })
      .then((r) => setExists(r.ok))
      .catch(() => setExists(false));
  }, [src]);

  if (!exists) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Screenshot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog>
          <DialogTrigger asChild>
            <button className="block w-full rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-colors cursor-pointer">
              <img
                src={src}
                alt="Website screenshot"
                className="w-full h-auto"
              />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <img
              src={src}
              alt="Website screenshot (full size)"
              className="w-full h-auto rounded-lg"
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
