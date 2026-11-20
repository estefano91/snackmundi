import { useEffect, useState } from 'react';
import { removePhoto, subscribePhotos } from '../lib/store';
import Uploader from './Uploader';
import Lightbox from './Lightbox';

export default function CountryPanel({ country, canEdit, author, onClose, onUnlock, onToast }) {
  const [fotos, setFotos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [visor, setVisor] = useState(null);

  useEffect(() => {
    setCargando(true);
    setFotos([]);
    const corta = subscribePhotos(country.code, (lista) => {
      setFotos(lista);
      setCargando(false);
    });
    return corta;
  }, [country.code]);

  const borrar = async (foto) => {
    if (!window.confirm('¿Borrar esta foto?')) return;
    try {
      await removePhoto(country.code, foto);
      setVisor(null);
      onToast('Foto borrada');
    } catch {
      onToast('No se pudo borrar la foto.', 'error');
    }
  };

  return (
    <>
      <aside className="panel" aria-label={`Fotos de ${country.name}`}>
        <header className="panel-cabecera">
          <span className="panel-bandera" aria-hidden="true">
            {country.flag}
          </span>
          <div>
            <h2>{country.name}</h2>
            <p className="panel-meta">
              {cargando
                ? 'Cargando…'
                : fotos.length === 0
                  ? 'Sin probar'
                  : `${fotos.length} ${fotos.length === 1 ? 'foto' : 'fotos'}`}
            </p>
          </div>
          <button type="button" className="btn-icono" onClick={onClose} aria-label="Cerrar panel">
            ✕
          </button>
        </header>

        <div className="panel-cuerpo">
          {fotos.length > 0 ? (
            <div className="cuadricula">
              {fotos.map((foto, i) => (
                <figure className="foto" key={foto.id}>
                  <img src={foto.thumbUrl || foto.url} alt={foto.dish || `Comida de ${country.name}`} loading="lazy" />
                  <button
                    type="button"
                    className="foto-abrir"
                    aria-label={`Ampliar ${foto.dish || 'la foto'}`}
                    onClick={() => setVisor(i)}
                  />
                  {(foto.dish || foto.author) && (
                    <figcaption className="foto-pie">
                      {foto.dish && <strong>{foto.dish}</strong>}
                      {foto.author && <span>{foto.author}</span>}
                    </figcaption>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      className="foto-borrar"
                      aria-label="Borrar foto"
                      onClick={() => borrar(foto)}
                    >
                      ✕
                    </button>
                  )}
                </figure>
              ))}
            </div>
          ) : (
            !cargando && (
              <div className="vacio">
                <div className="vacio-plato" aria-hidden="true" />
                <p>
                  Aquí no hay nada todavía. Si has comido algo de {country.name}, esta es su casilla.
                </p>
              </div>
            )
          )}
        </div>

        <footer className="panel-pie">
          {canEdit ? (
            <Uploader country={country} count={fotos.length} author={author} onToast={onToast} />
          ) : (
            <button type="button" className="btn btn-primario" onClick={onUnlock}>
              Entrar para subir fotos
            </button>
          )}
        </footer>
      </aside>

      {visor !== null && fotos.length > 0 && (
        <Lightbox
          photos={fotos}
          index={Math.min(visor, fotos.length - 1)}
          countryName={country.name}
          onIndex={setVisor}
          onClose={() => setVisor(null)}
        />
      )}
    </>
  );
}
