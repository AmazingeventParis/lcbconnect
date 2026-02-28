export async function sendNotification(payload: {
  type: string;
  actorId: string;
  targetType: string;
  targetId: string;
  data?: Record<string, string>;
}): Promise<void> {
  try {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    // Trigger immediate badge refresh on the sender's side
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("lcb-notification-sent"));
    }
  } catch {
    // Silencieux — les notifications sont best-effort
  }
}
