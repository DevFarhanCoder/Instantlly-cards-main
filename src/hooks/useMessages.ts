import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export interface DbConversation {
  id: string;
  user_id: string;
  business_id: string;
  business_name: string;
  business_avatar: string | null;
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
}

export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as DbConversation[];
    },
    enabled: !!user,
  });
}

export function useConversationMessages(conversationId: string | null) {
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as DbMessage[];
    },
    enabled: !!conversationId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient]);

  // Mark unread messages as read when conversation is opened
  useEffect(() => {
    if (!conversationId) return;
    const markRead = async () => {
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() } as any)
        .eq("conversation_id", conversationId)
        .neq("sender_type", "user")
        .is("read_at" as any, null);
    };
    markRead();
  }, [conversationId]);

  return messagesQuery;
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, text, senderType = "user", messageType = "text", cardData }: {
      conversationId: string;
      text: string;
      senderType?: string;
      messageType?: string;
      cardData?: any;
    }) => {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          text,
          sender_type: senderType,
          message_type: messageType,
          card_data: cardData,
        })
        .select()
        .single();
      if (error) throw error;
      // Update conversation timestamp
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["messages", data.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useCreateConversation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ businessId, businessName, businessAvatar }: {
      businessId: string;
      businessName: string;
      businessAvatar?: string;
    }) => {
      // Check if conversation exists
      const { data: existing } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user!.id)
        .eq("business_id", businessId)
        .maybeSingle();
      if (existing) return existing as DbConversation;

      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: user!.id, business_id: businessId, business_name: businessName, business_avatar: businessAvatar })
        .select()
        .single();
      if (error) throw error;
      return data as DbConversation;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}
