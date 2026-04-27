import { useMemo } from "react";
import { useAuth } from "./useAuth";
import {
  useFindOrCreateChatMutation,
  useGetChatMessagesQuery,
  useGetConversationsQuery,
  useSendMessageRestMutation,
  type ChatConversation,
  type ChatMessage,
} from "../store/api/chatApi";

export interface DbConversation {
  id: string;
  user_id: string;
  business_id: string;
  business_name: string;
  business_avatar: string | null;
  business_phone: string | null;
  unread_count: number;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_type: string;
  text: string;
  message_type: string;
  card_data: any;
  created_at: string;
  read_at?: string | null;
}

function mapConversation(conv: ChatConversation, userId?: number): DbConversation {
  const ts = conv.lastMessageTime || new Date().toISOString();
  const raw = (conv.lastMessage?.content || "").trim();
  const preview = !raw
    ? null
    : conv.lastMessage?.messageType === "image"
    ? "Sent an image"
    : conv.lastMessage?.messageType === "card"
    ? "Shared a business card"
    : raw;

  const senderPrefix =
    conv.lastMessage?.senderId && userId && conv.lastMessage.senderId === userId ? "You: " : "";

  return {
    id: String(conv.id),
    user_id: String(userId ?? ""),
    business_id: String(conv.otherUser?.id ?? ""),
    business_name: conv.otherUser?.name || "Unknown User",
    business_avatar: conv.otherUser?.avatar || null,
    business_phone: conv.otherUser?.phone || null,
    unread_count: conv.unreadCount ?? 0,
    last_message_preview: preview ? `${senderPrefix}${preview}` : null,
    created_at: ts,
    updated_at: ts,
  };
}

function mapMessage(msg: ChatMessage, currentUserId?: number): DbMessage {
  let parsedCardData: any = null;
  if (msg.messageType === "card") {
    try {
      parsedCardData = JSON.parse(msg.content);
    } catch {
      parsedCardData = null;
    }
  }

  return {
    id: String(msg.id),
    conversation_id: String(msg.chatId ?? ""),
    sender_type: msg.senderId === currentUserId ? "user" : "business",
    text: msg.content,
    message_type: msg.messageType,
    card_data: parsedCardData,
    created_at: msg.createdAt,
    read_at: msg.readAt || null,
  };
}

export function useConversations() {
  const { user } = useAuth();

  const query = useGetConversationsQuery(undefined, {
    skip: !user,
    pollingInterval: 5000,
    refetchOnMountOrArgChange: true,
  });

  const mappedData = useMemo(
    () => (query.data ?? []).filter((c) => !c.isGroup).map((c) => mapConversation(c, user?.id)),
    [query.data, user?.id]
  );

  return {
    ...query,
    data: mappedData,
  };
}

export function useConversationMessages(conversationId: string | null) {
  const { user } = useAuth();
  const chatId = conversationId ? Number(conversationId) : NaN;

  const query = useGetChatMessagesQuery(
    { chatId, limit: 50 },
    {
      skip: !conversationId || Number.isNaN(chatId),
      pollingInterval: 1500,
      refetchOnMountOrArgChange: true,
    }
  );

  const mappedData = useMemo(
    () => (query.data?.messages ?? []).map((m) => mapMessage(m, user?.id)),
    [query.data?.messages, user?.id]
  );

  return {
    ...query,
    data: mappedData,
  };
}

export function useSendMessage() {
  const { user } = useAuth();
  const [sendMessageRest, sendMessageState] = useSendMessageRestMutation();
  const convQuery = useGetConversationsQuery(undefined, { skip: !user });

  const receiverIdByChatId = useMemo(() => {
    const map = new Map<number, number>();
    for (const c of convQuery.data ?? []) {
      if (!c.isGroup && c.otherUser?.id) {
        map.set(c.id, c.otherUser.id);
      }
    }
    return map;
  }, [convQuery.data]);

  return {
    isPending: sendMessageState.isLoading,
    mutateAsync: async ({
      conversationId,
      text,
      messageType = "text",
      receiverId,
    }: {
      conversationId: string;
      text: string;
      senderType?: string;
      messageType?: string;
      cardData?: any;
      receiverId?: number;
    }) => {
      const chatId = Number(conversationId);
      const resolvedReceiverId = receiverId ?? receiverIdByChatId.get(chatId);

      if (!resolvedReceiverId) {
        throw new Error("Unable to resolve chat receiver");
      }

      const msg = await sendMessageRest({
        receiverId: resolvedReceiverId,
        content: text,
        messageType,
      }).unwrap();

      return mapMessage(msg, user?.id);
    },
  };
}

export function useCreateConversation() {
  const { user } = useAuth();
  const [findOrCreateChat] = useFindOrCreateChatMutation();

  return {
    mutateAsync: async ({
      businessId,
      businessName,
      businessAvatar,
    }: {
      businessId: string;
      businessName: string;
      businessAvatar?: string;
    }) => {
      if (!user?.id) {
        throw new Error("User not authenticated. Please sign in again.");
      }

      const otherUserId = Number(businessId);
      if (Number.isNaN(otherUserId) || otherUserId <= 0) {
        throw new Error("Invalid user for starting chat");
      }

      const chat = await findOrCreateChat({ otherUserId }).unwrap();
      const now = new Date().toISOString();

      return {
        id: String(chat.id),
        user_id: String(user.id),
        business_id: String(otherUserId),
        business_name: chat.otherUser?.name || businessName || "Unknown User",
        business_avatar: chat.otherUser?.avatar || businessAvatar || null,
        business_phone: chat.otherUser?.phone || null,
        unread_count: 0,
        last_message_preview: null,
        created_at: now,
        updated_at: now,
      } as DbConversation;
    },
  };
}
