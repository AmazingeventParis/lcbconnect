import WebSocket from "ws";

const AIS_API_KEY = "2be1c5db740b0c94f6db08696ed8cf6c1e748bec";
const WS_URL = "wss://stream.aisstream.io/v0/stream";

// Chaque zone = 1 connexion WebSocket parallele
const ZONES = [
  { name: "Seine", boxes: [[[48.3, 0.8], [49.5, 3.5]]] },
  { name: "Nord", boxes: [[[49.8, 2.0], [50.8, 3.8]]] },
  { name: "Rhone-Saone", boxes: [[[43.7, 4.2], [46.8, 5.2]]] },
  { name: "Rhin", boxes: [[[47.5, 7.2], [49.0, 8.2]]] },
  { name: "Moselle", boxes: [[[48.8, 5.8], [49.5, 6.5]]] },
  { name: "Oise-Aisne", boxes: [[[49.0, 2.4], [49.7, 3.8]]] },
  { name: "Marne", boxes: [[[48.7, 2.8], [49.1, 4.5]]] },
  { name: "Yonne-Bourgogne", boxes: [[[47.3, 2.8], [48.3, 4.0]]] },
];

const COASTAL_EXCLUSIONS = [
  { latMin: 49.35, latMax: 49.55, lngMin: -0.2, lngMax: 0.8 },
  { latMin: 50.9, latMax: 51.1, lngMin: 1.8, lngMax: 2.5 },
  { latMin: 43.2, latMax: 43.5, lngMin: 4.5, lngMax: 5.5 },
];

function isCoastal(lat: number, lng: number): boolean {
  return COASTAL_EXCLUSIONS.some(
    (z) => lat >= z.latMin && lat <= z.latMax && lng >= z.lngMin && lng <= z.lngMax
  );
}

export interface VesselData {
  mmsi: number;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  course: number;
  heading: number;
  timestamp: string;
}

type Listener = (vessel: VesselData) => void;

class AISManager {
  private vessels = new Map<number, VesselData>();
  private connections: WebSocket[] = [];
  private listeners = new Set<Listener>();
  private started = false;
  private reconnectTimers: ReturnType<typeof setTimeout>[] = [];

  /** Start all zone connections in parallel */
  start() {
    if (this.started) return;
    this.started = true;
    console.log(`[AIS] Starting ${ZONES.length} parallel zone connections...`);
    for (const zone of ZONES) {
      this.connectZone(zone.name, zone.boxes);
    }
  }

  /** Get full snapshot of all cached vessels */
  getSnapshot(): VesselData[] {
    return Array.from(this.vessels.values());
  }

  /** Subscribe to real-time updates. Returns unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  get vesselCount() {
    return this.vessels.size;
  }

  get connectionCount() {
    return this.connections.filter((ws) => ws.readyState === WebSocket.OPEN).length;
  }

  private connectZone(name: string, boxes: number[][][]) {
    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
    } catch (e) {
      console.error(`[AIS][${name}] Failed to create WebSocket:`, e);
      this.scheduleReconnect(name, boxes);
      return;
    }

    ws.on("open", () => {
      console.log(`[AIS][${name}] Connected`);
      this.connections.push(ws);
      ws.send(
        JSON.stringify({
          APIKey: AIS_API_KEY,
          BoundingBoxes: boxes,
          FilterMessageTypes: ["PositionReport"],
        })
      );
    });

    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.MessageType !== "PositionReport") return;
        const pos = data.Message?.PositionReport;
        const meta = data.MetaData;
        if (!pos || !meta) return;

        const lat: number = pos.Latitude;
        const lng: number = pos.Longitude;
        if (isCoastal(lat, lng)) return;

        const vessel: VesselData = {
          mmsi: meta.MMSI,
          name: meta.ShipName?.trim() || "",
          lat,
          lng,
          speed: pos.Sog ?? 0,
          course: pos.Cog ?? 0,
          heading: pos.TrueHeading ?? 0,
          timestamp: meta.time_utc || new Date().toISOString(),
        };

        this.vessels.set(vessel.mmsi, vessel);

        // Notify all listeners
        for (const listener of this.listeners) {
          try {
            listener(vessel);
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      }
    });

    ws.on("error", (err) => {
      console.error(`[AIS][${name}] Error:`, err.message);
    });

    ws.on("close", (code) => {
      console.log(`[AIS][${name}] Closed (code ${code})`);
      this.connections = this.connections.filter((c) => c !== ws);
      this.scheduleReconnect(name, boxes);
    });
  }

  private scheduleReconnect(name: string, boxes: number[][][]) {
    const timer = setTimeout(() => {
      console.log(`[AIS][${name}] Reconnecting...`);
      this.connectZone(name, boxes);
    }, 3000);
    this.reconnectTimers.push(timer);
  }

  /** Purge vessels not updated in the last N minutes */
  startPurge(intervalMs = 60_000, maxAgeMs = 10 * 60_000) {
    setInterval(() => {
      const now = Date.now();
      let purged = 0;
      for (const [mmsi, v] of this.vessels) {
        const age = now - new Date(v.timestamp).getTime();
        if (age > maxAgeMs) {
          this.vessels.delete(mmsi);
          purged++;
        }
      }
      if (purged > 0) {
        console.log(`[AIS] Purged ${purged} stale vessels. Active: ${this.vessels.size}`);
      }
    }, intervalMs);
  }
}

// Singleton — survit entre les requetes dans le process Node.js
const globalForAis = globalThis as unknown as { __aisManager?: AISManager };

export function getAISManager(): AISManager {
  if (!globalForAis.__aisManager) {
    const manager = new AISManager();
    manager.start();
    manager.startPurge();
    globalForAis.__aisManager = manager;
    console.log("[AIS] Manager initialized");
  }
  return globalForAis.__aisManager;
}
