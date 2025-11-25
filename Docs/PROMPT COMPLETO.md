ROL Y CONTEXTO
--------------
Eres un arquitecto de software y desarrollador senior experto en:
- TypeScript, React, Node.js, Electron (o Tauri)
- Supabase (Postgres, Auth, Realtime, Storage)
- Arquitectura limpia, mantenible y documentada
- Exportación a Excel (XLSX) con SheetJS u otras librerías similares
- Procesamiento y compresión de imágenes en navegador / Electron
- Implementación de asistentes de IA usando modelos locales o enchufables
- Model Context Protocol (MCP) con TypeScript
- Manejo de errores y logging en aplicaciones de escritorio

OBJETIVO GENERAL
----------------
Construir una **aplicación de escritorio para Windows** para la gestión de inventario de **UN solo almacén**, con:

- Gestión de productos y movimientos (entradas y salidas).
- Alarmas de stock.
- Chat interno entre usuarios.
- Asistente de IA integrado (ayuda del sistema + consultas básicas sobre datos).
- Exportaciones a Excel muy bien organizadas, en el idioma de la interfaz.
- Soporte multi-idioma (español / catalán).
- Modo claro/oscuro y personalización de colores.
- Semi-offline básico (consulta sin conexión).
- Manejo centralizado de errores y logs.
- Pensada para que en el futuro pueda existir también una versión web (ej. en Vercel).
- Todo usando servicios **gratuitos** (especialmente Supabase Free), excepto Cursor AI que ya está cubierto.

RESTRICCIONES Y PRINCIPIOS
--------------------------
- Backend-as-a-service: **Supabase** en plan Free.
- Sin dependencia obligatoria de servicios de IA externos de pago:
  - Diseñar una abstracción para IA que pueda conectar con un modelo local o, opcionalmente, con uno externo.
- Base de datos y campos internos en **inglés**.
- Textos visibles (UI, Excel) en **ES o CAT**, según idioma seleccionado.
- Arquitectura por capas (domain / infrastructure / application / presentation / mcp-server).
- Código **en TypeScript** tanto en front como en Node.
- App pensada para pantalla de escritorio, pero con UI **responsive** dentro de la ventana.

MÓDULO 1: AUTENTICACIÓN, ROLES Y PREFERENCIAS
---------------------------------------------
1.1 Autenticación básica
- Usar **Supabase Auth** con email + password.
- NO habrá opción de restablecer contraseña dentro de la app.
  - La gestión de contraseñas la realiza el administrador desde el panel de Supabase.
- Campos de login:
  - Email
  - Password
  - Checkbox “Recordar sesión en este equipo”
- Comportamiento:
  - Si existe una sesión válida (Supabase Auth + persistSession), saltar la pantalla de login y entrar directamente al Dashboard.
  - Si el usuario desmarca “Recordar sesión”, al cerrar la app se debe cerrar la sesión (signOut) y limpiar la sesión guardada.

1.2 Tabla `profiles` (perfil de usuario)
- Tabla en Supabase `public.profiles`:
  - id (uuid, PK, igual al user id de auth.users)
  - first_name (text, NOT NULL)
  - last_name (text, NOT NULL)
  - initials (text, generado automáticamente como iniciales de nombre+apellido si es posible)
  - role (text, NOT NULL, check: 'ADMIN' | 'WAREHOUSE' | 'VIEWER')
  - avatar_url (text, opcional)
  - created_at (timestamptz, default now())
  - updated_at (timestamptz, default now(), trigger de actualización)

- Roles:
  - ADMIN:
    - Gestiona usuarios, roles y parámetros globales desde la app.
    - CRUD completo de productos y movimientos.
  - WAREHOUSE:
    - Gestión de productos y movimientos.
    - Chat, IA, exportaciones.
  - VIEWER:
    - Solo lectura de productos, movimientos, alarmas y estadísticas.
    - Puede usar búsquedas y el asistente IA para consultar información.

1.3 Tabla `user_settings` (preferencias de usuario)
- Tabla en Supabase `public.user_settings`:
  - user_id (uuid, PK, FK → profiles.id)
  - language (text, NOT NULL, default 'es-ES')   // 'es-ES' o 'ca-ES'
  - theme_mode (text, NOT NULL, default 'system') // 'light' | 'dark' | 'system'
  - primary_color (text, NOT NULL, default '#2563EB')
  - secondary_color (text, NOT NULL, default '#10B981')
  - created_at (timestamptz, default now())
  - updated_at (timestamptz, default now())

