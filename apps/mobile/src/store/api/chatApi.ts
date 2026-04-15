import { baseApi } from './baseApi';

export interface ChatConversation {
  id: number;
  isGroup: boolean;
  groupId: number | null;
  groupName: string | null;
  groupIcon: string | null;
  otherUser: { id: number; name: string; phone: string; avatar?: string } | null;
  lastMessage: {
    id: number;
    content: string;
    messageType: string;
    senderId: number;
    senderName?: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  isMuted: boolean;
  lastMessageTime: string;
}

export interface ChatMessage {
  id: number;
  senderId: number;
  receiverId?: number;
  chatId?: number;
  groupId?: number;
  content: string;
  messageType: string;
  isRead: boolean;
  readAt?: string;
  isDelivered: boolean;
  deliveredAt?: string;
  localMessageId?: string;
  metadata?: any;
  createdAt: string;
  sender: { id: number; name: string; phone: string; avatar?: string };
}

export interface GroupInfo {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  joinCode: string;
  adminId: number;
  adminName?: string;
  memberCount: number;
  myRole: string;
  isMuted: boolean;
  lastMessage: {
    id: number;
    content: string;
    senderId: number;
    senderName?: string;
    createdAt: string;
  } | null;
  lastMessageTime: string;
  createdAt: string;
}

export interface GroupDetail {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  joinCode: string;
  admin: { id: number; name: string; phone: string; avatar?: string };
  members: {
    id: number;
    name: string;
    phone: string;
    avatar?: string;
    role: string;
    joinedAt: string;
  }[];
  myRole: string;
  createdAt: string;
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // ── Chats ───────────────────────────────────────────────────────
    getConversations: build.query<ChatConversation[], void>({
      query: () => '/chats',
      providesTags: ['Chat'],
    }),

    getChatMessages: build.query<
      { messages: ChatMessage[]; nextCursor: number | null },
      { chatId: number; cursor?: number; limit?: number }
    >({
      query: ({ chatId, cursor, limit = 50 }) => ({
        url: `/chats/${chatId}/messages`,
        params: { ...(cursor && { cursor }), limit },
      }),
      providesTags: (_r, _e, { chatId }) => [{ type: 'ChatMessages' as any, id: chatId }],
    }),

    findOrCreateChat: build.mutation<
      { id: number; isGroup: boolean; otherUser: any },
      { otherUserId: number }
    >({
      query: (body) => ({ url: '/chats/find-or-create', method: 'POST', body }),
      invalidatesTags: ['Chat'],
    }),

    toggleMuteChat: build.mutation<{ ok: boolean }, { chatId: number; muted: boolean }>({
      query: ({ chatId, muted }) => ({
        url: `/chats/${chatId}/mute`,
        method: 'PUT',
        body: { muted },
      }),
      invalidatesTags: ['Chat'],
    }),

    // ── Groups ──────────────────────────────────────────────────────
    getGroups: build.query<GroupInfo[], void>({
      query: () => '/groups',
      providesTags: ['Group'],
    }),

    getGroupDetail: build.query<GroupDetail, number>({
      query: (groupId) => `/groups/${groupId}`,
      providesTags: (_r, _e, id) => [{ type: 'Group', id }],
    }),

    getGroupMessages: build.query<
      { messages: ChatMessage[]; nextCursor: number | null },
      { groupId: number; cursor?: number; limit?: number }
    >({
      query: ({ groupId, cursor, limit = 50 }) => ({
        url: `/groups/${groupId}/messages`,
        params: { ...(cursor && { cursor }), limit },
      }),
      providesTags: (_r, _e, { groupId }) => [{ type: 'GroupMessages' as any, id: groupId }],
    }),

    createGroup: build.mutation<GroupInfo, { name: string; description?: string; icon?: string; memberIds?: number[] }>({
      query: (body) => ({ url: '/groups', method: 'POST', body }),
      invalidatesTags: ['Group'],
    }),

    joinGroup: build.mutation<{ id: number; name: string; alreadyMember: boolean }, { joinCode: string }>({
      query: (body) => ({ url: '/groups/join', method: 'POST', body }),
      invalidatesTags: ['Group'],
    }),

    updateGroup: build.mutation<any, { groupId: number; name?: string; description?: string; icon?: string }>({
      query: ({ groupId, ...body }) => ({ url: `/groups/${groupId}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { groupId }) => [{ type: 'Group', id: groupId }],
    }),

    addGroupMembers: build.mutation<{ added: number }, { groupId: number; memberIds: number[] }>({
      query: ({ groupId, memberIds }) => ({
        url: `/groups/${groupId}/members`,
        method: 'POST',
        body: { memberIds },
      }),
      invalidatesTags: (_r, _e, { groupId }) => [{ type: 'Group', id: groupId }],
    }),

    removeGroupMember: build.mutation<{ ok: boolean }, { groupId: number; memberId: number }>({
      query: ({ groupId, memberId }) => ({
        url: `/groups/${groupId}/members/${memberId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { groupId }) => [{ type: 'Group', id: groupId }],
    }),

    // ── Messages (REST fallback) ────────────────────────────────────
    sendMessageRest: build.mutation<
      ChatMessage,
      { receiverId?: number; groupId?: number; content: string; messageType?: string }
    >({
      query: (body) => ({ url: '/messages/send', method: 'POST', body }),
      invalidatesTags: ['Chat', 'Group'],
    }),

    deleteMessage: build.mutation<{ ok: boolean }, number>({
      query: (messageId) => ({ url: `/messages/${messageId}`, method: 'DELETE' }),
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetChatMessagesQuery,
  useFindOrCreateChatMutation,
  useToggleMuteChatMutation,
  useGetGroupsQuery,
  useGetGroupDetailQuery,
  useGetGroupMessagesQuery,
  useCreateGroupMutation,
  useJoinGroupMutation,
  useUpdateGroupMutation,
  useAddGroupMembersMutation,
  useRemoveGroupMemberMutation,
  useSendMessageRestMutation,
  useDeleteMessageMutation,
} = chatApi;
