import { createContext, useContext, ReactNode, useCallback, useState } from "react";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

interface NotificationContextType {
  permission: PermissionState;
  requestPermission: () => Promise<boolean>;
  sendPushNotification: (
    title: string,
    body: string,
    options?: { tag?: string; url?: string }
  ) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  permission: "default",
  requestPermission: async () => false,
  sendPushNotification: () => {},
});

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const [permission, setPermission] = useState<PermissionState>("default");

  const requestPermission = useCallback(async () => {
    // TODO: Replace with expo-notifications setup.
    setPermission("denied");
    return false;
  }, []);

  const sendPushNotification = useCallback(() => {
    // TODO: Replace with expo-notifications + in-app toast.
  }, []);

  return (
    <NotificationContext.Provider
      value={{ permission, requestPermission, sendPushNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const usePushNotifications = () => useContext(NotificationContext);
