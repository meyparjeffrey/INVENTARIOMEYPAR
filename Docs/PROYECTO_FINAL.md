# Proyecto Final: Sistema de Inventario con IA Integrada

> **Documento único de referencia para Cursor AI**  
> Versión: 1.0 | Fecha: Noviembre 2025  
> Este archivo es la fuente de verdad para toda la implementación.

---

## 1. Visión General

### 1.1. Objetivo
Construir una aplicación de escritorio para Windows que gestione el inventario de **un almacén**, con:
- Control completo de productos y lotes (incluyendo defectuosos)
- IA proactiva que predice necesidades de reposición
- Escaneo de códigos de barras y QR (USB + cámara)
- Sistema de permisos granular configurable por ADMIN
- UI moderna, personalizable y responsive
- Modo semi-offline para consultas sin conexión

### 1.2. Stack Tecnológico
| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Desktop | Electron |
| Backend | Supabase (Auth, Postgres, Realtime, Storage) |
| IA/MCP | MCP Server con tools personalizadas |
| UI | Tailwind CSS + Radix UI + Framer Motion |
| Gráficas | Recharts |
| Escáner | Quagga2 (cámara) + input nativo (USB) |
| Excel | SheetJS (xlsx) |
| PDF | react-pdf |
| i18n | i18next |
| Tests | Vitest + Playwright |
| Logs | electron-log |

### 1.3. Arquitectura por Capas
```
src/
├── domain/           # Entidades y lógica de negocio pura
├── infrastructure/   # Supabase, cache, escáner, logger
├── application/      # Servicios y casos de uso
├── presentation/     # React: páginas, componentes, hooks
└── main/electron/    # Proceso principal Electron

mcp-server/           # Servidor MCP con tools IA
```

---

## 2. Modelo de Datos Completo

### 2.1. Autenticación y Usuarios

#### Tabla `profiles`
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  initials text GENERATED ALWAYS AS (
    UPPER(LEFT(first_name, 1) || LEFT(last_name, 1))
  ) STORED,
  role text NOT NULL CHECK (role IN ('ADMIN', 'WAREHOUSE', 'VIEWER')),
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Tabla `user_settings`
```sql
CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY REFERENCES profiles(id),
  language text NOT NULL DEFAULT 'es-ES' CHECK (language IN ('es-ES', 'ca-ES')),
  theme_mode text NOT NULL DEFAULT 'system' CHECK (theme_mode IN ('light', 'dark', 'system')),
  primary_color text NOT NULL DEFAULT '#DC2626',  -- Rojo corporativo
  secondary_color text NOT NULL DEFAULT '#059669', -- Verde esmeralda
  sidebar_collapsed boolean DEFAULT false,
  notifications_enabled boolean DEFAULT true,
  scanner_sound_enabled boolean DEFAULT true,
  scanner_vibration_enabled boolean DEFAULT true,
  default_movement_type text DEFAULT 'OUT',
  items_per_page integer DEFAULT 25,
  date_format text DEFAULT 'DD/MM/YYYY',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Tabla `user_permissions` (Permisos Granulares)
```sql
CREATE TABLE user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  is_granted boolean DEFAULT true,
  granted_by uuid REFERENCES profiles(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, permission_key)
);

-- Permisos disponibles (ejemplos):
-- 'products.create', 'products.edit', 'products.delete', 'products.view'
-- 'batches.create', 'batches.edit', 'batches.mark_defective', 'batches.view'
-- 'movements.create', 'movements.view'
-- 'reports.view', 'reports.export_excel', 'reports.export_pdf'
-- 'scanner.use', 'scanner.camera'
-- 'chat.send', 'chat.view'
-- 'ai.use', 'ai.suggestions_view'
-- 'admin.users', 'admin.settings', 'admin.audit'
```

#### Tabla `user_login_events`
```sql
CREATE TABLE user_login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  login_at timestamptz DEFAULT now(),
  ip_address text,
  device_info text,
  success boolean DEFAULT true,
  failure_reason text
);
```

### 2.2. Productos

#### Tabla `products`
```sql
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  barcode text UNIQUE,
  name text NOT NULL,
  description text,
  category text,
  stock_current integer NOT NULL DEFAULT 0,
  stock_min integer NOT NULL DEFAULT 0,
  stock_max integer,
  aisle text NOT NULL,
  shelf text NOT NULL,
  location_extra text,
  cost_price numeric(12,2) NOT NULL DEFAULT 0,
  sale_price numeric(12,2),
  purchase_url text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  is_batch_tracked boolean NOT NULL DEFAULT false,
  unit_of_measure text DEFAULT 'unidad',
  weight_kg numeric(10,3),
  dimensions_cm text,  -- JSON: {"length": 10, "width": 5, "height": 3}
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id)
);

-- Índices para búsqueda rápida
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('spanish', name));
CREATE INDEX idx_products_stock_alarm ON products(stock_current, stock_min) 
  WHERE stock_current <= stock_min AND is_active = true;
```

### 2.3. Proveedores

#### Tabla `suppliers`
```sql
CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  city text,
  country text DEFAULT 'España',
  tax_id text,  -- NIF/CIF
  payment_terms text,
  lead_time_days integer DEFAULT 7,
  quality_rating numeric(3,2) DEFAULT 5.0,
  total_batches_supplied integer DEFAULT 0,
  defective_batches_count integer DEFAULT 0,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### Tabla `product_suppliers` (Relación N:M)
```sql
CREATE TABLE product_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_product_code text,
  cost_price numeric(12,2),
  is_preferred boolean DEFAULT false,
  min_order_quantity integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, supplier_id)
);
```

### 2.4. Lotes

#### Tabla `product_batches`
```sql
CREATE TABLE product_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id),
  batch_code text NOT NULL,
  batch_barcode text UNIQUE,
  quantity_total integer NOT NULL,
  quantity_available integer NOT NULL,
  quantity_reserved integer DEFAULT 0,
  defective_qty integer DEFAULT 0,
  status text NOT NULL DEFAULT 'OK' CHECK (status IN ('OK', 'DEFECTIVE', 'BLOCKED', 'CONSUMED', 'EXPIRED')),
  blocked_reason text,
  quality_score numeric(3,2) DEFAULT 1.0,
  received_at timestamptz DEFAULT now(),
  expiry_date date,
  manufacture_date date,
  cost_per_unit numeric(12,2),
  location_override text,  -- Si el lote está en ubicación diferente al producto
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  UNIQUE(product_id, batch_code)
);

CREATE INDEX idx_batches_status ON product_batches(status);
CREATE INDEX idx_batches_expiry ON product_batches(expiry_date) WHERE expiry_date IS NOT NULL;
```

