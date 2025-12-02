# Solución: Dropdown para Rol en Supabase Table Editor

## Problema

Supabase Table Editor **NO muestra dropdowns automáticamente** para columnas con CHECK constraints, incluso si tienen valores limitados. Esta es una limitación conocida del Table Editor.

## Soluciones

### Solución 1: Usar SQL Editor (Recomendado para evitar errores)

En lugar de usar el Table Editor, usa el **SQL Editor** con esta consulta:

```sql
-- Cambiar rol de un usuario por email
UPDATE public.profiles
SET role = 'WAREHOUSE'  -- Cambia a: 'ADMIN', 'WAREHOUSE' o 'VIEWER'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'jbolanos2@meypar.com'
);
```

**Ventajas:**
- ✅ No hay riesgo de escribir mal el valor
- ✅ Puedes copiar y pegar
- ✅ Más rápido una vez que tienes la plantilla

### Solución 2: Table Editor con Validación

Si prefieres usar el Table Editor:

1. Ve a **Table Editor → `profiles`**
2. Busca el usuario
3. Haz clic en la celda `role`
4. **Escribe EXACTAMENTE uno de estos valores:**
   - `ADMIN` (todo en mayúsculas)
   - `WAREHOUSE` (todo en mayúsculas)
   - `VIEWER` (todo en mayúsculas)
5. Si escribes algo diferente, Supabase mostrará un error de validación
6. Guarda los cambios

**Valores permitidos (copia y pega):**
```
ADMIN
WAREHOUSE
VIEWER
```

### Solución 3: Crear una Vista con Dropdown (Avanzado)

Puedes crear una vista que facilite la edición, pero requiere conocimientos avanzados de SQL.

## Verificación de Valores Permitidos

Para verificar qué valores están permitidos, ejecuta:

```sql
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass
AND conname = 'profiles_role_check';
```

Esto mostrará: `CHECK ((role = ANY (ARRAY['ADMIN'::text, 'WAREHOUSE'::text, 'VIEWER'::text])))`

## Nota Importante

El CHECK constraint **SÍ valida** los valores. Si intentas escribir algo diferente a `ADMIN`, `WAREHOUSE` o `VIEWER`, Supabase mostrará un error y no te dejará guardar. Esto previene errores de escritura.

## Recomendación

Para evitar errores, usa la **Solución 1 (SQL Editor)** con la plantilla proporcionada. Solo cambia el email y el rol deseado.

