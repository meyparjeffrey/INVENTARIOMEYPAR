# Proyecto: Aplicación de Inventario con Lotes y Escáner (Windows + Supabase + IA local)

## 0. Contexto

Este documento define **cómo debe ser el proyecto completo** para que la IA de Cursor genere y mantenga el código de forma coherente.

- Entorno principal: **Windows**.
- Tipo de app: **Escritorio** (Electron o similar) con frontend en **React + TypeScript**.
- Backend as a Service: **Supabase (plan gratuito)** para:
  - Autenticación.
  - Base de datos Postgres.
  - Realtime (chat).
  - Storage de imágenes.
- Objetivo: gestionar el inventario de **un solo almacén**, con:
  - Control de productos.
  - Gestión por **lotes** (packs con posible defecto).
  - Escaneo de **códigos de barras y QR**.
  - Chat interno.
  - IA integrada (ayuda + consultas de datos simples).
  - Exportaciones a Excel.
  - Modo semi-offline.
  - Personalización (tema, colores, idioma).
  - Buena arquitectura, fácil de mantener.

---

## 1. Objetivo general

Construir una aplicación de inventario para un almacén pequeño que permita:

1. Gestionar productos con información completa (ubicación, coste, proveedor, imagen, etc.).
2. Gestionar **lotes** de producto:
   - Cada lote con su propio código/lote, código de barras/QR, cantidades y estado (OK / DEFECTUOSO / BLOQUEADO).
   - Saber de qué lote viene cada producto consumido o defectuoso.
3. Registrar movimientos de inventario (entradas/salidas) asociados a producto y, cuando aplique, a **lote**.
4. Detectar y mostrar **alarmas de stock mínimo**.
5. Escanear códigos de barras / QR:
   - De producto.
   - De lote.
   - Tanto con escáner USB (modo teclado) como, opcionalmente, con cámara (QuaggaJS, ZXing, html5-qrcode o similar).
6. Ofrecer **chat interno** entre usuarios.
7. Integrar un **asistente de IA**:
   - Ayuda sobre el uso del sistema (cómo hacer cosas).
   - Consultas simples sobre inventario y lotes (stock, productos en alarma, lotes defectuosos, etc.).
8. Permitir **exportar a Excel**:
   - Cabeceras en el idioma de la UI (ES / CAT).
   - Posibilidad de elegir columnas a exportar y si se exporta todo o solo lo filtrado.
9. Incluir **modo semi-offline** para consultar datos básicos sin conexión.
10. Garantizar una **arquitectura limpia** (domain / infrastructure / application / presentation / mcp-server) para que el código sea mantenible y escalable.

---

## 2. Tecnologías y restricciones

- **Frontend / UI**: React + TypeScript.
- **App de escritorio**: Electron (o alternativa similar) con integración con:
  - Diálogo de archivos para guardar Excel.
  - Librería de logs (ej. `electron-log`).
- **Backend**: Supabase Free (Auth + Postgres + Storage + Realtime).
  - Límite típico plan Free: ~500MB DB, 1GB Storage, 50k MAU, 2 proyectos, ancho de banda limitado.
- **Escáner**:
  - Escáner USB (modo teclado) → input de texto con foco automático.
  - Opcional cámara:
    - Librerías open source: QuaggaJS / Quagga2, ZXing, html5-qrcode, etc.
- **Exportación Excel**: SheetJS (xlsx) u otra librería sólida.
- **IA**:
  - Diseñar una interfaz `AIProvider` que permita:
    - Uso de un modelo local (servidor local).
    - Conexión opcional a un LLM externo si se configura, pero **no obligatorio**.
- **Cursor**:
  - Este documento se usará como “Project Rules” para dar contexto y estilo unificado al código.

---

## 3. Roles de usuario

### 3.1. ADMIN

- Gestiona usuarios y sus roles (excepto contraseñas).
- Alta, baja lógica y edición de productos.
- Gestión completa de movimientos y lotes.
- Acceso a:
  - Panel de administración.
  - Auditoría.
  - Historial de logins.

### 3.2. WAREHOUSE (almacenero)