#### Tabla `batch_defect_reports`
```sql
CREATE TABLE batch_defect_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES product_batches(id) ON DELETE CASCADE,
  reported_by uuid REFERENCES profiles(id),
  defect_type text NOT NULL CHECK (defect_type IN (
    'DAMAGED', 'EXPIRED', 'WRONG_SPEC', 'CONTAMINATED', 
    'MISSING_PARTS', 'PACKAGING_ISSUE', 'OTHER'
  )),
  affected_quantity integer NOT NULL,
  severity text NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description text,
  images jsonb DEFAULT '[]',  -- Array de URLs
  resolution_status text DEFAULT 'PENDING' CHECK (resolution_status IN (
    'PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED', 'RETURNED_TO_SUPPLIER'
  )),
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
```

### 2.5. Movimientos

#### Tabla `inventory_movements`
```sql
CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  batch_id uuid REFERENCES product_batches(id),
  user_id uuid REFERENCES profiles(id),
  movement_type text NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER')),
  quantity integer NOT NULL CHECK (quantity > 0),
  quantity_before integer NOT NULL,
  quantity_after integer NOT NULL,
  movement_date timestamptz DEFAULT now(),
  request_reason text NOT NULL,
  reason_category text CHECK (reason_category IN (
    'PURCHASE', 'RETURN', 'PRODUCTION', 'CONSUMPTION', 
    'DEFECTIVE', 'EXPIRED', 'CORRECTION', 'INVENTORY_COUNT', 'OTHER'
  )),
  reference_document text,  -- Nº albarán, factura, etc.
  comments text,
  source_location text,
  destination_location text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_movements_date ON inventory_movements(movement_date);
CREATE INDEX idx_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_movements_batch ON inventory_movements(batch_id);
```

### 2.6. IA y Sugerencias

#### Tabla `ai_suggestions`
```sql
CREATE TABLE ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_type text NOT NULL CHECK (suggestion_type IN (
    'REORDER', 'BATCH_ALERT', 'STOCK_OPTIMIZATION', 
    'EXPIRY_WARNING', 'ANOMALY_DETECTED', 'FIFO_REMINDER'
  )),
  priority text NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  title text NOT NULL,
  description text NOT NULL,
  action_data jsonb,  -- { "type": "CREATE_MOVEMENT", "params": {...} }
  related_entity_type text,
  related_entity_id uuid,
  status text DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'ACCEPTED', 'DISMISSED', 'EXPIRED', 'AUTO_RESOLVED'
  )),
  expires_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_suggestions_status ON ai_suggestions(status) WHERE status = 'PENDING';
```

#### Tabla `ai_prediction_cache`
```sql
CREATE TABLE ai_prediction_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  prediction_type text NOT NULL,
  predicted_value jsonb NOT NULL,
  confidence_score numeric(3,2),
  valid_until timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(product_id, prediction_type)
);
```

### 2.7. Chat

#### Tabla `chat_rooms`
```sql
CREATE TABLE chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  room_type text DEFAULT 'general' CHECK (room_type IN ('general', 'ai_assistant', 'private')),
  created_at timestamptz DEFAULT now()
);
```

#### Tabla `chat_messages`
```sql
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id),
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'ai_response', 'system')),
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_messages_room ON chat_messages(room_id, created_at DESC);
```

### 2.8. Auditoría

#### Tabla `audit_logs`
```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'LOGIN', 'LOGOUT')),
  field_name text,
  old_value text,
  new_value text,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
```

### 2.9. Configuración Global

#### Tabla `app_settings`
```sql
CREATE TABLE app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now()
);

-- Configuraciones iniciales
INSERT INTO app_settings (key, value, description) VALUES
('company_name', '"Mi Almacén"', 'Nombre de la empresa'),
('company_logo_url', 'null', 'URL del logo'),
('default_language', '"es-ES"', 'Idioma por defecto'),
('stock_alarm_threshold_days', '7', 'Días de antelación para alarmas de stock'),
('batch_expiry_warning_days', '30', 'Días de antelación para alertas de caducidad'),
('ai_suggestions_enabled', 'true', 'Habilitar sugerencias de IA'),
('ai_prediction_frequency_hours', '24', 'Frecuencia de predicciones IA'),
('max_image_size_kb', '500', 'Tamaño máximo de imagen en KB'),
('barcode_formats', '["EAN13", "CODE128", "QR"]', 'Formatos de código soportados'),
('fifo_enabled', 'true', 'Forzar FIFO en salidas de lotes');
```

### 2.10. Vistas Materializadas

#### Vista `products_with_batch_status`
```sql
CREATE MATERIALIZED VIEW products_with_batch_status AS
SELECT 
  p.id AS product_id,
  p.code,
  p.name,
  p.stock_current,
  p.stock_min,
  p.is_batch_tracked,
  COALESCE(batch_stats.total_batches, 0) AS total_batches,
  COALESCE(batch_stats.ok_batches, 0) AS ok_batches,
  COALESCE(batch_stats.defective_batches, 0) AS defective_batches,
  COALESCE(batch_stats.blocked_batches, 0) AS blocked_batches,
  COALESCE(batch_stats.total_defective_qty, 0) AS total_defective_qty,
  batch_stats.critical_batch_codes,
  batch_stats.nearest_expiry,
  CASE 
    WHEN batch_stats.defective_batches > 0 THEN 'CRITICAL'
    WHEN batch_stats.blocked_batches > 0 THEN 'WARNING'
    WHEN p.stock_current <= p.stock_min THEN 'LOW_STOCK'
    ELSE 'OK'
  END AS health_status
FROM products p
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*) AS total_batches,
    COUNT(*) FILTER (WHERE status = 'OK') AS ok_batches,
    COUNT(*) FILTER (WHERE status = 'DEFECTIVE') AS defective_batches,
    COUNT(*) FILTER (WHERE status = 'BLOCKED') AS blocked_batches,
    SUM(defective_qty) AS total_defective_qty,
    ARRAY_AGG(batch_code) FILTER (WHERE status IN ('DEFECTIVE', 'BLOCKED')) AS critical_batch_codes,
    MIN(expiry_date) FILTER (WHERE expiry_date IS NOT NULL AND status = 'OK') AS nearest_expiry
  FROM product_batches pb
  WHERE pb.product_id = p.id AND pb.status NOT IN ('CONSUMED', 'EXPIRED')
) batch_stats ON true
WHERE p.is_active = true;

CREATE UNIQUE INDEX ON products_with_batch_status(product_id);

-- Refrescar cada 5 minutos
-- SELECT cron.schedule('refresh_products_batch_status', '*/5 * * * *', 
--   'REFRESH MATERIALIZED VIEW CONCURRENTLY products_with_batch_status');
```

