# Reglas del Proyecto de Inventario

## Principios generales
- Mantener arquitectura limpia: domain → infrastructure → application → presentation → mcp-server.
- Todo nuevo código en TypeScript. Componentes reutilizables, sin lógica pesada en la UI.
- Siempre mejora el código existente: refactorizar cuando se toque una zona con deuda.
- UI y textos en español/catalán según i18n; base de datos y código en inglés.
- Documenta lo imprescindible en cada PR: resumen técnico y decisiones clave.

## Seguridad y configuración
- Variables sensibles solo en `.env.local` (ver `Docs/env.example`). Nunca subir claves.
- Para nuevos servicios, documentar variables requeridas y actualizar el ejemplo.
- Logs con `electron-log`, diferenciando niveles (info/warn/error) y evitando datos sensibles.

## Datos y negocio
- Todos los productos que usen lotes deben tener `is_batch_tracked = true` y lotes coherentes.
- Lotes defectuosos requieren `status = 'DEFECTIVE'`, `defective_qty` y `notes` (añadir cuando se implemente).
- Movimientos siempre con motivo (`request_reason`) y, si aplica, `batch_id`.
- Exportaciones a Excel deben respetar idioma activo y filtros vigentes.

## UI / UX
- Dashboard con tarjetas KPI y alertas de lotes críticos (productos con lotes defectuosos/bloqueados).
- Tabla de productos debe mostrar badges de lote crítico y permitir filtrarlos.
- Módulo Escáner:
  - Campo con foco permanente para escáner USB.
  - Botón para escaneo por cámara (Quagga2 o ZXing).
  - Resolver automáticamente producto/lote según código.

## IA y MCP
- `AIProvider` siempre debe manejar caídas de proveedores devolviendo mensajes útiles.
- MCP server expone tools de lectura (stock, lotes, movimientos); nunca operaciones destructivas.
- IA puede sugerir reposiciones, resúmenes o detección temprana de defectos, pero pide confirmación antes de acciones manuales.

## Documentación y mantenimiento
- Cada módulo debe tener README corto (objetivo, dependencias, scripts).
- Añadir pruebas unitarias a servicios afectados y al menos smoke tests manuales documentados.
- Checklist previo a release:
  1. Migraciones aplicadas en Supabase.
  2. `.env.local` actualizado.
  3. Pruebas de escáner USB y cámara.
  4. Exportaciones Excel en ambos idiomas.

## Flujo de trabajo
- Antes de codificar, valida requisitos con usuario y actualiza plan.
- Usa ramas temáticas, commits pequeños y mensajes descriptivos.
- Corre linters/tests antes de pedir revisión.

