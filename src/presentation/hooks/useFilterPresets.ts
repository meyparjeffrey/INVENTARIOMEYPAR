import * as React from "react";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import { useAuth } from "../context/AuthContext";
import type { ProductFiltersState } from "../components/products/ProductFilters";

export interface FilterPreset {
  id: string;
  name: string;
  filters: ProductFiltersState;
  createdAt: string;
  updatedAt: string;
}

interface UseFilterPresetsOptions {
  storageKey?: string;
}

/**
 * Hook para gestionar presets de filtros guardados por usuario.
 */
export function useFilterPresets({ storageKey = "product_filter_presets" }: UseFilterPresetsOptions = {}) {
  const { authContext } = useAuth();
  const [presets, setPresets] = React.useState<FilterPreset[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const userStorageKey = authContext?.profile?.id 
    ? `${storageKey}_${authContext.profile.id}` 
    : storageKey;

  // Cargar presets
  React.useEffect(() => {
    const loadPresets = async () => {
      try {
        setIsLoading(true);

        // Intentar cargar desde Supabase
        if (authContext?.profile?.id) {
          try {
            const { data: settings } = await supabaseClient
              .from("user_settings")
              .select("*")
              .eq("user_id", authContext.profile.id)
              .single();

            const customSettings = settings as any;
            if (customSettings?.filter_presets && Array.isArray(customSettings.filter_presets)) {
              setPresets(customSettings.filter_presets);
              setIsLoading(false);
              return;
            }
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn("[useFilterPresets] Error cargando desde Supabase:", error);
          }
        }

        // Fallback a localStorage
        const stored = localStorage.getItem(userStorageKey);
        if (stored) {
          try {
            const savedPresets = JSON.parse(stored);
            if (Array.isArray(savedPresets)) {
              setPresets(savedPresets);
            }
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn("[useFilterPresets] Error parseando localStorage:", error);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadPresets();
  }, [userStorageKey, authContext?.profile?.id]);

  // Guardar presets
  const savePresets = React.useCallback(async (newPresets: FilterPreset[]) => {
    setPresets(newPresets);
    
    // Guardar en localStorage
    localStorage.setItem(userStorageKey, JSON.stringify(newPresets));
    
    // Guardar en Supabase si hay usuario autenticado
    if (authContext?.profile?.id) {
      try {
        const { data: existingSettings } = await supabaseClient
          .from("user_settings")
          .select("*")
          .eq("user_id", authContext.profile.id)
          .single();

        await supabaseClient
          .from("user_settings")
          .upsert({
            user_id: authContext.profile.id,
            filter_presets: newPresets,
            updated_at: new Date().toISOString()
          } as any, {
            onConflict: "user_id"
          });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("[useFilterPresets] Error guardando en Supabase:", error);
      }
    }
  }, [userStorageKey, authContext?.profile?.id]);

  // Guardar un nuevo preset
  const savePreset = React.useCallback(async (name: string, filters: ProductFiltersState) => {
    const newPreset: FilterPreset = {
      id: `preset_${Date.now()}`,
      name,
      filters,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newPresets = [...presets, newPreset];
    await savePresets(newPresets);
    return newPreset;
  }, [presets, savePresets]);

  // Eliminar un preset
  const deletePreset = React.useCallback(async (presetId: string) => {
    const newPresets = presets.filter((p) => p.id !== presetId);
    await savePresets(newPresets);
  }, [presets, savePresets]);

  // Actualizar un preset
  const updatePreset = React.useCallback(async (presetId: string, updates: Partial<FilterPreset>) => {
    const newPresets = presets.map((p) =>
      p.id === presetId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    );
    await savePresets(newPresets);
  }, [presets, savePresets]);

  return {
    presets,
    isLoading,
    savePreset,
    deletePreset,
    updatePreset,
    savePresets
  };
}

