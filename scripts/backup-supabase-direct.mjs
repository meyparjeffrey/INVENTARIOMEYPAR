/**
 * Script directo para hacer backup de Supabase usando variables de entorno del sistema
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Leer .env.local
const envPath = join(projectRoot, '.env.local');
if (!existsSync(envPath)) {
  console.error('❌ No se encontró .env.local');
  process.exit(1);
}

const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno');
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

async function backupTable(table) {
  try {
    console.log(`📦 ${table.name}...`);
    const { data, error } = await supabase
      .from(table.name)
      .select('*')
      .order(table.orderBy);

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      return { table: table.name, count: 0, error: error.message };
    }

    const backupDir = join(projectRoot, 'backup');
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    const filePath = join(backupDir, `${table.name}.json`);
    writeFileSync(filePath, JSON.stringify(data || [], null, 2), 'utf-8');

    const count = Array.isArray(data) ? data.length : 0;
    console.log(`   ✅ ${count} registros → ${table.name}.json`);
    return { table: table.name, count, error: null };
  } catch (err) {
    console.error(`   ❌ Error inesperado: ${err.message}`);
    return { table: table.name, count: 0, error: err.message };
  }
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  console.log(`\n🔄 BACKUP DE SUPABASE - ${timestamp}\n`);

  const backupDir = join(projectRoot, 'backup');
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  console.log(`📁 Directorio: ${backupDir}\n`);

  const results = [];
  for (const table of TABLES) {
    const result = await backupTable(table);
    results.push(result);
  }

  // Crear resumen
  const summary = {
    timestamp: new Date().toISOString(),
    tables: results.map((r) => ({
      name: r.table,
      count: r.count,
      error: r.error,
    })),
    totalRecords: results.reduce((sum, r) => sum + r.count, 0),
    backupLocation: backupDir,
  };

  writeFileSync(
    join(backupDir, 'backup-summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8',
  );

  console.log(`\n✅ Backup completado`);
  console.log(`📊 Total de registros: ${summary.totalRecords}`);
  console.log(`📄 Resumen: backup-summary.json\n`);
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
