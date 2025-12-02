# Cómo Cambiar los Colores del Tema

## 📍 Ubicación de la Configuración

Los usuarios pueden personalizar los colores de la aplicación en la página de **Configuración**.

### Ruta de Navegación Paso a Paso

1. **Inicia sesión** en la aplicación con tus credenciales
2. En el **menú lateral izquierdo**, busca y haz clic en **"Configuración"** (o **"Configuració"** en catalán)
   - 📍 **Ubicación**: Menú lateral izquierdo, última opción antes de "Admin"
   - 🎨 **Icono**: Engranaje/rueda dentada
   - 🔄 **Alternativa**: También puedes acceder desde el menú de usuario (avatar en la esquina superior derecha) → "Configuración"
3. En la página de Configuración, verás varias secciones:
   - **Configuración de Avatar** (primera sección)
   - **Apariencia** (segunda sección) - Aquí está el toggle de tema
   - **Colores del Tema** (tercera sección) - ⚠️ **Solo aparece en modo claro**
   - **Preferencias** (última sección)

## 🎨 Sección de Colores del Tema

### Requisitos

⚠️ **IMPORTANTE**: La sección de colores **solo aparece cuando el tema está en modo CLARO**.

**Cómo activar la sección de colores:**

1. Ve a la sección **"Apariencia"** en la página de Configuración
2. Busca el botón **"Cambiar tema"** (icono de sol/luna)
3. Haz clic hasta que el tema esté en **"Claro"** (modo claro)
4. La sección **"Colores del Tema"** aparecerá automáticamente debajo de "Apariencia"

**Nota importante:**
- El modo oscuro mantiene colores fijos para todos los usuarios (no se puede personalizar)
- Los colores personalizados solo se aplican cuando estás en modo claro
- Si cambias a modo oscuro, los colores personalizados se ocultan pero se mantienen guardados

### Pasos para Cambiar los Colores

#### Paso 1: Activar Modo Claro
1. En la sección **"Apariencia"**, busca el botón **"Cambiar tema"**
2. Haz clic hasta que el icono sea un **sol** ☀️ (modo claro)
3. La sección **"Colores del Tema"** aparecerá automáticamente

#### Paso 2: Seleccionar Color Primario
   - **Opción rápida**: Haz clic en uno de los 8 colores predefinidos:
     - 🔴 Rojo
     - 🔵 Azul
     - 🟢 Verde
     - 🟣 Morado
     - 🟠 Naranja
     - 🌸 Rosa
     - 🔷 Cian
     - 🟦 Índigo
   - **Opción personalizada**: 
     - Usa el selector de color (cuadro grande de color) para elegir cualquier color
     - O escribe el código hexadecimal directamente en el campo de texto (ej: `#DC2626`)
     - El código debe tener formato hexadecimal válido: `#RRGGBB` (6 dígitos)

#### Paso 3: Seleccionar Color Secundario
1. Desplázate hasta el campo **"Color secundario"**
2. Usa el selector de color o escribe el código hexadecimal
3. Este color se usa en fondos y elementos secundarios

#### Paso 4: Ver Vista Previa
- En la parte inferior de la sección verás una **"Vista previa"**
- Muestra cómo se verán los colores en botones y elementos
- Los cambios se aplican inmediatamente después de guardar

#### Paso 5: Guardar los Cambios
1. Desplázate hasta el final de la página
2. Haz clic en el botón **"Guardar cambios"** (o **"Desar canvis"** en catalán)
3. Aparecerá un mensaje de confirmación verde: ✅ "Configuración guardada correctamente"
4. Los colores se aplicarán automáticamente en toda la aplicación

## 🎯 Dónde se Aplican los Colores

Los colores personalizados se aplican automáticamente en toda la aplicación cuando estás en modo claro:

- **Botones principales**: Usan el color primario
- **Enlaces y elementos destacados**: Usan el color primario
- **Fondos secundarios**: Usan el color secundario
- **Bordes y acentos**: Usan variaciones del color primario
- **Badges y etiquetas**: Usan el color primario

### Ejemplos Visuales

- Botón "Guardar", "Aplicar", "Exportar" → Color primario
- Enlaces de navegación activos → Color primario
- Fondos de tarjetas y secciones → Color secundario
- Bordes de elementos destacados → Color primario

## 🔄 Cambiar entre Modos

- **Modo Claro**: Permite personalización de colores
- **Modo Oscuro**: Colores fijos (no personalizables)
- **Modo Sistema**: Sigue la preferencia del sistema operativo

## 📝 Notas Importantes

1. **Los colores solo se aplican en modo claro**: Si cambias a modo oscuro, los colores personalizados no se aplican
2. **Cada usuario tiene sus propios colores**: Los cambios son personales y no afectan a otros usuarios
3. **Los colores se guardan en Supabase**: Se sincronizan automáticamente con tu cuenta
4. **Vista previa en tiempo real**: Puedes ver cómo se verán los colores antes de guardar

## 🛠️ Para Desarrolladores

### Ubicación en el Código

- **Componente de selección de colores**: `src/presentation/components/settings/ThemeColors.tsx`
- **Página de configuración**: `src/presentation/pages/SettingsPage.tsx`
- **Aplicación de colores**: `src/presentation/context/ThemeContext.tsx`
- **Variables CSS**: `src/presentation/styles.css`

### Cómo Funciona

1. El usuario selecciona colores en `ThemeColors.tsx`
2. Los colores se guardan en `user_settings` (tabla Supabase)
3. `ThemeContext.tsx` lee los colores desde `authContext.settings`
4. Se aplican como variables CSS (`--primary-500`, `--secondary-500`, etc.)
5. Solo se aplican cuando `effectiveTheme === "light"`

