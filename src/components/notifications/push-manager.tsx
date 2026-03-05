"use client";

import { useEffect, useRef } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function PushManager() {
  const subscribed = useRef(false);

  useEffect(() => {
    if (subscribed.current) return;

    const hasSW = "serviceWorker" in navigator;
    const hasPush = "PushManager" in window;
    const hasNotif = "Notification" in window;
    console.log("[Push] Support check:", { hasSW, hasPush, hasNotif });

    if (!hasSW || !hasPush) {
      console.log("[Push] Not supported — skipping");
      return;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    console.log("[Push] VAPID key present:", !!vapidKey);
    if (!vapidKey) return;

    (async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        console.log("[Push] SW ready");

        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          console.log("[Push] Already subscribed");
          subscribed.current = true;
          return;
        }

        console.log("[Push] Requesting permission...");
        const permission = await Notification.requestPermission();
        console.log("[Push] Permission:", permission);
        if (permission !== "granted") return;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        console.log("[Push] Subscribed:", subscription.endpoint);

        const json = subscription.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth,
          }),
        });

        console.log("[Push] Subscription saved to server");
        subscribed.current = true;
      } catch (err) {
        console.error("[Push] Error:", err);
      }
    })();
  }, []);

  return null;
}
