"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#1E3A5F]/10">
          <WifiOff className="h-10 w-10 text-[#1E3A5F]" />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Hors connexion
        </h1>

        <p className="mb-8 text-gray-500">
          Vous semblez ne pas avoir de connexion internet.
          Vérifiez votre connexion et réessayez.
        </p>

        <Button
          onClick={() => window.location.reload()}
          className="gap-2"
          size="lg"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>

        <p className="mt-6 text-xs text-gray-400">
          Certaines pages consultées récemment peuvent être
          disponibles hors connexion.
        </p>
      </div>
    </div>
  );
}
