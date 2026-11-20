import { useRef, useState } from 'react';
import { addPhoto, MAX_PER_COUNTRY } from '../lib/store';

export default function Uploader({ country, count, author, onToast }) {
  const input = useRef(null);
  const [plato, setPlato] = useState('');
  const [encima, setEncima] = useState(false);
  const [hechas, setHechas] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  const libres = MAX_PER_COUNTRY - count;
  const subiendo = total > 0;

  const subir = async (archivos) => {
    setError('');
    const lista = [...archivos].filter((f) => f.type.startsWith('image/')).slice(0, Math.max(libres, 0));

    if (!lista.length) {
      setError(
        libres <= 0
          ? `${country.name} ya tiene el máximo de ${MAX_PER_COUNTRY} fotos.`
          : 'No había ninguna imagen en lo que has soltado.'
      );
      return;
    }

    setTotal(lista.length);
    setHechas(0);

    let ok = 0;
    for (const archivo of lista) {
      try {
        await addPhoto(country.code, { file: archivo, dish: plato, author });
        ok += 1;
      } catch (err) {
        setError(err?.message || 'No se pudo subir la foto. Revisa la conexión e inténtalo otra vez.');
      }
      setHechas((n) => n + 1);
    }

    setTotal(0);
    setHechas(0);
    setPlato('');
    if (ok) onToast(ok === 1 ? 'Foto subida' : `${ok} fotos subidas`);
  };

  return (
    <div className="subida">
      <div className="campo">
        <label htmlFor="plato">Qué plato es</label>
        <input
          id="plato"
          type="text"
          value={plato}
          placeholder="Opcional — p. ej. ramen de miso"
          onChange={(e) => setPlato(e.target.value)}
        />
      </div>

      <button
        type="button"
        className="suelta"
        data-encima={encima ? 'si' : 'no'}
        disabled={subiendo || libres <= 0}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => {
          e.preventDefault();
          setEncima(false);
          subir(e.dataTransfer.files);
        }}
      >
        {libres <= 0 ? (
          <strong>Este país ya está completo</strong>
        ) : subiendo ? (
          <strong>
            Subiendo {hechas + 1} de {total}…
          </strong>
        ) : (
          <>
            <strong>Subir una foto de {country.name}</strong>
            <small>Arrastra la imagen aquí o haz clic para elegirla</small>
          </>
        )}
      </button>

      {subiendo && (
        <div className="progreso" role="progressbar" aria-valuenow={hechas} aria-valuemax={total}>
          <i style={{ width: `${(hechas / total) * 100}%` }} />
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          subir(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
