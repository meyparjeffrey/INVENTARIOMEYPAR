/**
 * Repositorio de Supabase para programaciones de informes.
 *
 * Gestiona las operaciones CRUD de programaciones de informes
 * en la tabla report_schedules de Supabase.
 *
 * @module @infrastructure/repositories/SupabaseReportScheduleRepository
 */

import { supabaseClient } from '../supabase/supabaseClient';
import type { ReportSchedule } from '@domain/entities/Report';
import type { UUID } from '@domain/entities/common';

/**
 * Repositorio de Supabase para programaciones de informes.
 */
export class SupabaseReportScheduleRepository {
  /**
   * Obtiene todas las programaciones de informes del usuario actual.
   */
  async getAll(): Promise<ReportSchedule[]> {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session?.user?.id) {
      return [];
    }

    const { data, error } = await supabaseClient
      .from('report_schedules')
      .select('*')
      .eq('created_by', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error obteniendo programaciones: ${error.message}`);
    }

    return (data || []).map(this.mapToReportSchedule);
  }

  /**
   * Obtiene una programación por ID.
   */
  async getById(id: UUID): Promise<ReportSchedule | null> {
    const { data, error } = await supabaseClient
      .from('report_schedules')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Error obteniendo programación: ${error.message}`);
    }

    return data ? this.mapToReportSchedule(data) : null;
  }

  /**
   * Crea una nueva programación.
   */
  async create(schedule: Omit<ReportSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportSchedule> {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session?.user?.id) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await supabaseClient
      .from('report_schedules')
      .insert({
        report_type: schedule.reportType,
        frequency: schedule.frequency,
        time: schedule.time,
        day_of_week: schedule.dayOfWeek,
        day_of_month: schedule.dayOfMonth,
        recipients: schedule.recipients,
        formats: schedule.format,
        enabled: schedule.enabled,
        filters: schedule.filters,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creando programación: ${error.message}`);
    }

    return this.mapToReportSchedule(data);
  }

  /**
   * Actualiza una programación existente.
   */
  async update(
    id: UUID,
    updates: Partial<Omit<ReportSchedule, 'id' | 'createdAt' | 'createdBy'>>,
  ): Promise<ReportSchedule> {
    const { data, error } = await supabaseClient
      .from('report_schedules')
      .update({
        report_type: updates.reportType,
        frequency: updates.frequency,
        time: updates.time,
        day_of_week: updates.dayOfWeek,
        day_of_month: updates.dayOfMonth,
        recipients: updates.recipients,
        formats: updates.format,
        enabled: updates.enabled,
        filters: updates.filters,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Error actualizando programación: ${error.message}`);
    }

    return this.mapToReportSchedule(data);
  }

  /**
   * Elimina una programación.
   */
  async delete(id: UUID): Promise<void> {
    const { error } = await supabaseClient
      .from('report_schedules')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error eliminando programación: ${error.message}`);
    }
  }

  /**
   * Mapea una fila de Supabase a ReportSchedule.
   */
  private mapToReportSchedule(row: any): ReportSchedule {
    return {
      id: row.id,
      reportType: row.report_type,
      frequency: row.frequency,
      time: row.time,
      dayOfWeek: row.day_of_week,
      dayOfMonth: row.day_of_month,
      recipients: row.recipients || [],
      format: row.formats || ['xlsx'],
      enabled: row.enabled ?? true,
      filters: row.filters || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
