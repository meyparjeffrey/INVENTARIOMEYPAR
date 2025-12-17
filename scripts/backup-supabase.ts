/**
 * Script para hacer backup completo de todas las tablas de Supabase
 * Exporta todos los datos a archivos JSON en la carpeta backup/
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '❌ Error: Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TABLES = [
  'products',
  'inventory_movements',
  'product_stock_by_warehouse',
  'product_locations',
  'product_batches',
  'product_qr_assets',
  'product_label_assets',
  'profiles',
  'suppliers',
  'product_suppliers',
  'audit_logs',
  'user_permissions',
  'user_settings',
  'user_login_events',
  'app_settings',
  'ai_suggestions',
  'ai_prediction_cache',
  'chat_rooms',
  'chat_messages',
  'batch_defect_reports',
  'product_modification_history',
  'scanner_users',
];

async function backupTable(tableName: string): Promise<void> {
  try {
    console.log(`📦 Exportando tabla: ${tableName}...`);
    const { data, error } = await supabase.from(tableName).select('*');

    if (error) {
      console.error(`❌ Error al exportar ${tableName}:`, error.message);
      return;
    }

    const backupDir = path.join(process.cwd(), 'backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filePath = path.join(backupDir, `${tableName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data || [], null, 2), 'utf-8');

    const count = Array.isArray(data) ? data.length : 0;
    console.log(`✅ ${tableName}: ${count} registros exportados → ${filePath}`);
  } catch (err) {
    console.error(`❌ Error inesperado al exportar ${tableName}:`, err);
  }
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  console.log(`\n🔄 Iniciando backup de Supabase - ${timestamp}\n`);

  const backupDir = path.join(process.cwd(), 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Crear carpeta con timestamp
  const timestampDir = path.join(backupDir, `backup-${timestamp}`);
  fs.mkdirSync(timestampDir, { recursive: true });

  // Cambiar el directorio de trabajo al directorio con timestamp
  process.chdir(backupDir);
  fs.mkdirSync(`backup-${timestamp}`, { recursive: true });
  process.chdir(`backup-${timestamp}`);

  console.log(`📁 Carpeta de backup: ${path.join(backupDir, `backup-${timestamp}`)}\n`);

  // Exportar todas las tablas
  for (const table of TABLES) {
    await backupTable(table);
  }

  // Crear archivo de resumen
  const summary = {
    timestamp: new Date().toISOString(),
    tables: TABLES,
    backupLocation: path.join(backupDir, `backup-${timestamp}`),
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8',
  );

  console.log(
    `\n✅ Backup completado en: ${path.join(backupDir, `backup-${timestamp}`)}`,
  );
  console.log(`📄 Resumen guardado en: summary.json\n`);
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
