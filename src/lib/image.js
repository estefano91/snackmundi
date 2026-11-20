/**
 * Prepara una foto en el navegador antes de subirla: corrige la orientación EXIF,
 * la reduce a un tamaño razonable y genera una miniatura para la cuadrícula.
 * Así una foto de móvil de 6 MB se sube en ~250 KB.
 */

const MAX_FULL = 1600;
const MAX_THUMB = 420;

async function decode(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Safari antiguo y formatos que createImageBitmap no acepta
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  }
}

function render(source, srcW, srcH, max, quality) {
  const scale = Math.min(1, max / Math.max(srcW, srcH));
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve({ blob, width: w, height: h }) : reject(new Error('encode'))),
      'image/jpeg',
      quality
    );
  });
}

export async function prepareImage(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Eso no parece una imagen. Sube un JPG, PNG o WebP.');
  }

  let bitmap;
  try {
    bitmap = await decode(file);
  } catch {
    throw new Error('No se pudo leer esa imagen. Prueba a guardarla como JPG.');
  }

  const srcW = bitmap.width;
  const srcH = bitmap.height;

  try {
    const [full, thumb] = await Promise.all([
      render(bitmap, srcW, srcH, MAX_FULL, 0.84),
      render(bitmap, srcW, srcH, MAX_THUMB, 0.78),
    ]);
    return { full: full.blob, thumb: thumb.blob, width: full.width, height: full.height };
  } finally {
    bitmap.close?.();
  }
}
