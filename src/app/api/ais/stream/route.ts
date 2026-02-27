import WebSocket from "ws";

const AIS_API_KEY = "2be1c5db740b0c94f6db08696ed8cf6c1e748bec";
const WS_URL = "wss://stream.aisstream.io/v0/stream";

const BOUNDING_BOXES = [
  [
    [42.0, -5.0],
    [51.5, 8.5],
  ],
];

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let ws: WebSocket | null = null;
      let closed = false;

      function cleanup() {
        closed = true;
        if (ws) {
          try {
            ws.close();
          } catch {
            /* ignore */
          }
          ws = null;
        }
      }

      try {
        ws = new WebSocket(WS_URL);
      } catch {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "Failed to connect to AIS stream" })}\n\n`
          )
        );
        controller.close();
        return;
      }

      ws.on("open", () => {
        if (closed) return;
        ws!.send(
          JSON.stringify({
            APIKey: AIS_API_KEY,
            BoundingBoxes: BOUNDING_BOXES,
            FilterMessageTypes: ["PositionReport"],
          })
        );
        // Send a connected event
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "connected" })}\n\n`
            )
          );
        } catch {
          cleanup();
        }
      });

      ws.on("message", (data) => {
        if (closed) return;
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.MessageType === "PositionReport") {
            const pos = parsed.Message?.PositionReport;
            const meta = parsed.MetaData;
            if (pos && meta) {
              const vessel = {
                type: "vessel",
                mmsi: meta.MMSI,
                name: meta.ShipName?.trim() || "",
                lat: pos.Latitude,
                lng: pos.Longitude,
                speed: pos.Sog ?? 0,
                course: pos.Cog ?? 0,
                heading: pos.TrueHeading ?? 0,
                timestamp: meta.time_utc || new Date().toISOString(),
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(vessel)}\n\n`)
              );
            }
          }
        } catch {
          /* ignore parse errors */
        }
      });

      ws.on("error", () => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "WebSocket error" })}\n\n`
            )
          );
        } catch {
          /* ignore */
        }
        cleanup();
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });

      ws.on("close", () => {
        if (closed) return;
        cleanup();
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });

      // Cleanup when the client disconnects (stream cancelled)
      // We store cleanup reference for the cancel callback
      (controller as unknown as Record<string, () => void>).__cleanup = cleanup;
    },
    cancel() {
      // Client disconnected
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
