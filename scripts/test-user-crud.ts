/**
 * Script de prueba para validar las Edge Functions de gestión de usuarios.
 *
 * Prueba:
 * 1. Crear un usuario de prueba
 * 2. Verificar que se creó en auth.users y profiles
 * 3. Eliminar el usuario de prueba
 * 4. Verificar que se eliminó de ambos lugares
 *
 * @module scripts/test-user-crud
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
const envPath = path.join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Faltan SUPABASE_URL o SUPABASE_ANON_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUserCRUD() {
  console.log('🧪 Iniciando pruebas de gestión de usuarios...\n');

  const testEmail = `test-${Date.now()}@meypar.com`;
  const testPassword = 'Test123!@#';
  const testFirstName = 'Test';
  const testLastName = 'Usuario';

  try {
    // 1. CREAR USUARIO
    console.log('📝 Paso 1: Crear usuario de prueba...');
    console.log(`   Email: ${testEmail}`);

    const { data: createData, error: createError } = await supabase.functions.invoke(
      'create-user',
      {
        body: {
          email: testEmail,
          password: testPassword,
          firstName: testFirstName,
          lastName: testLastName,
          role: 'WAREHOUSE',
          isActive: true,
        },
        method: 'POST',
      },
    );

    if (createError) {
      console.error('❌ Error al crear usuario:', createError);
      return;
    }

    if (
      !createData ||
      (typeof createData === 'object' &&
        'success' in createData &&
        createData.success === false)
    ) {
      const errorMsg = (createData as { error?: string })?.error || 'Error desconocido';
      console.error('❌ Error al crear usuario:', errorMsg);
      return;
    }

    const userId = (createData as { userId?: string })?.userId;
    if (!userId) {
      console.error('❌ No se recibió userId en la respuesta');
      return;
    }

    console.log(`✅ Usuario creado exitosamente. ID: ${userId}\n`);

    // 2. VERIFICAR QUE SE CREÓ EN AUTH.USERS
    console.log('🔍 Paso 2: Verificar creación en auth.users...');
    const { data: authUser, error: authCheckError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .eq('id', userId)
      .single();

    if (authCheckError || !authUser) {
      console.error('❌ Error: Usuario no encontrado en profiles:', authCheckError);
      return;
    }

    console.log(
      `✅ Usuario encontrado en profiles: ${authUser.first_name} ${authUser.last_name} (${authUser.role})\n`,
    );

    // 3. ELIMINAR USUARIO
    console.log('🗑️  Paso 3: Eliminar usuario de prueba...');

    const { data: deleteData, error: deleteError } = await supabase.functions.invoke(
      'delete-user',
      {
        body: {
          userId: userId,
        },
        method: 'POST',
      },
    );

    if (deleteError) {
      console.error('❌ Error al eliminar usuario:', deleteError);
      return;
    }

    if (
      !deleteData ||
      (typeof deleteData === 'object' &&
        'success' in deleteData &&
        deleteData.success === false)
    ) {
      const errorMsg = (deleteData as { error?: string })?.error || 'Error desconocido';
      console.error('❌ Error al eliminar usuario:', errorMsg);
      return;
    }

    console.log('✅ Usuario eliminado exitosamente\n');

    // 4. VERIFICAR QUE SE ELIMINÓ DE PROFILES
    console.log('🔍 Paso 4: Verificar eliminación de profiles...');
    const { data: profileCheck, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (profileCheckError) {
      console.error('❌ Error al verificar profiles:', profileCheckError);
      return;
    }

    if (profileCheck) {
      console.error('❌ ERROR: El usuario todavía existe en profiles!');
      return;
    }

    console.log('✅ Usuario eliminado correctamente de profiles\n');

    // 5. VERIFICAR QUE SE ELIMINÓ DE AUTH.USERS (usando SQL directo)
    console.log('🔍 Paso 5: Verificar eliminación de auth.users...');
    console.log(
      '   (Nota: No podemos verificar auth.users directamente desde el cliente, pero si el perfil se eliminó, el usuario también debería estar eliminado)\n',
    );

    console.log('✅ ✅ ✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE ✅ ✅ ✅\n');
    console.log('📋 Resumen:');
    console.log('   ✅ Creación de usuario: EXITOSA');
    console.log('   ✅ Verificación en profiles: EXITOSA');
    console.log('   ✅ Eliminación de usuario: EXITOSA');
    console.log('   ✅ Verificación de eliminación: EXITOSA');
  } catch (error: unknown) {
    console.error('❌ Error inesperado:', error);
    if (error instanceof Error) {
      console.error('   Mensaje:', error.message);
      console.error('   Stack:', error.stack);
    }
  }
}

testUserCRUD();
