import { useCallback, useEffect, useRef, useState } from 'react';
import FoodGlobe from './components/FoodGlobe';
import WorldLedger from './components/WorldLedger';
import SearchBox from './components/SearchBox';
import CountryPanel from './components/CountryPanel';
import PasswordGate from './components/PasswordGate';
import { BY_CODE } from './data/countries';
import { isConfigured, onAuth, signOutEditor, subscribeStats } from './lib/store';
import { SCALE } from './lib/colors';

const CLAVE_NOMBRE = 'mundo-a-bocados:autor';

export default function App() {
  const [features, setFeatures] = useState([]);
  const [stats, setStats] = useState({});
  const [seleccion, setSeleccion] = useState(null);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [autor, setAutor] = useState(() => localStorage.getItem(CLAVE_NOMBRE) ?? '');
  const [clavePedida, setClavePedida] = useState(false);
  const [aviso, setAviso] = useState(null);
  const temporizador = useRef(null);

  const mostrarAviso = useCallback((texto, tono = 'ok') => {
    setAviso({ texto, tono });
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAviso(null), 3200);
  }, []);

  /* --- Polígonos --------------------------------------------------------- */
  useEffect(() => {
    let vivo = true;
    fetch('/data/countries.geo.json')
      .then((r) => r.json())
      .then((geo) => vivo && setFeatures(geo.features))
      .catch(() => vivo && mostrarAviso('No se pudieron cargar los países.', 'error'));
    return () => {
      vivo = false;
    };
  }, [mostrarAviso]);

  /* --- Datos en vivo ----------------------------------------------------- */
  useEffect(() => subscribeStats(setStats), []);
  useEffect(() => onAuth(setPuedeEditar), []);

  useEffect(() => {
    const esc = (e) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('.visor, .telon')) return; // los cierra quien esté encima
      setSeleccion(null);
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, []);

  const pais = seleccion ? BY_CODE[seleccion] : null;

  const salir = async () => {
    await signOutEditor();
    mostrarAviso('Has salido del modo edición');
  };

  return (
    <>
      <div className="estrellas" aria-hidden="true" />

      <FoodGlobe features={features} stats={stats} selected={seleccion} onSelect={setSeleccion} />

      <header className="barra">
        <div className="marca">
          <h1>El mundo a bocados</h1>
        </div>

        <SearchBox stats={stats} onSelect={setSeleccion} />

        <div className="acciones">
          {puedeEditar ? (
            <button type="button" className="btn" onClick={salir}>
              {autor ? `${autor} · salir` : 'Salir'}
            </button>
          ) : (
            <button type="button" className="btn btn-primario" onClick={() => setClavePedida(true)}>
              Entrar
            </button>
          )}
        </div>

        {/* Va al final del DOM, y la rejilla lo coloca en el centro: así el
            teclado llega antes al buscador que a las 250 marcas. */}
        <WorldLedger stats={stats} onSelect={setSeleccion} />
      </header>

      {pais && (
        <CountryPanel
          country={pais}
          canEdit={puedeEditar}
          author={autor}
          onClose={() => setSeleccion(null)}
          onUnlock={() => setClavePedida(true)}
          onToast={mostrarAviso}
        />
      )}

      {clavePedida && (
        <PasswordGate
          author={autor}
          onClose={() => setClavePedida(false)}
          onDone={(nombre) => {
            setAutor(nombre);
            localStorage.setItem(CLAVE_NOMBRE, nombre);
            setClavePedida(false);
            mostrarAviso('Ya puedes subir fotos');
          }}
        />
      )}

      <div className="leyenda" aria-hidden="true">
        <span>Menos fotos</span>
        <span className="leyenda-escala">
          {SCALE.map((t) => (
            <i key={t.from} style={{ background: `rgba(${t.color},${t.alpha})` }} />
          ))}
        </span>
        <span>más</span>
      </div>

      {!isConfigured && (
        <p className="cinta-demo">
          <strong>Modo demo</strong>
          Falta la configuración de Firebase, así que las fotos solo viven en esta pestaña. La clave
          para probar es «demo».
        </p>
      )}

      {aviso && (
        <p className="aviso" data-tono={aviso.tono} role="status">
          <i aria-hidden="true" />
          {aviso.texto}
        </p>
      )}
    </>
  );
}
