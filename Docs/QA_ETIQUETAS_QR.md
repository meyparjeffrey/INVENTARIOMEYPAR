## QA manual: Etiquetas QR

### Pre-requisitos

- Usuario autenticado.
- Acceso a la nueva página: menú lateral → **Etiquetas QR**.
- Impresora térmica configurada (si aplica).

### 1) Carga inicial

- Entra a **Etiquetas QR**.
- Verifica que carga la lista de productos.
- Busca por código/nombre/barcode.

### 2) Barcode (editar + validación)

- Selecciona un producto sin barcode.
- Introduce un barcode y pulsa **Guardar barcode**.
- Repite con un barcode ya usado por otro producto → debe mostrar error y NO guardar.

### 3) QR (generar + reemplazar + descargar)

- Con un producto con barcode:
  - Pulsa **Generar QR** → debe crear registro y preview.
  - Pulsa **Reemplazar QR** → debe pedir confirmación y regenerar.
  - Pulsa **Descargar** → debe descargar `{CODE}.png`.
  - Pulsa **Eliminar** → debe eliminar en Storage y en tabla, y desaparecer estado.

### 4) Etiqueta (preview + descargar)

- Ajusta tamaño (mm), DPI (203/300) y toggles.
- Verifica que el preview cambia.
- Pulsa **Descargar etiqueta PNG** → debe descargar `{CODE}.png`.

### 5) ZIP masivo (selector QR/Etiquetas/Ambos)

- Selecciona varios productos.
- Elige ZIP: QR / Etiquetas / Ambos.
- Pulsa **Descargar ZIP**.
- Verifica que el ZIP contiene:
  - Si QR: `PROD-XXX.png` (o `qr/PROD-XXX.png` si modo Ambos)
  - Si Etiquetas: `labels/PROD-XXX.png` si modo Ambos

### 6) Escáner

- Imprime una etiqueta/QR.
- Escanea con el módulo **Escáner**.
- Debe encontrar el producto (porque el QR contiene el `barcode`).
