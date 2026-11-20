import { useMemo } from 'react';
import { COUNTRIES, CONTINENT_ES, TOTAL } from '../data/countries';

const ORDEN = ['EU', 'AF', 'AS', 'NA', 'SA', 'OC', 'AN'];

/**
 * El registro: una marca por cada país del mundo, agrupadas por continente.
 * Se encienden al subir la primera foto de ese país.
 */
export default function WorldLedger({ stats, onSelect }) {
  const grupos = useMemo(() => {
    const porContinente = new Map(ORDEN.map((c) => [c, []]));
    for (const pais of COUNTRIES) {
      (porContinente.get(pais.continent) ?? porContinente.get('AN')).push(pais);
    }
    return ORDEN.map((code) => ({ code, paises: porContinente.get(code) ?? [] })).filter(
      (g) => g.paises.length
    );
  }, []);

  const probados = Object.keys(stats).length;

  return (
    <div className="registro">
      <p className="registro-cifra">
        <strong>{probados}</strong> de {TOTAL} países probados
      </p>

      <div className="registro-grupos">
        {grupos.map(({ code, paises }) => (
          <div
            key={code}
            className="registro-grupo"
            style={{ flex: `${paises.length} 1 0px` }}
            role="group"
            aria-label={`${CONTINENT_ES[code]}: ${paises.filter((p) => stats[p.code]).length} de ${paises.length}`}
            title={`${CONTINENT_ES[code]} · ${paises.filter((p) => stats[p.code]).length} de ${paises.length}`}
          >
            {paises.map((pais) => {
              const n = stats[pais.code]?.count ?? 0;
              return (
                <button
                  key={pais.code}
                  type="button"
                  className="marca-pais"
                  data-probado={n > 0 ? 'si' : 'no'}
                  title={n > 0 ? `${pais.name} · ${n} ${n === 1 ? 'foto' : 'fotos'}` : pais.name}
                  aria-label={pais.name}
                  onClick={() => onSelect(pais.code)}
                />
              );
            })}
          </div>
        ))}
      </div>

    </div>
  );
}