- Lógica:
  - Tras login:
    - Si no hay `user_settings` para el usuario → crear con idioma seleccionado en la pantalla de login y valores por defecto.
    - Aplicar idioma, tema y colores a la UI.

1.4 Tabla `user_login_events` (histórico de inicios de sesión)
- Tabla `public.user_login_events`:
  - id (uuid, PK, default gen_random_uuid())
  - user_id (uuid, FK → profiles.id)
  - login_at (timestamptz, default now())
  - ip_address (text, opcional)
  - device_info (text, opcional)

- Cada login correcto inserta un registro en esta tabla.

MÓDULO 2: INVENTARIO – PRODUCTOS
--------------------------------
2.1 Tabla `products`
- Campos:
  - id (uuid, PK)
  - code (text, UNIQUE, NOT NULL)                   // código interno de producto
  - name (text, NOT NULL)
  - description (text)
  - stock_current (integer NOT NULL default 0)
  - stock_min (integer NOT NULL default 0)
  - aisle (text NOT NULL)                           // pasillo
  - shelf (text NOT NULL)                           // estantería
  - location_extra (text)                           // ubicación adicional
  - cost_price (numeric(12,2) NOT NULL default 0)   // precio coste unitario
  - purchase_url (text)                             // web donde se compra
  - image_url (text)                                // URL en Storage
  - is_active (boolean NOT NULL default true)
  - created_at (timestamptz default now())
  - updated_at (timestamptz default now())

- Reglas:
  - Un producto está en alarma de stock si `stock_current <= stock_min`.
  - Campos obligatorios en el formulario de ALTA/EDICIÓN de producto:
    - code, name, stock_min, aisle, shelf, cost_price.
  - El resto opcionales (pero recomendados).

MÓDULO 3: INVENTARIO – MOVIMIENTOS
----------------------------------
3.1 Tabla `inventory_movements`
- Campos:
  - id (uuid, PK)
  - product_id (uuid, FK → products.id)
  - user_id (uuid, FK → profiles.id)
  - movement_type (text, check: 'IN' | 'OUT')
  - quantity (integer, > 0)
  - movement_date (timestamptz, default now())
  - request_reason (text) // motivo, obligatorio a nivel de negocio
  - comments (text)

- Reglas:
  - IN: suma `quantity` a `stock_current`.
  - OUT: resta `quantity` de `stock_current`.
  - No hay recuentos cíclicos específicos; los ajustes se realizan con movimientos controlados IN/OUT y motivo claro.
  - Campos obligatorios al crear movimiento:
    - product_id, movement_type, quantity, request_reason.

MÓDULO 4: AUDITORÍA
-------------------
4.1 Tabla `audit_logs`
- Campos:
  - id (uuid, PK)
  - user_id (uuid, FK → profiles.id)
  - entity_type (text)   // ej. 'PRODUCT', 'PRODUCT_LOCATION', 'PRODUCT_STOCK_MIN', 'PRODUCT_STATUS', 'MOVEMENT'
  - entity_id (uuid)
  - action (text)        // 'CREATE', 'UPDATE', 'DELETE'
  - field_name (text)
  - old_value (text)
  - new_value (text)
  - created_at (timestamptz default now())

- Deben registrarse logs en:
  - Creación de producto.
  - Cambios en stock_min.
  - Cambios en aisle/shelf/location_extra.
  - Activar/desactivar producto (is_active).
  - Creación de movimientos (log mínimo con movimiento resumen).

MÓDULO 5: CHAT INTERNO
----------------------
5.1 Tablas de chat
- `chat_rooms`:
  - id (uuid, PK)
  - name (text, NOT NULL)
  - created_at (timestamptz default now())

- `chat_messages`:
  - id (uuid, PK)
  - room_id (uuid, FK → chat_rooms.id)
  - sender_id (uuid, FK → profiles.id)
  - content (text, NOT NULL)
  - created_at (timestamptz default now())

- Uso:
  - Supabase Realtime para suscribirse a `chat_messages` por `room_id`.

5.2 Requisitos funcionales
- Salas:
  - Al menos una sala general (ej. “General”).
- Mensajes:
  - Mostrar avatar o iniciales, nombre y apellido.
  - Hora del mensaje.
- Integración con IA (ver Módulo 6):
  - Sala especial “Asistente IA” o botón de IA en el chat.

