"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Ship, Wifi, WifiOff, AlertTriangle } from "lucide-react";

// Dynamic import of react-leaflet (requires window)
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

// Bounding box covering France/Europe waterways
const BOUNDING_BOXES = [
  [
    [42.0, -5.0],
    [51.5, 8.5],
  ],
];

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

export function CarteClient() {
  const [vessels, setVessels] = useState<Map<number, VesselData>>(new Map());
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [leafletLib, setLeafletLib] = useState<
    typeof import("leaflet") | null
  >(null);
  const wsRef = useRef<WebSocket | null>(null);
  const cancelledRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load leaflet CSS and lib on mount
  useEffect(() => {
    setMounted(true);

    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    import("leaflet").then((L) => {
      setLeafletLib(L);
    });
  }, []);

  // WebSocket connection
  useEffect(() => {
    cancelledRef.current = false;

    function connect() {
      if (cancelledRef.current) return;

      // Close any existing connection
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }

      setError(null);

      let ws: WebSocket;
      try {
        ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
      } catch (e) {
        setError(`Impossible de creer la connexion WebSocket: ${e}`);
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelledRef.current) {
          ws.close();
          return;
        }
        setConnected(true);
        setError(null);
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
        try {
          const data = JSON.parse(event.data);
          if (data.MessageType === "PositionReport") {
            const pos = data.Message?.PositionReport;
            const meta = data.MetaData;
            if (pos && meta) {
              const vessel: VesselData = {
                mmsi: meta.MMSI,
                name: meta.ShipName?.trim() || "",
                lat: pos.Latitude,
                lng: pos.Longitude,
                speed: pos.Sog ?? 0,
                course: pos.Cog ?? 0,
                heading: pos.TrueHeading ?? 0,
                timestamp: meta.time_utc || new Date().toISOString(),
              };
              setVessels((prev) => {
                const next = new Map(prev);
                next.set(vessel.mmsi, vessel);
                return next;
              });
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        if (cancelledRef.current) return;
        setError("Erreur de connexion WebSocket — nouvelle tentative dans 5s...");
      };

      ws.onclose = (event) => {
        if (cancelledRef.current) return;
        setConnected(false);
        if (!error) {
          setError(
            `Connexion fermee (code ${event.code}) — nouvelle tentative dans 5s...`
          );
        }
        reconnectTimerRef.current = setTimeout(() => {
          if (!cancelledRef.current) {
            connect();
          }
        }, 5000);
      };
    }

    connect();

    return () => {
      cancelledRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
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
      {/* Header bar */}
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
            {connected ? (
              <>
                <Wifi className="size-4 text-green-500" />
                <span className="text-xs text-green-600">Connecte</span>
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

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      )}

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
