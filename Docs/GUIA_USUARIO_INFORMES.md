# 📊 Guía de Usuario: Sistema de Informes

## 🎯 Introducción

El sistema de informes de Inventario MEYPAR te permite generar, visualizar y exportar análisis completos de tu inventario. Esta guía te ayudará a utilizar todas las funcionalidades disponibles.

---

## 📋 Tabla de Contenidos

1. [Acceso a Informes](#acceso-a-informes)
2. [Informes Predefinidos](#informes-predefinidos)
3. [Generar un Informe](#generar-un-informe)
4. [Filtros Avanzados](#filtros-avanzados)
5. [Exportar Informes](#exportar-informes)
6. [Programar Informes](#programar-informes)
7. [Crear Informes Personalizados](#crear-informes-personalizados)
8. [Visualización de Datos](#visualización-de-datos)
9. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## 🚪 Acceso a Informes

1. Inicia sesión en la aplicación
2. En el menú lateral, haz clic en **"Informes"** o **"Reportes"**
3. Serás redirigido a la página principal de informes

---

## 📊 Informes Predefinidos

El sistema incluye 8 informes predefinidos listos para usar:

### 1. **Resumen Ejecutivo**
- **Descripción**: KPIs principales, valor del inventario y métricas clave
- **Contiene**:
  - Valor total del inventario
  - Número de productos activos
  - Productos en alarma
  - Movimientos del período
  - Rotación de inventario
- **Cuándo usarlo**: Para obtener una visión general rápida del estado del inventario

### 2. **Análisis de Stock y Alarmas**
- **Descripción**: Productos críticos, alertas y proyecciones de stock
- **Contiene**:
  - Productos con stock bajo
  - Días estimados hasta agotarse
  - Sugerencias de reposición
- **Cuándo usarlo**: Para identificar productos que requieren atención inmediata

### 3. **Análisis de Movimientos**
- **Descripción**: Movimientos por tipo, razón, almacén y usuario
- **Contiene**:
  - Resumen por tipo (Entrada, Salida, Ajuste, Transferencia)
  - Movimientos por almacén
  - Movimientos por usuario
  - Productos más movidos
- **Cuándo usarlo**: Para analizar la actividad del inventario

### 4. **Control de Lotes**
- **Descripción**: Estados, caducidades y defectos de lotes
- **Contiene**:
  - Lotes activos por estado
  - Lotes próximos a caducar
  - Lotes defectuosos
  - Calidad promedio por proveedor
- **Cuándo usarlo**: Para gestionar lotes y controlar caducidades

### 5. **Análisis de Proveedores**
- **Descripción**: Calidad, tiempos de entrega y tasas de defectos
- **Contiene**:
  - Proveedores activos vs inactivos
  - Tasa de defectos por proveedor
  - Tiempo promedio de entrega
  - Calidad promedio
- **Cuándo usarlo**: Para evaluar el rendimiento de proveedores

### 6. **Auditoría y Trazabilidad**
- **Descripción**: Logs de auditoría, modificaciones y actividad de usuarios
- **Contiene**:
  - Acciones realizadas (Crear, Actualizar, Eliminar, Ver, Exportar)
  - Historial de modificaciones
  - Usuarios más activos
  - Cambios por campo
- **Cuándo usarlo**: Para revisar la actividad del sistema y cumplir con auditorías

### 7. **Análisis de Ubicaciones**
- **Descripción**: Stock por almacén y distribución de ubicaciones
- **Contiene**:
  - Stock por almacén (MEYPAR, OLIVA_TORRAS, FURGONETA)
  - Distribución por pasillo/estante
  - Productos sin ubicación
- **Cuándo usarlo**: Para optimizar la organización del almacén

### 8. **Sugerencias de IA**
- **Descripción**: Sugerencias activas, prioridades y tasa de aceptación
- **Contiene**:
  - Sugerencias por tipo (Reorden, Alerta de Lote, Optimización)
  - Sugerencias por prioridad
  - Tasa de aceptación
- **Cuándo usarlo**: Para aprovechar las recomendaciones del sistema

---

## 🎬 Generar un Informe

### Pasos:

1. **Selecciona el informe** que deseas generar desde la lista de tarjetas
2. **Haz clic en "Ver"** en la tarjeta del informe
3. El sistema generará el informe automáticamente
4. **Visualiza** los KPIs, gráficos y tabla de datos

### Opciones disponibles:

- **Ver**: Genera y muestra el informe completo
- **Exportar**: Descarga el informe en diferentes formatos
- **Programar**: Configura la ejecución automática del informe

---

## 🔍 Filtros Avanzados

Los filtros te permiten personalizar los datos incluidos en el informe.

### Cómo aplicar filtros:

1. Haz clic en el botón **"Filtros"** en la parte superior
2. Selecciona las opciones deseadas:
   - **Rango de fechas**: Últimos 7 días, 30 días, 3 meses, 6 meses, 12 meses, o rango personalizado
   - **Almacén**: MEYPAR, OLIVA_TORRAS, FURGONETA
   - **Incluir inactivos**: Marca esta opción para incluir productos inactivos
3. Haz clic en **"Aplicar Filtros"**
4. El informe se regenerará con los filtros aplicados

### Limpiar filtros:

- Haz clic en **"Limpiar Filtros"** para restablecer todos los filtros

---

## 💾 Exportar Informes

Puedes exportar cualquier informe en 4 formatos diferentes:

### Formatos disponibles:

1. **Excel (XLSX)**
   - Múltiples hojas (KPIs, Datos, Filtros)
   - Formato profesional
   - Ideal para análisis en Excel

2. **PDF**
   - Diseño profesional
   - Gráficos embebidos
   - Ideal para presentaciones

3. **CSV**
   - Formato simple
   - Ideal para importar en otros sistemas

4. **JSON**
   - Datos estructurados
   - Ideal para integraciones

### Cómo exportar:

1. Genera el informe que deseas exportar
2. En la vista del informe, haz clic en el botón **"Exportar"**
3. Selecciona el formato deseado
4. El archivo se descargará automáticamente

---

## 📅 Programar Informes

Puedes programar informes para que se generen automáticamente.

### Configurar programación:

1. Haz clic en **"Programar"** en la tarjeta del informe
2. Configura:
   - **Frecuencia**: Diario, Semanal, Mensual o Personalizado
   - **Hora**: Selecciona la hora de ejecución
   - **Día de la semana**: Si es semanal
   - **Día del mes**: Si es mensual
   - **Formatos**: Selecciona los formatos de exportación
   - **Destinatarios**: Añade emails para recibir el informe
   - **Habilitado**: Activa o desactiva la programación
3. Haz clic en **"Guardar Programación"**

### Ver informes programados:

- En la sección **"Informes Programados"** verás todos los informes configurados
- Puedes ver el estado (Activo/Inactivo) de cada programación

---

## 🛠️ Crear Informes Personalizados

El constructor de informes te permite crear informes completamente personalizados.

### Pasos:

1. Haz clic en **"Crear Informe Personalizado"**
2. **Paso 1 - Seleccionar Tablas**:
   - Selecciona las tablas de datos que deseas incluir
   - Opciones: Productos, Movimientos, Lotes, Proveedores, Auditoría
3. **Paso 2 - Seleccionar Campos**:
   - Para cada tabla seleccionada, marca los campos que deseas incluir
4. **Paso 3 - Configurar Filtros**:
   - Los filtros se pueden configurar después de generar el informe
5. **Paso 4 - Seleccionar Visualizaciones**:
   - Añade gráficos (Tabla, Circular, Barras, Líneas, Área)
   - Configura la fuente de datos para cada visualización
6. **Nombre del Informe**:
   - Asigna un nombre descriptivo
7. Haz clic en **"Guardar"**

### Usar informe personalizado:

- Los informes personalizados guardados aparecerán en la lista de informes
- Puedes generarlos, exportarlos y programarlos igual que los predefinidos

---

## 📈 Visualización de Datos

### KPIs (Indicadores Clave)

- Se muestran en tarjetas con colores distintivos
- Cada KPI muestra:
  - Etiqueta descriptiva
  - Valor formateado (número, moneda o porcentaje)
  - Icono representativo

### Gráficos

Los informes incluyen gráficos interactivos:

- **Gráfico Circular (Pie)**: Para distribuciones
- **Gráfico de Barras (Bar)**: Para comparativas
- **Gráfico de Líneas (Line)**: Para tendencias
- **Gráfico de Área (Area)**: Para evolución temporal

**Interactividad**:
- Pasa el cursor sobre los elementos para ver detalles
- Los gráficos son responsive y se adaptan al tamaño de pantalla

### Tablas de Datos

- Muestran los datos detallados del informe
- Incluyen totales cuando aplica
- Son paginadas para grandes volúmenes de datos

---

## ❓ Preguntas Frecuentes

### ¿Puedo exportar múltiples informes a la vez?

No, actualmente debes exportar cada informe individualmente.

### ¿Los informes programados se envían por email?

La funcionalidad de envío por email está preparada pero requiere configuración del servidor. Por ahora, los informes se guardan en el sistema.

### ¿Puedo modificar un informe personalizado después de crearlo?

Actualmente, debes crear un nuevo informe personalizado. La edición de plantillas estará disponible en futuras versiones.

### ¿Los filtros se guardan entre sesiones?

No, los filtros se resetean al cerrar la sesión. Puedes guardar filtros como parte de un informe programado.

### ¿Puedo compartir informes con otros usuarios?

Los informes exportados (Excel, PDF, CSV, JSON) se pueden compartir manualmente. La funcionalidad de compartir dentro del sistema estará disponible en futuras versiones.

### ¿Qué hago si un informe tarda mucho en generarse?

- Verifica los filtros aplicados (rangos de fechas muy amplios pueden ser lentos)
- Intenta reducir el rango de fechas
- Si el problema persiste, contacta al administrador

### ¿Los gráficos se pueden exportar como imágenes?

Actualmente, los gráficos se incluyen en las exportaciones PDF y Excel. La exportación individual de gráficos como imágenes estará disponible en futuras versiones.

---

## 🆘 Soporte

Si tienes problemas o preguntas:

1. Revisa esta guía
2. Consulta la documentación técnica
3. Contacta al administrador del sistema

---

**Última actualización**: $(date)
**Versión**: 1.0.0
