import type { Nullable, Timestamp, UUID } from "./common";

export type ChatRoomType = "general" | "ai_assistant" | "private";

export interface ChatRoom {
  id: UUID;
  name: string;
  roomType: ChatRoomType;
  createdAt: Timestamp;
}

export type ChatMessageType = "text" | "ai_response" | "system";

export interface ChatMessage {
  id: UUID;
  roomId: UUID;
  senderId?: Nullable<UUID>;
  content: string;
  messageType: ChatMessageType;
  metadata?: Nullable<Record<string, unknown>>;
  createdAt: Timestamp;
}

