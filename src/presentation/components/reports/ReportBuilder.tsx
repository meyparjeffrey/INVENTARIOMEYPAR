/**
 * Constructor de informes personalizados.
 *
 * Permite a los usuarios crear informes personalizados
 * seleccionando datos, filtros y visualizaciones.
 *
 * @module @presentation/components/reports/ReportBuilder
 */

import {
  Database,
  Filter,
  BarChart3,
  Save,
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import * as React from 'react';
import { Button } from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';
import type { ReportFilters } from '@domain/entities/Report';
import type { ReportTemplate as ReportTemplateType } from '@infrastructure/repositories/SupabaseReportTemplateRepository';

export interface ReportBuilderProps {
  onSave?: (template: ReportTemplate) => void;
  onCancel?: () => void;
  existingTemplate?: ReportTemplateType | null;
}

interface ReportTemplate {
  id?: string;
  name: string;
  description?: string;
  tables: string[];
  fields: Record<string, string[]>;
  filters: ReportFilters;
  visualizations: VisualizationConfig[];
  createdAt?: string;
}

interface VisualizationConfig {
  type: 'table' | 'pie' | 'bar' | 'line' | 'area' | 'scatter' | 'heatmap' | 'radar';
  title: string;
  dataSource: string;
  xAxis?: string;
  yAxis?: string;
  groupBy?: string;
}

/**
 * Constructor de informes personalizados.
 */
export function ReportBuilder({
  onSave,
  onCancel,
  existingTemplate,
}: ReportBuilderProps) {
  const { t, language } = useLanguage();
  const [step, setStep] = React.useState(1);
  const [template, setTemplate] = React.useState<ReportTemplate>({
    id: existingTemplate?.id,
    name: existingTemplate?.name || '',
    description: existingTemplate?.description || '',
    tables: existingTemplate?.config?.tables || [],
    fields: existingTemplate?.config?.fields || {},
    filters: (existingTemplate?.config?.filters as ReportFilters) || {},
    visualizations:
      existingTemplate?.config?.visualizations?.map((v: any) => ({
        type: v.type as 'table' | 'pie' | 'bar' | 'line' | 'area' | 'scatter' | 'heatmap' | 'radar',
        title: v.title || '',
        dataSource: v.dataSource || '',
        xAxis: v.xAxis,
        yAxis: v.yAxis,
        groupBy: v.groupBy,
      })) || [],
  });

  const availableTables = [
    { id: 'products', name: language === 'ca-ES' ? 'Productes' : 'Productos' },
    {
      id: 'inventory_movements',
      name: language === 'ca-ES' ? 'Moviments' : 'Movimientos',
    },
    { id: 'product_batches', name: language === 'ca-ES' ? 'Lots' : 'Lotes' },
    {
      id: 'suppliers',
      name: language === 'ca-ES' ? 'Proveïdors' : 'Proveedores',
    },
    {
      id: 'audit_logs',
      name: language === 'ca-ES' ? 'Auditoria' : 'Auditoría',
    },
  ];

  const availableFields: Record<string, string[]> = {
    products: ['code', 'name', 'category', 'stockCurrent', 'stockMin', 'costPrice'],
    inventory_movements: [
      'movement_type',
      'quantity',
      'movement_date',
      'request_reason',
      'warehouse',
    ],
    product_batches: [
      'batch_code',
      'status',
      'expiry_date',
      'quantity_available',
      'quality_score',
    ],
    suppliers: ['name', 'quality_rating', 'lead_time_days', 'is_active'],
    audit_logs: ['action', 'entity_type', 'created_at', 'user_id'],
  };

  const handleTableToggle = (tableId: string) => {
    setTemplate((prev) => {
      const tables = prev.tables.includes(tableId)
        ? prev.tables.filter((t) => t !== tableId)
        : [...prev.tables, tableId];

      const fields = { ...prev.fields };
      if (!tables.includes(tableId)) {
        delete fields[tableId];
      } else {
        fields[tableId] = [];
      }

      return { ...prev, tables, fields };
    });
  };

  const handleFieldToggle = (tableId: string, fieldId: string) => {
    setTemplate((prev) => {
      const tableFields = prev.fields[tableId] || [];
      const fields = {
        ...prev.fields,
        [tableId]: tableFields.includes(fieldId)
          ? tableFields.filter((f) => f !== fieldId)
          : [...tableFields, fieldId],
      };

      return { ...prev, fields };
    });
  };

  const handleAddVisualization = () => {
    setTemplate((prev) => ({
      ...prev,
      visualizations: [
        ...prev.visualizations,
        {
          type: 'bar',
          title: '',
          dataSource: prev.tables[0] || '',
        },
      ],
    }));
  };

  const handleRemoveVisualization = (index: number) => {
    setTemplate((prev) => ({
      ...prev,
      visualizations: prev.visualizations.filter((_, i) => i !== index),
    }));
  };

  const handleSave = () => {
    if (!template.name.trim()) {
      return;
    }

    const finalTemplate: ReportTemplate = {
      ...template,
      id: existingTemplate?.id || `template_${Date.now()}`,
      createdAt: existingTemplate?.createdAt || new Date().toISOString(),
    };

    onSave?.(finalTemplate);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            {t('reports.builder.title')}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('reports.builder.selectData')}
          </p>
        </div>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Pasos */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <React.Fragment key={s}>
            <button
              type="button"
              onClick={() => setStep(s)}
              className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold transition-colors ${
                step === s
                  ? 'bg-primary-600 text-white'
                  : step > s
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {step > s ? '✓' : s}
            </button>
            {s < 4 && (
              <div
                className={`h-1 flex-1 rounded ${
                  step > s ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Paso 1: Seleccionar Tablas */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t('reports.builder.selectTables')}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {availableTables.map((table) => (
              <button
                key={table.id}
                type="button"
                onClick={() => handleTableToggle(table.id)}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  template.tables.includes(table.id)
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20'
                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  <span className="font-medium">{table.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Paso 2: Seleccionar Campos */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t('reports.builder.selectFields')}
          </h3>
          {template.tables.map((tableId) => {
            const table = availableTables.find((t) => t.id === tableId);
            const fields = availableFields[tableId] || [];

            return (
              <div key={tableId} className="space-y-2">
                <h4 className="font-medium text-gray-700 dark:text-gray-300">
                  {table?.name}
                </h4>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {fields.map((field) => (
                    <label
                      key={field}
                      className="flex items-center gap-2 rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800"
                    >
                      <input
                        type="checkbox"
                        checked={
                          template.fields[tableId]?.includes(field) || false
                        }
                        onChange={() => handleFieldToggle(tableId, field)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600"
                      />
                      <span className="text-sm">{field}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paso 3: Configurar Filtros */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t('reports.builder.configureFilters')}
          </h3>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'ca-ES'
                ? 'Els filtres es poden configurar després de generar l\'informe.'
                : 'Los filtros se pueden configurar después de generar el informe.'}
            </p>
          </div>
        </div>
      )}

      {/* Paso 4: Seleccionar Visualizaciones */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {t('reports.builder.selectVisualizations')}
            </h3>
            <Button size="sm" onClick={handleAddVisualization}>
              <Plus className="mr-2 h-4 w-4" />
              {language === 'ca-ES' ? 'Afegir' : 'Añadir'}
            </Button>
          </div>
          <div className="space-y-4">
            {template.visualizations.map((viz, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">
                      {language === 'ca-ES' ? 'Visualització' : 'Visualización'}{' '}
                      {index + 1}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveVisualization(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      {language === 'ca-ES' ? 'Tipus' : 'Tipo'}
                    </label>
                    <select
                      value={viz.type}
                      onChange={(e) => {
                        const newVizs = [...template.visualizations];
                        newVizs[index].type = e.target.value as any;
                        setTemplate({ ...template, visualizations: newVizs });
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
                    >
                      <option value="table">Tabla</option>
                      <option value="pie">Gráfico Circular</option>
                      <option value="bar">Gráfico de Barras</option>
                      <option value="line">Gráfico de Líneas</option>
                      <option value="area">Gráfico de Área</option>
                      <option value="scatter">Gráfico de Dispersión</option>
                      <option value="heatmap">Mapa de Calor</option>
                      <option value="radar">Gráfico Radar</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      {language === 'ca-ES' ? 'Font de Dades' : 'Fuente de Datos'}
                    </label>
                    <select
                      value={viz.dataSource}
                      onChange={(e) => {
                        const newVizs = [...template.visualizations];
                        newVizs[index].dataSource = e.target.value;
                        setTemplate({ ...template, visualizations: newVizs });
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
                    >
                      {template.tables.map((tableId) => {
                        const table = availableTables.find((t) => t.id === tableId);
                        return (
                          <option key={tableId} value={tableId}>
                            {table?.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nombre del informe */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('reports.builder.templateName')}
        </label>
        <input
          type="text"
          value={template.name}
          onChange={(e) =>
            setTemplate({ ...template, name: e.target.value })
          }
          placeholder={
            language === 'ca-ES'
              ? 'Nom de l\'informe personalitzat'
              : 'Nombre del informe personalizado'
          }
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50"
        />
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            {t('reports.builder.cancel')}
          </Button>
        )}
        <Button
          onClick={() => {
            if (step < 4) {
              setStep(step + 1);
            } else {
              handleSave();
            }
          }}
          disabled={step === 1 && template.tables.length === 0}
        >
          {step < 4
            ? language === 'ca-ES'
              ? 'Següent'
              : 'Siguiente'
            : t('reports.builder.save')}
        </Button>
      </div>
    </div>
  );
}