MÓDULO 6: ASISTENTE DE IA (LOCAL/ENCHUFABLE)
--------------------------------------------
6.1 Objetivo del asistente
- Ayudar en dos ámbitos:
  1) **Ayuda sobre la app**:
     - Cómo añadir productos.
     - Cómo registrar movimientos.
     - Cómo exportar a Excel.
     - Cómo ver alarmas, etc.
  2) **Consultas simples sobre datos**:
     - “Dime el stock del producto con código X”.
     - “Qué productos están en alarma”.
     - “Qué productos se han consumido más este mes” (a nivel básico).

6.2 Restricciones IA
- No depender de un LLM externo de pago por defecto:
  - Crear interfaz `AIProvider` con:
    - `LocalAIProvider`: se comunica con un servidor de IA local (por ejemplo en `http://localhost:port`).
    - `ExternalAIProvider`: opcional, para conectar a APIs externas en el futuro.
- El sistema debe funcionar aunque el módulo IA no esté disponible (devolver mensajes informativos).

6.3 MCP (Model Context Protocol)
- Carpeta `/mcp-server` con servidor Node + TS:
  - Usa `@supabase/supabase-js`.
  - Expone herramientas (tools) como:
    - `get_product_by_code(code)`
    - `list_low_stock_products()`
    - `top_consumed_products(period)`
    - `list_movements_by_date_range(start, end)`
  - El asistente IA usará estas herramientas para responder preguntas sobre inventario.

MÓDULO 7: EXPORTACIÓN A EXCEL
-----------------------------
7.1 Tipos de exportaciones
- Inventario actual (todos los productos + stock).
- Movimientos entre fechas.
- Productos en alarma de stock.

7.2 Requisitos
- Librería recomendada: SheetJS (xlsx) u otra librería sólida.
- El usuario puede:
  - Elegir tipo de export.
  - Seleccionar qué columnas incluir (checklist).
  - Elegir si exporta todos los registros o solo los filtrados.
- Las cabeceras de Excel deben:
  - Estar en el **idioma activo** de la app (ES o CAT).
  - Mapear 1:1 con los campos de base de datos, pero con nombres legibles para el usuario.
- El archivo `.xlsx` se guarda usando el diálogo de archivos de Electron.

MÓDULO 8: IMÁGENES DE PRODUCTO (COMPRESIÓN)
-------------------------------------------
- Flujo:
  1) El usuario selecciona una imagen (JPG/PNG).
  2) La imagen se carga en un `<canvas>` (renderer).
  3) Se redimensiona a un máximo (ej. 1024x1024) manteniendo proporción.
  4) Se convierte a JPEG con `canvas.toBlob('image/jpeg', quality)`.
  5) Se ajusta `quality` (y si hace falta tamaño) hasta que el blob sea ≤ 500 KB.
  6) Se sube al bucket de Supabase Storage (ej. `product-images/`).
  7) Se guarda la URL en `products.image_url`.

MÓDULO 9: IDIOMA, TEMA Y COLORES
--------------------------------
- Idiomas:
  - Mínimo: 'es-ES' (Español) y 'ca-ES' (Catalán).
  - Selector de idioma:
    - En pantalla de Login.
    - Icono de idioma dentro de la app para cambiarlo en cualquier momento.
  - Usar una solución de i18n (ej. i18next) para textos.

- Tema:
  - `theme_mode`:
    - 'light', 'dark', 'system'.
  - Modo oscuro y claro:
    - Cambios en fondo, tipografías, tarjetas, tablas.
  - Mantener buen contraste.

- Colores:
  - `primary_color`, `secondary_color` en `user_settings`.
  - Pantalla de preferencias donde el usuario pueda elegir colores (color pickers).
  - Aplicar esos colores a botones, enlaces y elementos clave.

MÓDULO 10: MODO SEMI-OFFLINE
-----------------------------
- Objetivo:
  - Permitir al usuario CONSULTAR datos básicos del inventario aunque no haya conexión, y tener posibilidad de reintentar operaciones cuando vuelva la red.

- Implementación básica:
  - Al conectarse:
    - Descargar y cachear:
      - Lista de productos y stock.
      - Un subconjunto de movimientos (ej. últimos 30 días).
  - Al perder conexión:
    - UI muestra un estado “sin conexión”.
    - Se permite:
      - Buscar y ver productos desde cache.
    - Movimientos:
      - Primera versión: bloquear creación de nuevos movimientos si no hay conexión, mostrando mensaje claro.
      - (Opcional futuro: cola local de movimientos a sincronizar).

