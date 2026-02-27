import { getAISManager } from "@/lib/ais/manager";
import type { VesselData } from "@/lib/ais/manager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const manager = getAISManager();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      function send(obj: Record<string, unknown>) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          closed = true;
        }
      }

      // 1. Envoyer le snapshot complet immediatement (bulk)
      const snapshot = manager.getSnapshot();
      send({
        type: "snapshot",
        vessels: snapshot,
        stats: {
          total: snapshot.length,
          connections: manager.connectionCount,
        },
      });

      // 2. Streamer les mises a jour en temps reel
      const unsubscribe = manager.subscribe((vessel: VesselData) => {
        send({ type: "vessel", ...vessel });
      });

      // Cleanup ref for cancel
      (controller as unknown as Record<string, () => void>).__cleanup = () => {
        closed = true;
        unsubscribe();
      };
    },
    cancel() {
      const ctrl = this as unknown as Record<string, () => void>;
      if (ctrl.__cleanup) ctrl.__cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
