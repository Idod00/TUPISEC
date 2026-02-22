import type { ScanProgress } from "./types";

type Listener = (progress: ScanProgress) => void;

interface ScanEntry {
  listeners: Set<Listener>;
  lastProgress: ScanProgress | null;
}

const scans = new Map<string, ScanEntry>();

function ensure(scanId: string): ScanEntry {
  if (!scans.has(scanId)) {
    scans.set(scanId, { listeners: new Set(), lastProgress: null });
  }
  return scans.get(scanId)!;
}

export function emitProgress(scanId: string, progress: ScanProgress): void {
  const entry = ensure(scanId);
  entry.lastProgress = progress;
  for (const listener of entry.listeners) {
    listener(progress);
  }
}

export function subscribe(scanId: string, listener: Listener): () => void {
  const entry = ensure(scanId);
  entry.listeners.add(listener);
  // Send last known progress immediately
  if (entry.lastProgress) {
    listener(entry.lastProgress);
  }
  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size === 0) {
      scans.delete(scanId);
    }
  };
}
