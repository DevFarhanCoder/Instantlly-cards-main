/**
 * Socket.IO client service for real-time chat.
 * Connects to the backend with JWT auth and provides event helpers.
 */
import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
  'http://localhost:8080';

let socket: Socket | null = null;
let currentToken: string | null = null;

type MessagePayload = {
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
  sender?: { id: number; name: string; phone: string; avatar?: string };
};

type SocketEvents = {
  new_message: (msg: MessagePayload) => void;
  new_group_message: (msg: MessagePayload) => void;
  message_delivered: (data: { messageId: number; localMessageId?: string }) => void;
  messages_delivered: (data: { messageIds: number[]; deliveredTo: number }) => void;
  messages_read: (data: { chatId: number; readBy: number; readAt: string }) => void;
  typing: (data: { userId: number; chatId?: number; groupId?: number }) => void;
  typing_stop: (data: { userId: number; chatId?: number; groupId?: number }) => void;
  user_online: (data: { userId: number }) => void;
  user_offline: (data: { userId: number }) => void;
  'group:sharing_started': (data: { groupId: number; joinCode: string }) => void;
};

const listeners = new Map<string, Set<(...args: any[]) => void>>();

function getSocket(): Socket | null {
  return socket;
}

async function connect(): Promise<Socket> {
  if (socket?.connected) return socket;

  const token = await SecureStore.getItemAsync('accessToken');
  if (!token) throw new Error('No access token');

  // Reuse if token hasn't changed
  if (socket && currentToken === token) {
    socket.connect();
    return socket;
  }

  // Disconnect old socket
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  currentToken = token;
  socket = io(API_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  // Re-attach event listeners
  for (const [event, fns] of listeners) {
    for (const fn of fns) {
      socket.on(event, fn);
    }
  }

  return socket;
}

function disconnect() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
  listeners.clear();
}

function on<K extends keyof SocketEvents>(event: K, handler: SocketEvents[K]) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(handler);
  if (socket) socket.on(event, handler as any);
}

function off<K extends keyof SocketEvents>(event: K, handler: SocketEvents[K]) {
  listeners.get(event)?.delete(handler);
  if (socket) socket.off(event, handler as any);
}

function sendMessage(
  data: { receiverId: number; content: string; messageType?: string; localMessageId?: string; metadata?: any },
): Promise<{ ok: boolean; message?: MessagePayload; error?: string }> {
  return new Promise((resolve) => {
    if (!socket?.connected) {
      return resolve({ ok: false, error: 'Not connected' });
    }
    socket.emit('send_message', data, (res: any) => resolve(res));
  });
}

function sendGroupMessage(
  data: { groupId: number; content: string; messageType?: string; localMessageId?: string; metadata?: any },
): Promise<{ ok: boolean; message?: MessagePayload; error?: string }> {
  return new Promise((resolve) => {
    if (!socket?.connected) {
      return resolve({ ok: false, error: 'Not connected' });
    }
    socket.emit('send_group_message', data, (res: any) => resolve(res));
  });
}

function joinGroup(groupId: number) {
  socket?.emit('join_group', groupId);
}

function leaveGroupRoom(groupId: number) {
  socket?.emit('leave_group_room', groupId);
}

function emitTyping(data: { chatId?: number; groupId?: number }) {
  socket?.emit('typing_start', data);
}

function emitTypingStop(data: { chatId?: number; groupId?: number }) {
  socket?.emit('typing_stop', data);
}

function markRead(data: { chatId?: number; groupId?: number }) {
  socket?.emit('mark_read', data);
}

function getOnlineUsers(): Promise<number[]> {
  return new Promise((resolve) => {
    if (!socket?.connected) return resolve([]);
    socket.emit('get_online_users', (ids: number[]) => resolve(ids));
  });
}

function isConnected(): boolean {
  return socket?.connected ?? false;
}

export const socketService = {
  getSocket,
  connect,
  disconnect,
  on,
  off,
  sendMessage,
  sendGroupMessage,
  joinGroup,
  leaveGroupRoom,
  emitTyping,
  emitTypingStop,
  markRead,
  getOnlineUsers,
  isConnected,
};

export type { MessagePayload };