- Al nivel de código:
  - Capa en `infrastructure` que abstraiga lecturas (online/cache) y operaciones de escritura con gestión de errores por conexión.

MÓDULO 11: MANEJO DE ERRORES Y LOGS
-----------------------------------
- Requisito:
  - Cualquier error importante (login, guardar producto, movimiento, exportación, imagen, chat, IA, etc.) debe:
    1) Mostrar una **ventana/modal de error** amigable.
    2) Registrar el error en un **log persistente**.

- Ventana de error:
  - Título: “Ha ocurrido un error”.
  - Mensaje amigable (texto configurable por idioma).
  - Botón [Cerrar].
  - Botón/toggle “Ver detalles técnicos” que muestre el mensaje técnico/código de error.

- Logs:
  - Usar una librería como `electron-log` (o similar) desde el proceso principal.
  - Loguear:
    - Errores de Supabase.
    - Excepciones no controladas.
    - Errores de exportación de Excel.
    - Errores de subida de imágenes.
  - Ubicación de logs: ruta estándar de usuario (gestiona la librería).

MÓDULO 12: AUTO-ACTUALIZACIÓN (A NIVEL ALTO)
--------------------------------------------
- No hace falta implementarlo de inmediato, pero hay que preparar el proyecto para:
  - Usar electron-builder + electron-updater (u otra solución) en el futuro.
  - Estructurar el código para que el proceso principal pueda:
    - Consultar si hay nueva versión.
    - Notificar al usuario.
    - Descargar y aplicar updates al reiniciar.

DISEÑO DE PANTALLAS (UI)
------------------------

1) PANTALLA DE LOGIN
--------------------
- Elementos:
  - Fondo con modo claro/oscuro.
  - Layout responsive:
    - Escritorio: lado izquierdo con descripción, lado derecho con formulario.
    - Pantallas pequeñas: formulario centrado, descripción arriba o abajo.

- Zona superior derecha:
  - Selector de idioma: [ES] / [CAT].
  - Botón de tema: icono 🌙/☀️.

- Tarjeta de login:
  - Título: “Iniciar sesión” (ES) / “Inicia sessió” (CAT).
  - Campos:
    - Correo electrónico.
    - Contraseña (con icono para mostrar/ocultar).
  - Checkbox:
    - “Recordar sesión en este equipo”.
  - Botón principal:
    - [Iniciar sesión].
  - Mensajes:
    - Área para mostrar errores (ej. “Usuario o contraseña incorrectos”).
    - Área para mostrar información (ej. “Cargando sesión...”).
  - NO hay enlace “¿Has olvidado tu contraseña?” en la UI.

2) DASHBOARD (PANEL PRINCIPAL)
------------------------------
- Tras login, se llega al Dashboard.
- Layout:
  - Barra superior con:
    - Logo y nombre de la app.
    - Nombre del usuario + avatar.
    - Icono de idioma.
    - Icono modo oscuro/claro.
    - Menú de usuario (Perfil, Preferencias, Cerrar sesión).
  - Menú lateral (sidebar):
    - Dashboard
    - Productos
    - Movimientos
    - Alarmas
    - Chat
    - Preferencias
    - (Opcional Admin: Usuarios, Logs)

- Contenido principal:
  - Tarjetas-resumen:
    - Total de productos activos.
    - Productos en alarma de stock.
    - Movimientos hoy.
  - Gráficas:
    - Top productos consumidos.
    - Movimientos por día.
  - Todo con diseño limpio y claro.

3) PANTALLA DE PRODUCTOS
------------------------
- Vista tipo tabla:
  - Columnas básicas:
    - Código
    - Nombre
    - Stock actual
    - Stock mínimo
    - Pasillo
    - Estantería
    - Alarma (icono si stock <= mínimo)
  - Barra superior:
    - Buscador por código/nombre.
    - Filtros (Activo / Inactivo, solo en alarma, etc).
    - Botón [Nuevo producto].
    - Botón [Exportar a Excel].

- Responsive:
  - En pantallas pequeñas, la tabla se puede convertir en tarjetas tipo lista.

