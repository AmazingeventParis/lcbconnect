import WebSocket from "ws";

const AIS_API_KEY = "2be1c5db740b0c94f6db08696ed8cf6c1e748bec";
const WS_URL = "wss://stream.aisstream.io/v0/stream";

export type VesselZone = "idf" | "limitrophes" | "autres";

// 3 connexions avec priorite croissante
// Connexion 1 : IDF (prioritaire, se connecte immediatement)
// Connexion 2 : Limitrophes (se connecte apres 1.5s)
// Connexion 3 : Sud/Est (se connecte apres 3s)
const CONNECTIONS: {
  name: string;
  zone: VesselZone;
  delay: number;
  boxes: number[][][];
}[] = [
  {
    name: "IDF",
    zone: "idf",
    delay: 0,
    boxes: [
      [[48.3, 0.8], [49.5, 3.5]],   // Seine (Paris → Rouen)
      [[49.0, 2.4], [49.7, 3.8]],   // Oise-Aisne (Compiegne-Creil)
      [[48.7, 2.8], [49.1, 4.5]],   // Marne (Meaux-Chalons)
      [[47.3, 2.8], [48.3, 4.0]],   // Yonne-Bourgogne
    ],
  },
  {
    name: "Limitrophes",
    zone: "limitrophes",
    delay: 1500,
    boxes: [
      [[49.8, 2.0], [50.8, 3.8]],   // Nord (Dunkerque-Lille)
      [[47.0, 0.5], [48.3, 2.8]],   // Loire / Val de Loire
      [[48.8, -1.5], [49.5, 0.8]],  // Normandie interieur (Seine aval)
    ],
  },
  {
    name: "Sud-Est",
    zone: "autres",
    delay: 3000,
    boxes: [
      [[43.7, 4.2], [46.8, 5.2]],   // Rhone-Saone (Lyon-Arles)
      [[47.5, 7.2], [49.0, 8.2]],   // Rhin (Strasbourg-Mulhouse)
      [[48.8, 5.8], [49.5, 6.5]],   // Moselle (Metz-Thionville)
    ],
  },
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
  zone: VesselZone;
  shipType?: number;
}

type Listener = (vessel: VesselData) => void;

class AISManager {
  private vessels = new Map<number, VesselData>();
  private shipTypes = new Map<number, number>();
  private connections: WebSocket[] = [];
  private listeners = new Set<Listener>();
  private started = false;
  private reconnectTimers: ReturnType<typeof setTimeout>[] = [];

  /** Start connections: IDF immediately, limitrophes after 1.5s, others after 3s */
  start() {
    if (this.started) return;
    this.started = true;
    console.log(`[AIS] Starting ${CONNECTIONS.length} connections (IDF prioritaire)...`);
    for (const conn of CONNECTIONS) {
      if (conn.delay > 0) {
        setTimeout(() => this.connectZone(conn.name, conn.zone, conn.boxes), conn.delay);
      } else {
        this.connectZone(conn.name, conn.zone, conn.boxes);
      }
    }
  }

  /** Get snapshot of cached vessels, optionally filtered by zone */
  getSnapshot(zone?: VesselZone): VesselData[] {
    if (!zone) {
      return Array.from(this.vessels.values());
    }
    return Array.from(this.vessels.values()).filter((v) => v.zone === zone);
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

  private connectZone(name: string, zone: VesselZone, boxes: number[][][]) {
    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
    } catch (e) {
      console.error(`[AIS][${name}] Failed to create WebSocket:`, e);
      this.scheduleReconnect(name, zone, boxes);
      return;
    }

    ws.on("open", () => {
      console.log(`[AIS][${name}] Connected (${boxes.length} zones)`);
      this.connections.push(ws);
      ws.send(
        JSON.stringify({
          APIKey: AIS_API_KEY,
          BoundingBoxes: boxes,
          FilterMessageTypes: ["PositionReport", "ShipStaticData"],
        })
      );
    });

    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        const meta = data.MetaData;
        if (!meta) return;

        // Handle ShipStaticData — cache ship type
        if (data.MessageType === "ShipStaticData") {
          const ssd = data.Message?.ShipStaticData;
          if (ssd && typeof ssd.Type === "number") {
            this.shipTypes.set(meta.MMSI, ssd.Type);
            // Update existing vessel if already tracked
            const existing = this.vessels.get(meta.MMSI);
            if (existing) {
              existing.shipType = ssd.Type;
              for (const listener of this.listeners) {
                try { listener(existing); } catch { /* ignore */ }
              }
            }
          }
          return;
        }

        if (data.MessageType !== "PositionReport") return;
        const pos = data.Message?.PositionReport;
        if (!pos) return;

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
          zone,
          shipType: this.shipTypes.get(meta.MMSI),
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
      this.scheduleReconnect(name, zone, boxes);
    });
  }

  private scheduleReconnect(name: string, zone: VesselZone, boxes: number[][][]) {
    const timer = setTimeout(() => {
      // Remove this timer from the array once it fires
      this.reconnectTimers = this.reconnectTimers.filter((t) => t !== timer);
      console.log(`[AIS][${name}] Reconnecting... (${boxes.length} zones)`);
      this.connectZone(name, zone, boxes);
    }, 5000);
    this.reconnectTimers.push(timer);
  }

  /** Purge vessels not updated in the last N minutes */
  startPurge(intervalMs = 60_000, maxAgeMs = 30 * 60_000) {
    setInterval(() => {
      const now = Date.now();
      let purged = 0;
      for (const [mmsi, v] of this.vessels) {
        const age = now - new Date(v.timestamp).getTime();
        if (age > maxAgeMs) {
          this.vessels.delete(mmsi);
          this.shipTypes.delete(mmsi);
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
