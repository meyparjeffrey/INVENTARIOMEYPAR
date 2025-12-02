# Guía: Gestión de Usuarios en Supabase

## Relación entre `auth.users` y `profiles`

### ¿Cómo se relacionan?

La relación es **1 a 1** mediante el campo `id`:

- **`auth.users.id`** = UUID del usuario en el sistema de autenticación
- **`profiles.id`** = **Mismo UUID** que `auth.users.id` (Foreign Key)

**Ejemplo:**
```
auth.users:
  id: "89ff900f-29c9-4509-aece-5a32a91de1fe"
  email: "jbolanos2@meypar.com"
  encrypted_password: "..."

profiles:
  id: "89ff900f-29c9-4509-aece-5a32a91de1fe"  ← Mismo ID
  first_name: "Jeffrey"
  last_name: "Bolaños"
  role: "ADMIN"
```

### ¿Cómo identificar un usuario?

**Método 1: Por email (más fácil)**
```sql
SELECT 
  au.email,
  p.first_name,
  p.last_name,
  p.role
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'jbolanos2@meypar.com';
```

**Método 2: Por ID**
```sql
SELECT 
  au.email,
  p.first_name,
  p.last_name,
  p.role
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.id = '89ff900f-29c9-4509-aece-5a32a91de1fe';
```

## Cambiar Contraseña de un Usuario

### Opción 1: Desde el Dashboard de Supabase (Recomendado)

1. **Accede al Dashboard de Supabase**
   - Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
   - Selecciona tu proyecto

2. **Ve a Authentication**
   - En el menú lateral, haz clic en **"Authentication"**
   - Luego haz clic en **"Users"**

3. **Encuentra el Usuario**
   - Busca el usuario por email en la lista
   - Haz clic en el usuario para ver sus detalles

4. **Cambiar Contraseña**
   - En la página de detalles del usuario, busca la sección **"Password"**
   - Haz clic en **"Reset Password"** o **"Change Password"**
   - Ingresa la nueva contraseña
   - Confirma el cambio

### Opción 2: Desde SQL Editor (Solo Admin)

⚠️ **ADVERTENCIA:** Esto requiere permisos de administrador y conocimiento de SQL.

```sql
-- Cambiar contraseña de un usuario por email
-- La contraseña debe estar encriptada con bcrypt
-- Es más seguro usar el Dashboard

UPDATE auth.users
SET encrypted_password = crypt('NuevaContraseña123', gen_salt('bf'))
WHERE email = 'jbolanos2@meypar.com';
```

**Nota:** El método SQL es complejo porque requiere encriptar la contraseña con bcrypt. Es más fácil y seguro usar el Dashboard.

### Opción 3: Enviar Email de Restablecimiento

1. En **Authentication → Users**
2. Selecciona el usuario
3. Haz clic en **"Send Password Reset Email"**
4. El usuario recibirá un email para restablecer su contraseña

## Cambiar Rol de un Usuario

### Desde Table Editor (Con Dropdown)

1. **Ve a Table Editor → `profiles`**
2. **Busca el usuario** por nombre o email
3. **Haz clic en la columna `role`**
4. **Selecciona del dropdown:**
   - `ADMIN` - Administrador completo
   - `WAREHOUSE` - Editor/Almacén
   - `VIEWER` - Solo lectura
5. **Guarda los cambios**

**Nota:** Si no aparece el dropdown, es porque Supabase Table Editor no siempre muestra dropdowns para CHECK constraints. En ese caso, escribe manualmente uno de los 3 valores permitidos.

### Desde SQL Editor

```sql
-- Cambiar rol por email
UPDATE public.profiles
SET role = 'WAREHOUSE'  -- o 'VIEWER' o 'ADMIN'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'jbolanos2@meypar.com'
);
```

## Crear un Nuevo Usuario

### Paso 1: Crear en Authentication

1. Ve a **Authentication → Users**
2. Haz clic en **"Add User"** o **"Create User"**
3. Completa:
   - **Email:** `nuevo@ejemplo.com`
   - **Password:** (contraseña segura)
   - **Auto Confirm User:** ✅ (marcar para activar inmediatamente)
4. Haz clic en **"Create User"**

### Paso 2: Crear Perfil en `profiles`

Después de crear el usuario en Authentication, debes crear su perfil:

```sql
INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  role
)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'nuevo@ejemplo.com'),
  'Nombre',
  'Apellido',
  'WAREHOUSE'  -- Rol inicial
);
```

## Ver Todos los Usuarios con sus Perfiles

```sql
SELECT 
  au.id,
  au.email,
  au.created_at AS usuario_creado,
  p.first_name,
  p.last_name,
  p.role,
  p.is_active,
  p.created_at AS perfil_creado
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC;
```

## Desactivar un Usuario

```sql
-- Desactivar usuario (no puede iniciar sesión)
UPDATE public.profiles
SET is_active = false
WHERE id = (SELECT id FROM auth.users WHERE email = 'usuario@ejemplo.com');
```

## Eliminar un Usuario

⚠️ **ADVERTENCIA:** Esto eliminará el usuario y su perfil permanentemente.

1. **Desde Dashboard:**
   - Authentication → Users
   - Selecciona el usuario
   - Haz clic en **"Delete User"**

2. **Desde SQL:**
   ```sql
   -- Esto eliminará automáticamente el perfil por CASCADE
   DELETE FROM auth.users 
   WHERE email = 'usuario@ejemplo.com';
   ```

## Sincronización en Tiempo Real

✅ **Los cambios se sincronizan automáticamente:**

- Cuando cambias el rol en Supabase, la aplicación lo detecta en tiempo real
- Cuando cambias la contraseña, el usuario debe usar la nueva contraseña en el próximo login
- Los cambios en el perfil se reflejan inmediatamente en la aplicación

