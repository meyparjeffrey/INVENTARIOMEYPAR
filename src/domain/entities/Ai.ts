import type { Nullable, Timestamp, UUID } from "./common";

export type SuggestionType =
  | "REORDER"
  | "BATCH_ALERT"
  | "STOCK_OPTIMIZATION"
  | "EXPIRY_WARNING"
  | "ANOMALY_DETECTED"
  | "FIFO_REMINDER";

export type SuggestionPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type SuggestionStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DISMISSED"
  | "EXPIRED"
  | "AUTO_RESOLVED";

export interface AiSuggestion {
  id: UUID;
  suggestionType: SuggestionType;
  priority: SuggestionPriority;
  title: string;
  description: string;
  actionData?: Nullable<Record<string, unknown>>;
  relatedEntityType?: Nullable<string>;
  relatedEntityId?: Nullable<UUID>;
  status: SuggestionStatus;
  expiresAt?: Nullable<Timestamp>;
  reviewedBy?: Nullable<UUID>;
  reviewedAt?: Nullable<Timestamp>;
  createdAt: Timestamp;
}

export interface AiPredictionCache {
  id: UUID;
  productId: UUID;
  predictionType: string;
  predictedValue: Record<string, unknown>;
  confidenceScore?: Nullable<number>;
  validUntil?: Nullable<Timestamp>;
  createdAt: Timestamp;
}

