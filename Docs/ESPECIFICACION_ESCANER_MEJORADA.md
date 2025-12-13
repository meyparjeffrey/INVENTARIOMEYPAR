# Especificación Técnica: Módulo de Escáner Mejorado

> **Versión:** 2.0  
> **Fecha:** Diciembre 2024  
> **Estado:** Implementación mejorada y profesional

---

## 1. Objetivo

El módulo de escáner permite buscar productos rápidamente mediante códigos de barras o códigos QR, y realizar acciones inmediatas sobre los productos encontrados, principalmente:

- **Ver detalle del producto** → Navegar a la página de detalle
- **Añadir movimiento** → Abrir formulario de movimiento con producto preseleccionado

---

## 2. Funcionalidades Principales

### 2.1. Escaneo de Códigos

#### 2.1.1. Formatos Soportados

- **Códigos de barras:** EAN-13, EAN-8, CODE-128, CODE-39
- **Códigos QR:** Cualquier QR que contenga un código de producto o barcode
- **Código interno:** Código alfanumérico del producto (campo `code`)

#### 2.1.2. Métodos de Escaneo

**A. Escáner USB (Modo Teclado) - PRINCIPAL**

- El escáner USB se comporta como un teclado
- Escribe el código rápidamente y envía Enter automáticamente
- El campo de entrada mantiene el foco permanente
- Re-enfoca automáticamente cada segundo si se pierde el foco
- Re-enfoca cuando la ventana recupera el foco

**B. Entrada Manual**

- El usuario puede escribir el código manualmente
- Botón "Buscar" para confirmar la búsqueda
- También funciona con Enter

**C. Escáner por Cámara (Futuro)**

- Botón para activar cámara
- Usando Quagga2 para códigos de barras
- Usando ZXing para códigos QR

---

## 3. Flujo de Búsqueda y Resultados

### 3.1. Proceso de Búsqueda

```
┌─────────────────────────────────────────────────────────────┐
│                    CÓDIGO ESCANEADO                          │
│              (barcode, QR o código interno)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Buscar en Supabase usando findByCodeOrBarcode()         │
│     - Busca en columna 'barcode' (case-insensitive)         │
│     - Busca en columna 'code' (case-insensitive)            │
│     - Retorna Product | null                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐
        │   PRODUCTO       │  │   NO ENCONTRADO  │
        │   ENCONTRADO     │  │                  │
        └──────────────────┘  └──────────────────┘
                    │                   │
                    ▼                   ▼
        ┌──────────────────────────────────────────┐
        │  MOSTRAR RESULTADO CON OPCIONES          │
        │  ┌────────────────────────────────────┐ │
        │  │ ✓ Producto encontrado              │ │
        │  │ Nombre: [Nombre del producto]      │ │
        │  │ Código: [Código]                   │ │
        │  │ Stock: [Stock actual]              │ │
        │  │                                     │ │
        │  │ [Ver Producto] [Añadir Movimiento]│ │
        │  └────────────────────────────────────┘ │
        └──────────────────────────────────────────┘
```

### 3.2. Búsqueda en Base de Datos

**IMPORTANTE:** La búsqueda debe realizarse directamente en Supabase usando el método `findByCodeOrBarcode()` del repositorio, NO buscar en el array local de productos.

**Razones:**

1. **Eficiencia:** Evita cargar todos los productos en memoria
2. **Precisión:** Siempre obtiene datos actualizados de la BD
3. **Escalabilidad:** Funciona con miles de productos sin problemas
4. **Consistencia:** Garantiza que se encuentra el producto si existe

**Implementación:**

```typescript
// ✅ CORRECTO: Usar repositorio
const product = await findByCode(barcode);

// ❌ INCORRECTO: Buscar en array local
const product = products.find((p) => p.barcode === barcode);
```

---

## 4. Acciones Disponibles

### 4.1. Ver Producto

**Descripción:** Navega a la página de detalle del producto.

**Comportamiento:**

- Redirige a `/products/{productId}`
- Muestra toda la información del producto
- Permite ver historial, lotes, etc.

**Cuándo usar:**

- Usuario quiere consultar información del producto
- Verificar stock, ubicación, etc.
- Revisar historial de movimientos

---

### 4.2. Añadir Movimiento

**Descripción:** Abre el formulario de movimiento con el producto preseleccionado.

**Comportamiento:**

1. Abre el modal `MovementForm`
2. Preselecciona el producto encontrado
3. Permite elegir tipo de movimiento (IN/OUT/ADJUSTMENT)
4. Usuario completa cantidad, motivo, etc.
5. Al guardar, se registra el movimiento y se actualiza el stock

**Integración con MovementsPage:**

