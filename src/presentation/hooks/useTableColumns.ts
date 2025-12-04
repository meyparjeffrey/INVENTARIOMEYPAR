import * as React from "react";
import { supabaseClient } from "@infrastructure/supabase/supabaseClient";
import { useAuth } from "../context/AuthContext";

export interface TableColumn {
  id: string;
  label: string;
  visible: boolean;
  width?: number;
  order: number;
  resizable?: boolean;
}

interface UseTableColumnsOptions {
  tableId: string; // Identificador único de la tabla (ej: "products")
  defaultColumns: TableColumn[];
  storageKey?: string; // Clave para localStorage (opcional)
}

/**
 * Hook para gestionar columnas personalizables de tablas.
 * Permite mostrar/ocultar, reordenar y redimensionar columnas.
 * Las preferencias se guardan en Supabase (user_settings) y localStorage.
 */
export function useTableColumns({
  tableId,
  defaultColumns,
  storageKey
}: UseTableColumnsOptions) {
  const { authContext } = useAuth();
  const storageKeyFinal = storageKey || `table_columns_${tableId}`;
  
  const [columns, setColumns] = React.useState<TableColumn[]>(defaultColumns);
  const [isLoading, setIsLoading] = React.useState(true);

  // Cargar preferencias desde Supabase o localStorage
  React.useEffect(() => {
    const loadColumns = async () => {
      try {
        setIsLoading(true);
        
        // Intentar cargar desde Supabase primero (por usuario)
        if (authContext?.profile?.id) {
          try {
            // Usar una clave específica por usuario en localStorage como fallback
            const userStorageKey = `${storageKeyFinal}_${authContext.profile.id}`;
            
            // Intentar cargar desde Supabase usando RPC o directamente
            const { data: settings, error } = await supabaseClient
              .from("user_settings")
              .select("*")
              .eq("user_id", authContext.profile.id)
              .single();

            if (!error && settings) {
              // Intentar leer table_columns desde settings (puede ser JSONB o campo específico)
              const customSettings = settings as any;
              
              // Si existe table_columns como JSONB
              if (customSettings?.table_columns && typeof customSettings.table_columns === "object") {
                const savedColumns = (customSettings.table_columns as Record<string, any>)[tableId];
                if (savedColumns && Array.isArray(savedColumns)) {
                  const mergedColumns = defaultColumns.map((defaultCol) => {
                    const savedCol = savedColumns.find((c: any) => c.id === defaultCol.id);
                    if (savedCol) {
                      return {
                        ...defaultCol,
                        visible: savedCol.visible ?? defaultCol.visible,
                        width: savedCol.width ?? defaultCol.width,
                        order: savedCol.order ?? defaultCol.order
                      };
                    }
                    return defaultCol;
                  }).sort((a, b) => a.order - b.order);
                  
                  setColumns(mergedColumns);
                  // También guardar en localStorage como backup
                  localStorage.setItem(userStorageKey, JSON.stringify(mergedColumns));
                  setIsLoading(false);
                  return;
                }
              }
            }
            
            // Si no hay en Supabase, intentar desde localStorage específico del usuario
            const userStored = localStorage.getItem(userStorageKey);
            if (userStored) {
              try {
                const savedColumns = JSON.parse(userStored);
                if (Array.isArray(savedColumns)) {
                  const mergedColumns = defaultColumns.map((defaultCol) => {
                    const savedCol = savedColumns.find((c: any) => c.id === defaultCol.id);
                    if (savedCol) {
                      return {
                        ...defaultCol,
                        visible: savedCol.visible ?? defaultCol.visible,
                        width: savedCol.width ?? defaultCol.width,
                        order: savedCol.order ?? defaultCol.order
                      };
                    }
                    return defaultCol;
                  }).sort((a, b) => a.order - b.order);
                  
                  setColumns(mergedColumns);
                  setIsLoading(false);
                  return;
                }
              } catch (parseError) {
                // eslint-disable-next-line no-console
                console.warn("[useTableColumns] Error parseando localStorage del usuario:", parseError);
              }
            }
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn("[useTableColumns] Error cargando desde Supabase:", error);
          }
        }

        // Fallback a localStorage
        const stored = localStorage.getItem(storageKeyFinal);
        if (stored) {
          try {
            const savedColumns = JSON.parse(stored);
            if (Array.isArray(savedColumns)) {
              const mergedColumns = defaultColumns.map((defaultCol) => {
                const savedCol = savedColumns.find((c: any) => c.id === defaultCol.id);
                if (savedCol) {
                  return {
                    ...defaultCol,
                    visible: savedCol.visible ?? defaultCol.visible,
                    width: savedCol.width ?? defaultCol.width,
                    order: savedCol.order ?? defaultCol.order
                  };
                }
                return defaultCol;
              }).sort((a, b) => a.order - b.order);
              
              setColumns(mergedColumns);
            }
          } catch (error) {
            // eslint-disable-next-line no-console
            console.warn("[useTableColumns] Error parseando localStorage:", error);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadColumns();
  }, [tableId, defaultColumns, storageKeyFinal, authContext?.profile?.id]);

  // Guardar preferencias
  const saveColumns = React.useCallback(async (newColumns: TableColumn[]) => {
    setColumns(newColumns);
    
    // Guardar en localStorage específico del usuario si está autenticado
    if (authContext?.profile?.id) {
      const userStorageKey = `${storageKeyFinal}_${authContext.profile.id}`;
      localStorage.setItem(userStorageKey, JSON.stringify(newColumns));
      
      // Guardar en Supabase usando RPC o update directo
      try {
        // Primero intentar obtener settings existentes
        const { data: existingSettings } = await supabaseClient
          .from("user_settings")
          .select("*")
          .eq("user_id", authContext.profile.id)
          .single();

        // Preparar el objeto table_columns
        let tableColumns: Record<string, any> = {};
        
        if (existingSettings?.table_columns && typeof existingSettings.table_columns === "object") {
          tableColumns = existingSettings.table_columns as Record<string, any>;
        }
        
        tableColumns[tableId] = newColumns;

        // Intentar actualizar usando RPC o update directo
        // Si la columna table_columns no existe, usaremos un campo JSONB genérico
        const { error: updateError } = await supabaseClient
          .from("user_settings")
          .upsert({
            user_id: authContext.profile.id,
            table_columns: tableColumns,
            updated_at: new Date().toISOString()
          } as any, {
            onConflict: "user_id"
          });

        if (updateError) {
          // Si falla porque no existe la columna, intentar con RPC
          // eslint-disable-next-line no-console
          console.warn("[useTableColumns] Error actualizando table_columns, puede que necesite migración:", updateError);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("[useTableColumns] Error guardando en Supabase:", error);
      }
    } else {
      // Si no hay usuario, usar localStorage genérico
      localStorage.setItem(storageKeyFinal, JSON.stringify(newColumns));
    }
  }, [tableId, storageKeyFinal, authContext?.profile?.id]);

  // Toggle visibilidad de columna
  const toggleColumnVisibility = React.useCallback((columnId: string) => {
    const newColumns = columns.map((col) =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    saveColumns(newColumns);
  }, [columns, saveColumns]);

  // Reordenar columnas (drag & drop)
  const reorderColumns = React.useCallback((fromIndex: number, toIndex: number) => {
    const newColumns = [...columns];
    const [moved] = newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, moved);
    
    // Actualizar orden
    const reordered = newColumns.map((col, index) => ({
      ...col,
      order: index
    }));
    
    saveColumns(reordered);
  }, [columns, saveColumns]);

  // Cambiar ancho de columna
  const resizeColumn = React.useCallback((columnId: string, newWidth: number) => {
    const newColumns = columns.map((col) =>
      col.id === columnId ? { ...col, width: newWidth } : col
    );
    saveColumns(newColumns);
  }, [columns, saveColumns]);

  // Resetear a valores por defecto
  const resetColumns = React.useCallback(() => {
    saveColumns(defaultColumns);
  }, [defaultColumns, saveColumns]);

  // Obtener columnas visibles ordenadas
  const visibleColumns = React.useMemo(() => {
    return columns
      .filter((col) => col.visible)
      .sort((a, b) => a.order - b.order);
  }, [columns]);

  return {
    columns,
    visibleColumns,
    isLoading,
    toggleColumnVisibility,
    reorderColumns,
    resizeColumn,
    resetColumns,
    saveColumns
  };
}

