/**
 * Repositorio de Supabase para plantillas de informes.
 *
 * Gestiona las operaciones CRUD de plantillas de informes personalizados
 * en la tabla report_templates de Supabase.
 *
 * @module @infrastructure/repositories/SupabaseReportTemplateRepository
 */

import { supabaseClient } from '../supabase/supabaseClient';
import type { UUID } from '@domain/entities/common';

/**
 * Plantilla de informe personalizado.
 */
export interface ReportTemplate {
  id: UUID;
  name: string;
  description?: string;
  config: {
    tables: string[];
    fields: Record<string, string[]>;
    filters?: Record<string, unknown>;
    visualizations: Array<{
      type: string;
      dataSource: string;
      xAxis?: string;
      yAxis?: string;
      groupBy?: string;
    }>;
  };
  createdBy: UUID;
  createdAt: string;
  updatedAt: string;
}

/**
 * Repositorio de Supabase para plantillas de informes.
 */
export class SupabaseReportTemplateRepository {
  /**
   * Obtiene todas las plantillas del usuario actual.
   */
  async getAll(): Promise<ReportTemplate[]> {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session?.user?.id) {
      return [];
    }

    const { data, error } = await supabaseClient
      .from('report_templates')
      .select('*')
      .eq('created_by', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error obteniendo plantillas: ${error.message}`);
    }

    return (data || []).map(this.mapToReportTemplate);
  }

  /**
   * Obtiene una plantilla por ID.
   */
  async getById(id: UUID): Promise<ReportTemplate | null> {
    const { data, error } = await supabaseClient
      .from('report_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Error obteniendo plantilla: ${error.message}`);
    }

    return data ? this.mapToReportTemplate(data) : null;
  }

  /**
   * Crea una nueva plantilla.
   */
  async create(
    template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
  ): Promise<ReportTemplate> {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session?.user?.id) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await supabaseClient
      .from('report_templates')
      .insert({
        name: template.name,
        description: template.description,
        config: template.config,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creando plantilla: ${error.message}`);
    }

    return this.mapToReportTemplate(data);
  }

  /**
   * Actualiza una plantilla existente.
   */
  async update(
    id: UUID,
    updates: Partial<Omit<ReportTemplate, 'id' | 'createdAt' | 'createdBy'>>,
  ): Promise<ReportTemplate> {
    const { data, error } = await supabaseClient
      .from('report_templates')
      .update({
        name: updates.name,
        description: updates.description,
        config: updates.config,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error actualizando plantilla: ${error.message}`);
    }

    return this.mapToReportTemplate(data);
  }

  /**
   * Elimina una plantilla.
   */
  async delete(id: UUID): Promise<void> {
    const { error } = await supabaseClient
      .from('report_templates')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error eliminando plantilla: ${error.message}`);
    }
  }

  /**
   * Mapea una fila de Supabase a ReportTemplate.
   */
  private mapToReportTemplate(row: any): ReportTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      config: row.config,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