- El formulario debe estar sincronizado con la página de movimientos
- Después de crear el movimiento, se puede:
  - Cerrar el modal y volver al escáner
  - Navegar a la página de movimientos para ver el nuevo registro

**Cuándo usar:**

- Registrar entrada de mercancía
- Registrar salida de mercancía
- Ajustar stock
- Recepción rápida de pedidos

---

## 5. Modos de Operación

### 5.1. Modo Búsqueda (Por Defecto)

**Comportamiento:**

- Al encontrar un producto, muestra las opciones
- El usuario elige qué hacer (Ver o Añadir movimiento)
- NO navega automáticamente

**Uso recomendado:**

- Consultas rápidas
- Verificar información
- Decidir qué acción realizar

---

### 5.2. Modo Movimiento Rápido (Futuro)

**Comportamiento:**

- Al encontrar un producto, abre directamente el formulario de movimiento
- Preselecciona tipo de movimiento según configuración del usuario
- Usuario solo completa cantidad y motivo

**Uso recomendado:**

- Recepciones masivas
- Salidas rápidas
- Flujo de trabajo optimizado

---

## 6. Interfaz de Usuario

### 6.1. Layout Principal

```
┌─────────────────────────────────────────────────────────────┐
│  📷 Escáner                                    [Buscar] [Mov] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📷 [Campo de escaneo con foco permanente]          │  │
│  │  Escanea o escribe el código...                       │  │
│  │  [Buscar]                                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ✓ Producto encontrado                               │  │
│  │  Nombre: Tornillos M8 x 20mm                        │  │
│  │  Código: TORN-M8-20 · Stock: 150                    │  │
│  │                                                      │  │
│  │  [Ver Producto]  [Añadir Movimiento]               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Historial de escaneos:                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📦 Tornillos M8 x 20mm  TORN-M8-20  [Ver]           │  │
│  │  📦 Tuercas M10         TUER-M10    [Ver]           │  │
│  │  ❌ No encontrado                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 6.2. Estados Visuales

**Producto Encontrado:**

- Fondo verde claro (green-50)
- Borde verde (green-200)
- Icono de check verde
- Muestra información del producto
- Botones de acción visibles

**Producto No Encontrado:**

- Fondo rojo claro (red-50)
- Borde rojo (red-200)
- Icono de X rojo
- Mensaje explicativo
- Opción de crear producto (futuro)

**Cargando:**

- Spinner animado
- Mensaje "Buscando producto..."
- Deshabilitar campo de entrada

---

## 7. Historial de Escaneos

### 7.1. Funcionalidad

- Mantiene los últimos 10 escaneos
- Muestra resultado (encontrado/no encontrado)
- Permite acceder rápidamente a productos escaneados anteriormente
- Se limpia al recargar la página

### 7.2. Visualización

- Lista compacta con iconos
- Nombre del producto o mensaje de error
- Botón rápido para ver producto
- Orden: más reciente primero

---

## 8. Integración con Movimientos

### 8.1. Flujo de Integración

```
Escáner → Encuentra Producto → Usuario elige "Añadir Movimiento"
    ↓
Abre MovementForm con producto preseleccionado
    ↓
Usuario completa formulario
    ↓
Guarda movimiento → Actualiza stock
    ↓
Opciones:
  - Cerrar modal y continuar escaneando
  - Navegar a página de movimientos
```

### 8.2. Props del MovementForm

El `MovementForm` ya acepta:

- `preselectedProduct?: Product` → Producto preseleccionado
- `preselectedMovementType?: MovementType` → Tipo preseleccionado

**Uso desde ScannerPage:**

```typescript
<MovementForm
  isOpen={isMovementFormOpen}
  onClose={() => setIsMovementFormOpen(false)}
  onSubmit={handleMovementSubmit}
  products={products}
  preselectedProduct={foundProduct}
  preselectedMovementType="OUT" // o según configuración