---

## 3. Roles y Permisos

### 3.1. Roles Base

| Rol | Descripción |
|-----|-------------|
| `ADMIN` | Superusuario. Acceso total + gestión de usuarios y permisos |
| `WAREHOUSE` | Operador de almacén. CRUD productos, lotes, movimientos |
| `VIEWER` | Solo lectura. Consultas, reportes básicos, chat |

### 3.2. Sistema de Permisos Granulares

El ADMIN puede **restringir permisos específicos** a cualquier usuario, independientemente de su rol base. Ejemplo: un WAREHOUSE puede tener bloqueado `reports.export_excel`.

#### Lista Completa de Permisos
```typescript
const PERMISSIONS = {
  // Productos
  'products.view': 'Ver productos',
  'products.create': 'Crear productos',
  'products.edit': 'Editar productos',
  'products.delete': 'Eliminar productos (baja lógica)',
  'products.import': 'Importar productos desde Excel/CSV',
  
  // Lotes
  'batches.view': 'Ver lotes',
  'batches.create': 'Crear lotes',
  'batches.edit': 'Editar lotes',
  'batches.mark_defective': 'Marcar lotes como defectuosos',
  'batches.block': 'Bloquear/desbloquear lotes',
  
  // Movimientos
  'movements.view': 'Ver movimientos',
  'movements.create_in': 'Registrar entradas',
  'movements.create_out': 'Registrar salidas',
  'movements.adjust': 'Ajustes de inventario',
  
  // Escáner
  'scanner.use': 'Usar escáner USB',
  'scanner.camera': 'Usar escáner por cámara',
  'scanner.bulk_mode': 'Modo escaneo masivo',
  
  // Reportes
  'reports.view': 'Ver reportes',
  'reports.export_excel': 'Exportar a Excel',
  'reports.export_pdf': 'Exportar a PDF',
  'reports.schedule': 'Programar reportes automáticos',
  
  // IA
  'ai.chat': 'Usar chat con IA',
  'ai.suggestions_view': 'Ver sugerencias de IA',
  'ai.suggestions_accept': 'Aceptar sugerencias de IA',
  
  // Chat
  'chat.view': 'Ver chat',
  'chat.send': 'Enviar mensajes',
  
  // Proveedores
  'suppliers.view': 'Ver proveedores',
  'suppliers.manage': 'Gestionar proveedores',
  
  // Administración
  'admin.users': 'Gestionar usuarios',
  'admin.permissions': 'Gestionar permisos',
  'admin.settings': 'Configuración global',
  'admin.audit': 'Ver auditoría',
  'admin.backup': 'Gestionar backups',
} as const;
```

### 3.3. Permisos por Defecto según Rol

```typescript
const DEFAULT_PERMISSIONS: Record<Role, string[]> = {
  ADMIN: Object.keys(PERMISSIONS), // Todos
  
  WAREHOUSE: [
    'products.view', 'products.create', 'products.edit',
    'batches.view', 'batches.create', 'batches.edit', 'batches.mark_defective',
    'movements.view', 'movements.create_in', 'movements.create_out',
    'scanner.use', 'scanner.camera',
    'reports.view', 'reports.export_excel',
    'ai.chat', 'ai.suggestions_view', 'ai.suggestions_accept',
    'chat.view', 'chat.send',
    'suppliers.view',
  ],
  
  VIEWER: [
    'products.view',
    'batches.view',
    'movements.view',
    'reports.view',
    'ai.chat', 'ai.suggestions_view',
    'chat.view',
    'suppliers.view',
  ],
};
```

---

## 4. Funcionalidades de IA

### 4.1. Tools MCP Disponibles

#### `predict_reorder_needs(days_ahead: number)`
Analiza el consumo histórico y predice qué productos necesitarán reposición.

**Algoritmo:**
1. Obtener movimientos OUT de los últimos 90 días
2. Calcular consumo promedio diario por producto
3. Estimar días hasta llegar a `stock_min`
4. Filtrar productos que llegarán a mínimo en `days_ahead` días
5. Ordenar por urgencia (días restantes ASC)

**Retorno:**
```typescript
interface ReorderPrediction {
  product_id: string;
  product_code: string;
  product_name: string;
  current_stock: number;
  stock_min: number;
  avg_daily_consumption: number;
  days_until_min: number;
  suggested_reorder_qty: number;
  confidence: number; // 0-1
  preferred_supplier?: {
    id: string;
    name: string;
    lead_time_days: number;
  };
}
```

#### `detect_batch_anomalies()`
Identifica lotes con comportamiento anormal.

**Detecta:**
- Lotes con tasa de defectos > media del proveedor
- Lotes con consumo anormalmente rápido/lento
- Lotes próximos a caducar (< 30 días)
- Lotes bloqueados sin resolver > 7 días

#### `suggest_optimal_stock_levels(product_id: uuid)`
Calcula el stock mínimo óptimo usando EOQ (Economic Order Quantity).

**Fórmula EOQ:**
```
EOQ = √((2 × D × S) / H)

D = Demanda anual
S = Coste por pedido
H = Coste de almacenamiento por unidad/año
```

#### `get_product_by_code(code: string)`
Busca producto por código interno o barcode.

#### `get_batch_by_code(code: string)`
Busca lote por batch_code o batch_barcode.

