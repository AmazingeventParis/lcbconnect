"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
          <WifiOff className="h-10 w-10 text-blue-600" />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Hors connexion
        </h1>

        <p className="mb-8 text-gray-500">
          Vous semblez ne pas avoir de connexion internet.
          Verifiez votre connexion et reessayez.
        </p>

        <Button
          onClick={() => window.location.reload()}
          className="gap-2"
          size="lg"
        >
          <RefreshCw className="h-4 w-4" />
          Reessayer
        </Button>

        <p className="mt-6 text-xs text-gray-400">
          Certaines pages consultees recemment peuvent etre
          disponibles hors connexion.
        </p>
      </div>
    </div>
  );
}