- Alta y edición de productos (según reglas).
- Registro de movimientos (IN / OUT) por producto y lote.
- Consulta de alarmas, lotes y estadísticas.
- Uso del chat interno.
- Uso del asistente de IA.
- Exportaciones a Excel.

### 3.3. VIEWER

- Solo lectura:
  - Productos, lotes, movimientos, alarmas.
- Uso del asistente de IA para consultar.
- Opcionalmente, exportaciones (configurable).

---

## 4. Modelo de datos (conceptual)

### 4.1. Autenticación y perfiles

**Supabase Auth:**

- `auth.users`:
  - Email + contraseña (gestionado desde la consola de Supabase, no desde la app).

**Tabla `profiles`:**

- `id` (uuid, PK, = auth.users.id)
- `first_name` (text)
- `last_name` (text)
- `initials` (text, generada a partir del nombre/apellido)
- `role` (text: 'ADMIN' | 'WAREHOUSE' | 'VIEWER')
- `avatar_url` (text, opcional)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Tabla `user_settings`:**

- `user_id` (uuid, PK, FK → profiles.id)
- `language` (text: 'es-ES' | 'ca-ES')
- `theme_mode` (text: 'light' | 'dark' | 'system')
- `primary_color` (text, hex)
- `secondary_color` (text, hex)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Tabla `user_login_events`:**

- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles.id)
- `login_at` (timestamptz)
- `ip_address` (text, opcional)
- `device_info` (text, opcional)

---

### 4.2. Productos

**Tabla `products`:**

- `id` (uuid, PK)
- `code` (text, UNIQUE, NOT NULL)  
  → Código interno de producto.
- `barcode` (text, UNIQUE, NULL)  
  → Código de barras / QR genérico de producto (no de lote).
- `name` (text, NOT NULL)
- `description` (text)
- `stock_current` (integer NOT NULL default 0)
- `stock_min` (integer NOT NULL default 0)
- `aisle` (text NOT NULL)       → Pasillo.
- `shelf` (text NOT NULL)       → Estantería.
- `location_extra` (text)       → Ubicación adicional.
- `cost_price` (numeric(12,2) NOT NULL default 0)
- `purchase_url` (text)         → Web/proveedor donde se compra.
- `image_url` (text)            → URL de imagen en Supabase Storage.
- `is_active` (boolean NOT NULL default true)
- `is_batch_tracked` (boolean NOT NULL default false)  
  → Indica si este producto se controla por lotes.
- `created_at` (timestamptz default now())
- `updated_at` (timestamptz default now())

**Reglas:**

- Producto en **alarma**: `stock_current <= stock_min`.
- Campos obligatorios al crear:
  - `code`, `name`, `stock_min`, `aisle`, `shelf`, `cost_price`.
- `barcode` es opcional pero recomendado si se usa escáner.

---

### 4.3. Lotes / Batches

**Tabla `product_batches` (lotes):**

- `id` (uuid, PK)
- `product_id` (uuid, FK → products.id)
- `batch_code` (text, NOT NULL)  
  → Código de lote interno o del proveedor.
- `batch_barcode` (text, UNIQUE, NULL)  
  → Código de barras/QR del lote (si existe).
- `quantity_total` (integer NOT NULL)  
  → Cantidad total recibida en el lote.
- `quantity_available` (integer NOT NULL)  
  → Cantidad disponible (no consumida ni defectuosa).
- `status` (text NOT NULL, check: 'OK' | 'DEFECTIVE' | 'BLOCKED')
- `received_at` (timestamptz default now())
- `expiry_date` (date, opcional)
- `notes` (text, opcional)
- `created_at` (timestamptz default now())
- `updated_at` (timestamptz default now())

**Uso:**

- Para productos con `is_batch_tracked = true`:
  - Las entradas (IN) deberían crear o sumar a un lote.
  - Las salidas (OUT) deben asociarse a un lote específico.
- Lotes defectuosos:
  - `status = 'DEFECTIVE'` para indicar que el lote (o parte) presenta defectos.
  - Permitir ver de qué lote proceden productos defectuosos.

---

