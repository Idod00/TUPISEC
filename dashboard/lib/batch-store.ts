interface BatchProgress {
  completedUrls: number;
  failedUrls: number;
  totalUrls: number;
  currentUrl?: string;
  phase: "running" | "done" | "error";
}

type Listener = (progress: BatchProgress) => void;

interface BatchEntry {
  listeners: Set<Listener>;
  lastProgress: BatchProgress | null;
}

const batches = new Map<string, BatchEntry>();

function ensure(batchId: string): BatchEntry {
  if (!batches.has(batchId)) {
    batches.set(batchId, { listeners: new Set(), lastProgress: null });
  }
  return batches.get(batchId)!;
}

export function emitBatchProgress(batchId: string, progress: BatchProgress): void {
  const entry = ensure(batchId);
  entry.lastProgress = progress;
  for (const listener of entry.listeners) {
    listener(progress);
  }
}

export function subscribeBatch(batchId: string, listener: Listener): () => void {
  const entry = ensure(batchId);
  entry.listeners.add(listener);
  if (entry.lastProgress) {
    listener(entry.lastProgress);
  }
  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size === 0) {
      batches.delete(batchId);
    }
  };
}
