import type {
  AiPredictionCache,
  AiSuggestion,
  SuggestionPriority,
  SuggestionStatus,
  UUID
} from "@domain/entities";

export interface AiSuggestionFilters {
  status?: SuggestionStatus;
  priority?: SuggestionPriority;
  limit?: number;
}

export interface CreateAiSuggestionInput {
  suggestionType: AiSuggestion["suggestionType"];
  priority: SuggestionPriority;
  title: string;
  description: string;
  actionData?: Record<string, unknown>;
  relatedEntityType?: string;
  relatedEntityId?: UUID;
  expiresAt?: string;
}

export interface UpdateSuggestionStatusInput {
  status: SuggestionStatus;
  reviewedBy?: UUID;
}

export interface AiPredictionInput {
  productId: UUID;
  predictionType: string;
  predictedValue: Record<string, unknown>;
  confidenceScore?: number;
  validUntil?: string;
}

export interface AiRepository {
  listSuggestions(filters?: AiSuggestionFilters): Promise<AiSuggestion[]>;
  createSuggestion(payload: CreateAiSuggestionInput): Promise<AiSuggestion>;
  updateSuggestionStatus(
    id: UUID,
    payload: UpdateSuggestionStatusInput
  ): Promise<AiSuggestion>;
  upsertPrediction(payload: AiPredictionInput): Promise<AiPredictionCache>;
}

