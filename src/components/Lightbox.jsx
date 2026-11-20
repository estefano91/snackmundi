import { useEffect } from 'react';

export default function Lightbox({ photos, index, onIndex, onClose, countryName }) {
  const foto = photos[index];

  useEffect(() => {
    const teclas = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndex((index + 1) % photos.length);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + photos.length) % photos.length);
    };
    document.addEventListener('keydown', teclas);
    return () => document.removeEventListener('keydown', teclas);
  }, [index, photos.length, onClose, onIndex]);

  if (!foto) return null;

  return (
    <div className="visor" role="dialog" aria-modal="true" aria-label="Foto ampliada">
      <img src={foto.url} alt={foto.dish || `Comida de ${countryName}`} />

      <div className="visor-pie">
        <strong>{foto.dish || countryName}</strong>
        <p>
          {foto.author ? `Subida por ${foto.author}` : 'Sin firmar'} · {index + 1} de {photos.length}
        </p>
      </div>

      <button type="button" className="btn-icono visor-cerrar" onClick={onClose} aria-label="Cerrar">
        ✕
      </button>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="visor-nav"
            data-dir="prev"
            aria-label="Foto anterior"
            onClick={() => onIndex((index - 1 + photos.length) % photos.length)}
          >
            ‹
          </button>
          <button
            type="button"
            className="visor-nav"
            data-dir="next"
            aria-label="Foto siguiente"
            onClick={() => onIndex((index + 1) % photos.length)}
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
