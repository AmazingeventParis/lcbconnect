"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "lcb-pwa-prompt-dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Check if previously dismissed
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < DISMISS_DURATION_MS) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setDeferredPrompt(null);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-16 inset-x-0 z-50 p-4 md:bottom-4 md:left-auto md:right-4 md:max-w-sm">
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1E3A5F]">
          <Download className="h-5 w-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            Installer l&apos;application
          </p>
          <p className="text-xs text-gray-500">
            Acces rapide depuis votre ecran d&apos;accueil
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button size="sm" onClick={handleInstall}>
            Installer
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fermer</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
