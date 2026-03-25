import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  requestNotificationPermission,
  getNotificationPermission,
  registerServiceWorker,
  showBrowserNotification,
} from "@/lib/pushNotifications";

interface NotificationContextType {
  permission: NotificationPermission | "unsupported";
  requestPermission: () => Promise<boolean>;
  sendPushNotification: (title: string, body: string, options?: { tag?: string; url?: string }) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  permission: "default",
  requestPermission: async () => false,
  sendPushNotification: () => {},
});

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    getNotificationPermission()
  );
  const userConversationIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Load user's conversation IDs and listen for new messages globally
  useEffect(() => {
    if (!user) return;

    // Fetch conversation IDs owned by this user
    supabase
      .from("conversations")
      .select("id, business_name")
      .then(({ data }) => {
        if (data) {
          userConversationIds.current = new Set(data.map((c) => c.id));
        }
      });

    const channel = supabase
      .channel("global-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as { conversation_id: string; sender_type: string; text: string };
          // Only notify for non-user messages in user's conversations
          if (msg.sender_type === "user") return;
          if (!userConversationIds.current.has(msg.conversation_id)) return;

          // Skip if user is currently on messaging page
          if (window.location.pathname === "/messaging") return;

          // Get business name for the notification
          const { data: conv } = await supabase
            .from("conversations")
            .select("business_name")
            .eq("id", msg.conversation_id)
            .single();

          const title = conv?.business_name || "New Message";
          const body = msg.text.length > 80 ? msg.text.slice(0, 80) + "…" : msg.text;

          // In-app toast
          toast(title, {
            description: body,
            duration: 5000,
            action: { label: "View", onClick: () => { window.location.href = "/messaging"; } },
          });

          // Browser push
          if (getNotificationPermission() === "granted") {
            showBrowserNotification(title, {
              body,
              tag: `msg-${msg.conversation_id}`,
              data: { url: "/messaging" },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const requestPermission = useCallback(async () => {
    const granted = await requestNotificationPermission();
    setPermission(getNotificationPermission());
    return granted;
  }, []);

  const sendPushNotification = useCallback(
    (title: string, body: string, options?: { tag?: string; url?: string }) => {
      // Always show in-app toast
      toast(title, {
        description: body,
        duration: 5000,
        action: options?.url
          ? {
              label: "View",
              onClick: () => {
                window.location.href = options.url!;
              },
            }
          : undefined,
      });

      // Also send browser push if permitted
      if (permission === "granted") {
        showBrowserNotification(title, {
          body,
          tag: options?.tag,
          data: { url: options?.url || "/messaging" },
        });
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
