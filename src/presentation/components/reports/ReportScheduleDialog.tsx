/**
 * Diálogo para programar informes.
 *
 * Permite configurar la frecuencia, hora, destinatarios
 * y formato de informes programados.
 *
 * @module @presentation/components/reports/ReportScheduleDialog
 */

import { Calendar, Clock, Mail, Save, X } from 'lucide-react';
import * as React from 'react';
import { Button } from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';
import type { ReportSchedule, ExportFormat, ReportType } from '@domain/entities/Report';

export interface ReportScheduleDialogProps {
  reportType: string;
  open: boolean;
  onClose: () => void;
  onSave: (schedule: ReportSchedule) => void;
  existingSchedule?: ReportSchedule | null;
}

/**
 * Diálogo para programar informes.
 */
export function ReportScheduleDialog({
  reportType,
  open,
  onClose,
  onSave,
  existingSchedule,
}: ReportScheduleDialogProps) {
  const { t, language } = useLanguage();
  const [schedule, setSchedule] = React.useState<ReportSchedule>(() => {
    const existing = existingSchedule as ReportSchedule | undefined;
    return {
      id: existing?.id || `schedule_${Date.now()}`,
      reportType: (reportType || existing?.reportType || 'executive_summary') as ReportType,
      frequency: existing?.frequency || 'weekly',
      time: existing?.time || '09:00',
      dayOfWeek: existing?.dayOfWeek || 1, // Lunes
      dayOfMonth: existing?.dayOfMonth || 1,
      recipients: existing?.recipients || [],
      format: (existing?.format || ['xlsx']) as ExportFormat[],
      enabled: existing?.enabled ?? true,
      filters: existing?.filters || {},
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const [newRecipient, setNewRecipient] = React.useState('');

  if (!open) return null;

  const handleAddRecipient = () => {
    if (newRecipient.trim() && newRecipient.includes('@')) {
      setSchedule({
        ...schedule,
        recipients: [...schedule.recipients, newRecipient.trim()],
      });
      setNewRecipient('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setSchedule({
      ...schedule,
      recipients: schedule.recipients.filter((r) => r !== email),
    });
  };

  const handleSave = () => {
    onSave(schedule);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
              {t('reports.schedule.title')}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Contenido */}
        <div className="space-y-6 p-6">
          {/* Frecuencia */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('reports.schedule.frequency')}
            </label>
            <select
              value={schedule.frequency}
              onChange={(e) =>
                setSchedule({
                  ...schedule,
                  frequency: e.target.value as ReportSchedule['frequency'],
                })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
            >
              <option value="daily">{t('reports.schedule.daily')}</option>
              <option value="weekly">{t('reports.schedule.weekly')}</option>
              <option value="monthly">{t('reports.schedule.monthly')}</option>
              <option value="custom">{t('reports.schedule.custom')}</option>
            </select>
          </div>

          {/* Hora */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('reports.schedule.time')}
            </label>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-500" />
              <input
                type="time"
                value={schedule.time}
                onChange={(e) =>
                  setSchedule({ ...schedule, time: e.target.value })
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
              />
            </div>
          </div>

          {/* Día de la semana (si es semanal) */}
          {schedule.frequency === 'weekly' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('reports.schedule.dayOfWeek')}
              </label>
              <select
                value={schedule.dayOfWeek}
                onChange={(e) =>
                  setSchedule({
                    ...schedule,
                    dayOfWeek: Number(e.target.value),
                  })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
              >
                <option value={0}>
                  {language === 'ca-ES' ? 'Diumenge' : 'Domingo'}
                </option>
                <option value={1}>
                  {language === 'ca-ES' ? 'Dilluns' : 'Lunes'}
                </option>
                <option value={2}>
                  {language === 'ca-ES' ? 'Dimarts' : 'Martes'}
                </option>
                <option value={3}>
                  {language === 'ca-ES' ? 'Dimecres' : 'Miércoles'}
                </option>
                <option value={4}>
                  {language === 'ca-ES' ? 'Dijous' : 'Jueves'}
                </option>
                <option value={5}>
                  {language === 'ca-ES' ? 'Divendres' : 'Viernes'}
                </option>
                <option value={6}>
                  {language === 'ca-ES' ? 'Dissabte' : 'Sábado'}
                </option>
              </select>
            </div>
          )}

          {/* Día del mes (si es mensual) */}
          {schedule.frequency === 'monthly' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('reports.schedule.dayOfMonth')}
              </label>
              <select
                value={schedule.dayOfMonth}
                onChange={(e) =>
                  setSchedule({
                    ...schedule,
                    dayOfMonth: Number(e.target.value),
                  })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Formatos */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('reports.schedule.format')}
            </label>
            <div className="flex flex-wrap gap-2">
              {(['xlsx', 'csv', 'pdf', 'json'] as ExportFormat[]).map((format) => (
                <label
                  key={format}
                  className="flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                >
                  <input
                    type="checkbox"
                    checked={schedule.format.includes(format)}
                    onChange={(e) => {
                      const formatArray = e.target.checked
                        ? ([...schedule.format, format] as ExportFormat[])
                        : (schedule.format.filter((f) => f !== format) as ExportFormat[]);
                      setSchedule({ ...schedule, format: formatArray });
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600"
                  />
                  <span className="text-sm uppercase">{format}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Destinatarios */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('reports.schedule.recipients')}
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                placeholder="email@example.com"
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddRecipient();
                  }
                }}
              />
              <Button onClick={handleAddRecipient}>
                <Mail className="h-4 w-4" />
              </Button>
            </div>
            {schedule.recipients.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {schedule.recipients.map((email) => (
                  <span
                    key={email}
                    className="flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-sm text-primary-800 dark:bg-primary-900 dark:text-primary-200"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(email)}
                      className="ml-1 text-primary-600 hover:text-primary-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Habilitado */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={schedule.enabled}
              onChange={(e) =>
                setSchedule({ ...schedule, enabled: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-primary-600"
            />
            <label
              htmlFor="enabled"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t('reports.schedule.enabled')}
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-200 p-6 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            {t('reports.schedule.cancel')}
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            {t('reports.schedule.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
