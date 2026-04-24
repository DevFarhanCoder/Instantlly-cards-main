import { createContext, useContext, ReactNode, useCallback, useState, useEffect } from "react";
import { Platform } from "react-native";
import * as ExpoNotifications from "expo-notifications";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "../store/api/baseApi";

// Only skip push token on web — always attempt on Android/iOS regardless of
// what Constants.isDevice says (it's unreliable in Play Store builds).
const isDevice = Platform.OS !== "web";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

interface NotificationContextType {
  permission: PermissionState;
  requestPermission: () => Promise<boolean>;
  sendPushNotification: (
    title: string,
    body: string,
    data?: Record<string, unknown>
  ) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  permission: "default",
  requestPermission: async () => false,
  sendPushNotification: async () => {},
});

async function registerTokenWithBackend(token: string) {
  console.log("[PushNotifications] registerTokenWithBackend called, API_URL=", API_URL);
  try {
    const accessToken = await SecureStore.getItemAsync("accessToken");
    if (!accessToken) {
      console.warn("[PushNotifications] No accessToken in SecureStore — skipping registration");
      return; // Not logged in yet — token will be registered after login
    }
    console.log("[PushNotifications] Sending push token to backend...");
    const res = await fetch(`${API_URL}/api/users/push-token`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ pushToken: token }),
    });
    console.log("[PushNotifications] Backend responded:", res.status);
    if (!res.ok) {
      const text = await res.text();
      console.warn("[PushNotifications] Backend error body:", text);
    }
  } catch (e) {
    console.error("[PushNotifications] registerTokenWithBackend fetch failed:", e);
  }
}

// Exported so auth flows can re-register the token after a fresh login.
export async function getAndRegisterToken(): Promise<string | null> {
  console.log("[PushNotifications] getAndRegisterToken called, isDevice=", isDevice);
  if (!isDevice) return null;

  // Set up Android channels
  if (Platform.OS === "android") {
    await ExpoNotifications.setNotificationChannelAsync("default", {
      name: "General",
      importance: ExpoNotifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
      enableLights: true,
      lightColor: "#0F6FFF",
      showBadge: true,
    });
    await ExpoNotifications.setNotificationChannelAsync("messages", {
      name: "Messages",
      importance: ExpoNotifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
      enableLights: true,
      lightColor: "#0F6FFF",
      showBadge: true,
    });
    await ExpoNotifications.setNotificationChannelAsync("groups", {
      name: "Group Messages",
      importance: ExpoNotifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
      enableLights: true,
      lightColor: "#0F6FFF",
      showBadge: true,
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  console.log("[PushNotifications] projectId=", projectId);

  if (!projectId) {
    console.warn("[PushNotifications] No EAS project ID found in config");
    return null;
  }

  // Check permission before trying
  const { status: permStatus } = await ExpoNotifications.getPermissionsAsync();
  console.log("[PushNotifications] notification permission status=", permStatus);
  if (permStatus !== "granted") {
    console.warn("[PushNotifications] Permission not granted, requesting...");
    const { status: newStatus } = await ExpoNotifications.requestPermissionsAsync();
    console.log("[PushNotifications] After request, status=", newStatus);
    if (newStatus !== "granted") {
      console.warn("[PushNotifications] Permission denied — cannot get push token");
      return null;
    }
  }

  try {
    console.log("[PushNotifications] Calling getExpoPushTokenAsync...");
    const { data: token } = await ExpoNotifications.getExpoPushTokenAsync({ projectId });
    console.log("[PushNotifications] Got token:", token?.slice(0, 40));
    await registerTokenWithBackend(token);
    return token;
  } catch (e) {
    console.warn("[PushNotifications] Failed to get push token:", e);
    return null;
  }
}

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const [permission, setPermission] = useState<PermissionState>("default");

  useEffect(() => {
    // On mount, check existing permission and register token if already granted
    ExpoNotifications.getPermissionsAsync().then(({ status }) => {
      if (status === "granted") {
        setPermission("granted");
        getAndRegisterToken();
      } else if (status === "denied") {
        setPermission("denied");
      }
    });
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isDevice) {
      setPermission("unsupported");
      return false;
    }

    const { status: existing } = await ExpoNotifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== "granted") {
      const { status } = await ExpoNotifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus === "granted") {
      setPermission("granted");
      await getAndRegisterToken();
      return true;
    }

    setPermission("denied");
    return false;
  }, []);

  const sendPushNotification = useCallback(
    async (title: string, body: string, data: Record<string, unknown> = {}) => {
      if (!isDevice || permission !== "granted") return;

      try {
        await ExpoNotifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data,
            sound: "default",
          },
          trigger: null,
        });
      } catch {
        // Non-fatal: chat continues even if local notification scheduling fails.
      }
    },
    [permission]
  );

  return (
    <NotificationContext.Provider value={{ permission, requestPermission, sendPushNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const usePushNotifications = () => useContext(NotificationContext);
