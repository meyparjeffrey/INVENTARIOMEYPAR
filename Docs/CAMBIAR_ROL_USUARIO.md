# Guía: Cambiar Rol de Usuario en Supabase

## Método Recomendado: Table Editor con Dropdown

### Pasos para Cambiar el Rol

1. **Accede al Dashboard de Supabase**
   - Ve a tu proyecto en [supabase.com](https://supabase.com)
   - Inicia sesión con tus credenciales

2. **Abre el Table Editor**
   - En el menú lateral, haz clic en **"Table Editor"**
   - Selecciona la tabla **`profiles`**

3. **Encuentra el Usuario**
   - Busca el usuario por nombre (`first_name`, `last_name`) o email
   - Puedes usar el buscador de la tabla

4. **Edita la Columna `role`**
   - Haz clic en la celda de la columna `role` del usuario
   - **Aparecerá un dropdown con 3 opciones:**
     - `ADMIN` - Administrador completo
     - `WAREHOUSE` - Editor/Almacén (puede crear y editar productos)
     - `VIEWER` - Solo lectura (visualizador)
   - Selecciona el nuevo rol del dropdown
   - **No necesitas escribir manualmente**, solo seleccionar

5. **Guarda los Cambios**
   - Haz clic en el botón **"Save"** o presiona `Ctrl+S`
   - Los cambios se guardan automáticamente

### Sincronización en Tiempo Real

✅ **Los cambios se sincronizan automáticamente en tiempo real:**

- Cuando cambias el rol en Supabase, la aplicación detecta el cambio automáticamente
- El usuario verá el nuevo rol reflejado sin necesidad de cerrar sesión
- Si el usuario está activo en la aplicación, los permisos se actualizan inmediatamente

### Valores Permitidos

La columna `role` tiene un constraint que solo permite estos valores:
- `ADMIN`
- `WAREHOUSE`
- `VIEWER`

Si intentas escribir otro valor, Supabase mostrará un error de validación.

### Notas Importantes

- ⚠️ **El rol `ADMIN` tiene acceso completo** a todas las funcionalidades
- ⚠️ **El rol `WAREHOUSE`** puede crear, editar y eliminar productos y movimientos
- ⚠️ **El rol `VIEWER`** solo puede ver información, no puede modificar nada
- 🔄 Los cambios se reflejan en tiempo real gracias a Supabase Realtime
- 📝 El campo `updated_at` se actualiza automáticamente cuando cambias el rol

### Alternativa: SQL Editor

Si prefieres usar SQL, puedes ejecutar:

```sql
UPDATE public.profiles
SET role = 'WAREHOUSE'  -- o 'VIEWER' o 'ADMIN'
WHERE id = 'UUID_DEL_USUARIO';
```

Pero el método del Table Editor con dropdown es más seguro y fácil de usar.

