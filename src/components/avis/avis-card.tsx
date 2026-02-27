"use client";

import { formatDistanceToNow, format, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  Calendar,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Sun,
  CloudSun,
  MapPin,
  Thermometer,
  Wind,
} from "lucide-react";

import type { Profile, AvisBatellerie } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type AvisWithAuthor = AvisBatellerie & {
  author: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
};

interface AvisCardProps {
  avis: AvisWithAuthor;
}

interface WeatherData {
  temperature?: number;
  windSpeed?: number;
  windDirection?: number;
  weatherCode?: number;
  description?: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getWeatherIcon(code: number | undefined) {
  if (code === undefined) return <Cloud className="h-4 w-4" />;
  if (code === 0) return <Sun className="h-4 w-4 text-yellow-500" />;
  if (code <= 3) return <CloudSun className="h-4 w-4 text-gray-500" />;
  if (code <= 49) return <CloudFog className="h-4 w-4 text-gray-400" />;
  if (code <= 69) return <CloudRain className="h-4 w-4 text-blue-500" />;
  if (code <= 79) return <CloudSnow className="h-4 w-4 text-blue-300" />;
  if (code <= 99)
    return <CloudLightning className="h-4 w-4 text-yellow-600" />;
  return <Cloud className="h-4 w-4" />;
}

export function AvisCard({ avis }: AvisCardProps) {
  const isExpired = avis.valid_until ? isPast(new Date(avis.valid_until)) : false;
  const weather = avis.weather_data as WeatherData | null;

  return (
    <Card
      className={cn(
        "gap-0 py-0 transition-shadow hover:shadow-md",
        avis.is_urgent && "border-red-500 border-2",
        isExpired && "opacity-60"
      )}
    >
      <CardContent className="p-5">
        {/* En-tete : auteur et badges */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarImage
                src={avis.author?.avatar_url ?? undefined}
                alt={avis.author?.full_name ?? ""}
              />
              <AvatarFallback>
                {avis.author?.full_name
                  ? getInitials(avis.author.full_name)
                  : "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">
                {avis.author?.full_name ?? "Utilisateur inconnu"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(avis.created_at), {
                  addSuffix: true,
                  locale: fr,
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {avis.is_urgent && (
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                URGENT
              </Badge>
            )}
            {isExpired && (
              <Badge variant="secondary" className="text-xs">
                Expiré
              </Badge>
            )}
          </div>
        </div>

        {/* Titre */}
        <h3 className="font-semibold text-base mb-1">{avis.title}</h3>

        {/* Contenu (apercu) */}
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {avis.content}
        </p>

        {/* Informations complementaires */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {/* Secteur */}
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span>{avis.sector}</span>
          </div>

          {/* Date de validite */}
          {avis.valid_until && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                Valide jusqu&apos;au{" "}
                {format(new Date(avis.valid_until), "dd MMMM yyyy", {
                  locale: fr,
                })}
              </span>
            </div>
          )}
        </div>

        {/* Donnees meteo */}
        {weather && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-muted/50 px-3 py-2 text-xs">
            {weather.weatherCode !== undefined && (
              <div className="flex items-center gap-1">
                {getWeatherIcon(weather.weatherCode)}
                {weather.description && (
                  <span className="capitalize">{weather.description}</span>
                )}
              </div>
            )}
            {weather.temperature !== undefined && (
              <div className="flex items-center gap-1">
                <Thermometer className="h-3.5 w-3.5 text-orange-500" />
                <span>{weather.temperature}°C</span>
              </div>
            )}
            {weather.windSpeed !== undefined && (
              <div className="flex items-center gap-1">
                <Wind className="h-3.5 w-3.5 text-blue-500" />
                <span>{weather.windSpeed} km/h</span>
                {weather.windDirection !== undefined && (
                  <span className="text-muted-foreground">
                    ({weather.windDirection}°)
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