#### `list_low_stock_products()`
Lista productos donde `stock_current <= stock_min`.

#### `list_batches_by_status(status: string)`
Lista lotes filtrados por estado.

#### `top_consumed_products(period: 'week' | 'month' | 'quarter')`
Top 10 productos más consumidos en el período.

#### `list_movements_by_date_range(start: string, end: string)`
Movimientos entre dos fechas.

#### `get_expiring_batches(days: number)`
Lotes que caducan en los próximos X días.

### 4.2. Flujo de Sugerencias Proactivas

```
┌─────────────────────────────────────────────────────────────┐
│                    CRON JOB (cada noche)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Ejecutar predict_reorder_needs(7)                       │
│  2. Ejecutar detect_batch_anomalies()                       │
│  3. Ejecutar get_expiring_batches(30)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Insertar sugerencias en ai_suggestions                     │
│  - Calcular prioridad según urgencia                        │
│  - Establecer expires_at                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Dashboard muestra badge con sugerencias pendientes         │
│  Usuario puede:                                             │
│  - ✓ Aceptar (ejecuta acción automática)                   │
│  - ✗ Descartar (marca como dismissed)                      │
│  - 👁 Ver detalle                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Diseño de UI/UX

### 5.1. Sistema de Diseño

#### Paleta de Colores (Tema por defecto)
```css
:root {
  /* Primarios - Rojo corporativo */
  --primary-50: #fef2f2;
  --primary-100: #fee2e2;
  --primary-500: #ef4444;
  --primary-600: #dc2626;
  --primary-700: #b91c1c;
  
  /* Secundarios - Verde esmeralda */
  --secondary-50: #ecfdf5;
  --secondary-500: #10b981;
  --secondary-600: #059669;
  
  /* Neutros */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  
  /* Estados */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
  
  /* Sidebar */
  --sidebar-bg: #1f2937;
  --sidebar-text: #f9fafb;
  --sidebar-hover: #374151;
  --sidebar-active: var(--primary-600);
}

