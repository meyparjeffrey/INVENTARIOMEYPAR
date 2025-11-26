import * as React from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";

/**
 * Hook genérico para suscripciones en tiempo real de Supabase.
 * 
 * @param table - Nombre de la tabla a escuchar
 * @param filter - Filtro opcional (ej: "id=eq.123")
 * @param onInsert - Callback cuando se inserta un registro
 * @param onUpdate - Callback cuando se actualiza un registro
 * @param onDelete - Callback cuando se elimina un registro
 */
export function useRealtime<T = any>({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete
}: {
  table: string;
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: T) => void;
}) {
  const channelRef = React.useRef<RealtimeChannel | null>(null);

  React.useEffect(() => {
    // Crear canal de suscripción
    const channelName = filter ? `${table}:${filter}` : table;
    const channel = supabaseClient
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: filter ? filter : undefined
        },
        (payload) => {
          if (payload.eventType === "INSERT" && onInsert) {
            onInsert(payload.new as T);
          } else if (payload.eventType === "UPDATE" && onUpdate) {
            onUpdate(payload.new as T);
          } else if (payload.eventType === "DELETE" && onDelete) {
            onDelete(payload.old as T);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      // Limpiar suscripción al desmontar
      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, filter, onInsert, onUpdate, onDelete]);
}