### 4.4. Movimientos de inventario

**Tabla `inventory_movements`:**

- `id` (uuid, PK)
- `product_id` (uuid, FK → products.id)
- `batch_id` (uuid, FK → product_batches.id, NULL si no aplica)
- `user_id` (uuid, FK → profiles.id)
- `movement_type` (text, check: 'IN' | 'OUT')
- `quantity` (integer > 0)
- `movement_date` (timestamptz default now())
- `request_reason` (text, NOT NULL)  
  → Motivo (consumo, reposición, defecto, corrección, etc.).
- `comments` (text)

**Reglas:**

- IN:
  - Suma a `stock_current` del producto.
  - Si `is_batch_tracked = true`, debe:
    - Crear un nuevo lote **o**
    - Asociarse a un lote existente y aumentar `quantity_total` y `quantity_available`.
- OUT:
  - Resta de `stock_current` del producto.
  - Si `is_batch_tracked = true`, debe:
    - Asociarse a un lote concreto.
    - Restar de `quantity_available` de ese lote.
- En caso de lote defectuoso:
  - Se puede usar `movement_type = 'OUT'` con `request_reason = 'DEFECTIVE'` y asociar el lote afectado.

---

### 4.5. Auditoría

**Tabla `audit_logs`:**

- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles.id)
- `entity_type` (text)  
  Ej: 'PRODUCT', 'PRODUCT_STOCK_MIN', 'PRODUCT_LOCATION', 'PRODUCT_STATUS',
  'BATCH', 'BATCH_STATUS', 'MOVEMENT'
- `entity_id` (uuid)
- `action` (text: 'CREATE' | 'UPDATE' | 'DELETE')
- `field_name` (text)
- `old_value` (text)
- `new_value` (text)
- `created_at` (timestamptz default now())

---

### 4.6. Chat

**Tabla `chat_rooms`:**

- `id` (uuid, PK)
- `name` (text)
- `created_at` (timestamptz default now())

**Tabla `chat_messages`:**

- `id` (uuid, PK)
- `room_id` (uuid, FK → chat_rooms.id)
- `sender_id` (uuid, FK → profiles.id)
- `content` (text)
- `created_at` (timestamptz default now())

---

## 5. Módulos funcionales

### 5.1. Módulo Login

**Pantalla:**

- Layout:
  - Fondo claro/oscuro según tema.
  - Lado izquierdo (en escritorio):
    - Nombre de la app (Inventario Almacén).
    - Breve descripción.
  - Lado derecho:
    - Tarjeta de login.

- Elementos UI:
  - Selector idioma (ES / CAT) arriba a la derecha.
  - Botón modo oscuro/claro.
  - Formulario:
    - Email.
    - Contraseña (mostrar/ocultar).
    - Checkbox “Recordar sesión en este equipo”.
    - Botón [Iniciar sesión].
  - Área de errores (usuario/contraseña incorrectos, etc.).

**Lógica:**

- Si `rememberSession` es true y Supabase tiene sesión válida → saltar login.
- Al iniciar sesión:
  - Autenticar con Supabase.
  - Cargar `profiles` y `user_settings`.
  - Crear `user_settings` si no existen (usando el idioma elegido en login).
  - Registrar entrada en `user_login_events`.
  - Aplicar idioma, tema y colores.
  - Ir al Dashboard.

---

### 5.2. Dashboard

**Objetivo:** Vista general del almacén.

**Contenido:**

- Tarjetas:
  - Total productos activos.
  - Productos en alarma.
  - Movimientos hoy.
- Gráficas simples:
  - Top productos consumidos.
  - Evolución de movimientos por día.

**UI:**

- Barra superior:
  - Logo + nombre.
  - Icono idioma.
  - Icono tema.
  - Avatar + nombre usuario (con menú para perfil, preferencias, cerrar sesión).
- Menú lateral:
  - Dashboard.
  - Productos.
  - Lotes (o integrado en productos como pestaña).
  - Movimientos.
  - Alarmas.
  - Escáner (si se quiere como módulo separado).
  - Chat.
  - Preferencias.
  - Admin (solo ADMIN).