/* Tema oscuro */
[data-theme="dark"] {
  --gray-50: #111827;
  --gray-100: #1f2937;
  --gray-200: #374151;
  --gray-800: #f3f4f6;
  --gray-900: #f9fafb;
}
```

#### Tipografía
```css
:root {
  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
}
```

#### Espaciado y Bordes
```css
:root {
  --radius-sm: 0.375rem;  /* 6px */
  --radius-md: 0.5rem;    /* 8px */
  --radius-lg: 0.75rem;   /* 12px */
  --radius-xl: 1rem;      /* 16px */
  
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
```

### 5.2. Layout Principal

```
┌─────────────────────────────────────────────────────────────────────┐
│ ┌──────────┐                                                        │
│ │  SIDEBAR │  HEADER                                                │
│ │          │  ┌─────────────────────────────────────────────────┐  │
│ │ ┌──────┐ │  │ 🔍 Buscar...          [ES▾] [🌙] [🔔] [👤 Admin]│  │
│ │ │ LOGO │ │  └─────────────────────────────────────────────────┘  │
│ │ └──────┘ │                                                        │
│ │          │  CONTENT                                               │
│ │ Dashboard│  ┌─────────────────────────────────────────────────┐  │
│ │ ────────│  │                                                   │  │
│ │ 📦 Prods │  │                                                   │  │
│ │ 📋 Lotes │  │                                                   │  │
│ │ ↔️ Movs  │  │                                                   │  │
│ │ ⚠️ Alarm │  │                                                   │  │
│ │ 📷 Scan  │  │                                                   │  │
│ │ ────────│  │                                                   │  │
│ │ 💬 Chat  │  │                                                   │  │
│ │ 📊 Report│  │                                                   │  │
│ │ ⚙️ Config│  │                                                   │  │
│ │ ────────│  │                                                   │  │
│ │ 👥 Admin │  │                                                   │  │
│ │          │  └─────────────────────────────────────────────────┘  │
│ └──────────┘                                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3. Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│ Dashboard                                              Hoy: 26 Nov  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │ 📦 1,234    │  │ ⚠️ 23       │  │ 🚨 5        │  │ 💡 12       ││
│  │ Productos   │  │ En alarma   │  │ Lotes       │  │ Sugerencias ││
│  │ activos     │  │ de stock    │  │ críticos    │  │ IA          ││
│  │ ↑ 3% mes    │  │ ↓ 2 hoy     │  │ 2 nuevos    │  │ 4 urgentes  ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘│
│  │ borde verde │  │ borde ambar │  │ borde rojo  │  │ borde azul  ││
│                                                                     │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐│
│  │ 📊 Movimientos últimos 7 días│  │ 🔔 Alertas Recientes         ││
│  │ ┌────────────────────────┐   │  │                              ││
│  │ │     ████                │   │  │ • Lote LOTE-456 defectuoso  ││
│  │ │   ██████  ██            │   │  │   Tornillos M8 - Hace 2h    ││
│  │ │ ████████████ ██         │   │  │                              ││
│  │ │ L  M  X  J  V  S  D     │   │  │ • Stock bajo: Tuercas M10   ││
│  │ └────────────────────────┘   │  │   Quedan 45 uds - Hace 4h    ││
│  │ ■ Entradas  ■ Salidas        │  │                              ││
│  └──────────────────────────────┘  │ • Sugerencia: Reponer cables ││
│                                     │   Predicción: 5 días         ││
│  ┌──────────────────────────────┐  │                              ││
│  │ 🏆 Top Productos Consumidos  │  │ [Ver todas →]                ││
│  │ ┌────────────────────────┐   │  └──────────────────────────────┘│
│  │ │ 1. Tornillos M8  ████  │   │                                  │
│  │ │ 2. Tuercas M10   ███   │   │  ┌──────────────────────────────┐│
│  │ │ 3. Arandelas     ██    │   │  │ ⏱️ Actividad Reciente        ││
│  │ │ 4. Cables USB    ██    │   │  │                              ││
│  │ │ 5. Conectores    █     │   │  │ • Juan registró salida       ││
│  │ └────────────────────────┘   │  │   Producto: ABC-123 (x10)    ││
│  │ Período: Este mes ▾         │  │                              ││
│  └──────────────────────────────┘  │ • María creó lote nuevo      ││
│                                     │   Lote: LOTE-789             ││
│                                     └──────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### 5.4. Componentes Clave

#### Tarjeta KPI
```tsx
interface KPICardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  trend?: { value: number; label: string; direction: 'up' | 'down' };
  accentColor: 'green' | 'amber' | 'red' | 'blue';
  onClick?: () => void;
}
```

#### Badge de Estado de Lote
```tsx
interface BatchStatusBadgeProps {
  status: 'OK' | 'DEFECTIVE' | 'BLOCKED' | 'EXPIRED';
  count?: number;
  showTooltip?: boolean;
}

// Ejemplos:
// ✓ OK (verde)
// 🚨 2 defectuosos (rojo)
// ⚠️ 1 bloqueado (amarillo)
// ⏰ Caduca en 5 días (naranja)
```

#### Tabla con Filtros
```tsx
interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: PaginationConfig;
  filters?: FilterConfig[];
  sorting?: SortConfig;
  onRowClick?: (row: T) => void;
  bulkActions?: BulkAction[];
  exportOptions?: ExportOption[];
}
```

### 5.5. Pantallas Principales

#### 5.5.1. Login
- Fondo con gradiente sutil
- Tarjeta centrada con sombra
- Logo + nombre de empresa
- Campos: Email, Contraseña (con toggle visibilidad)
- Checkbox "Recordar sesión"
- Selector de idioma (ES/CAT) arriba a la derecha
- Toggle tema claro/oscuro

#### 5.5.2. Productos

**Vista de Lista:**
- Tabla con columnas: Código, Nombre, Stock, Mín, Ubicación, Estado Lotes
- Barra superior: Búsqueda, Filtros (Activo, En alarma, Con lotes críticos), [+ Nuevo], [Exportar]
- Badge de estado de lotes en cada fila
- Acción rápida: hover muestra botones (Ver, Editar, Movimiento)

**Validaciones de Formulario:**
- Código: Requerido, único, mínimo 3 caracteres, sin espacios
- Nombre: Requerido, mínimo 2 caracteres
- Stock actual: Entero >= 0
- Stock mínimo: Entero >= 0
- Stock máximo: Entero > stock_min (si se especifica)
- Pasillo/Estante: Requeridos, formato libre
- Precio de coste: Decimal >= 0
- Precio de venta: Decimal >= precio de coste (si se especifica)
- Barcode: Opcional, único si se proporciona
- Dimensiones: JSON válido con length, width, height (números positivos)

**Subida de Imágenes:**
- Formatos permitidos: JPG, PNG, WebP
- Tamaño máximo: 500 KB (configurable en app_settings)
- Almacenamiento: Supabase Storage bucket `product-images`
- Ruta: `{product_id}/{timestamp}.{ext}`
- Preview antes de guardar
- Opción de eliminar imagen existente

**Manejo de Errores:**
- Código duplicado: "Este código ya existe. Elige otro."
- Barcode duplicado: "Este código de barras ya está en uso."
- Stock inválido: "El stock mínimo no puede ser mayor que el máximo."
- Imagen muy grande: "La imagen excede el tamaño máximo (500 KB)."
- Error de red: "No se pudo guardar. Verifica tu conexión."
- Sin permisos: "No tienes permisos para realizar esta acción."

**Flujo de Creación/Edición:**
- Modal o drawer lateral (responsive)
- Formulario con validación en tiempo real
- Botones: [Cancelar] [Guardar]
- Al guardar: mostrar loading, deshabilitar botones
- Éxito: cerrar modal, refrescar lista, mostrar toast
- Error: mostrar mensaje específico, mantener modal abierto

**Asociación de Proveedores:**
- Sección en formulario: "Proveedores"
- Lista de proveedores asociados con:
  - Código del producto en el proveedor
  - Precio de coste (puede diferir del precio general)
  - Checkbox "Proveedor preferido" (solo uno)
- Botón [+ Añadir proveedor] abre selector
- Opción de eliminar asociación

#### 5.5.3. Detalle Producto
- Layout 2 columnas en desktop
- Izquierda: Imagen grande, botón cambiar
- Derecha: Formulario con todos los campos
- Sección inferior (si batch_tracked): Tabla de lotes del producto
- Historial de movimientos recientes

#### 5.5.4. Lotes (Módulo dedicado)
- Vista Kanban: columnas OK / DEFECTIVE / BLOCKED
- Drag & drop para cambiar estado
- Filtros: Producto, Proveedor, Fecha recepción, Próximos a caducar
- Modal de reporte de defecto con captura de foto

#### 5.5.5. Movimientos
- Tabla con filtros de fecha, tipo, producto, usuario
- Formulario modal para nuevo movimiento
- Campo de escaneo con autocompletado
- Si producto tiene lotes: selector de lote (o crear nuevo en entradas)

#### 5.5.6. Escáner
- Campo grande con foco automático (para USB)
- Botón "Activar cámara" para escaneo visual
- Modos: Buscar producto, Buscar lote, Movimiento rápido
- Resultado muestra ficha resumida con acciones contextuales
- Modo masivo: lista de escaneos pendientes de confirmar

#### 5.5.7. Reportes
- Selector de tipo de reporte
- Filtros específicos según tipo
- Vista previa en pantalla
- Botones: Exportar Excel, Exportar PDF, Imprimir

#### 5.5.8. Chat
- Sidebar con salas (General, Asistente IA)
- Área de mensajes con burbujas
- Input con botón enviar
- Indicador de "escribiendo..."
- Respuestas IA con formato especial

#### 5.5.9. Configuración Usuario
```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚙️ Configuración                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ PERFIL                                                              │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ [Avatar]  Nombre: ___________  Apellidos: ___________           ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ APARIENCIA                                                          │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Idioma: [ES ▾]    Tema: [○ Claro ○ Oscuro ● Sistema]           ││
│ │ Color primario: [■]    Color secundario: [■]                    ││
│ │ Sidebar: [○ Expandido ○ Colapsado]                             ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ ESCÁNER                                                             │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ [✓] Sonido al escanear    [✓] Vibración (si disponible)        ││
│ │ Acción por defecto: [Buscar producto ▾]                         ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ NOTIFICACIONES                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ [✓] Notificaciones de stock bajo                                ││
│ │ [✓] Notificaciones de lotes críticos                            ││
│ │ [✓] Sugerencias de IA                                           ││
│ │ [✓] Mensajes de chat                                            ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ DATOS                                                               │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Formato fecha: [DD/MM/YYYY ▾]    Elementos por página: [25 ▾]  ││
│ │ Tipo movimiento por defecto: [Salida ▾]                         ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│                                        [Cancelar]  [Guardar]        │
└─────────────────────────────────────────────────────────────────────┘
```

#### 5.5.10. Panel Admin
```
┌─────────────────────────────────────────────────────────────────────┐
│ 👥 Administración                                                   │
├─────────────────────────────────────────────────────────────────────┤
│ [Usuarios] [Permisos] [Config. Global] [Auditoría] [Sistema]       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ USUARIOS                                                            │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Email           │ Nombre      │ Rol       │ Estado │ Acciones   ││
│ ├─────────────────┼─────────────┼───────────┼────────┼────────────┤│
│ │ juan@email.com  │ Juan García │ WAREHOUSE │ ● Act  │ [✏️] [🔑]  ││
│ │ maria@email.com │ María López │ VIEWER    │ ● Act  │ [✏️] [🔑]  ││
│ │ pedro@email.com │ Pedro Ruiz  │ WAREHOUSE │ ○ Inac │ [✏️] [🔑]  ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ Al hacer clic en [🔑] se abre modal de permisos:                   │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Permisos de Juan García (WAREHOUSE)                             ││
│ │                                                                  ││
│ │ PRODUCTOS                          REPORTES                      ││
│ │ [✓] Ver productos                  [✓] Ver reportes              ││
│ │ [✓] Crear productos                [✓] Exportar Excel            ││
│ │ [✓] Editar productos               [ ] Exportar PDF  ← BLOQUEADO ││
│ │ [ ] Eliminar productos             [ ] Programar reportes        ││
│ │                                                                  ││
│ │ LOTES                              IA                            ││
│ │ [✓] Ver lotes                      [✓] Usar chat IA              ││
│ │ [✓] Crear lotes                    [✓] Ver sugerencias           ││
│ │ [✓] Marcar defectuosos             [ ] Aceptar sugerencias       ││
│ │                                                                  ││
│ │                                    [Cancelar] [Guardar]          ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│ CONFIG. GLOBAL                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ Nombre empresa: [Mi Almacén        ]                            ││
│ │ Logo: [Subir imagen]                                            ││
│ │ Idioma por defecto: [Español ▾]                                 ││
│ │                                                                  ││
│ │ ALERTAS                                                          ││
│ │ Días antelación alarma stock: [7  ]                             ││
│ │ Días antelación caducidad: [30 ]                                ││
│ │                                                                  ││
│ │ IA                                                               ││
│ │ [✓] Habilitar sugerencias IA                                    ││
│ │ Frecuencia predicciones: [24] horas                             ││
│ │                                                                  ││
│ │ INVENTARIO                                                       ││
│ │ [✓] Forzar FIFO en salidas                                      ││
│ │ Formatos código: [✓] EAN13 [✓] CODE128 [✓] QR                   ││
│ └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Módulo de Escáner

### 6.1. Escáner USB (Modo Teclado)
El escáner USB se comporta como un teclado: escribe el código y envía Enter.

**Implementación:**
```typescript
// Hook useScanner
const useScanner = (options: ScannerOptions) => {
  const [isListening, setIsListening] = useState(false);
  const bufferRef = useRef('');
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isListening) return;
      
      // Enter = fin de escaneo
      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        if (code.length >= 4) {
          options.onScan(code);
        }
        bufferRef.current = '';
        return;
      }
      
      // Acumular caracteres (escáner escribe rápido)
      bufferRef.current += e.key;
      
      // Limpiar buffer si pasa mucho tiempo
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        bufferRef.current = '';
      }, 100);
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isListening, options]);
  
  return { isListening, setIsListening };
};
```

### 6.2. Escáner por Cámara
Usando Quagga2 para códigos de barras y ZXing para QR.

**Formatos soportados:**
- EAN-13, EAN-8
- CODE-128, CODE-39
- QR Code
- Data Matrix (opcional)

### 6.3. Flujo de Escaneo

```
┌─────────────────────────────────────────────────────────────┐
│                    CÓDIGO ESCANEADO                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  ¿Es barcode de PRODUCTO?                                   │
│  (buscar en products.barcode)                               │
└─────────────────────────────────────────────────────────────┘
          │ SÍ                              │ NO
          ▼                                 ▼
