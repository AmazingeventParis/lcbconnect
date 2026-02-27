import WebSocket from "ws";

const AIS_API_KEY = "2be1c5db740b0c94f6db08696ed8cf6c1e748bec";
const WS_URL = "wss://stream.aisstream.io/v0/stream";

// Bounding boxes ciblant uniquement les voies navigables interieures francaises
// Format: [[latMin, lngMin], [latMax, lngMax]]
const BOUNDING_BOXES = [
  // Seine: Paris → Rouen → embouchure (evite la Manche)
  [[48.3, 0.8], [49.5, 3.5]],
  // Nord / Pas-de-Calais canaux (Dunkerque, Lille, Valenciennes)
  [[49.8, 2.0], [50.8, 3.8]],
  // Rhone-Saone: Lyon → Chalon → Arles (couloir etroit, evite Mediterranee)
  [[43.7, 4.2], [46.8, 5.2]],
  // Rhin: Strasbourg / Mulhouse
  [[47.5, 7.2], [49.0, 8.2]],
  // Moselle: Metz → Thionville → frontiere
  [[48.8, 5.8], [49.5, 6.5]],
  // Oise / Aisne (Compiegne, Creil)
  [[49.0, 2.4], [49.7, 3.8]],
  // Marne (Meaux, Chalons)
  [[48.7, 2.8], [49.1, 4.5]],
  // Yonne / Canal de Bourgogne
  [[47.3, 2.8], [48.3, 4.0]],
];

// Zones d'exclusion cotieres — si un navire est dedans, on l'ignore
// (embouchures, ports maritimes)
const COASTAL_EXCLUSIONS = [
  // Embouchure Seine / Le Havre / Honfleur
  { latMin: 49.35, latMax: 49.55, lngMin: -0.2, lngMax: 0.8 },
  // Dunkerque port maritime
  { latMin: 50.9, latMax: 51.1, lngMin: 1.8, lngMax: 2.5 },
  // Fos-sur-Mer / Marseille (embouchure Rhone)
  { latMin: 43.2, latMax: 43.5, lngMin: 4.5, lngMax: 5.5 },
];

function isInCoastalExclusion(lat: number, lng: number): boolean {
  return COASTAL_EXCLUSIONS.some(
    (z) => lat >= z.latMin && lat <= z.latMax && lng >= z.lngMin && lng <= z.lngMax
  );
}

// Plafond de navires en memoire
const MAX_VESSELS = 500;

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  const knownVessels = new Set<number>();

  const stream = new ReadableStream({
    start(controller) {
      let ws: WebSocket | null = null;
      let closed = false;

      function cleanup() {
        closed = true;
        if (ws) {
          try { ws.close(); } catch { /* ignore */ }
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
              const lat = pos.Latitude;
              const lng = pos.Longitude;

              // Filtre: exclure les zones cotieres
              if (isInCoastalExclusion(lat, lng)) return;

              // Plafond de navires
              const mmsi = meta.MMSI as number;
              if (!knownVessels.has(mmsi) && knownVessels.size >= MAX_VESSELS) return;
              knownVessels.add(mmsi);

              const vessel = {
                type: "vessel",
                mmsi,
                name: meta.ShipName?.trim() || "",
                lat,
                lng,
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
        } catch { /* ignore */ }
      });

      ws.on("error", () => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "WebSocket error" })}\n\n`
            )
          );
        } catch { /* ignore */ }
        cleanup();
        try { controller.close(); } catch { /* ignore */ }
      });

      ws.on("close", () => {
        if (closed) return;
        cleanup();
        try { controller.close(); } catch { /* ignore */ }
      });

      (controller as unknown as Record<string, () => void>).__cleanup = cleanup;
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
