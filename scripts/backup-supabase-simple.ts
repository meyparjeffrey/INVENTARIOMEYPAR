/**
 * Script simple para hacer backup de todas las tablas de Supabase
 * Usa las variables de entorno del proyecto
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Leer variables de entorno desde .env.local
function loadEnv() {
  const envPath = path.join(projectRoot, '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('No se encontró el archivo .env.local');
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};

  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TABLES = [
  { name: 'products', orderBy: 'created_at' },
  { name: 'inventory_movements', orderBy: 'created_at' },
  { name: 'product_stock_by_warehouse', orderBy: 'created_at' },
  { name: 'product_locations', orderBy: 'created_at' },
  { name: 'product_batches', orderBy: 'created_at' },
  { name: 'product_qr_assets', orderBy: 'created_at' },
  { name: 'product_label_assets', orderBy: 'created_at' },
  { name: 'profiles', orderBy: 'created_at' },
  { name: 'suppliers', orderBy: 'created_at' },
  { name: 'product_suppliers', orderBy: 'created_at' },
  { name: 'audit_logs', orderBy: 'created_at' },
  { name: 'user_settings', orderBy: 'created_at' },
  { name: 'user_login_events', orderBy: 'login_at' },
  { name: 'app_settings', orderBy: 'updated_at' },
  { name: 'ai_suggestions', orderBy: 'created_at' },
  { name: 'ai_prediction_cache', orderBy: 'created_at' },
  { name: 'chat_rooms', orderBy: 'created_at' },
  { name: 'chat_messages', orderBy: 'created_at' },
  { name: 'batch_defect_reports', orderBy: 'created_at' },
  { name: 'product_modification_history', orderBy: 'created_at' },
  { name: 'scanner_users', orderBy: 'created_at' },
  { name: 'user_permissions', orderBy: 'granted_at' },
];

async function backupTable(table: { name: string; orderBy: string }): Promise<void> {
  try {
    console.log(`📦 Exportando: ${table.name}...`);
    const { data, error } = await supabase
      .from(table.name)
      .select('*')
      .order(table.orderBy);

    if (error) {
      console.error(`❌ Error en ${table.name}:`, error.message);
      return;
    }

    const backupDir = path.join(projectRoot, 'backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filePath = path.join(backupDir, `${table.name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data || [], null, 2), 'utf-8');

    const count = Array.isArray(data) ? data.length : 0;
    console.log(`   ✅ ${count} registros → ${path.basename(filePath)}`);
  } catch (err) {
    console.error(`❌ Error inesperado en ${table.name}:`, err);
  }
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  console.log(`\n🔄 BACKUP DE SUPABASE - ${timestamp}\n`);
  console.log(`📁 Directorio: ${path.join(projectRoot, 'backup')}\n`);

  const backupDir = path.join(projectRoot, 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Exportar todas las tablas
  for (const table of TABLES) {
    await backupTable(table);
  }

  // Crear archivo de resumen
  const summary = {
    timestamp: new Date().toISOString(),
    tables: TABLES.map((t) => t.name),
    backupLocation: backupDir,
  };

  fs.writeFileSync(
    path.join(backupDir, 'backup-summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8',
  );

  console.log(`\n✅ Backup completado en: ${backupDir}`);
  console.log(`📄 Resumen: backup-summary.json\n`);
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