┌─────────────────────┐    ┌─────────────────────────────────┐
│ Mostrar ficha       │    │ ¿Es barcode de LOTE?            │
│ producto            │    │ (buscar en product_batches.     │
│                     │    │  batch_barcode)                 │
│ Acciones:           │    └─────────────────────────────────┘
│ - Ver detalle       │              │ SÍ           │ NO
│ - Registrar entrada │              ▼              ▼
│ - Registrar salida  │    ┌─────────────┐  ┌─────────────┐
└─────────────────────┘    │ Mostrar     │  │ "Código no  │
                           │ ficha lote  │  │ encontrado" │
                           │ + producto  │  │             │
                           │             │  │ ¿Crear      │
                           │ Acciones:   │  │ producto?   │
                           │ - Ver lote  │  └─────────────┘
                           │ - Movimiento│
                           │ - Reportar  │
                           │   defecto   │
                           └─────────────┘
```

### 6.4. Modo Escaneo Masivo
Para recepciones de pedidos grandes:

1. Activar "Modo Recepción"
2. Escanear múltiples códigos seguidos
3. Se acumulan en lista temporal
4. Revisar y ajustar cantidades
5. Confirmar → Crea todos los movimientos IN
6. Opción: Generar PDF resumen para pegar en pallet

---

## 7. Exportaciones y Reportes

### 7.1. Tipos de Exportación

| Tipo | Formatos | Descripción |
|------|----------|-------------|
| Inventario actual | Excel, PDF, CSV | Todos los productos con stock |
| Movimientos | Excel, PDF | Movimientos entre fechas |
| Lotes | Excel | Lotes por estado/producto |
| Alarmas de stock | Excel, PDF | Productos bajo mínimo |
| Lotes próximos a caducar | Excel, PDF | Lotes con expiry_date cercana |
| Auditoría | Excel | Logs de cambios |

### 7.2. Reportes Predefinidos (Semanales Recomendados)

1. **Resumen Semanal de Inventario**
   - KPIs: productos activos, en alarma, movimientos totales
   - Top 10 productos consumidos
   - Lotes críticos pendientes de resolver
   - Sugerencias IA activas

2. **Informe de Stock Bajo**
   - Productos donde stock_current <= stock_min
   - Columnas: código, nombre, stock actual, mínimo, ubicación, días estimados hasta agotarse
   - Sugerencias de cantidad a reponer

3. **Control de Lotes**
   - Lotes defectuosos/bloqueados sin resolver
   - Lotes próximos a caducar (< 30 días)
   - Historial de defectos por proveedor

### 7.3. Cabeceras Multiidioma

```typescript
const EXCEL_HEADERS = {
  'es-ES': {
    code: 'Código',
    name: 'Nombre',
    stock_current: 'Stock Actual',
    stock_min: 'Stock Mínimo',
    aisle: 'Pasillo',
    shelf: 'Estantería',
    // ...
  },
  'ca-ES': {
    code: 'Codi',
    name: 'Nom',
    stock_current: 'Estoc Actual',
    stock_min: 'Estoc Mínim',
    aisle: 'Passadís',
    shelf: 'Prestatge',
    // ...
  },
};
```

---

## 8. Modo Semi-Offline

### 8.1. Estrategia de Caché

**Datos cacheados al conectar:**
- Productos: todos (típicamente < 10k registros)
- Lotes: solo activos (status NOT IN ('CONSUMED', 'EXPIRED'))
- Movimientos: últimos 30 días
- Proveedores: todos
- Sugerencias IA: pendientes

**Almacenamiento:**
- IndexedDB para datos estructurados
- LocalStorage para configuración de usuario

### 8.2. Operaciones Offline

| Operación | Disponible Offline | Comportamiento |
|-----------|-------------------|----------------|
| Consultar productos | ✓ | Desde caché |
| Consultar lotes | ✓ | Desde caché |
| Ver movimientos | ✓ | Últimos 30 días |
| Crear movimiento | ✗ | Mostrar mensaje + cola |
| Editar producto | ✗ | Mostrar mensaje |
| Reportar defecto | ✗ | Mostrar mensaje |
| Exportar Excel | ✓ | Desde caché |
| Chat | ✗ | Mostrar mensaje |

### 8.3. Cola de Sincronización

```typescript
interface OfflineOperation {
  id: string;
  type: 'CREATE_MOVEMENT' | 'UPDATE_PRODUCT' | 'REPORT_DEFECT';
  payload: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
}

