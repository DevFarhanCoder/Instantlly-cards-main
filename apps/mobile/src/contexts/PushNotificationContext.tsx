import { createContext, useContext, ReactNode, useCallback, useState, useEffect } from "react";
import { Platform } from "react-native";
import * as ExpoNotifications from "expo-notifications";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "../store/api/baseApi";

// Use Constants.isDevice to detect whether running on a real device
const isDevice = !!Constants.isDevice;

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
  try {
    const accessToken = await SecureStore.getItemAsync("accessToken");
    if (!accessToken) return; // Not logged in yet — token will be registered after login
    await fetch(`${API_URL}/api/users/push-token`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ pushToken: token }),
    });
  } catch {
    // Non-fatal — will retry on next permission request
  }
}

// Exported so auth flows can re-register the token after a fresh login.
export async function getAndRegisterToken(): Promise<string | null> {
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

  if (!projectId) {
    console.warn("[PushNotifications] No EAS project ID found in config");
    return null;
  }

  try {
    const { data: token } = await ExpoNotifications.getExpoPushTokenAsync({ projectId });
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
