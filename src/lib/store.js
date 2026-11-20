/**
 * Capa de datos. Una sola API para los componentes, con dos implementaciones:
 *   - Firebase (Firestore + Storage), cuando hay variables de entorno.
 *   - Demo en memoria, para poder abrir la app sin configurar nada.
 *
 * Modelo en Firestore:
 *   countries/{ISO2}                -> { count, cover, updatedAt }
 *   countries/{ISO2}/photos/{id}    -> { url, path, thumbUrl, thumbPath, dish, author, createdAt }
 */
import {
  collection, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy,
  query, serverTimestamp, setDoc, writeBatch, increment,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from 'firebase/auth';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { auth, db, EDITOR_EMAIL, isConfigured, storage } from '../firebase';
import { prepareImage } from './image';

export { isConfigured };

/** Tope de fotos por país. Súbelo si queréis más. */
export const MAX_PER_COUNTRY = 30;

const uid = () =>
  (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 20);

/* ========================================================================== */
/*  Firebase                                                                  */
/* ========================================================================== */

const fb = {
  onAuth(cb) {
    return onAuthStateChanged(auth, (user) => cb(Boolean(user)));
  },

  async signIn(password) {
    try {
      await signInWithEmailAndPassword(auth, EDITOR_EMAIL, password);
    } catch (err) {
      const code = err?.code ?? '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        throw new Error('Esa contraseña no es correcta.');
      }
      if (code === 'auth/too-many-requests') {
        throw new Error('Demasiados intentos. Espera un minuto y vuelve a probar.');
      }
      if (code === 'auth/network-request-failed') {
        throw new Error('Sin conexión con el servidor. Revisa tu red.');
      }
      throw new Error('No se pudo entrar. Vuelve a intentarlo.');
    }
  },

  signOut() {
    return signOut(auth);
  },

  subscribeStats(cb) {
    return onSnapshot(collection(db, 'countries'), (snap) => {
      const stats = {};
      snap.forEach((d) => {
        const data = d.data();
        if ((data.count ?? 0) > 0) stats[d.id] = { count: data.count, cover: data.cover ?? null };
      });
      cb(stats);
    });
  },

  subscribePhotos(code, cb) {
    const q = query(collection(db, 'countries', code, 'photos'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  },

  async addPhoto(code, { file, dish, author }) {
    const { full, thumb, width, height } = await prepareImage(file);
    const id = uid();
    const path = `photos/${code}/${id}.jpg`;
    const thumbPath = `photos/${code}/${id}_t.jpg`;
    const meta = { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000' };

    const [fullSnap, thumbSnap] = await Promise.all([
      uploadBytes(ref(storage, path), full, meta),
      uploadBytes(ref(storage, thumbPath), thumb, meta),
    ]);
    const [url, thumbUrl] = await Promise.all([
      getDownloadURL(fullSnap.ref),
      getDownloadURL(thumbSnap.ref),
    ]);

    const batch = writeBatch(db);
    batch.set(doc(db, 'countries', code, 'photos', id), {
      url, path, thumbUrl, thumbPath, width, height,
      dish: dish?.trim() || '',
      author: author?.trim() || '',
      createdAt: serverTimestamp(),
    });
    batch.set(
      doc(db, 'countries', code),
      { count: increment(1), cover: thumbUrl, updatedAt: serverTimestamp() },
      { merge: true }
    );
    await batch.commit();
  },

  async removePhoto(code, photo) {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'countries', code, 'photos', photo.id));
    batch.set(
      doc(db, 'countries', code),
      { count: increment(-1), updatedAt: serverTimestamp() },
      { merge: true }
    );
    await batch.commit();

    // La portada del país pasa a ser la foto más reciente que quede.
    const rest = await getDocs(
      query(collection(db, 'countries', code, 'photos'), orderBy('createdAt', 'desc'), limit(1))
    );
    if (rest.empty) {
      await deleteDoc(doc(db, 'countries', code));
    } else {
      await setDoc(
        doc(db, 'countries', code),
        { cover: rest.docs[0].data().thumbUrl ?? null },
        { merge: true }
      );
    }

    await Promise.allSettled([
      photo.path && deleteObject(ref(storage, photo.path)),
      photo.thumbPath && deleteObject(ref(storage, photo.thumbPath)),
    ]);
  },
};

/* ========================================================================== */
/*  Demo en memoria                                                           */
/* ========================================================================== */

const memory = { photos: new Map(), editor: false };
const listeners = { stats: new Set(), photos: new Map(), auth: new Set() };

const statsFromMemory = () =>
  Object.fromEntries(
    [...memory.photos].filter(([, list]) => list.length).map(([code, list]) => [
      code,
      { count: list.length, cover: list[0].thumbUrl },
    ])
  );

function emit(code) {
  const stats = statsFromMemory();
  listeners.stats.forEach((cb) => cb(stats));
  if (code) {
    listeners.photos.get(code)?.forEach((cb) => cb([...(memory.photos.get(code) ?? [])]));
  }
}

const demo = {
  onAuth(cb) {
    listeners.auth.add(cb);
    cb(memory.editor);
    return () => listeners.auth.delete(cb);
  },

  async signIn(password) {
    if (password !== 'demo') throw new Error('En modo demo la contraseña es «demo».');
    memory.editor = true;
    listeners.auth.forEach((cb) => cb(true));
  },

  async signOut() {
    memory.editor = false;
    listeners.auth.forEach((cb) => cb(false));
  },

  subscribeStats(cb) {
    listeners.stats.add(cb);
    cb(statsFromMemory());
    return () => listeners.stats.delete(cb);
  },

  subscribePhotos(code, cb) {
    if (!listeners.photos.has(code)) listeners.photos.set(code, new Set());
    listeners.photos.get(code).add(cb);
    cb([...(memory.photos.get(code) ?? [])]);
    return () => listeners.photos.get(code)?.delete(cb);
  },

  async addPhoto(code, { file, dish, author }) {
    const { full, thumb, width, height } = await prepareImage(file);
    const list = memory.photos.get(code) ?? [];
    list.unshift({
      id: uid(),
      url: URL.createObjectURL(full),
      thumbUrl: URL.createObjectURL(thumb),
      width, height,
      dish: dish?.trim() || '',
      author: author?.trim() || '',
      createdAt: { seconds: Date.now() / 1000 },
    });
    memory.photos.set(code, list);
    emit(code);
  },

  async removePhoto(code, photo) {
    const list = (memory.photos.get(code) ?? []).filter((p) => p.id !== photo.id);
    memory.photos.set(code, list);
    URL.revokeObjectURL(photo.url);
    URL.revokeObjectURL(photo.thumbUrl);
    emit(code);
  },
};

/* ========================================================================== */

const store = isConfigured ? fb : demo;

export const onAuth = (cb) => store.onAuth(cb);
export const signIn = (password) => store.signIn(password);
export const signOutEditor = () => store.signOut();
export const subscribeStats = (cb) => store.subscribeStats(cb);
export const subscribePhotos = (code, cb) => store.subscribePhotos(code, cb);
export const addPhoto = (code, payload) => store.addPhoto(code, payload);
export const removePhoto = (code, photo) => store.removePhoto(code, photo);
