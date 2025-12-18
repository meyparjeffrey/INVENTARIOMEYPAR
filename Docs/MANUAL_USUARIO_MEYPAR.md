# MANUAL OPERATIVO Y TÉCNICO - SISTEMA INTEGRAL DE INVENTARIO MEYPAR

**Departamento de Desarrollo y Sistemas**  
**Versión del Documento:** 2.0 (Revisión Integral)  
**Versión de la Aplicación:** v0.7.0  
**Última Actualización:** Diciembre 2025

---

## ÍNDICE DE CONTENIDOS

1.  [Introducción y Alcance](#1-introducción-y-alcance)
2.  [Arquitectura Tecnológica](#2-arquitectura-tecnológica)
3.  [Acceso y Seguridad](#3-acceso-y-seguridad)
4.  [Interfaz General y Navegación](#4-interfaz-general-y-navegación)
5.  [Módulo: Dashboard (Cuadro de Mando)](#5-módulo-dashboard-cuadro-de-mando)
6.  [Módulo: Gestión Maestra de Productos](#6-módulo-gestión-maestra-de-productos)
7.  [Módulo: Control de Movimientos (Stock)](#7-módulo-control-de-movimientos-stock)
8.  [Módulo: Identificación Digital (QR y Etiquetas)](#8-módulo-identificación-digital-qr-y-etiquetas)
9.  [Gestión Multialmacén](#9-gestión-multialmacén)
10. [Funcionalidades en Fase Beta (IA e Informes)](#10-funcionalidades-en-fase-beta-ia-e-informes)
11. [Protocolos de Importación/Exportación](#11-protocolos-de-importaciónexportación)
12. [Solución de Incidencias](#12-solución-de-incidencias)

---

## 1. INTRODUCCIÓN Y ALCANCE

El **Sistema de Inventario MEYPAR** es una solución de software empresarial desarrollada internamente para centralizar, digitalizar y optimizar todas las operaciones logísticas de la compañía.

### Objetivo

El propósito fundamental es eliminar la dependencia de hojas de cálculo descentralizadas y procesos manuales, ofreciendo una **única fuente de verdad** sobre el estado del stock en tiempo real, accesible desde los almacenes principales (MEYPAR), ubicaciones externas (OLIVA TORRAS) y unidades móviles (FURGONETAS).

### Público Objetivo

Este manual está diseñado para:

- **Operarios de Almacén:** Gestión diaria de entradas, salidas y etiquetado.
- **Administrativos:** Creación de referencias, importaciones masivas y control de stock.
- **Gerencia:** Consulta de estados y valoración de inventario.

---

## 2. ARQUITECTURA TECNOLÓGICA

Para conocimiento del personal técnico y confianza del usuario final, el sistema se basa en un stack tecnológico moderno y robusto:

- **Plataforma Híbrida (Electron + React):**
  - _¿Qué significa?_ La aplicación se instala en Windows como un programa tradicional (.exe), garantizando acceso al hardware (impresoras, escáneres) y alto rendimiento. Sin embargo, su interfaz está construida con tecnología web moderna (React), lo que permite una experiencia de usuario fluida y visualmente atractiva.
- **Seguridad de Tipos (TypeScript):**
  - Todo el código está "tipado". Esto significa que el sistema tiene controles internos estrictos para prevenir errores comunes de software antes de que ocurran (ej. intentar sumar un texto a un número).
- **Infraestructura de Datos (Supabase):**
  - Base de datos relacional (PostgreSQL) alojada en la nube. Garantiza que si un usuario en _Oliva Torras_ registra una salida, el cambio se refleje **en milisegundos** en la sede central de _Meypar_.
  - Incluye copias de seguridad automáticas y gestión de seguridad por roles (Row Level Security).

---

## 3. ACCESO Y SEGURIDAD

### 3.1. Instalación

El sistema se distribuye mediante un instalador ejecutable (`INVENTARI MEYPAR-0.7.0-x64.exe`). Al instalarse, crea accesos directos en el Escritorio y Menú Inicio.

> _Nota:_ Al ser software interno, Windows SmartScreen puede solicitar confirmación. Pulse "Más información" -> "Ejecutar de todas formas".

### 3.2. Proceso de Carga (Splash Screen)

Al ejecutar el programa, se inicia una secuencia de validación automática:

1.  **Verificación de Red:** Comprueba si hay salida a internet.
2.  **Sincronización:** Conecta con los servidores de Supabase.
3.  **Integridad:** Verifica que la versión local (v0.7.0) sea compatible con la base de datos.

### 3.3. Autenticación (Login)

Pantalla de seguridad obligatoria para identificar al usuario.

- **Campos:**
  - `Email`: Debe ser una dirección de correo corporativa válida.
  - `Contraseña`: Credencial personal intransferible.
- **Funcionalidad "Recordarme":**
  - Si se activa, el sistema guarda un "token de sesión" seguro y cifrado. Esto permite abrir la aplicación en el futuro sin reintroducir credenciales, hasta que el token expire o se cierre sesión manualmente.
- **Recuperación:** Si olvida su contraseña, debe contactar con el Administrador del Sistema para un reseteo manual por seguridad.

---

## 4. INTERFAZ GENERAL Y NAVEGACIÓN

La aplicación utiliza un diseño de **Barra Lateral Izquierda (Sidebar)** persistente para facilitar la navegación rápida.

- **Navegación Principal:**
  - `Dashboard`: Visión general.
  - `Productos`: Catálogo maestro.
  - `Movimientos`: Registro de operaciones.
  - `Etiquetas QR`: Gestión de impresión.
  - `Ajustes`: Configuración de usuario.
- **Barra Superior (Header):**
  - **Buscador Global:** (Ctrl+K) Permite buscar cualquier producto desde cualquier pantalla.
  - **Tema:** Botón Sol/Luna para alternar entre Modo Claro (oficina) y Modo Oscuro (almacén con poca luz).
  - **Idioma:** Selector ES/CA/EN (Español, Català, English).
  - **Notificaciones:** Campana de alertas (stock bajo, errores de sistema).
  - **Perfil:** Acceso a datos de usuario y **Cerrar Sesión**.

---

## 5. MÓDULO: DASHBOARD (CUADRO DE MANDO)

Es la pantalla de aterrizaje. Su función es proporcionar "Conciencia Situacional" del almacén.

### 5.1. Tarjetas de KPI (Indicadores Clave de Rendimiento)

- **Total Productos:** Conteo de referencias únicas activas en la base de datos.
- **Stock Bajo Mínimo:** Número crítico. Indica cuántas referencias están por debajo del umbral de seguridad definido. Si este número es > 0, requiere acción inmediata.
- **Valor del Inventario:** (Si el usuario tiene permisos de precios) Suma total del valor económico del stock actual.

### 5.2. Gráficos Analíticos

- **Movimientos (Últimos 7 días):** Gráfico de barras que contrasta visualmente la intensidad de Entradas (verde) vs Salidas (rojo). Útil para detectar picos de trabajo.

### 5.3. Paneles de Acción

- **Alertas de Stock:** Lista priorizada de productos que necesitan reposición. Muestra el Stock Actual vs Stock Mínimo.
- **Actividad Reciente:** Feed en tiempo real. Muestra _quién_ hizo _qué_ y _cuándo_. (Ej: "Juan Pérez registró salida de 5 tornillos hace 2 minutos").

---

## 6. MÓDULO: GESTIÓN MAESTRA DE PRODUCTOS

Este es el corazón del sistema. Aquí se define la "Ficha Técnica" de cada material.

### 6.1. Tabla de Productos

- **Filtros Avanzados:**
  - _Categoría:_ Filtrar por familias (Electrónica, Mecánica, etc.).
  - _Estado:_ Activos / Obsoletos.
  - **ALMACÉN (Novedad v0.7.0):** Filtro crítico. Permite visualizar la tabla mostrando el stock específico de una ubicación (`MEYPAR`, `OLIVA TORRAS`, `FURGONETA`).
- **Ordenación:** Clic en cualquier cabecera (Nombre, Stock, Precio) para ordenar ascendente/descendente.

### 6.2. Alta de Producto (Crear)

Formulario exhaustivo para dar de alta nuevas referencias.

1.  **Datos Identificativos:**
    - `Nombre`: Descripción completa.
    - `Código`: Identificador único (Referencia interna o EAN). El sistema no permite duplicados.
    - `Categoría`: Clasificación para informes.
2.  **Gestión de Stock Inicial por Ubicación:**
    - El sistema presenta campos separados para introducir el stock inicial en cada almacén físico.
    - _Ejemplo:_ Puede iniciar un producto con 10 unidades en `Meypar` y 0 en `Oliva Torras`.
3.  **Parámetros de Control:**
    - `Stock Mínimo`: Umbral de alerta.
    - `Precio`: Coste unitario (opcional).
4.  **Multimedia:**
    - Área de "Arrastrar y Soltar" para subir imagen del producto.

### 6.3. Edición y Detalle

Al hacer clic en un producto, se abre su ficha detallada.

- **Pestaña General:** Edición de datos básicos.
- **Pestaña Ubicaciones:** Muestra el desglose exacto de dónde están las unidades.
- **Pestaña Historial:** Muestra solo los movimientos de ESE producto específico.

---

## 7. MÓDULO: CONTROL DE MOVIMIENTOS (STOCK)

**Regla de Oro:** El stock nunca se edita manualmente (salvo ajustes de inventario). El stock es el resultado matemático de: `Stock Inicial + Entradas - Salidas`.

### 7.1. Tipos de Operación

- **ENTRADA (Inbound):**
  - Recepción de proveedores.
  - Devoluciones de clientes.
  - Producción interna.
  - _Efecto:_ Aumenta el stock en la ubicación seleccionada.
- **SALIDA (Outbound):**
  - Consumo en producción.
  - Venta / Envío a cliente.
  - Mermas o roturas.
  - _Efecto:_ Disminuye el stock. El sistema **bloquea** la operación si no hay stock suficiente.
- **AJUSTE (Corrección):**
  - Regularización tras conteo físico (inventario anual/cíclico).
  - _Efecto:_ Fuerza el stock a una cantidad específica, generando un movimiento de diferencia transparente.

### 7.2. Proceso de Registro

1.  Pulsar botón `Entrada/Salida` (accesible desde Dashboard o Productos).
2.  **Identificación:** Escanear código QR o buscar por nombre.
3.  **Configuración:** Seleccionar Tipo (Entrada/Salida) y Ubicación Origen/Destino.
4.  **Cuantificación:** Introducir cantidad.
5.  **Confirmación:** Pulsar "Confirmar". El sistema actualiza instantáneamente los contadores globales.

---

## 8. MÓDULO: IDENTIFICACIÓN DIGITAL (QR Y ETIQUETAS)

Sistema para garantizar la trazabilidad física mediante etiquetado.

### 8.1. Estados de Etiquetado

El sistema audita la base de datos y clasifica los productos en:

- **Con QR:** Tienen un código generado en el sistema.
- **Sin QR:** Productos nuevos o importados que requieren generación.
- **Con/Sin Etiqueta:** Estado lógico para saber si ya se ha impreso y pegado la etiqueta física.

### 8.2. Generación y Limpieza

- **Generar Faltantes:** Botón inteligente que busca todos los productos sin código QR y los genera en lote.
- **Unicidad:** El sistema garantiza (v0.7.0) que solo exista **un** código QR válido y activo por producto, eliminando automáticamente versiones antiguas o duplicadas para evitar confusión en el escáner.

### 8.3. Impresión

- Diseño de etiqueta optimizado para impresoras térmicas estándar.
- Incluye: Código QR (legible por máquina), Nombre (legible por humano) y Referencia.

---

## 9. GESTIÓN MULTIALMACÉN

El sistema v0.7.0 introduce una lógica robusta de ubicaciones.

### Concepto

Un mismo "Producto" (ej. "Tornillo M5") existe conceptualmente una sola vez, pero sus existencias físicas están distribuidas.

### Ubicaciones Definidas

1.  **MEYPAR:** Almacén central/principal.
2.  **OLIVA TORRAS:** Ubicación secundaria externa.
3.  **FURGONETA:** Stock móvil para técnicos de servicio.

### Comportamiento del Sistema

- **Stock Total:** En las vistas generales, verá la suma (`Meypar + OT + Furgoneta`).
- **Stock Específico:** Al filtrar o ver el detalle, verá la cantidad exacta en cada sitio.
- **Movimientos:** Cada movimiento debe especificar obligatoriamente **en qué almacén** ocurre. No se puede "sacar" 5 unidades de MEYPAR si el stock está físicamente en OLIVA TORRAS.

---

## 10. FUNCIONALIDADES EN FASE BETA (IA E INFORMES)

> **⚠️ AVISO IMPORTANTE:**
> Los módulos descritos a continuación se encuentran en proceso de **MEJORA CONTINUA (BETA)**.
> Aunque son operativos, es posible que experimenten cambios, ajustes de precisión o rediseños en próximas actualizaciones.

### 10.1. Asistente Virtual (Chat IA)

Herramienta experimental basada en Google Gemini.

- **Función:** Permite hacer preguntas en lenguaje natural sobre el inventario.
- **Ejemplos de uso actual:** _"¿Qué stock tiene el producto X?", "¿Cuándo fue el último movimiento?"_.
- **Limitaciones:** Puede no interpretar consultas muy complejas o combinadas. Se está entrenando para mejorar su precisión contextual.

### 10.2. Informes Avanzados y Sugerencias

- Secciones destinadas a la analítica predictiva y reportes PDF detallados. Actualmente en desarrollo activo para garantizar la fiabilidad de los datos calculados antes de su despliegue final.

---

## 11. PROTOCOLOS DE IMPORTACIÓN/EXPORTACIÓN

### 11.1. Exportación de Datos (Excel)

Desde la página de productos, el botón `Exportar` descarga un archivo `.xlsx`.

- **Estructura v0.7.0:** El archivo generado es "inteligente". No solo exporta el total, sino que desglosa columnas:
  - `Stock Meypar`
  - `Stock Oliva Torras`
  - `Stock Furgoneta`
  - `Stock Total`
- **Uso:** Ideal para inventarios físicos, auditorías o backup de datos.

### 11.2. Importación Masiva (Exclusivo Admin)

Herramienta potente para cargas iniciales o actualizaciones masivas.

- **Lógica de Coincidencia:**
  - El sistema lee el Excel y compara el **CÓDIGO** del producto.
  - **Si Existe:** SUMA la cantidad del Excel al stock actual de la ubicación seleccionada. (No sobrescribe, acumula).
  - **Si No Existe:** Crea un nuevo producto con los datos del Excel.
- **Precaución:** Se recomienda revisar el Excel antes de cargar para evitar duplicados por errores tipográficos en los códigos.

---

## 12. SOLUCIÓN DE INCIDENCIAS

### Problemas Comunes y Soluciones

| Síntoma                           | Causa Probable                             | Solución                                                                                                     |
| :-------------------------------- | :----------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| **"Error de conexión"**           | Pérdida de internet o bloqueo de firewall. | Verifique la red. Si persiste, contacte a sistemas para revisar puerto 443 (Supabase).                       |
| **Escáner no lee**                | Foco de entrada incorrecto.                | Haga clic en el campo de búsqueda antes de disparar el lector.                                               |
| **No puedo borrar un movimiento** | Funcionalidad eliminada.                   | Por seguridad y trazabilidad (v0.7.0), los movimientos no se borran. Realice un "Ajuste" correctivo inverso. |
| **Diferencia de Stock**           | Error humano en registro.                  | Realice un conteo físico y registre un movimiento de tipo "Ajuste" con la nota "Regularización Inventario".  |
| **Login fallido**                 | Credenciales o Usuario inactivo.           | Verifique mayúsculas/minúsculas. Si persiste, solicite al Admin verificar si su usuario está "Activo".       |

---

**© 2025 MEYPAR - Departamento de Desarrollo**
_Documento confidencial de uso interno._
