import type {
  AiPredictionCache,
  AiSuggestion
} from "@domain/entities";
import type {
  AiPredictionInput,
  AiRepository,
  AiSuggestionFilters,
  CreateAiSuggestionInput,
  UpdateSuggestionStatusInput
} from "@domain/repositories/AiRepository";
import { BaseSupabaseRepository } from "./BaseSupabaseRepository";

type SuggestionRow = {
  id: string;
  suggestion_type: AiSuggestion["suggestionType"];
  priority: AiSuggestion["priority"];
  title: string;
  description: string;
  action_data: Record<string, unknown> | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  status: AiSuggestion["status"];
  expires_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type PredictionRow = {
  id: string;
  product_id: string;
  prediction_type: string;
  predicted_value: Record<string, unknown>;
  confidence_score: number | null;
  valid_until: string | null;
  created_at: string;
};

const mapSuggestion = (row: SuggestionRow): AiSuggestion => ({
  id: row.id,
  suggestionType: row.suggestion_type,
  priority: row.priority,
  title: row.title,
  description: row.description,
  actionData: row.action_data ?? undefined,
  relatedEntityType: row.related_entity_type ?? undefined,
  relatedEntityId: row.related_entity_id ?? undefined,
  status: row.status,
  expiresAt: row.expires_at ?? undefined,
  reviewedBy: row.reviewed_by ?? undefined,
  reviewedAt: row.reviewed_at ?? undefined,
  createdAt: row.created_at
});

const mapPrediction = (row: PredictionRow): AiPredictionCache => ({
  id: row.id,
  productId: row.product_id,
  predictionType: row.prediction_type,
  predictedValue: row.predicted_value,
  confidenceScore: row.confidence_score ?? undefined,
  validUntil: row.valid_until ?? undefined,
  createdAt: row.created_at
});

export class SupabaseAiRepository
  extends BaseSupabaseRepository
  implements AiRepository
{
  async listSuggestions(filters?: AiSuggestionFilters) {
    let query = this.client
      .from("ai_suggestions")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    } else {
      query = query.eq("status", "PENDING");
    }

    if (filters?.priority) {
      query = query.eq("priority", filters.priority);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    this.handleError("listar sugerencias IA", error);
    return (data ?? []).map((row) => mapSuggestion(row as SuggestionRow));
  }

  async createSuggestion(payload: CreateAiSuggestionInput) {
    const { data, error } = await this.client
      .from("ai_suggestions")
      .insert({
        suggestion_type: payload.suggestionType,
        priority: payload.priority,
        title: payload.title,
        description: payload.description,
        action_data: payload.actionData ?? null,
        related_entity_type: payload.relatedEntityType ?? null,
        related_entity_id: payload.relatedEntityId ?? null,
        expires_at: payload.expiresAt ?? null
      })
      .select("*")
      .single();

    this.handleError("crear sugerencia IA", error);
    return mapSuggestion(data as SuggestionRow);
  }

  async updateSuggestionStatus(id: string, payload: UpdateSuggestionStatusInput) {
    const { data, error } = await this.client
      .from("ai_suggestions")
      .update({
        status: payload.status,
        reviewed_by: payload.reviewedBy ?? null,
        reviewed_at: payload.reviewedBy ? new Date().toISOString() : null
      })
      .eq("id", id)
      .select("*")
      .single();

    this.handleError("actualizar sugerencia IA", error);
    return mapSuggestion(data as SuggestionRow);
  }

  async upsertPrediction(payload: AiPredictionInput) {
    const { data, error } = await this.client
      .from("ai_prediction_cache")
      .upsert(
        {
          product_id: payload.productId,
          prediction_type: payload.predictionType,
          predicted_value: payload.predictedValue,
          confidence_score: payload.confidenceScore ?? null,
          valid_until: payload.validUntil ?? null
        },
        {
          onConflict: "product_id,prediction_type"
        }
      )
      .select("*")
      .single();

    this.handleError("actualizar caché IA", error);
    return mapPrediction(data as PredictionRow);
  }
}

