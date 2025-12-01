/**
 * Script de validación del build de Electron
 * Verifica que todos los archivos necesarios estén presentes
 */

const fs = require("fs");
const path = require("path");

const errors = [];
const warnings = [];

console.log("🔍 Validando build de Electron...\n");

// Verificar estructura de directorios
const requiredPaths = [
  "dist/main/src/main/electron/main.js",
  "dist/renderer/index.html",
  "dist/renderer/assets"
];

requiredPaths.forEach(relPath => {
  const fullPath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`❌ Falta: ${relPath}`);
  } else {
    console.log(`✅ ${relPath}`);
  }
});

// Verificar index.html
const htmlPath = path.join(process.cwd(), "dist/renderer/index.html");
if (fs.existsSync(htmlPath)) {
  const htmlContent = fs.readFileSync(htmlPath, "utf-8");
  
  // Verificar que use rutas relativas
  if (htmlContent.includes('src="/assets/') || htmlContent.includes('href="/assets/')) {
    errors.push("❌ index.html contiene rutas absolutas (debe usar ./assets/)");
  } else {
    console.log("✅ index.html usa rutas relativas");
  }
  
  // Verificar que tenga el div root
  if (!htmlContent.includes('<div id="root">')) {
    errors.push("❌ index.html no contiene <div id=\"root\">");
  } else {
    console.log("✅ index.html tiene <div id=\"root\">");
  }
} else {
  errors.push("❌ No se encontró dist/renderer/index.html");
}

// Verificar assets
const assetsPath = path.join(process.cwd(), "dist/renderer/assets");
if (fs.existsSync(assetsPath)) {
  const assets = fs.readdirSync(assetsPath);
  const jsFiles = assets.filter(f => f.endsWith(".js"));
  const cssFiles = assets.filter(f => f.endsWith(".css"));
  
  if (jsFiles.length === 0) {
    errors.push("❌ No se encontraron archivos JS en assets");
  } else {
    console.log(`✅ Encontrados ${jsFiles.length} archivos JS`);
  }
  
  if (cssFiles.length === 0) {
    warnings.push("⚠️  No se encontraron archivos CSS en assets");
  } else {
    console.log(`✅ Encontrados ${cssFiles.length} archivos CSS`);
  }
}

// Verificar main.js
const mainJsPath = path.join(process.cwd(), "dist/main/src/main/electron/main.js");
if (fs.existsSync(mainJsPath)) {
  const mainContent = fs.readFileSync(mainJsPath, "utf-8");
  
  if (!mainContent.includes("app.getAppPath()")) {
    warnings.push("⚠️  main.js podría no estar usando app.getAppPath() correctamente");
  } else {
    console.log("✅ main.js usa app.getAppPath()");
  }
}

console.log("\n" + "=".repeat(50));

if (errors.length > 0) {
  console.error("\n❌ ERRORES ENCONTRADOS:");
  errors.forEach(err => console.error(`  ${err}`));
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn("\n⚠️  ADVERTENCIAS:");
  warnings.forEach(warn => console.warn(`  ${warn}`));
}

console.log("\n✅ Validación completada exitosamente");
process.exit(0);

