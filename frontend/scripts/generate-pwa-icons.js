/**
 * Script para generar iconos PWA de AiutoX ERP
 *
 * Este script genera los iconos PWA en los tamaños requeridos
 * usando el logo de AiutoX y los colores de brand.
 *
 * Requiere: sharp (instalado como devDependency)
 *
 * Uso: node scripts/generate-pwa-icons.js
 */

import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de colores de brand
const BRAND_COLORS = {
  blue: "#023E87", // AiutoX Blue (primario)
  teal: "#00B6BC", // AiutoX Teal (secundario)
  dark: "#121212", // AiutoX Dark
  bodyText: "#3C3A47", // Body Text Gray (usado en theme-color del manifest)
  red: "#F44250", // AiutoX Red (logo symbol)
};

// Tamaños de iconos requeridos para PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Directorios
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const LOGO_SOURCE = path.join(
  __dirname,
  "..",
  "..",
  "docs",
  "60-brand",
  "logos",
  "H_Logo.png"
);

/**
 * Crea un icono cuadrado con el logo centrado y fondo de color
 */
async function createIcon(
  size,
  outputPath,
  backgroundColor = BRAND_COLORS.bodyText
) {
  try {
    console.log(`Generando icono de ${size}x${size}px...`);

    // Crear fondo cuadrado con color
    const background = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: backgroundColor,
      },
    })
      .png()
      .toBuffer();

    // Redimensionar logo para que quepa con margen (80% del tamaño)
    const logoSize = Math.floor(size * 0.8);
    const margin = Math.floor((size - logoSize) / 2);

    // Leer y redimensionar logo
    const resizedLogo = await sharp(LOGO_SOURCE)
      .resize(logoSize, logoSize, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();

    // Componer: fondo + logo centrado
    await sharp(background)
      .composite([
        {
          input: resizedLogo,
          top: margin,
          left: margin,
        },
      ])
      .png()
      .toFile(outputPath);

    console.log(`✓ Generado: ${path.basename(outputPath)}`);
  } catch (error) {
    console.error(`✗ Error generando icono ${size}x${size}:`, error.message);
  }
}

/**
 * Crea apple-touch-icon con esquinas redondeadas
 */
async function createAppleTouchIcon() {
  const size = 180;
  const outputPath = path.join(PUBLIC_DIR, "apple-touch-icon.png");
  const cornerRadius = Math.floor(size * 0.22); // Radio de 22% para iOS

  try {
    console.log(
      `Generando apple-touch-icon de ${size}x${size}px con esquinas redondeadas...`
    );

    // Crear fondo con esquinas redondeadas
    const roundedCorners = Buffer.from(
      `<svg width="${size}" height="${size}">
        <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="${BRAND_COLORS.bodyText}"/>
      </svg>`
    );

    const background = await sharp(roundedCorners).png().toBuffer();

    // Redimensionar logo
    const logoSize = Math.floor(size * 0.75);
    const margin = Math.floor((size - logoSize) / 2);

    const resizedLogo = await sharp(LOGO_SOURCE)
      .resize(logoSize, logoSize, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();

    // Componer con máscara redondeada
    await sharp(background)
      .composite([
        {
          input: resizedLogo,
          top: margin,
          left: margin,
        },
      ])
      .png()
      .toFile(outputPath);

    console.log(`✓ Generado: apple-touch-icon.png`);
  } catch (error) {
    console.error(`✗ Error generando apple-touch-icon:`, error.message);
  }
}

/**
 * Main function
 */
async function main() {
  console.log("========================================");
  console.log("  Generador de Iconos PWA - AiutoX ERP");
  console.log("========================================\n");

  // Verificar que existe el logo source
  if (!fs.existsSync(LOGO_SOURCE)) {
    console.error(`✗ Error: No se encuentra el logo en ${LOGO_SOURCE}`);
    console.error(
      "  Verifica que el archivo existe en docs/60-brand/logos/LOGO.png"
    );
    process.exit(1);
  }

  // Verificar que existe el directorio public
  if (!fs.existsSync(PUBLIC_DIR)) {
    console.error(`✗ Error: No existe el directorio public: ${PUBLIC_DIR}`);
    process.exit(1);
  }

  console.log(`Logo source: ${LOGO_SOURCE}`);
  console.log(`Output directory: ${PUBLIC_DIR}\n`);

  // Generar todos los iconos
  for (const size of ICON_SIZES) {
    const outputPath = path.join(PUBLIC_DIR, `icon-${size}x${size}.png`);
    await createIcon(size, outputPath);
  }

  // Generar apple-touch-icon
  await createAppleTouchIcon();

  console.log("\n========================================");
  console.log("  ✓ Todos los iconos PWA generados");
  console.log("========================================\n");
  console.log("Iconos generados:");
  ICON_SIZES.forEach((size) => {
    console.log(`  - icon-${size}x${size}.png`);
  });
  console.log("  - apple-touch-icon.png\n");
}

// Ejecutar
main().catch((error) => {
  console.error("\n✗ Error fatal:", error);
  process.exit(1);
});