// Al reconectar:
// 1. Sincronizar caché (pull)
// 2. Ejecutar cola (push)
// 3. Resolver conflictos
// 4. Notificar usuario
```

### 8.4. Indicadores Visuales

- Banner superior amarillo: "📡 Sin conexión - Modo offline"
- Icono junto a datos: "💾 Datos locales (hace 2h)"
- Botones deshabilitados con tooltip explicativo
- Badge en cola: "3 operaciones pendientes"

---

## 9. Manejo de Errores y Logs

### 9.1. Modal de Error Global

```tsx
interface ErrorModalProps {
  title: string;           // "Ha ocurrido un error"
  message: string;         // Mensaje amigable
  technicalDetails?: string; // Stack trace (oculto por defecto)
  actions?: {
    primary: { label: string; onClick: () => void };
    secondary?: { label: string; onClick: () => void };
  };
}
```

### 9.2. Niveles de Log

```typescript
// Usando electron-log
import log from 'electron-log';

log.info('Usuario inició sesión', { userId, timestamp });
log.warn('Stock bajo detectado', { productId, currentStock, minStock });
log.error('Error al guardar movimiento', { error, payload });

// Ubicación de logs en Windows:
// %USERPROFILE%\AppData\Roaming\{app-name}\logs\
```

### 9.3. Errores Específicos a Capturar

- Errores de autenticación Supabase
- Errores de red / timeout
- Errores de validación de formularios
- Errores de escaneo (código no reconocido)
- Errores de exportación (archivo en uso, sin permisos)
- Errores de subida de imágenes (tamaño, formato)

---

## 10. Internacionalización (i18n)

### 10.1. Idiomas Soportados
- `es-ES`: Español (España) - Por defecto
- `ca-ES`: Català (Catalunya)

### 10.2. Estructura de Traducciones

```
src/presentation/i18n/
├── locales/
│   ├── es-ES/
│   │   ├── common.json
│   │   ├── products.json
│   │   ├── batches.json
│   │   ├── movements.json
│   │   └── ...
│   └── ca-ES/
│       ├── common.json
│       └── ...
└── index.ts
```

### 10.3. Ejemplo de Traducciones

```json
// es-ES/common.json
{
  "app_name": "Inventario",
  "actions": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "export": "Exportar",
    "search": "Buscar"
  },
  "status": {
    "ok": "OK",
    "defective": "Defectuoso",
    "blocked": "Bloqueado"
  }
}

