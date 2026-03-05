"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "lcb-apk-prompt-dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Don't show if already running as installed app (TWA or PWA)
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Only show on Android
    const isAndroid = /android/i.test(navigator.userAgent);
    if (!isAndroid) return;

    // Check if previously dismissed
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < DISMISS_DURATION_MS) return;
    }

    // Show after a short delay
    const timer = setTimeout(() => setShowPrompt(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-16 inset-x-0 z-50 p-4 md:bottom-4 md:left-auto md:right-4 md:max-w-sm">
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1E3A5F]">
          <Smartphone className="h-5 w-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            Installer l&apos;application
          </p>
          <p className="text-xs text-gray-500">
            Télécharger l&apos;APK pour Android
          </p>
        </div>

        <div className="flex items-center gap-1">
          <a
            href="/LCBconnect.apk"
            download="LCBconnect.apk"
            className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Installer
          </a>
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
