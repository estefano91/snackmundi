import { useState } from 'react';
import { isConfigured, signIn } from '../lib/store';

export default function PasswordGate({ author, onDone, onClose }) {
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState(author ?? '');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await signIn(password);
      onDone(nombre.trim());
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="telon" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialogo" role="dialog" aria-modal="true" aria-labelledby="titulo-clave">
        <h2 id="titulo-clave">Clave de edición</h2>
        <p>
          {isConfigured
            ? 'Con la clave compartida puedes subir fotos a cualquier país.'
            : 'Esto es una demo sin Firebase: la clave es «demo» y las fotos no se guardan.'}
        </p>

        <form onSubmit={enviar}>
          <div className="campo">
            <label htmlFor="clave">Contraseña</label>
            <input
              id="clave"
              type="password"
              value={password}
              autoFocus
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="campo">
            <label htmlFor="nombre">Tu nombre, para firmar las fotos</label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              placeholder="Opcional"
              autoComplete="name"
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          {error && <p className="error">{error}</p>}

          <div className="dialogo-botones">
            <button type="button" className="btn-texto" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primario" disabled={!password || enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