/>
```

---

## 9. Mejoras Implementadas

### 9.1. Búsqueda Optimizada

✅ **Antes:** Buscaba en array local de productos (ineficiente)  
✅ **Ahora:** Usa `findByCodeOrBarcode()` del repositorio (directo a BD)

### 9.2. Opciones de Acción

✅ **Antes:** Solo navegaba a detalle del producto  
✅ **Ahora:** Muestra opciones "Ver Producto" y "Añadir Movimiento"

### 9.3. Integración con Movimientos

✅ **Antes:** No había integración  
✅ **Ahora:** Abre formulario de movimiento con producto preseleccionado

### 9.4. Mejor UX

✅ **Antes:** Navegación automática (puede ser molesta)  
✅ **Ahora:** Usuario elige qué hacer (más control)

---

## 10. Casos de Uso

### 10.1. Recepción de Mercancía

1. Usuario escanea código de producto recibido
2. Sistema encuentra el producto
3. Usuario elige "Añadir Movimiento"
4. Selecciona tipo "IN" (Entrada)
5. Ingresa cantidad recibida
6. Completa motivo (ej: "Recepción pedido #12345")
7. Guarda → Stock actualizado

### 10.2. Consulta Rápida

1. Usuario escanea código
2. Sistema encuentra el producto
3. Usuario elige "Ver Producto"
4. Ve información completa, stock, ubicación, etc.

### 10.3. Salida de Mercancía

1. Usuario escanea código
2. Sistema encuentra el producto
3. Usuario elige "Añadir Movimiento"
4. Selecciona tipo "OUT" (Salida)
5. Ingresa cantidad
6. Completa motivo (ej: "Venta a cliente X")
7. Guarda → Stock actualizado

---

## 11. Pruebas y Validación

### 11.1. Pruebas Funcionales

- [x] Escaneo de código de barras encuentra producto
- [x] Escaneo de código interno encuentra producto
- [x] Código no encontrado muestra mensaje apropiado
- [x] Botón "Ver Producto" navega correctamente
- [x] Botón "Añadir Movimiento" abre formulario
- [x] Formulario de movimiento tiene producto preseleccionado
- [x] Historial muestra últimos escaneos
- [x] Foco permanente en campo de entrada

### 11.2. Pruebas de UI/UX

- [x] Diseño moderno y profesional
- [x] Estados visuales claros (encontrado/no encontrado)
- [x] Botones de acción visibles y accesibles
- [x] Historial fácil de usar
- [x] Responsive en diferentes tamaños de pantalla
- [x] Animaciones suaves y profesionales

### 11.3. Pruebas de Rendimiento

- [x] Búsqueda rápida (< 500ms)
- [x] No bloquea la UI durante búsqueda
- [x] Manejo correcto de errores de red
- [x] Historial no afecta rendimiento

### 11.4. Pruebas de Integración

- [x] Integración correcta con MovementsPage
- [x] Sincronización de datos después de crear movimiento
- [x] Navegación fluida entre páginas
- [x] Estado persistente durante navegación

---

## 12. Traducciones

### 12.1. Nuevas Claves Añadidas

**Español:**

- `scanner.viewProduct`: "Ver Producto"
- `scanner.addMovement`: "Añadir Movimiento"
- `scanner.searching`: "Buscando producto..."
- `scanner.productFound`: "Producto encontrado"
- `scanner.selectAction`: "Selecciona una acción"

**Catalán:**

- `scanner.viewProduct`: "Veure Producte"
- `scanner.addMovement`: "Afegir Moviment"
- `scanner.searching`: "Cercant producte..."
- `scanner.productFound`: "Producte trobat"
- `scanner.selectAction`: "Selecciona una acció"

---

## 13. Mejoras Futuras

### 13.1. Escáner por Cámara

- Implementar Quagga2 para códigos de barras
- Implementar ZXing para códigos QR
- Botón para activar/desactivar cámara

### 13.2. Modo Movimiento Rápido

- Configuración de tipo de movimiento por defecto
- Apertura automática del formulario
- Atajos de teclado

### 13.3. Escaneo de Lotes

- Buscar por `batch_barcode`
- Mostrar información del lote
- Acciones específicas para lotes

### 13.4. Modo Masivo

- Escanear múltiples productos seguidos
- Lista temporal de escaneos
- Confirmación masiva de movimientos

---

## 14. Documentación Técnica

### 14.1. Archivos Modificados

- `src/presentation/pages/ScannerPage.tsx` → Página principal del escáner
- `src/presentation/context/LanguageContext.tsx` → Traducciones
- `src/presentation/components/movements/MovementForm.tsx` → Formulario de movimiento (ya existente)

### 14.2. Dependencias

- `@domain/entities` → Tipos Product, MovementType
- `@domain/repositories/ProductRepository` → Interface del repositorio
- `@infrastructure/repositories/SupabaseProductRepository` → Implementación
- `@presentation/hooks/useProducts` → Hook para buscar productos
- `@presentation/components/movements/MovementForm` → Formulario de movimiento

---

## 15. Conclusión

El módulo de escáner mejorado proporciona una experiencia profesional y eficiente para:

1. **Búsqueda rápida** de productos mediante códigos
2. **Acciones inmediatas** sobre productos encontrados
3. **Integración fluida** con el sistema de movimientos
4. **UX optimizada** con opciones claras y accesibles

La implementación sigue las mejores prácticas:

- Búsqueda directa en base de datos (no en memoria)
- Separación de responsabilidades
- Reutilización de componentes existentes
- Traducciones completas
- Diseño moderno y profesional

---

**Última actualización:** Diciembre 2024  
**Versión del documento:** 2.0
