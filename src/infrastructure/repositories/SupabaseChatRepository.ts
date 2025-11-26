import type { ChatMessage, ChatRoom } from "@domain/entities";
import type {
  ChatRepository,
  CreateChatMessageInput
} from "@domain/repositories/ChatRepository";
import { BaseSupabaseRepository } from "./BaseSupabaseRepository";

type ChatRoomRow = {
  id: string;
  name: string;
  room_type: ChatRoom["roomType"];
  created_at: string;
};

type ChatMessageRow = {
  id: string;
  room_id: string;
  sender_id: string | null;
  content: string;
  message_type: ChatMessage["messageType"];
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const mapRoom = (row: ChatRoomRow): ChatRoom => ({
  id: row.id,
  name: row.name,
  roomType: row.room_type,
  createdAt: row.created_at
});

const mapMessage = (row: ChatMessageRow): ChatMessage => ({
  id: row.id,
  roomId: row.room_id,
  senderId: row.sender_id ?? undefined,
  content: row.content,
  messageType: row.message_type,
  metadata: row.metadata ?? undefined,
  createdAt: row.created_at
});

export class SupabaseChatRepository
  extends BaseSupabaseRepository
  implements ChatRepository
{
  async listRooms() {
    const { data, error } = await this.client
      .from("chat_rooms")
      .select("*")
      .order("created_at", { ascending: true });
    this.handleError("listar salas de chat", error);
    return (data ?? []).map((row) => mapRoom(row as ChatRoomRow));
  }

  async listMessages(roomId: string, limit = 50) {
    const { data, error } = await this.client
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(limit);
    this.handleError("listar mensajes", error);
    return (data ?? [])
      .map((row) => mapMessage(row as ChatMessageRow))
      .reverse();
  }

  async createMessage(payload: CreateChatMessageInput) {
    const { data, error } = await this.client
      .from("chat_messages")
      .insert({
        room_id: payload.roomId,
        sender_id: payload.senderId ?? null,
        content: payload.content,
        message_type: payload.messageType ?? "text",
        metadata: payload.metadata ?? null
      })
      .select("*")
      .single();
    this.handleError("crear mensaje de chat", error);
    return mapMessage(data as ChatMessageRow);
  }
}

