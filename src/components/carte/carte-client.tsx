"use client";

import { useEffect, useRef, useState, memo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Loader2,
  Ship,
  Wifi,
  WifiOff,
  AlertTriangle,
  Radio,
} from "lucide-react";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

interface VesselData {
  mmsi: number;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  course: number;
  heading: number;
  timestamp: string;
  zone?: string;
  shipType?: number;
}

// Ship type 70-89 = cargo/tanker/peniche
function getVesselKind(shipType?: number): "peniche" | "boat" {
  if (shipType != null && shipType >= 70 && shipType <= 89) return "peniche";
  return "boat";
}

function getRotationDeg(heading: number, course: number): number {
  if (heading !== 511 && heading >= 0 && heading < 360) return heading;
  if (course >= 0 && course < 360) return course;
  return 0;
}

// Peniche/cargo SVG — rectangular barge shape, pointing north
const PENICHE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="30" viewBox="0 0 12 30">
  <path d="M2 30 L0 26 L0 4 Q0 0 6 0 Q12 0 12 4 L12 26 L10 30 Z" fill="#1E3A5F" stroke="#fff" stroke-width="1"/>
</svg>`;

// Generic boat SVG — more pointed/sleek shape, pointing north
const BOAT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="28" viewBox="0 0 10 28">
  <path d="M2 28 L0 22 L1 6 Q1 0 5 0 Q9 0 9 6 L10 22 L8 28 Z" fill="#2563EB" stroke="#fff" stroke-width="1"/>
</svg>`;

const SHIP_TYPE_LABELS: Record<number, string> = {
  70: "Cargo",
  71: "Cargo - DG cat A",
  72: "Cargo - DG cat B",
  73: "Cargo - DG cat C",
  74: "Cargo - DG cat D",
  79: "Cargo",
  80: "Tanker",
  81: "Tanker - DG cat A",
  82: "Tanker - DG cat B",
  83: "Tanker - DG cat C",
  84: "Tanker - DG cat D",
  89: "Tanker",
  60: "Passager",
  69: "Passager",
  30: "Pêche",
  31: "Remorqueur",
  32: "Remorqueur",
  36: "Voilier",
  37: "Plaisance",
  52: "Remorqueur",
};

function getShipTypeLabel(shipType?: number): string | null {
  if (shipType == null) return null;
  if (SHIP_TYPE_LABELS[shipType]) return SHIP_TYPE_LABELS[shipType];
  if (shipType >= 70 && shipType <= 79) return "Cargo";
  if (shipType >= 80 && shipType <= 89) return "Tanker";
  if (shipType >= 60 && shipType <= 69) return "Passager";
  if (shipType >= 40 && shipType <= 49) return "Grande vitesse";
  if (shipType >= 30 && shipType <= 39) return "Navire spécial";
  return `Type ${shipType}`;
}

function createVesselIcon(L: typeof import("leaflet"), vessel: VesselData) {
  const kind = getVesselKind(vessel.shipType);
  const svg = kind === "peniche" ? PENICHE_SVG : BOAT_SVG;
  const rotation = getRotationDeg(vessel.heading, vessel.course);
  const opacity = vessel.speed < 0.5 ? 0.6 : 1;
  const size = kind === "peniche" ? [12, 30] : [10, 28];

  return new L.DivIcon({
    html: `<div style="transform:rotate(${rotation}deg);opacity:${opacity};transition:transform 0.3s ease;width:${size[0]}px;height:${size[1]}px">${svg}</div>`,
    className: "vessel-marker",
    iconSize: [size[0], size[1]],
    iconAnchor: [size[0] / 2, size[1] / 2],
    popupAnchor: [0, -size[1] / 2],
  });
}

type Status = "connecting" | "connected" | "error";

