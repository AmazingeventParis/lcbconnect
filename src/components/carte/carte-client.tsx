"use client";

import { useEffect, useRef, useState } from "react";
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
}

const AIS_API_KEY = "2be1c5db740b0c94f6db08696ed8cf6c1e748bec";
const WS_URL = "wss://stream.aisstream.io/v0/stream";
const CONNECT_TIMEOUT_MS = 10000;

const BOUNDING_BOXES = [
  [
    [42.0, -5.0],
    [51.5, 8.5],
  ],
];

type WsStatus = "idle" | "connecting" | "connected" | "error";

function CarteMap({
  vessels,
  leafletIcon,
}: {
  vessels: Map<number, VesselData>;
  leafletIcon: typeof import("leaflet") | null;
}) {
  if (!leafletIcon) return null;

  const vesselIcon = new leafletIcon.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  return (
    <MapContainer
      center={[46.8, 2.5]}
      zoom={6}
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
          icon={vesselIcon}
        >
          <Popup>
            <div className="text-sm space-y-1 min-w-[180px]">
              <p className="font-bold text-base">
                {vessel.name || "Inconnu"}
              </p>
              <p>
                <span className="text-slate-500">MMSI:</span> {vessel.mmsi}
              </p>
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
}

function StatusBanner({ status, error }: { status: WsStatus; error: string | null }) {
  if (status === "connecting") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-200 text-blue-800 text-sm">
        <Loader2 className="size-4 shrink-0 animate-spin" />
        Connexion au flux AIS en cours...
      </div>
    );
  }
  if (status === "error" && error) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
        <AlertTriangle className="size-4 shrink-0" />
        {error}
      </div>
    );
  }
  return null;
}

export function CarteClient() {
  const [vessels, setVessels] = useState<Map<number, VesselData>>(new Map());
  const [wsStatus, setWsStatus] = useState<WsStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [leafletLib, setLeafletLib] = useState<
    typeof import("leaflet") | null
  >(null);
  const wsRef = useRef<WebSocket | null>(null);
  const cancelledRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load leaflet
  useEffect(() => {
    setMounted(true);
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    import("leaflet").then((L) => setLeafletLib(L));
  }, []);

  // WebSocket
  useEffect(() => {
    cancelledRef.current = false;
    let messageCount = 0;

    function cleanup() {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* ignore */ }
        wsRef.current = null;
      }
    }

    function scheduleReconnect() {
      if (cancelledRef.current) return;
      reconnectTimerRef.current = setTimeout(() => {
        if (!cancelledRef.current) connect();
      }, 5000);
    }

    function connect() {
      if (cancelledRef.current) return;
      cleanup();

      setWsStatus("connecting");
      setError(null);

      let ws: WebSocket;
      try {
        ws = new WebSocket(WS_URL);
      } catch (e) {
        setWsStatus("error");
        setError(`Impossible de creer le WebSocket: ${String(e)}`);
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      // Timeout: if not open within 10s, abort and retry
      connectTimeoutRef.current = setTimeout(() => {
        if (cancelledRef.current) return;
        if (ws.readyState === WebSocket.CONNECTING) {
          setWsStatus("error");
          setError(
            `Timeout de connexion (${CONNECT_TIMEOUT_MS / 1000}s) — le serveur AIS ne repond pas. Nouvelle tentative...`
          );
          try { ws.close(); } catch { /* ignore */ }
          wsRef.current = null;
          scheduleReconnect();
        }
      }, CONNECT_TIMEOUT_MS);

      ws.onopen = () => {
        if (cancelledRef.current) { ws.close(); return; }
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        setWsStatus("connected");
        setError(null);
        messageCount = 0;
        ws.send(
          JSON.stringify({
            APIKey: AIS_API_KEY,
            BoundingBoxes: BOUNDING_BOXES,
            FilterMessageTypes: ["PositionReport"],
          })
        );
      };

      ws.onmessage = (event) => {
        if (cancelledRef.current) return;
        messageCount++;
        try {
          const data = JSON.parse(event.data);
          if (data.MessageType === "PositionReport") {
            const pos = data.Message?.PositionReport;
            const meta = data.MetaData;
            if (pos && meta) {
              setVessels((prev) => {
                const next = new Map(prev);
                next.set(meta.MMSI, {
                  mmsi: meta.MMSI,
                  name: meta.ShipName?.trim() || "",
                  lat: pos.Latitude,
                  lng: pos.Longitude,
                  speed: pos.Sog ?? 0,
                  course: pos.Cog ?? 0,
                  heading: pos.TrueHeading ?? 0,
                  timestamp: meta.time_utc || new Date().toISOString(),
                });
                return next;
              });
            }
          }
        } catch { /* ignore */ }
      };

      ws.onerror = () => {
        if (cancelledRef.current) return;
        setWsStatus("error");
        setError(
          `Erreur WebSocket (${messageCount} messages recus avant erreur) — nouvelle tentative dans 5s...`
        );
      };

      ws.onclose = (event) => {
        if (cancelledRef.current) return;
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        setWsStatus("error");
        setError(
          `Connexion fermee (code ${event.code}${event.reason ? ": " + event.reason : ""}, ${messageCount} msgs recus) — nouvelle tentative dans 5s...`
        );
        scheduleReconnect();
      };
    }

    connect();

    return () => {
      cancelledRef.current = true;
      cleanup();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="size-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <Ship className="size-5 text-blue-600" />
          <h1 className="text-lg font-semibold text-slate-900">
            Carte AIS - Navires
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {vessels.size} navire{vessels.size !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1.5">
            {wsStatus === "connected" ? (
              <>
                <Wifi className="size-4 text-green-500" />
                <span className="text-xs text-green-600">Connecte</span>
              </>
            ) : wsStatus === "connecting" ? (
              <>
                <Radio className="size-4 text-blue-500 animate-pulse" />
                <span className="text-xs text-blue-600">Connexion...</span>
              </>
            ) : (
              <>
                <WifiOff className="size-4 text-red-500" />
                <span className="text-xs text-red-600">Deconnecte</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status banner */}
      <StatusBanner status={wsStatus} error={error} />

      {/* Map */}
      <div className="flex-1 relative">
        {leafletLib ? (
          <CarteMap vessels={vessels} leafletIcon={leafletLib} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="size-8 animate-spin text-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
}