---

### 5.3. Productos

#### 5.3.1. Lista de productos

- Tabla con:
  - Código.
  - Nombre.
  - Stock actual.
  - Stock mínimo.
  - Pasillo.
  - Estantería.
  - Indicador de alarma.
  - Indicador de si está controlado por lotes.
- Filtros:
  - Búsqueda por texto (código/nombre).
  - Estado (activo/inactivo).
  - Solo en alarma.
- Acciones:
  - [Nuevo producto].
  - [Exportar a Excel].

#### 5.3.2. Detalle de producto

- Layout:
  - Columna izquierda:
    - Imagen del producto.
    - Botón para subir/cambiar imagen (con compresión < 500 KB).
  - Columna derecha:
    - Campos:
      - Código (no editable si ya creado).
      - Código de barras (barcode).
      - Nombre.
      - Descripción.
      - Stock actual (solo lectura).
      - Stock mínimo.
      - Pasillo.
      - Estantería.
      - Ubicación extra.
      - Precio coste.
      - Web de compra.
      - Switch: Activo / Inactivo.
      - Switch: “Controlar por lotes”.

- Sección inferior (si `is_batch_tracked = true`):
  - Tabla de lotes (`product_batches`) del producto:
    - Código de lote.
    - Batch barcode (si existe).
    - Cantidad total.
    - Cantidad disponible.
    - Estado (OK / DEFECTUOSO / BLOQUEADO).
    - Fecha de recepción.
    - Fecha de caducidad (si aplica).
    - Acción: Ver detalle de lote.

---

### 5.4. Lotes

Se puede implementar como:

- Pestaña dentro de Productos, o
- Módulo separado **“Lotes”**.

**Pantalla Lotes (global):**

- Filtros:
  - Producto.
  - Código de lote.
  - Estado (OK / DEFECTUOSO / BLOQUEADO).
  - Rango de fechas de recepción.

- Tabla:
  - Código producto.
  - Nombre producto.
  - Código lote.
  - Batch barcode.
  - Cantidad total.
  - Cantidad disponible.
  - Estado.
  - Fecha de recepción.
  - Caducidad.
- Acciones:
  - Ir al detalle de lote.
  - Marcar lote como DEFECTUOSO o BLOQUEADO.
  - Exportar lotes a Excel (con selección de columnas).

**Detalle de lote:**

- Información:
  - Producto.
  - Código lote.
  - Batch barcode (editable).
  - Estado.
  - Cantidades.
  - Fechas.
  - Notas.
- Movimientos asociados:
  - Lista de movimientos `inventory_movements` filtrados por `batch_id`.
  - Permitir ver rápidamente:
    - Entradas del lote.
    - Salidas (incluyendo las marcadas por defecto).

---

### 5.5. Movimientos

**Pantalla principal:**

- Tabla:
  - Fecha.
  - Producto (código + nombre).
  - Lote (si aplica).
  - Tipo (IN / OUT).
  - Cantidad.
  - Usuario.
  - Motivo.
- Filtros:
  - Rango de fechas.
  - Tipo.
  - Producto.
  - Lote.
  - Usuario.
- Acciones:
  - [Añadir movimiento].
  - [Exportar a Excel].

**Formulario de movimiento:**

- Campos:
  - Tipo: IN / OUT.
  - Producto:
    - Selector de producto o entrada rápida por código/barcode escaneado.
  - Si el producto es `is_batch_tracked = true`:
    - Selector de lote **o** opción “Crear nuevo lote” (solo en IN).
  - Cantidad.
  - Motivo (obligatorio).
  - Comentarios (opcional).

- Escaneo:
  - Campo de captura para escáner:
    - Si escaneas **barcode de producto** → autocompleta producto.
    - Si escaneas **batch_barcode de lote** → autocompleta producto + lote.

---

### 5.6. Alarmas de stock

**Pantalla:**

- Lista de productos donde `stock_current <= stock_min`.
- Columnas:
  - Código, nombre, stock actual, stock mínimo, pasillo, estantería, ubicación extra.
- Acciones:
  - Ir al detalle del producto.
  - Exportar a Excel solo productos en alarma.

