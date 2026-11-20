# El mundo a bocados

Un mapamundi en 3D que se va encendiendo con las fotos de la comida que habéis
probado de cada país. Gira en 360°, están los 250 países y territorios ISO, y
cualquiera que tenga la clave compartida puede añadir fotos.

React + Vite en el front, Firebase (Firestore + Storage) detrás, desplegado en Vercel.

---

## Probarlo ahora mismo

```bash
npm install
npm run dev
```

Sin configurar Firebase arranca en **modo demo**: todo funciona, la clave es `demo`
y las fotos viven solo en esa pestaña. Sirve para ver el globo y la interfaz antes
de montar nada.

---

## Montarlo de verdad

### 1. Proyecto de Firebase

En [console.firebase.google.com](https://console.firebase.google.com):

1. **Crear un proyecto** (puedes desactivar Google Analytics).
2. **Firestore Database** → Crear base de datos → modo producción → región `eur3 (europe-west)`.
3. **Storage** → Empezar → misma región.
4. **Authentication** → Empezar → habilitar **Correo electrónico/contraseña**.
5. **Authentication → Users → Añadir usuario**: crea la cuenta compartida, por ejemplo
   `editor@elmundoabocados.app`, con la contraseña que repartirás entre quienes puedan subir fotos.
6. **Configuración del proyecto → Tus apps → Web (`</>`)**: registra una app y copia el objeto
   `firebaseConfig`.

### 2. Variables de entorno

```bash
cp .env.example .env
```

Rellena `.env` con los valores de `firebaseConfig` y pon en `VITE_EDITOR_EMAIL` el email
exacto de la cuenta del paso 5.

### 3. Reglas de seguridad

Las reglas están en `firestore.rules` y `storage.rules`. **Cambia el email** que aparece
en la función `esEditor()` de los dos ficheros por el tuyo y súbelas:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage:rules --project TU_PROJECT_ID
```

O pégalas a mano en la consola, en las pestañas *Reglas* de Firestore y de Storage.

Con estas reglas: **cualquiera lee el mapa, solo la cuenta compartida escribe**. La
contraseña no se comprueba en el navegador, la comprueba Firebase — así que no se puede
saltar manipulando el front.

### 4. CORS de Storage

Para que el navegador pueda leer las fotos desde tu dominio:

```bash
echo '[{"origin":["*"],"method":["GET"],"maxAgeSeconds":3600}]' > cors.json
gsutil cors set cors.json gs://TU_BUCKET.appspot.com
```

### 5. Desplegar en Vercel

```bash
npm install -g vercel
vercel
```

Vercel detecta Vite solo. Después, en **Settings → Environment Variables**, añade las
mismas siete variables del `.env` (Production, Preview y Development) y vuelve a desplegar.

Por último, en **Firebase → Authentication → Settings → Dominios autorizados**, añade tu
dominio de Vercel.

---

## Cómo funciona

```
src/
  firebase.js            arranque del SDK; detecta si hay configuración
  lib/store.js           única API de datos — Firebase o demo en memoria
  lib/image.js           redimensiona en el navegador antes de subir
  lib/colors.js          escala de color según nº de fotos
  data/countries.js      250 países: nombre, continente, bandera, centroide (generado)
  components/
    FoodGlobe.jsx        el globo: polígonos, hover, vuelo al país
    WorldLedger.jsx      la tira de marcas, una por país
    CountryPanel.jsx     panel lateral con la cuadrícula de fotos
    Uploader.jsx         subida con arrastrar y soltar
    SearchBox.jsx        buscador sin acentos, con teclado
    Lightbox.jsx         visor a pantalla completa
    PasswordGate.jsx     clave compartida
```

Un detalle de la vista: la cámara calcula su distancia inicial según la forma de la
pantalla, para que el mundo entero quepa tanto en un móvil vertical como en un
monitor ancho.

### Datos en Firestore

```
countries/{ES}                  { count: 3, cover: "https://…", updatedAt }
countries/{ES}/photos/{id}      { url, path, thumbUrl, thumbPath, dish, author, createdAt, width, height }
```

El globo escucha la colección `countries` entera (250 documentos pequeños, una sola
suscripción) y las fotos de un país solo mientras su panel está abierto.

### Las fotos

Se redimensionan **en el navegador** antes de subirse: una copia de 1600 px para ver y
una miniatura de 420 px para la cuadrícula. Una foto de móvil de 6 MB acaba ocupando unos
250 KB, así que el plan gratuito de Firebase (5 GB) da para unas 20.000 fotos.

### Ajustes rápidos

| Qué | Dónde |
| --- | --- |
| Máximo de fotos por país (30) | `src/lib/store.js` → `MAX_PER_COUNTRY` |
| Colores de la escala | `src/lib/colors.js` |
| Tamaño al que se redimensionan | `src/lib/image.js` → `MAX_FULL`, `MAX_THUMB` |
| Velocidad de rotación | `src/components/FoodGlobe.jsx` → `autoRotateSpeed` |
| Vista inicial del globo | `src/components/FoodGlobe.jsx` → `CENTRO_INICIAL` |

### Regenerar los datos y la textura

Los polígonos vienen de Natural Earth 1:50m vía `world-atlas`, y los nombres de
ISO 3166-1. La textura del globo es la imagen nocturna de la NASA, procesada para
apagar el velo azulado que tiene sobre los desiertos (si no, compite con el color
de los países probados).

```bash
npm run data      # public/data/countries.geo.json + src/data/countries.js
npm run texture   # public/img/earth-night.jpg
```

Los dos salen de dependencias de desarrollo, así que el despliegue no los necesita:
los ficheros generados van en el repositorio.

---

## Fuentes de los datos

- Fronteras: [Natural Earth](https://www.naturalearthdata.com/) (dominio público) vía `world-atlas`.
- Nombres y códigos: ISO 3166-1 vía `i18n-iso-countries` y `countries-list`.
- Texturas del globo: ejemplos de `three-globe` (NASA Visible Earth).
