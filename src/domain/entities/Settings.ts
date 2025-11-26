import type { Nullable, Timestamp, UUID } from "./common";

export interface AppSetting {
  key: string;
  value: Record<string, unknown>;
  description?: string;
  updatedBy?: Nullable<UUID>;
  updatedAt: Timestamp;
}

