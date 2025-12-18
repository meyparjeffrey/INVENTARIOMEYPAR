const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const version = pkg.version;

const src = path.join(__dirname, '..', 'src', 'main', 'electron', 'splash.html');
const dstDir = path.join(__dirname, '..', 'dist', 'main', 'src', 'main', 'electron');
const dst = path.join(dstDir, 'splash.html');

if (fs.existsSync(src)) {
    if (!fs.existsSync(dstDir)) {
        fs.mkdirSync(dstDir, { recursive: true });
    }
    
    let content = fs.readFileSync(src, 'utf8');
    // Mantener UNA sola fuente de verdad (package.json version).
    // Soporta:
    // - Placeholder: v__APP_VERSION__
    // - Cualquier versión hardcodeada previa: vX.X.X
    content = content.replace(/__APP_VERSION__/g, version);
    content = content.replace(/v\d+\.\d+\.\d+/g, `v${version}`);
    
    fs.writeFileSync(dst, content);
    console.log(`✅ Splash copiado y actualizado a v${version}`);
} else {
    console.error(`❌ No se encontró el splash en: ${src}`);
}