4) PANTALLA DE DETALLE / EDICIÓN DE PRODUCTO
--------------------------------------------
- Layout:
  - Columna izquierda:
    - Imagen del producto.
    - Botón de subir/cambiar imagen.
  - Columna derecha:
    - Formulario con:
      - Código (no editable si ya existe).
      - Nombre.
      - Descripción.
      - Stock actual (display, no editable directamente).
      - Stock mínimo.
      - Pasillo.
      - Estantería.
      - Ubicación extra.
      - Precio coste.
      - Web de compra.
      - Activo (switch).
  - Botones:
    - [Guardar cambios].
    - [Volver].
  - Validaciones:
    - Mostrar errores bajo cada campo obligatorio.

5) PANTALLA DE MOVIMIENTOS
--------------------------
- Tabla de movimientos:
  - Columnas:
    - Fecha
    - Código producto
    - Nombre producto
    - Tipo (IN/OUT)
    - Cantidad
    - Usuario
    - Motivo
  - Filtros:
    - Rango de fechas.
    - Tipo de movimiento.
    - Producto.
  - Botón [Añadir movimiento]:
    - Abre modal o nueva vista con:
      - Selección de producto.
      - Tipo (IN/OUT).
      - Cantidad.
      - Motivo (obligatorio).
      - Comentarios (opcional).

- Botón [Exportar a Excel] para exportar los movimientos filtrados o todos, con selección de columnas.

6) PANTALLA DE ALARMAS (PRODUCTOS EN MÍNIMO)
--------------------------------------------
- Lista o tabla de productos donde `stock_current <= stock_min`.
- Columnas:
  - Código, Nombre, Stock actual, Stock mínimo, Pasillo, Estantería.
- Botones:
  - Ir al detalle de producto.
  - Exportar a Excel solo de productos en alarma.

7) PANTALLA DE CHAT
-------------------
- Layout:
  - Columna izquierda:
    - Lista de salas:
      - General
      - (Opcional) Asistente IA
    - Lista de usuarios conectados (opcional).
  - Columna central:
    - Mensajes de la sala:
      - Avatar / iniciales.
      - Nombre y apellido.
      - Hora.
      - Texto.
  - Parte inferior:
    - Input de texto.
    - Botón [Enviar].
    - Icono/botón para activar el “Asistente IA” (si la sala es la de IA).

8) PANTALLA DE PREFERENCIAS DE USUARIO
--------------------------------------
- Secciones:
  1) Datos personales:
     - Nombre, apellidos.
     - Avatar (subir/cambiar imagen).
  2) Idioma:
     - Radio buttons o dropdown: Español / Català.
  3) Tema:
     - Radio: Claro / Oscuro / Sistema.
  4) Colores:
     - Color picker para color primario.
     - Color picker para color secundario.

- Botones:
  - [Guardar].
  - [Cancelar].

9) PANTALLA DE ADMINISTRACIÓN (ROL ADMIN)
-----------------------------------------
- Gestión de usuarios:
  - Tabla:
    - Email, Nombre, Rol, Fecha alta.
  - Acciones:
    - Cambiar rol.
    - Ver detalles/perfil.
  - No se gestiona la contraseña aquí (eso se hace en el panel de Supabase).

ARQUITECTURA Y ESTRUCTURA DE PROYECTO
-------------------------------------
- Capas:
  - `/src/domain`:
    - Modelos y tipos (Product, UserProfile, UserSettings, InventoryMovement, ChatRoom, ChatMessage, etc).
  - `/src/infrastructure`:
    - `supabaseClient`.
    - Repositorios:
      - ProductRepository
      - MovementRepository
      - UserRepository / ProfileRepository
      - UserSettingsRepository
      - ChatRepository
      - AuditLogRepository
      - ExportRepository (Excel)
      - OfflineCache (para modo semi-offline)
  - `/src/application`:
    - Servicios / casos de uso:
      - AuthService
      - ProductService
      - MovementService
      - ChatService
      - AuditService
      - SettingsService
      - ExportService
      - AIService (usa AIProvider)
  - `/src/presentation`:
    - React:
      - Páginas (Login, Dashboard, Productos, ProductoDetalle, Movimientos, Alarmas, Chat, Preferencias, Admin).
      - Componentes UI.
      - Hooks personalizados (useProducts, useMovements, useChat, etc).
      - Sistema de i18n y temas.
      - Modal de errores global.
  - `/mcp-server`:
    - Servidor MCP Node+TS con herramientas para consultar Supabase.