---

### 5.7. Escáner (módulo de UI)

**Objetivo:** Tener una pantalla / panel dedicada a escanear códigos.

**Opciones de implementación:**

- Módulo “Escáner” en el menú:
  - Campo grande con foco permanente para escáner USB (modo teclado).
  - Botones para:
    - Modo “Buscar producto”.
    - Modo “Buscar lote”.
    - Modo “Crear movimiento rápido”.
  - Opcional: botón para activar cámara (si se implementa QuaggaJS/Zxing/html5-qrcode).

**Comportamiento:**

- Escáner USB:
  - El escáner se comporta como teclado → al leer un código, lo escribe en el campo y suele terminar con Enter.
  - La app detecta el Enter:
    - Busca en `products.barcode`.
    - Si no encuentra, busca en `product_batches.batch_barcode`.
    - Según el contexto:
      - Muestra ficha de producto.
      - O ficha de lote.
      - O abre formulario de movimiento con producto/lote ya seleccionados.

- Escáner por cámara (opcional):
  - Vista con `<video>` y overlay de escaneo.
  - Librerías posibles:
    - Quagga2 (barcode JS).
    - ZXing (con `react-zxing`).
    - `html5-qrcode` o similares.

---

### 5.8. Chat interno

**Pantalla:**

- Columna izquierda:
  - Lista de salas:
    - General.
    - Asistente IA.
- Columna central:
  - Mensajes:
    - Avatar/iniciales.
    - Nombre + apellido.
    - Hora.
    - Contenido.
- Parte inferior:
  - Campo de texto.
  - Botón [Enviar].
  - Icono de IA (en la sala específica).

**Tecnología:**

- Supabase Realtime sobre `chat_messages`.

---

### 5.9. Asistente de IA

**Acceso:**

- Sala de chat “Asistente IA”.
- Icono de IA que abre panel lateral.

**Funciones:**

1. Ayuda de uso:
   - Explicar, paso a paso, cómo:
     - Crear productos.
     - Crear lotes.
     - Registrar movimientos.
     - Exportar a Excel.
2. Consultas simples sobre datos:
   - “Stock del producto CODE-123”.
   - “Productos en alarma”.
   - “Lotes defectuosos del último mes”.
   - “Movimientos del lote LOTE-XYZ”.

**Técnica:**

- MCP Server (`/mcp-server`) con tools:
  - `get_product_by_code(code)`
  - `get_product_by_barcode(barcode)`
  - `get_batch_by_code_or_barcode(value)`
  - `list_low_stock_products()`
  - `list_batches_by_status(status)`
  - `top_consumed_products(period)`
  - `list_movements_by_date_range(start, end)`

- IA:
  - Interfaz `AIProvider` para poder usar:
    - Modelo local (servidor en `http://localhost:port`).
    - Opcionalmente API externa si se decide en el futuro.

---

### 5.10. Exportación a Excel

**Tipos de export:**

- Productos (inventario actual).
- Movimientos.
- Lotes.
- Alarmas.

**Características:**

- Selector de columnas (checkbox por columna).
- Opción “Exportar solo resultados filtrados” vs “Exportar todo”.
- Cabeceras en el idioma actual (ES / CAT).
- Archivo `.xlsx` generado con librería tipo SheetJS y guardado mediante diálogo de archivos de Electron.

---

### 5.11. Preferencias de usuario

**Pantalla:**

1. Datos personales:
   - Nombre.
   - Apellidos.
   - Avatar (subir imagen).
2. Idioma:
   - Español (España).
   - Català (Catalunya).
3. Tema:
   - Claro.
   - Oscuro.
   - Sistema.
4. Colores:
   - Color primario.
   - Color secundario.

**Persistencia:**

- Guardado en `user_settings`.
- Aplicación inmediata de cambios (re-tematizar la UI).

---

### 5.12. Modo semi-offline

**Objetivo:** Permitir consulta básica sin conexión.

**Comportamiento:**

- Al conectarse:
  - Sincronizar y cachear:
    - Lista de productos + stock.
    - Lotes activos.
    - Últimos X movimientos.
