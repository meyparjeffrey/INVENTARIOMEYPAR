# 🔍 Problema de Búsqueda en Frontend - Página de Productos

## 📅 Fecha de Detección
5 de diciembre de 2025

## 🎯 Contexto
Después de importar exitosamente **9,220 productos** desde Excel a Supabase, se detectó que la búsqueda local en la página de productos (`/products`) no está funcionando correctamente.

## ✅ Lo que SÍ funciona
- ✅ **Importación masiva**: 8,227 productos creados + 968 actualizados
- ✅ **Base de datos**: Todos los productos están correctamente en Supabase
- ✅ **Búsquedas SQL directas**: Funcionan perfectamente
  ```sql
  -- Ejemplo: buscar "00240" devuelve 14 productos
  SELECT COUNT(*) FROM products 
  WHERE (code ILIKE '%00240%' OR name ILIKE '%00240%' OR barcode ILIKE '%00240%') 
  AND is_active = true;
  -- Resultado: 14 productos
  ```
- ✅ **Búsqueda global del header**: Funciona correctamente

## ❌ Lo que NO funciona
- ❌ **Búsqueda local en `/products`**: Al escribir en el campo de búsqueda "Buscar per codi, nom o barcode..." no se filtran los resultados
- Los productos se muestran en la tabla, pero la búsqueda no reacciona
- La búsqueda del header (arriba) sí funciona, pero la del filtro local de productos no

## 🔬 Evidencia
### Capturas de pantalla
- Se escribió "00240" en el campo de búsqueda local
- La tabla sigue mostrando productos que NO coinciden (KIT20-20048, KIT20-20043, KIT30-XXXXX, etc.)
- Debería mostrar solo los 14 productos que contienen "00240" en código/nombre/barcode

### Consulta SQL que confirma que los datos existen
```sql
SELECT code, name, barcode FROM products 
WHERE (code ILIKE '%00240%' OR name ILIKE '%00240%' OR barcode ILIKE '%00240%') 
AND is_active = true;
```

**Resultado**: 14 productos encontrados correctamente

## 🐛 Posibles Causas
1. **Problema de debounce**: El debounce podría estar configurado con un delay muy largo
2. **Estado no sincronizado**: El estado de búsqueda no se está propagando correctamente al filtro
3. **Hook useProducts**: El filtro de búsqueda local podría no estar funcionando
4. **Componente ProductFilters o ProductTable**: No están recibiendo/aplicando el filtro de búsqueda correctamente

## 📁 Archivos Relacionados
- `src/presentation/pages/ProductsPage.tsx` - Página principal de productos
- `src/presentation/components/products/ProductFilters.tsx` - Componente de filtros
- `src/presentation/components/products/ProductTable.tsx` - Tabla de productos
- `src/presentation/hooks/useProducts.ts` - Hook para gestionar productos
- `src/infrastructure/repositories/SupabaseProductRepository.ts` - Repositorio con queries

## 🎯 Objetivo para Mañana
Arreglar la búsqueda local en la página de productos para que:
1. Al escribir en el campo "Buscar per codi, nom o barcode..." se filtren los resultados en tiempo real
2. La búsqueda debe ser case-insensitive
3. Debe buscar en: `code`, `name`, y `barcode`
4. Debe tener un debounce razonable (300-500ms)
5. Debe mostrar "No se encontraron productos" cuando no hay resultados

## 📝 Prompt para Mañana

```
La búsqueda local en la página de productos (/products) no está funcionando. 

CONTEXTO:
- Tengo 9,220 productos correctamente en Supabase
- Las búsquedas SQL directas funcionan perfectamente
- La búsqueda global del header SÍ funciona
- Pero el campo de búsqueda local "Buscar per codi, nom o barcode..." en la página de productos NO filtra los resultados

PROBLEMA:
Al escribir en el campo de búsqueda de la página de productos, la tabla no se filtra. Los productos siguen mostrándose todos sin ningún filtro aplicado.

EVIDENCIA:
- Escribí "00240" en la búsqueda
- La tabla muestra productos que NO coinciden (KIT20-20048, KIT30-XXXXX, etc.)
- SQL confirma que hay 14 productos con "00240": 
  SELECT COUNT(*) FROM products WHERE (code ILIKE '%00240%' OR name ILIKE '%00240%' OR barcode ILIKE '%00240%') AND is_active = true;
  Resultado: 14

ARCHIVOS CLAVE:
- src/presentation/pages/ProductsPage.tsx
- src/presentation/components/products/ProductFilters.tsx
- src/presentation/hooks/useProducts.ts

POR FAVOR:
1. Investiga por qué la búsqueda local no está filtrando
2. Verifica que el estado de búsqueda se propague correctamente
3. Asegúrate de que el debounce esté funcionando (300-500ms)
4. Prueba con @Browser que la búsqueda funciona después del fix
5. La búsqueda debe ser en code, name y barcode (case-insensitive)
```

## ✅ Checklist de Verificación Post-Fix
- [ ] Escribir "00240" en búsqueda local → Debe mostrar solo 14 productos
- [ ] Escribir "ZZZ99" → Debe mostrar productos de la serie ZZZ99
- [ ] Búsqueda por nombre parcial funciona
- [ ] Búsqueda por barcode funciona
- [ ] Búsqueda vacía muestra todos los productos
- [ ] No hay errores en consola del navegador
- [ ] El debounce funciona correctamente (no consulta en cada tecla)

## 📊 Datos de Importación (para referencia)
```
✅ Importación completada
- Creados: 8,227
- Actualizados: 968  
- Errores: 13
- Tiempo: 19.27s
- Total en DB: 9,220 productos activos
```