// ca-ES/common.json
{
  "app_name": "Inventari",
  "actions": {
    "save": "Desar",
    "cancel": "Cancel·lar",
    "delete": "Eliminar",
    "export": "Exportar",
    "search": "Cercar"
  },
  "status": {
    "ok": "OK",
    "defective": "Defectuós",
    "blocked": "Bloquejat"
  }
}
```

---

## 11. Testing

### 11.1. Estrategia de Tests

| Tipo | Herramienta | Cobertura Objetivo |
|------|-------------|-------------------|
| Unitarios | Vitest | 80% en domain y application |
| Integración | Vitest + MSW | Flujos críticos |
| E2E | Playwright | Smoke tests + flujos principales |

### 11.2. Tests Prioritarios

**Unitarios:**
- Cálculo de predicción de reposición
- Validación de entidades de dominio
- Lógica de permisos
- Formateo de exportaciones

**Integración:**
- Flujo de autenticación completo
- CRUD de productos con lotes
- Registro de movimientos con actualización de stock
- Generación de sugerencias IA

**E2E:**
- Login → Dashboard → Ver productos
- Escanear código → Registrar movimiento
- Crear producto → Añadir lote → Marcar defectuoso

---

## 12. Estructura de Carpetas Final

```
src/
├── domain/
│   ├── entities/
│   │   ├── Product.ts
│   │   ├── ProductBatch.ts
│   │   ├── InventoryMovement.ts
│   │   ├── Supplier.ts
│   │   ├── User.ts
│   │   ├── Permission.ts
│   │   └── AISuggestion.ts
│   ├── value-objects/
│   │   ├── Money.ts
│   │   ├── Quantity.ts
│   │   └── BatchStatus.ts
│   └── errors/
│       └── DomainError.ts
│
├── infrastructure/
│   ├── supabase/
│   │   ├── supabaseClient.ts
│   │   └── types.ts (generados)
│   ├── repositories/
│   │   ├── ProductRepository.ts
│   │   ├── BatchRepository.ts
│   │   ├── MovementRepository.ts
│   │   ├── SupplierRepository.ts
│   │   ├── UserRepository.ts
│   │   └── AISuggestionRepository.ts
│   ├── cache/
│   │   ├── OfflineCache.ts
│   │   └── SyncQueue.ts
│   ├── scanner/
│   │   ├── USBScanner.ts
│   │   └── CameraScanner.ts
│   ├── export/
│   │   ├── ExcelExporter.ts
│   │   └── PDFExporter.ts
│   └── logging/
│       └── Logger.ts
│
├── application/
│   ├── services/
│   │   ├── AuthService.ts
│   │   ├── ProductService.ts
│   │   ├── BatchService.ts
│   │   ├── MovementService.ts
│   │   ├── SupplierService.ts
│   │   ├── PermissionService.ts
│   │   ├── ExportService.ts
│   │   ├── ScannerService.ts
│   │   └── AIService.ts
│   ├── use-cases/
│   │   ├── PredictReorderNeeds.ts
│   │   ├── DetectBatchAnomalies.ts
│   │   └── SuggestOptimalStockLevels.ts
│   └── __tests__/
│       └── *.test.ts
│
├── presentation/
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── ProductDetailPage.tsx
│   │   ├── BatchesPage.tsx
│   │   ├── MovementsPage.tsx
│   │   ├── ScannerPage.tsx
│   │   ├── ReportsPage.tsx
│   │   ├── ChatPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── AdminPage.tsx
│   ├── components/
│   │   ├── ui/           # Componentes base (Button, Input, Modal, etc.)
│   │   ├── layout/       # Sidebar, Header, Footer
│   │   ├── products/     # Componentes específicos de productos
│   │   ├── batches/      # Componentes específicos de lotes
│   │   ├── scanner/      # Componentes de escáner
│   │   └── shared/       # Componentes compartidos
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useProducts.ts
│   │   ├── useBatches.ts
│   │   ├── useScanner.ts
│   │   ├── usePermissions.ts
│   │   └── useOffline.ts
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── OfflineContext.tsx
│   ├── i18n/
│   │   ├── locales/
│   │   └── index.ts
│   ├── styles/
│   │   ├── globals.css
│   │   └── tailwind.config.ts
│   ├── App.tsx
│   └── main.tsx
│
├── main/
│   └── electron/
│       ├── main.ts
│       ├── preload.ts
│       └── ipc/
│
mcp-server/
├── index.ts
├── tools/
│   ├── predictReorderNeeds.ts
│   ├── detectBatchAnomalies.ts
│   ├── suggestOptimalStockLevels.ts
│   ├── getProductByCode.ts
│   ├── listLowStockProducts.ts
│   └── ...
└── __tests__/
```

---

## 13. Checklist de Implementación

### Fase 1: Fundamentos (Semanas 1-2)
- [ ] Crear tablas en Supabase (migraciones)
- [ ] Configurar RLS (Row Level Security)
- [ ] Implementar entidades de dominio
- [ ] Crear repositorios base
- [ ] Implementar AuthService con permisos
- [ ] UI: Login + Layout principal
- [ ] Tests unitarios de servicios críticos

### Fase 2: Productos y Lotes (Semanas 3-4)
- [ ] CRUD completo de productos
- [ ] CRUD de proveedores
- [ ] Gestión de lotes con estados
- [ ] Registro de movimientos IN/OUT
- [ ] Actualización automática de stock
- [ ] Vista materializada de productos con lotes
- [ ] UI: Páginas de productos, lotes, movimientos

### Fase 3: Escáner e IA (Semanas 5-6)
- [ ] Implementar escáner USB
- [ ] Implementar escáner por cámara
- [ ] Modo escaneo masivo
- [ ] Tools MCP: predict_reorder_needs, detect_batch_anomalies
- [ ] Sistema de sugerencias con tabla ai_suggestions
- [ ] Dashboard con sugerencias pendientes
- [ ] Chat con IA integrado

### Fase 4: Reportes y Admin (Semanas 7-8)
- [ ] Exportación a Excel con cabeceras i18n
- [ ] Exportación a PDF
- [ ] Reportes predefinidos
- [ ] Panel de administración completo
- [ ] Gestión granular de permisos
- [ ] Auditoría de cambios

### Fase 5: Pulido y Testing (Semanas 9-10)
- [ ] Modo offline con sincronización
- [ ] Tests E2E con Playwright
- [ ] Optimización de rendimiento
- [ ] Documentación de usuario
- [ ] Preparación para empaquetado (electron-builder)

---

## 14. Notas Finales

### Convenciones de Código
- Todo en TypeScript estricto
- Nombres de variables y funciones en inglés
- Comentarios en español si son explicativos
- Commits en español con prefijos (feat:, fix:, chore:, etc.)

### Seguridad
- Nunca exponer claves en código
- Usar `.env.local` para credenciales
- Implementar RLS en todas las tablas
- Validar permisos en cliente Y servidor

### Rendimiento
- Paginación en todas las tablas (25 items por defecto)
- Lazy loading de componentes pesados
- Caché agresivo en modo offline
- Debounce en búsquedas

### Mantenibilidad
- README en cada módulo
- Tests antes de PR
- Refactorizar al tocar código legacy
- Documentar decisiones técnicas en commits

---

**Este documento es la fuente de verdad. Cursor AI debe seguirlo estrictamente.**