- Si se pierde la conexión:
  - Mostrar indicador de “Sin conexión”.
  - Permitir:
    - Buscar y ver productos desde caché.
    - Ver lotes desde caché.
  - Bloquear creación de nuevos movimientos o mostrar mensaje indicando que hace falta conexión.

---

### 5.13. Manejo de errores y logs

**Modal de error:**

- Título: “Ha ocurrido un error”.
- Mensaje amigable (ES/CAT).
- Botón [Cerrar].
- Botón/Toggle “Ver detalles técnicos”:
  - Muestra mensaje técnico y stack si procede.

**Logs:**

- Uso de librería tipo `electron-log` en el proceso principal de Electron:
  - Loguear:
    - Errores de Supabase.
    - Errores de red.
    - Errores en exportación.
    - Errores en procesamiento de imagen o escaneo.
- Ficheros de log en ruta estándar del usuario en Windows.

---

### 5.14. Administración (solo ADMIN)

**Pantalla:**

- Tabla de usuarios:
  - Email.
  - Nombre.
  - Rol.
  - Fecha de alta.
- Acciones:
  - Cambiar rol.
  - Ver perfil.
- Contraseñas:
  - **NO** se gestionan desde la app (solo en consola de Supabase).

---

## 6. Arquitectura de software y estructura

### 6.1. Capas

- `src/domain/`:
  - Tipos y modelos: `Product`, `ProductBatch`, `InventoryMovement`, `UserProfile`, `UserSettings`, `ChatRoom`, `ChatMessage`, etc.
  - Lógica de dominio pura.

- `src/infrastructure/`:
  - `supabaseClient.ts`.
  - Repositorios:
    - `ProductRepository`
    - `BatchRepository`
    - `MovementRepository`
    - `UserRepository`
    - `UserSettingsRepository`
    - `ChatRepository`
    - `AuditLogRepository`
    - `ExportRepository`
    - `OfflineCache`
    - `ScannerService` (gestión de input de escáner USB / cámara).
  - Adaptadores a Supabase, Storage, Realtime.

- `src/application/`:
  - Casos de uso / servicios:
    - `AuthService`
    - `ProductService`
    - `BatchService`
    - `MovementService`
    - `AlarmService`
    - `ChatService`
    - `AuditService`
    - `SettingsService`
    - `ExportService`
    - `AIService` (usa `AIProvider` + MCP).

- `src/presentation/`:
  - Páginas React:
    - `LoginPage`
    - `DashboardPage`
    - `ProductsPage`
    - `ProductDetailPage`
    - `BatchesPage`
    - `BatchDetailPage`
    - `MovementsPage`
    - `AlarmsPage`
    - `ScannerPage`
    - `ChatPage`
    - `PreferencesPage`
    - `AdminPage`
  - Componentes compartidos:
    - Tablas, formularios, modales, toasts, etc.
  - Layout:
    - Cabecera, sidebar, contenedor principal.
  - i18n (ES/CAT).
  - Theming (light/dark + colores).
  - Modal global de errores.

- `mcp-server/`:
  - Servidor Node+TS:
    - Cliente Supabase.
    - Definición de tools MCP.
    - Lógica para responder a la IA con datos reales del inventario.

- Carpeta / configuración de Electron:
  - Main process (creación de `BrowserWindow`, integración con logs, etc.).
  - Configuración empaquetado y futuras auto-actualizaciones (nivel alto).

---

## 7. Uso en Cursor

- Este documento debe tratarse como **fuente de verdad**:
  - La IA debe respetar:
    - Arquitectura por capas.
    - Modelo de datos.
    - Reglas de negocio.
    - Idiomas y temas.
- Se recomienda pegar este `.md` en:
  - Project Rules / `.cursorrules` o documentación principal del repo.
- Cuando se pida a Cursor implementar algo:
  - Debe seguir esta estructura de carpetas.
  - Debe usar TypeScript.
  - Debe separar responsabilidades (repositorios, servicios, componentes).
  - Debe mantener la coherencia con los nombres de tablas y campos definidos aquí.

---
