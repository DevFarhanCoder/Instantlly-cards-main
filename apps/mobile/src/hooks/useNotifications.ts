import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { baseApi } from "../store/api/baseApi";
import { useAuth } from "./useAuth";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string | null;
  emoji: string | null;
  read: boolean;
  created_at: string;
}

// RTK Query endpoints injected into baseApi
const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<{ notifications: Notification[]; unreadCount: number }, void>({
      query: () => "/notifications",
      providesTags: ["Notification"],
    }),
    markNotificationRead: build.mutation<void, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "PATCH" }),
      invalidatesTags: ["Notification"],
    }),
    markAllNotificationsRead: build.mutation<void, void>({
      query: () => ({ url: "/notifications/read-all", method: "PATCH" }),
      invalidatesTags: ["Notification"],
    }),
    deleteAllNotifications: build.mutation<void, void>({
      query: () => ({ url: "/notifications", method: "DELETE" }),
      invalidatesTags: ["Notification"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteAllNotificationsMutation,
} = notificationsApi;

export function useNotifications() {
  const { user } = useAuth();
  const dispatch = useDispatch();

  const { data, isLoading, refetch } = useGetNotificationsQuery(undefined, {
    skip: !user,
    pollingInterval: 10000,
    refetchOnMountOrArgChange: true,
  });

  const [markReadMutation] = useMarkNotificationReadMutation();
  const [markAllReadMutation] = useMarkAllNotificationsReadMutation();
  const [deleteAllMutation] = useDeleteAllNotificationsMutation();

  const markRead = useCallback(
    async (id: string) => { await markReadMutation(id); },
    [markReadMutation]
  );

  const markAllRead = useCallback(
    async () => { await markAllReadMutation(); },
    [markAllReadMutation]
  );

  const deleteAll = useCallback(
    async () => { await deleteAllMutation(); },
    [deleteAllMutation]
  );

  return {
    notifications: data?.notifications ?? [],
    isLoading,
    unreadCount: data?.unreadCount ?? 0,
    markRead: { mutate: (id: string) => markRead(id), mutateAsync: markRead },
    markAllRead: { mutate: () => markAllRead(), mutateAsync: markAllRead },
    deleteAll: { mutate: () => deleteAll(), mutateAsync: deleteAll },
    refetch,
  };
}
