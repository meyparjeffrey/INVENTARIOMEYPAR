/**
 * Componente de gráficos para informes.
 *
 * Renderiza diferentes tipos de gráficos usando Recharts
 * según la configuración del informe.
 *
 * @module @presentation/components/reports/ReportCharts
 */

import * as React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import type { ChartConfig } from '@domain/entities/Report';
import { useLanguage } from '../../context/LanguageContext';

interface ReportChartsProps {
  charts: ChartConfig[];
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ef4444', // red
  '#6366f1', // indigo
  '#ec4899', // pink
  '#14b8a6', // teal
];

/**
 * Componente de gráficos para informes.
 */
export function ReportCharts({ charts }: ReportChartsProps) {
  const { t } = useLanguage();

  const renderChart = (chart: ChartConfig, index: number) => {
    const { type, data } = chart;

    switch (type) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300} key={index}>
            <AreaChart
              data={data.datasets[0]?.data.map((val, i) => ({
                name: data.labels[i] || '',
                value: val,
              }))}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-gray-700"
              />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="value"
                stroke={COLORS[0]}
                fill={COLORS[0]}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300} key={index}>
            <BarChart
              data={data.datasets[0]?.data.map((val, i) => ({
                name: data.labels[i] || '',
                value: val,
              }))}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-gray-700"
              />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300} key={index}>
            <LineChart
              data={data.datasets[0]?.data.map((val, i) => ({
                name: data.labels[i] || '',
                value: val,
              }))}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-gray-700"
              />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300} key={index}>
            <PieChart>
              <Pie
                data={data.labels.map((label, i) => ({
                  name: label,
                  value: data.datasets[0]?.data[i] || 0,
                }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.labels.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300} key={index}>
            <ScatterChart
              data={data.datasets[0]?.data.map((val, i) => ({
                name: data.labels[i] || '',
                value: val,
                x: i,
                y: val,
              }))}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-gray-700"
              />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Scatter dataKey="y" fill={COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={300} key={index}>
            <RadarChart
              data={data.labels.map((label, i) => ({
                subject: label,
                value: data.datasets[0]?.data[i] || 0,
                fullMark: 100,
              }))}
            >
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" className="text-xs" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Valor"
                dataKey="value"
                stroke={COLORS[0]}
                fill={COLORS[0]}
                fillOpacity={0.6}
              />
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'heatmap':
        // Heatmap simplificado usando BarChart
        return (
          <ResponsiveContainer width="100%" height={300} key={index}>
            <BarChart
              data={data.datasets[0]?.data.map((val, i) => ({
                name: data.labels[i] || '',
                value: val,
              }))}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-gray-700"
              />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="value"
                fill={COLORS[0]}
                radius={[4, 4, 0, 0]}
                fillOpacity={0.8}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div
            key={index}
            className="h-64 flex items-center justify-center text-gray-400"
          >
            Tipo de gráfico no soportado: {type}
          </div>
        );
    }
  };

  if (charts.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="text-center text-gray-500 dark:text-gray-400">
          {t('reports.noData')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {charts.map((chart, index) => (
        <div
          key={index}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-50">
            {chart.title}
          </h3>
          {renderChart(chart, index)}
        </div>
      ))}
    </div>
  );
}
