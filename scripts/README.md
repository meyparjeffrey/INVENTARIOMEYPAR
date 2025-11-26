# Scripts de Utilidad

## Importar Productos desde Excel

Script para reemplazar todos los productos existentes con productos desde un archivo Excel.

### Formato del Excel

El archivo Excel debe tener las siguientes columnas en la primera fila:
- **CODIGO**: Código único del producto (requerido)
- **NOMBRE**: Nombre del producto (requerido)
- **COD. PRODUCTO PROVEEDOR**: Código del producto en el proveedor (opcional)

### Uso

```bash
npm run import:products <ruta-al-archivo-excel>
```

Ejemplo:
```bash
npm run import:products "C:\Users\TuUsuario\Desktop\productos.xlsx"
```

### Qué hace el script

1. ✅ Lee el archivo Excel
2. ✅ Valida que existan las columnas requeridas
3. ✅ Desactiva todos los productos existentes (baja lógica)
4. ✅ Crea los nuevos productos con:
   - Código y nombre del Excel
   - Código de proveedor como barcode (si está disponible)
   - Valores por defecto para campos no especificados:
     - Stock: 0
     - Stock mínimo: 0
     - Ubicación: A1 / E1
     - Sin seguimiento de lotes
     - Precio de coste: 0

### Notas

- El script requiere que exista al menos un usuario ADMIN en la base de datos
- Los productos anteriores se desactivan (no se eliminan físicamente)
- Si un producto tiene código de proveedor, se guarda en el campo `barcode` y en `notes`

