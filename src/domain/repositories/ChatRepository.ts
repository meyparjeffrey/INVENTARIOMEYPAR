import type { ChatMessage, ChatRoom, UUID } from "@domain/entities";

export interface CreateChatMessageInput {
  roomId: UUID;
  senderId?: UUID;
  content: string;
  messageType?: ChatMessage["messageType"];
  metadata?: Record<string, unknown>;
}

export interface ChatRepository {
  listRooms(): Promise<ChatRoom[]>;
  listMessages(roomId: UUID, limit?: number): Promise<ChatMessage[]>;
  createMessage(payload: CreateChatMessageInput): Promise<ChatMessage>;
}

