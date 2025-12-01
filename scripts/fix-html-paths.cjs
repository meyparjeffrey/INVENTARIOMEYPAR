/**
 * Script para corregir las rutas absolutas en index.html a rutas relativas
 * Esto es necesario para que Electron pueda cargar los recursos correctamente
 */

const fs = require("fs");
const path = require("path");

const htmlPath = path.join(__dirname, "..", "dist", "renderer", "index.html");

if (fs.existsSync(htmlPath)) {
  let content = fs.readFileSync(htmlPath, "utf-8");
  
  // Reemplazar rutas absolutas por relativas
  content = content.replace(/src="\/assets\//g, 'src="./assets/');
  content = content.replace(/href="\/assets\//g, 'href="./assets/');
  
  fs.writeFileSync(htmlPath, content, "utf-8");
  console.log("✅ Rutas en index.html corregidas a relativas");
} else {
  console.warn("⚠️  No se encontró index.html en:", htmlPath);
}


