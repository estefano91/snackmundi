/**
 * La textura nocturna de la NASA trae un velo azulado sobre los desiertos que
 * compite con el color de los países probados. Aquí se apaga ese velo y se
 * conservan las luces de las ciudades.
 *
 * Uso: npm run texture
 */
import sharp from 'sharp';

const ORIGEN = 'node_modules/three-globe/example/img/earth-night.jpg';
const DESTINO = 'public/img/earth-night.jpg';

const APAGADO = 0.26;   // cuánta luz conserva lo más oscuro (océanos)
const CURVA = 1.15;     // cuanto más alto, más se aplasta lo tenue
const GRIS = 0.72;      // cuánto se desatura el velo tenue (mata el cian)
const CALIDEZ = 0.1;    // las luces de ciudad quedan un punto más cálidas

const { data, info } = await sharp(ORIGEN).raw().toBuffer({ resolveWithObject: true });
const canales = info.channels;

for (let i = 0; i < data.length; i += canales) {
  const r = data[i] / 255;
  const g = data[i + 1] / 255;
  const b = data[i + 2] / 255;

  const luz = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const factor = APAGADO + (1 - APAGADO) * Math.pow(luz, CURVA);

  // Solo se desatura lo tenue: las luces de ciudad conservan su color.
  const gris = GRIS * Math.pow(1 - luz, 2);
  const calor = CALIDEZ * luz;

  data[i] = Math.min(255, (r * (1 - gris) + luz * gris) * factor * (1 + calor) * 255);
  data[i + 1] = Math.min(255, (g * (1 - gris) + luz * gris) * factor * 255);
  data[i + 2] = Math.min(255, (b * (1 - gris) + luz * gris) * factor * (1 - calor) * 255);
}

await sharp(data, { raw: info }).jpeg({ quality: 88, mozjpeg: true }).toFile(DESTINO);
console.log(`✓ ${DESTINO} (${info.width}×${info.height})`);
