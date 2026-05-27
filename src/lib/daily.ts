/**
 * Daily.co Video Consultation Integration
 * Docs: https://docs.daily.co/reference
 * Install: npm install @daily-co/daily-js (client-side only)
 */

const DAILY_API_URL = "https://api.daily.co/v1";
const DAILY_API_KEY = process.env.DAILY_API_KEY;

export interface DailyRoom {
  id: string;
  name: string;
  url: string;
  privacy: "public" | "private";
  config: Record<string, unknown>;
  created_at: string;
}

export interface DailyToken {
  token: string;
}

export async function createRoom(options: {
  name?: string;
  expiresAt?: Date;
  maxParticipants?: number;
  enableRecording?: boolean;
}): Promise<DailyRoom> {
  if (!DAILY_API_KEY) throw new Error("DAILY_API_KEY not configured");

  const roomName = options.name || `xcare-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const response = await fetch(`${DAILY_API_URL}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      name: roomName,
      privacy: "private",
      properties: {
        exp: options.expiresAt
          ? Math.floor(options.expiresAt.getTime() / 1000)
          : Math.floor(Date.now() / 1000) + 3600, // 1 hour default
        max_participants: options.maxParticipants || 10,
        enable_recording: options.enableRecording ? "cloud" : "off",
        enable_chat: true,
        enable_knocking: true,
        lang: "de",
        // German data residency
        geo: "eu",
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Daily.co room creation failed: ${err}`);
  }

  return response.json();
}

export async function deleteRoom(roomName: string): Promise<void> {
  if (!DAILY_API_KEY) return;
  await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
  });
}

export async function createMeetingToken(options: {
  roomName: string;
  userId: string;
  userName: string;
  isOwner?: boolean;
  expiresAt?: Date;
}): Promise<string> {
  if (!DAILY_API_KEY) throw new Error("DAILY_API_KEY not configured");

  const response = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: options.roomName,
        user_id: options.userId,
        user_name: options.userName,
        is_owner: options.isOwner || false,
        exp: options.expiresAt
          ? Math.floor(options.expiresAt.getTime() / 1000)
          : Math.floor(Date.now() / 1000) + 3600,
        enable_recording: options.isOwner ? "cloud" : "off",
      },
    }),
  });

  if (!response.ok) throw new Error("Token creation failed");
  const data: DailyToken = await response.json();
  return data.token;
}
