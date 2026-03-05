"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    LCBNative?: {
      getSubscriberId: () => string;
      isNativeApp: () => boolean;
    };
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function subscribeNtfy() {
  // Retry up to 3 times (subscriber ID might not be ready yet)
  for (let attempt = 0; attempt < 3; attempt++) {
    const subscriberId = window.LCBNative?.getSubscriberId();
    if (subscriberId) {
      const topic = `lcb-${subscriberId}`;
      console.log("[Push] ntfy topic:", topic);
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: topic, type: "ntfy" }),
      });
      if (res.ok) {
        console.log("[Push] ntfy subscription saved to server");
        return true;
      }
      console.error("[Push] ntfy subscribe failed:", res.status);
      return false;
    }
    console.log(`[Push] Subscriber ID not ready, retry ${attempt + 1}/3...`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.error("[Push] Subscriber ID not available after retries");
  return false;
}

async function subscribeWebPush() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return false;

  const registration = await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    console.log("[Push] Already subscribed (web push)");
    return true;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const json = subscription.toJSON();
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      type: "web",
    }),
  });

  console.log("[Push] Web Push subscription saved");
  return true;
}

export function PushManager() {
  const subscribed = useRef(false);

  useEffect(() => {
    if (subscribed.current) return;

    const isNative = !!window.LCBNative?.isNativeApp();
    console.log("[Push] Native app:", isNative);

    if (isNative) {
      // ntfy path for APK
      subscribeNtfy().then((ok) => {
        if (ok) subscribed.current = true;
      });
    } else {
      // Web Push for browsers
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

      subscribeWebPush()
        .then((ok) => { if (ok) subscribed.current = true; })
        .catch((err) => console.error("[Push] Error:", err));
    }
  }, []);

  return null;
}
