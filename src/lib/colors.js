/** Escala de un solo tono: azafrán -> pimentón según cuántas fotos tenga el país. */
export const SCALE = [
  { from: 1, color: '242,163,60', alpha: 0.34 },
  { from: 3, color: '242,163,60', alpha: 0.6 },
  { from: 6, color: '233,126,45', alpha: 0.78 },
  { from: 10, color: '214,74,46', alpha: 0.9 },
];

export const SIN_PROBAR = 'rgba(244,239,229,0.055)';
export const HOVER = 'rgba(122,170,224,0.5)';

const tier = (count) => {
  let hit = null;
  for (const t of SCALE) if (count >= t.from) hit = t;
  return hit;
};

/** Color de la cara superior del país en el globo. */
export function capColor(count, { hovered = false } = {}) {
  if (hovered) return HOVER;
  const t = tier(count);
  return t ? `rgba(${t.color},${t.alpha})` : SIN_PROBAR;
}

/** Color plano, sin transparencia, para las marcas del registro y los puntos. */
export function solidColor(count) {
  const t = tier(count);
  return t ? `rgb(${t.color})` : 'rgba(244,239,229,0.14)';
}

export function sideColor(count) {
  const t = tier(count);
  return t ? `rgba(${t.color},0.22)` : 'rgba(244,239,229,0.04)';
}
