const fs = require('fs');
const path = require('path');

const { Resvg } = require('@resvg/resvg-js');
const pngToIco = require('png-to-ico').default;

function extractInnerSvgContent(svgText) {
  const match = svgText.match(/(<g[\s\S]*<\/g>\s*)<\/svg>/i);
  if (!match) {
    throw new Error('No se pudo extraer el contenido <g> del SVG');
  }
  return match[1];
}

function extractViewBox(svgText) {
  const match = svgText.match(
    /viewBox\s*=\s*"\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*"/i,
  );
  if (!match) {
    throw new Error('No se pudo leer el viewBox del SVG');
  }
  return {
    minX: Number(match[1]),
    minY: Number(match[2]),
    width: Number(match[3]),
    height: Number(match[4]),
  };
}

async function main() {
  const repoRoot = process.cwd();
  const buildDir = path.join(repoRoot, 'build');
  const svgPath = path.join(repoRoot, 'src', 'assets', 'logochat.svg');
  const outIcoPath = path.join(buildDir, 'icon.ico');

  if (!fs.existsSync(svgPath)) {
    throw new Error(`No existe el SVG de origen: ${svgPath}`);
  }

  fs.mkdirSync(buildDir, { recursive: true });

  const svgText = fs.readFileSync(svgPath, 'utf8');
  const inner = extractInnerSvgContent(svgText);
  const vb = extractViewBox(svgText);

  const maxSide = Math.max(vb.width, vb.height);
  const offsetX = (maxSide - vb.width) / 2;
  const offsetY = (maxSide - vb.height) / 2;

  // SVG cuadrado para que los PNG finales sean cuadrados (mejor para .ico)
  const squareSvg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${maxSide} ${maxSide}">` +
    `<g transform="translate(${offsetX} ${offsetY})">` +
    inner +
    `</g></svg>`;

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngPaths = [];

  for (const size of sizes) {
    const resvg = new Resvg(squareSvg, {
      fitTo: { mode: 'width', value: size },
      background: 'transparent',
    });

    const pngData = resvg.render().asPng();
    const pngPath = path.join(buildDir, `icon-${size}.png`);
    fs.writeFileSync(pngPath, pngData);
    pngPaths.push(pngPath);
  }

  const icoBuffer = await pngToIco(pngPaths);
  fs.writeFileSync(outIcoPath, icoBuffer);

  // Limpieza opcional de temporales
  for (const p of pngPaths) {
    try {
      fs.unlinkSync(p);
    } catch {
      // ignore
    }
  }

  const stat = fs.statSync(outIcoPath);
  console.log(`✅ icon.ico generado: ${outIcoPath} (${stat.size} bytes)`);
}

main().catch((err) => {
  console.error('❌ Error generando icon.ico:', err);
  process.exit(1);
});