const CarteMap = memo(function CarteMap({
  vessels,
  leafletLib,
}: {
  vessels: Map<number, VesselData>;
  leafletLib: typeof import("leaflet");
}) {
  return (
    <MapContainer
      center={[48.85, 2.6]}
      zoom={8}
      className="h-full w-full"
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {Array.from(vessels.values()).map((vessel) => (
        <Marker
          key={vessel.mmsi}
          position={[vessel.lat, vessel.lng]}
          icon={createVesselIcon(leafletLib, vessel)}
        >
          <Popup>
            <div className="text-sm space-y-1 min-w-[180px]">
              <p className="font-bold text-base">
                {vessel.name || "Inconnu"}
              </p>
              <p>
                <span className="text-slate-500">MMSI:</span> {vessel.mmsi}
              </p>
              {vessel.shipType != null && (
                <p>
                  <span className="text-slate-500">Type:</span>{" "}
                  {getShipTypeLabel(vessel.shipType)}
                </p>
              )}
              <p>
                <span className="text-slate-500">Vitesse:</span>{" "}
                {vessel.speed.toFixed(1)} noeuds
              </p>
              <p>
                <span className="text-slate-500">Cap:</span>{" "}
                {vessel.course.toFixed(0)}°
              </p>
              <p>
                <span className="text-slate-500">Position:</span>{" "}
                {vessel.lat.toFixed(4)}, {vessel.lng.toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
});

export function CarteClient() {
  const [vessels, setVessels] = useState<Map<number, VesselData>>(new Map());
  const [status, setStatus] = useState<Status>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [leafletLib, setLeafletLib] = useState<
    typeof import("leaflet") | null
  >(null);
  const esRef = useRef<EventSource | null>(null);

  // useRef buffer for vessel updates — decouples reception from rendering
  const vesselsRef = useRef<Map<number, VesselData>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Flush ref → state periodically (max 2 renders/sec)
  const flushToState = useCallback(() => {
    setVessels(new Map(vesselsRef.current));
  }, []);

  // Load leaflet
  useEffect(() => {
    setMounted(true);
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    // Smooth marker sliding between positions
    if (!document.getElementById("vessel-marker-css")) {
      const style = document.createElement("style");
      style.id = "vessel-marker-css";
      style.textContent = `.vessel-marker{transition:transform .5s linear!important}.leaflet-zoom-anim .vessel-marker{transition:none!important}`;
      document.head.appendChild(style);
    }
    import("leaflet").then((L) => setLeafletLib(L));
  }, []);

  // Start periodic flush timer
  useEffect(() => {
    flushTimerRef.current = setInterval(flushToState, 500);
    return () => {
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [flushToState]);

  // SSE connection via server proxy
  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;

      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      setStatus("connecting");
      setError(null);

      const es = new EventSource("/api/ais/stream");
      esRef.current = es;

      es.onmessage = (event) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(event.data);

          if (data.type === "error") {
            setStatus("error");
            setError(data.message || "Erreur du flux AIS");
            return;
          }

          // Snapshot: apply immediately to ref AND state (no throttle for first load)
          if (data.type === "snapshot") {
            setStatus("connected");
            setError(null);
            for (const v of data.vessels) {
              vesselsRef.current.set(v.mmsi, v);
            }
            // Immediate flush for snapshots — user sees IDF boats instantly
            flushToState();
            return;
          }

          // Batch update: apply to ref, will be flushed by timer
          if (data.type === "batch") {
            setStatus("connected");
            for (const v of data.vessels) {
              vesselsRef.current.set(v.mmsi, v);
            }
            return;
          }

          // Individual vessel update (legacy fallback)
          if (data.type === "vessel") {
            setStatus("connected");
            vesselsRef.current.set(data.mmsi, {
              mmsi: data.mmsi,
              name: data.name,
              lat: data.lat,
              lng: data.lng,
              speed: data.speed,
              course: data.course,
              heading: data.heading,
              timestamp: data.timestamp,
              zone: data.zone,
              shipType: data.shipType,
            });
          }
        } catch {
          /* ignore */
        }
      };

      es.onerror = () => {
        if (cancelled) return;
        es.close();
        esRef.current = null;
        setStatus("error");
        setError("Connexion au flux perdue — reconnexion dans 5s...");
        setTimeout(() => {
          if (!cancelled) connect();
        }, 5000);
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [flushToState]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="size-8 animate-spin text-[#1E3A5F]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <Ship className="size-5 text-[#1E3A5F]" />
          <h1 className="text-lg font-semibold text-slate-900">
            Carte AIS - Navires
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {vessels.size} navire{vessels.size !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1.5">
            {status === "connected" ? (
              <>
                <Wifi className="size-4 text-green-500" />
                <span className="text-xs text-green-600">Connecté</span>
              </>
            ) : status === "connecting" ? (
              <>
                <Radio className="size-4 text-[#1E3A5F] animate-pulse" />
                <span className="text-xs text-[#1E3A5F]">Connexion...</span>
              </>
            ) : (
              <>
                <WifiOff className="size-4 text-red-500" />
                <span className="text-xs text-red-600">Déconnecté</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status banners */}
      {status === "connecting" && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F]/10 border-b border-[#1E3A5F]/20 text-[#1E3A5F] text-sm">
          <Loader2 className="size-4 shrink-0 animate-spin" />
          Connexion au flux AIS en cours...
        </div>
      )}
      {status === "error" && error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        {leafletLib ? (
          <CarteMap vessels={vessels} leafletLib={leafletLib} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="size-8 animate-spin text-[#1E3A5F]" />
          </div>
        )}
      </div>
    </div>
  );
}
