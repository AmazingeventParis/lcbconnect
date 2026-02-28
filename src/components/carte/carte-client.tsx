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

type Status = "connecting" | "connected" | "error";

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
      center={[48.0, 3.0]}
      zoom={7}
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
  const [status, setStatus] = useState<Status>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [leafletLib, setLeafletLib] = useState<
    typeof import("leaflet") | null
  >(null);
  const esRef = useRef<EventSource | null>(null);

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

          // Snapshot bulk: charge tous les navires en cache d'un coup
          if (data.type === "snapshot") {
            setStatus("connected");
            setError(null);
            const bulk = new Map<number, VesselData>();
            for (const v of data.vessels) {
              bulk.set(v.mmsi, v);
            }
            setVessels(bulk);
            return;
          }

          // Mise a jour individuelle en temps reel
          if (data.type === "vessel") {
            setStatus("connected");
            setVessels((prev) => {
              const next = new Map(prev);
              next.set(data.mmsi, {
                mmsi: data.mmsi,
                name: data.name,
                lat: data.lat,
                lng: data.lng,
                speed: data.speed,
                course: data.course,
                heading: data.heading,
                timestamp: data.timestamp,
              });
              return next;
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
  }, []);

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
                <span className="text-xs text-green-600">Connecte</span>
              </>
            ) : status === "connecting" ? (
              <>
                <Radio className="size-4 text-[#1E3A5F] animate-pulse" />
                <span className="text-xs text-[#1E3A5F]">Connexion...</span>
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
          <CarteMap vessels={vessels} leafletIcon={leafletLib} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="size-8 animate-spin text-[#1E3A5F]" />
          </div>
        )}
      </div>
    </div>
  );
}
