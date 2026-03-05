"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    LCBNative?: {
      getFCMToken: () => string;
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

async function subscribeFCM() {
  // Try up to 3 times with 2s delay (token might not be ready yet)
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = window.LCBNative?.getFCMToken();
    if (token) {
      console.log("[Push] FCM token obtained:", token.substring(0, 20) + "...");
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: token, type: "fcm" }),
      });
      if (res.ok) {
        console.log("[Push] FCM subscription saved to server");
        return true;
      }
      console.error("[Push] FCM subscribe failed:", res.status);
      return false;
    }
    console.log(`[Push] FCM token not ready, retry ${attempt + 1}/3...`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.error("[Push] FCM token not available after retries");
  return false;
}

async function subscribeWebPush() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  console.log("[Push] VAPID key present:", !!vapidKey);
  if (!vapidKey) return false;

  const registration = await navigator.serviceWorker.ready;
  console.log("[Push] SW ready");

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    console.log("[Push] Already subscribed (web push)");
    return true;
  }

  console.log("[Push] Requesting permission...");
  const permission = await Notification.requestPermission();
  console.log("[Push] Permission:", permission);
  if (permission !== "granted") return false;

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
      type: "web",
    }),
  });

  console.log("[Push] Web Push subscription saved to server");
  return true;
}

export function PushManager() {
  const subscribed = useRef(false);

  useEffect(() => {
    if (subscribed.current) return;

    const isNative = !!window.LCBNative?.isNativeApp();
    console.log("[Push] Native app detected:", isNative);

    if (isNative) {
      // FCM path for APK
      subscribeFCM().then((ok) => {
        if (ok) subscribed.current = true;
      });
    } else {
      // Web Push path for browsers
      const hasSW = "serviceWorker" in navigator;
      const hasPush = "PushManager" in window;
      console.log("[Push] Support check:", { hasSW, hasPush });

      if (!hasSW || !hasPush) {
        console.log("[Push] Not supported — skipping");
        return;
      }

      subscribeWebPush()
        .then((ok) => {
          if (ok) subscribed.current = true;
        })
        .catch((err) => console.error("[Push] Error:", err));
    }
  }, []);

  return null;
}
