// Push notification utility

const SW_PATH = "/sw-push.js";

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
    return reg;
  } catch {
    return null;
  }
}

export async function showBrowserNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  // Try via service worker first (works in background)
  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-72.png",
      tag: options?.tag || "instantly-msg",
      ...options,
    } as any);
    return;
  }

  // Fallback to Notification API
  new Notification(title, {
    icon: "/icons/icon-192.png",
    ...options,
  });
}
