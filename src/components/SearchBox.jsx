import { useEffect, useMemo, useRef, useState } from 'react';
import { COUNTRIES } from '../data/countries';

const sinAcentos = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const INDICE = COUNTRIES.map((c) => ({ ...c, busca: sinAcentos(`${c.name} ${c.nameEn}`) }));

export default function SearchBox({ stats, onSelect }) {
  const [texto, setTexto] = useState('');
  const [activo, setActivo] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const caja = useRef(null);

  const resultados = useMemo(() => {
    const q = sinAcentos(texto.trim());
    if (!q) return [];
    return INDICE.filter((c) => c.busca.includes(q))
      .sort((a, b) => a.busca.indexOf(q) - b.busca.indexOf(q))
      .slice(0, 8);
  }, [texto]);

  useEffect(() => setActivo(0), [texto]);

  useEffect(() => {
    const fuera = (e) => {
      if (caja.current && !caja.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, []);

  const elegir = (code) => {
    onSelect(code);
    setTexto('');
    setAbierto(false);
  };

  const teclas = (e) => {
    if (!resultados.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActivo((i) => (i + 1) % resultados.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivo((i) => (i - 1 + resultados.length) % resultados.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      elegir(resultados[activo].code);
    } else if (e.key === 'Escape') {
      setAbierto(false);
    }
  };

  return (
    <div className="buscador" ref={caja}>
      <input
        type="search"
        value={texto}
        placeholder="Buscar un país"
        aria-label="Buscar un país"
        autoComplete="off"
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onKeyDown={teclas}
      />

      {abierto && resultados.length > 0 && (
        <ul className="sugerencias">
          {resultados.map((pais, i) => {
            const n = stats[pais.code]?.count ?? 0;
            return (
              <li key={pais.code} data-activo={i === activo ? 'si' : 'no'}>
                <button type="button" onMouseEnter={() => setActivo(i)} onClick={() => elegir(pais.code)}>
                  <span className="bandera" aria-hidden="true">{pais.flag}</span>
                  {pais.name}
                  {n > 0 && <span className="cuenta">{n}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
