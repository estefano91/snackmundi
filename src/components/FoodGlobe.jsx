import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Color, MeshPhongMaterial, SRGBColorSpace, TextureLoader } from 'three';
import Globe from 'react-globe.gl';
import { BY_CODE, COUNTRIES } from '../data/countries';
import { capColor, HOVER, sideColor, solidColor } from '../lib/colors';

/** Países sin polígono propio en Natural Earth: se marcan con un punto. */
const PUNTOS = COUNTRIES.filter((c) => !c.polygon);

const CENTRO_INICIAL = { lat: 24, lng: 8 };

/**
 * A qué distancia colocar la cámara para que el mundo entero quepa en pantalla.
 * En vertical manda el ancho; en horizontal, el alto (y se deja aire para la barra).
 */
function altitudInicial(ancho, alto) {
  const fovV = (50 * Math.PI) / 180;                                  // el de globe.gl
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * (ancho / alto));
  const apertura = ancho < alto ? fovH * 0.88 : fovV * 0.7;
  const distancia = 100 / Math.sin(apertura / 2);                      // radio del globo = 100
  return Math.min(7, Math.max(1.6, distancia / 100 - 1));
}

export default function FoodGlobe({ features, stats, selected, onSelect }) {
  const globo = useRef(null);

  /* La tierra: textura nocturna, relieve suave y nada de brillo especular
     (si no, la atmósfera azul tiñe de cian los desiertos). */
  const material = useMemo(() => {
    const cargador = new TextureLoader();
    const mapa = cargador.load('/img/earth-night.jpg');
    mapa.colorSpace = SRGBColorSpace; // si no, three la interpreta como lineal y la tierra sale lavada
    return new MeshPhongMaterial({
      map: mapa,
      bumpMap: cargador.load('/img/earth-topology.png'),
      bumpScale: 4,
      specular: new Color('#070b18'),
      shininess: 3,
    });
  }, []);
  const marco = useRef(null);
  const [tamano, setTamano] = useState({ w: 0, h: 0 });
  const [encima, setEncima] = useState(null);
  const [listo, setListo] = useState(false);

  /* --- Tamaño ------------------------------------------------------------ */
  useLayoutEffect(() => {
    const el = marco.current;
    if (!el) return;
    const ro = new ResizeObserver(([entrada]) => {
      const { width, height } = entrada.contentRect;
      setTamano({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* --- Controles: gira solo hasta que el usuario toca el globo ----------- */
  const alEstarListo = useCallback(() => {
    const controles = globo.current?.controls();
    if (!controles) return;

    controles.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    controles.autoRotateSpeed = 0.32;
    controles.enableDamping = true;
    controles.dampingFactor = 0.12;
    controles.minDistance = 125;
    controles.maxDistance = 900;
    controles.addEventListener('start', () => {
      controles.autoRotate = false;
    });

    globo.current.pointOfView(
      { ...CENTRO_INICIAL, altitude: altitudInicial(window.innerWidth, window.innerHeight) },
      0
    );
    setListo(true);
  }, []);

  /* --- Vuela al país seleccionado --------------------------------------- */
  useEffect(() => {
    if (!selected || !globo.current) return;
    const pais = BY_CODE[selected];
    if (!pais) return;
    const controles = globo.current.controls();
    if (controles) controles.autoRotate = false;
    const cerca = window.innerWidth < 768 ? 1.9 : 1.1;
    globo.current.pointOfView({ lat: pais.lat, lng: pais.lng, altitude: cerca }, 900);
  }, [selected]);

  /* --- Accesores: cambian de identidad para que el globo se repinte ----- */
  const cuenta = useCallback((f) => stats[f.properties.code]?.count ?? 0, [stats]);

  const colorCara = useCallback(
    (f) => {
      const code = f.properties.code;
      return capColor(cuenta(f), { hovered: code === encima || code === selected });
    },
    [cuenta, encima, selected]
  );

  const altura = useCallback(
    (f) => {
      const code = f.properties.code;
      if (code === encima || code === selected) return 0.055;
      const n = cuenta(f);
      return n > 0 ? 0.012 + Math.min(n, 12) * 0.0018 : 0.008;
    },
    [cuenta, encima, selected]
  );

  const etiqueta = useCallback(
    (f) => {
      const code = f.properties.code;
      const pais = BY_CODE[code];
      const n = cuenta(f);
      const nombre = pais?.name ?? f.properties.name;
      const bandera = pais?.flag ?? '';
      const texto = n > 0 ? `<em>${n} ${n === 1 ? 'foto' : 'fotos'}</em>` : 'sin probar';
      return `<div class="globo-tooltip">${bandera} ${nombre} · ${texto}</div>`;
    },
    [cuenta]
  );

  const colorPunto = useCallback(
    (p) => (p.code === encima || p.code === selected ? HOVER : solidColor(stats[p.code]?.count ?? 0)),
    [stats, encima, selected]
  );

  const alturaPunto = useCallback(
    (p) => (p.code === encima || p.code === selected ? 0.05 : 0.02),
    [encima, selected]
  );
  const etiquetaPunto = useCallback(
    (p) => {
      const n = stats[p.code]?.count ?? 0;
      const texto = n > 0 ? `<em>${n} ${n === 1 ? 'foto' : 'fotos'}</em>` : 'sin probar';
      return `<div class="globo-tooltip">${p.flag} ${p.name} · ${texto}</div>`;
    },
    [stats]
  );

  return (
    <div className="escena" ref={marco}>
      {tamano.w > 0 && (
        <Globe
          ref={globo}
          width={tamano.w}
          height={tamano.h}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={material}
          showAtmosphere
          atmosphereColor="#6f86b8"
          atmosphereAltitude={0.12}
          onGlobeReady={alEstarListo}
          polygonsData={features}
          polygonAltitude={altura}
          polygonCapColor={colorCara}
          polygonSideColor={(f) => sideColor(cuenta(f))}
          polygonStrokeColor={() => 'rgba(244,239,229,0.18)'}
          polygonLabel={etiqueta}
          polygonsTransitionDuration={220}
          onPolygonHover={(f) => setEncima(f?.properties?.code ?? null)}
          onPolygonClick={(f) => onSelect(f.properties.code)}
          pointsData={PUNTOS}
          pointLat="lat"
          pointLng="lng"
          pointColor={colorPunto}
          pointAltitude={alturaPunto}
          pointRadius={0.32}
          pointLabel={etiquetaPunto}
          pointsTransitionDuration={220}
          onPointHover={(p) => setEncima(p?.code ?? null)}
          onPointClick={(p) => onSelect(p.code)}
        />
      )}

      {!listo && <p className="cargando">Dibujando el mundo…</p>}
    </div>
  );
}
