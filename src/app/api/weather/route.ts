import { NextRequest, NextResponse } from "next/server";

// Descriptions des codes meteo WMO en francais
const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: "Ciel dégagé",
  1: "Principalement dégagé",
  2: "Partiellement nuageux",
  3: "Couvert",
  45: "Brouillard",
  48: "Brouillard givrant",
  51: "Bruine légère",
  53: "Bruine modérée",
  55: "Bruine dense",
  56: "Bruine verglaçante légère",
  57: "Bruine verglaçante dense",
  61: "Pluie légère",
  63: "Pluie modérée",
  65: "Pluie forte",
  66: "Pluie verglaçante légère",
  67: "Pluie verglaçante forte",
  71: "Neige légère",
  73: "Neige modérée",
  75: "Neige forte",
  77: "Grains de neige",
  80: "Averses légères",
  81: "Averses modérées",
  82: "Averses violentes",
  85: "Averses de neige légères",
  86: "Averses de neige fortes",
  95: "Orage",
  96: "Orage avec grêle légère",
  99: "Orage avec grêle forte",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { error: "Les paramètres lat et lon sont requis." },
      { status: 400 }
    );
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { error: "Les coordonnées doivent être des nombres valides." },
      { status: 400 }
    );
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json(
      { error: "Coordonnées hors limites." },
      { status: 400 }
    );
  }

  try {
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code`;

    const response = await fetch(apiUrl, {
      next: { revalidate: 600 }, // Cache 10 minutes
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Erreur lors de la récupération des données météo." },
        { status: 502 }
      );
    }

    const data = await response.json();

    const current = data.current;
    if (!current) {
      return NextResponse.json(
        { error: "Données météo non disponibles." },
        { status: 502 }
      );
    }

    const weatherCode = current.weather_code as number;
    const description =
      WEATHER_DESCRIPTIONS[weatherCode] ?? "Conditions inconnues";

    return NextResponse.json({
      temperature: current.temperature_2m,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      weatherCode,
      description,
    });
  } catch {
    return NextResponse.json(
      { error: "Erreur interne lors de la récupération des données météo." },
      { status: 500 }
    );
  }
}
