import { subscribe } from "@/lib/scan-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const unsubscribe = subscribe(id, (progress) => {
        try {
          const data = `data: ${JSON.stringify(progress)}\n\n`;
          controller.enqueue(encoder.encode(data));
          if (progress.phase === "done" || progress.phase === "error") {
            unsubscribe();
            controller.close();
          }
        } catch {
          // stream closed
        }
      });

      // Auto-close after 5 minutes if scan hangs
      const timeout = setTimeout(() => {
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      }, 5 * 60 * 1000);

      // Cleanup on cancel
      _request.signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
