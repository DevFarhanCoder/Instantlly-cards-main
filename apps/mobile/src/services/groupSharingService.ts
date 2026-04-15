/**
 * Group Sharing Service — minimal mock/service layer.
 * Replace the mock implementations with real API calls as the backend is ready.
 */

export interface GroupParticipant {
  id: string;
  name: string;
  photoUrl?: string;
  isOnline: boolean;
  isAdmin: boolean;
}

export interface GroupSession {
  sessionId: string;
  code: string; // 4-digit numeric
  adminId: string;
  adminName: string;
  status: 'waiting' | 'sharing' | 'connected' | 'ended';
  participantSharing: boolean; // can participants share with each other
  participants: GroupParticipant[];
  expiresAt: number; // timestamp ms
}

export interface JoinResult {
  session: GroupSession;
}

export interface CreateResult {
  session: GroupSession;
  code: string;
}

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function generateCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

const activeSessions: Map<string, GroupSession> = new Map();

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createGroupSession(
  adminId: string,
  adminName: string,
  participantSharing: boolean,
): Promise<CreateResult> {
  // Simulate network delay
  await delay(600);

  const code = generateCode();
  const sessionId = `session_${Date.now()}`;
  const session: GroupSession = {
    sessionId,
    code,
    adminId,
    adminName,
    status: 'waiting',
    participantSharing,
    participants: [
      { id: adminId, name: adminName, isOnline: true, isAdmin: true },
    ],
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  activeSessions.set(code, session);
  return { session, code };
}

// ─── Join ─────────────────────────────────────────────────────────────────────

export async function joinGroupSession(
  code: string,
  userId: string,
  userName: string,
): Promise<JoinResult> {
  await delay(700);

  const session = activeSessions.get(code);
  if (!session) {
    throw { type: 'NOT_FOUND', message: 'No active group found with this code.' };
  }
  if (Date.now() > session.expiresAt) {
    throw { type: 'EXPIRED', message: 'This group code has expired. Please ask for a new code.' };
  }

  // Add participant if not already in
  const exists = session.participants.find((p) => p.id === userId);
  if (!exists) {
    session.participants.push({
      id: userId,
      name: userName,
      isOnline: true,
      isAdmin: false,
    });
  }

  return { session: { ...session } };
}

// ─── Poll (get current state) ─────────────────────────────────────────────────

export async function pollGroupSession(code: string): Promise<GroupSession | null> {
  await delay(100);
  const session = activeSessions.get(code);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(code);
    return null;
  }
  return { ...session, participants: [...session.participants] };
}

// ─── Start sharing ────────────────────────────────────────────────────────────

export async function startGroupSharing(code: string): Promise<GroupSession> {
  await delay(400);
  const session = activeSessions.get(code);
  if (!session) throw new Error('Session not found');
  session.status = 'sharing';
  return { ...session };
}

// ─── End / leave ─────────────────────────────────────────────────────────────

export async function leaveGroupSession(code: string, userId: string): Promise<void> {
  await delay(200);
  const session = activeSessions.get(code);
  if (!session) return;
  // Admin ending deletes session
  if (session.adminId === userId) {
    activeSessions.delete(code);
  } else {
    session.participants = session.participants.filter((p) => p.id !== userId);
  }
}

export async function endGroupSession(code: string): Promise<void> {
  await delay(200);
  activeSessions.delete(code);
}

// ─── Share cards ──────────────────────────────────────────────────────────────

export async function submitCards(
  _code: string,
  _cardIds: string[],
  _defaultCardId: string | null,
): Promise<void> {
  await delay(500);
  // In real impl: POST /api/group-sharing/submit-cards
}

// ─── Map real API GroupInfo → GroupSession ────────────────────────────────────

export function mapGroupInfoToSession(
  group: {
    id: number;
    name: string;
    joinCode: string;
    adminId: number;
    adminName?: string;
    members?: { id: number; name: string; avatar?: string; role: string }[];
    memberCount?: number;
  },
  currentUserId: string,
): GroupSession {
  const members = group.members ?? [];
  return {
    sessionId: String(group.id),
    code: group.joinCode,
    adminId: String(group.adminId),
    adminName: group.adminName ?? '',
    status: 'waiting',
    participantSharing: true,
    participants: members.length > 0
      ? members.map((m) => ({
          id: String(m.id),
          name: m.name,
          photoUrl: m.avatar,
          isOnline: true,
          isAdmin: m.role === 'admin',
        }))
      : [{ id: currentUserId, name: group.adminName ?? 'You', isOnline: true, isAdmin: true }],
    expiresAt: Date.now() + 30 * 60 * 1000, // 30 min for real sessions
  };
}

// ─── Map server errors to user-facing messages ────────────────────────────────

export function mapJoinError(err: any): string {
  if (!err) return 'Unable to join group. Please check the code and try again.';
  const type = err?.type;
  if (type === 'NOT_FOUND') return 'No active group found with this code.';
  if (type === 'EXPIRED') return 'This group code has expired. Please ask for a new code.';
  if (type === 'INVALID') return 'The code you entered is not valid. Please check and try again.';
  return 'Unable to join group. Please check the code and try again.';
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
